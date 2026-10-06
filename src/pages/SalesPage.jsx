import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Snackbar, Divider,
} from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList, useOne } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';
import { productLabel } from '../config/products';

const EMPTY_FORM = {
  partner_id: '', referral_id: '', customer_name: '', customer_phone: '', product_id: '', product_name: '', unit_price: '', quantity: 1,
  sale_amount: '', sale_date: '', commission_rate: '', payment_status: 'unpaid', amount_paid: '', payment_method: '',
  reference_number: '', notes: '', affiliate_link_code: '', affiliate_enquiry_id: '',
};
const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Fully Paid' };
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Online (Shop)'];

const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const round2 = (v) => Math.round(Number(v) * 100) / 100;

/** Same rule as the backend (Sale::paymentStatusFor): status follows the amount paid. */
function paymentStatusFor(paid, total) {
  if (!(Number(paid) > 0)) return 'unpaid';
  return Number(paid) + 0.005 >= Number(total) ? 'paid' : 'partial';
}

// `partnerTypeCode` narrows to sales recorded under one partner role.
export function SalesPage({ partnerTypeCode = '', title = 'Sales' }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR[partnerTypeCode || 'sales'] });
  const { data: products } = useList('products', { status: 'active' });
  // Actual sales only — partners' referrals are separate records (Referrals page).
  const { data, isLoading } = useList('sales', { partner_type_code: partnerTypeCode, sale_type: 'sale', per_page: 100 });
  // Referrals still waiting for their sale — the optional Referral Reference to link.
  const { data: linkable } = useList('sales', { linkable: 1, per_page: 200 }, { enabled: open && !editingId });
  const referralOptions = linkable?.data ?? [];
  // The selected partner's active affiliate links (inactive ones can't take a sale).
  const { data: partnerLinks } = useList('affiliate-links', { partner_id: form.partner_id, per_page: 100 }, { enabled: open && !editingId && !!form.partner_id });
  const linkOptions = (partnerLinks?.data ?? []).filter((l) => l.status === 'active');
  const selectedLink = linkOptions.find((l) => l.code === form.affiliate_link_code);
  // Affiliate Enquiries → "Convert to Sale": the enquiry being converted.
  const { data: enquiry } = useOne('affiliate-enquiries', open && !editingId ? form.affiliate_enquiry_id : null);

  const selectedProduct = (products ?? []).find((p) => String(p.id) === String(form.product_id));
  const selectedReferral = referralOptions.find((r) => String(r.id) === String(form.referral_id));

  // Live totals shown in the form — the backend recalculates the same way on save. An entered
  // Sale Amount (the actual amount charged) wins over price × quantity.
  // The product's price is pre-filled into Unit Price but stays editable; blank = the product's price.
  const unitPrice = form.unit_price !== '' ? Number(form.unit_price) : Number(selectedProduct?.amount ?? 0);
  const listTotal = round2(unitPrice * Number(form.quantity || 0));
  const total = form.sale_amount !== '' ? round2(form.sale_amount) : listTotal;
  const commissionAmount = form.commission_rate === '' ? null : round2((total * Number(form.commission_rate)) / 100);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['affiliate-enquiries'] });
    queryClient.invalidateQueries({ queryKey: ['affiliate-links'] });
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = (referralId = '') => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, referral_id: referralId });
    setError('');
    setOpen(true);
  };

  // Arriving from Referrals → "Record Sale": open the form with that referral selected.
  const [searchParams, setSearchParams] = useSearchParams();
  // Arriving from Affiliate Enquiries → "Convert to Sale": open the form for that enquiry.
  useEffect(() => {
    const ref = searchParams.get('referral_id');
    const enquiryId = searchParams.get('enquiry_id');
    if (ref) {
      openCreate(ref);
      setSearchParams((p) => { p.delete('referral_id'); return p; }, { replace: true });
    } else if (enquiryId) {
      openCreate();
      set({ affiliate_enquiry_id: enquiryId });
      setSearchParams((p) => { p.delete('enquiry_id'); return p; }, { replace: true });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once the enquiry loads, fill partner, customer, product/service, its affiliate link and the
  // link's commission %. Admin then types the final amount.
  useEffect(() => {
    if (!enquiry || String(enquiry.id) !== String(form.affiliate_enquiry_id) || form.partner_id) return;
    const prod = (products ?? []).find((p) => p.id === enquiry.product_id);
    const link = enquiry.affiliate_link?.status === 'active' ? enquiry.affiliate_link : null;
    set({
      partner_id: enquiry.partner_id,
      customer_name: enquiry.customer_name ?? '',
      customer_phone: enquiry.customer_phone ?? '',
      affiliate_link_code: link?.code ?? '',
      ...(prod && {
        product_id: String(prod.id),
        unit_price: prod.amount,
        sale_amount: round2(Number(prod.amount) * Number(form.quantity || 1)),
      }),
      commission_rate: link?.commission_percent != null ? Number(link.commission_percent)
        : prod ? Number(prod.commission_percent) : '',
    });
  }, [enquiry, products]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once the referral list loads, fill the partner/customer/rate from the preselected referral.
  useEffect(() => {
    if (selectedReferral && !form.partner_id) pickReferral(selectedReferral.id);
  }, [selectedReferral]); // eslint-disable-line react-hooks/exhaustive-deps

  // Referral picked → the sale belongs to that referral's partner; customer + agreed rate carry over.
  const pickReferral = (value) => {
    const ref = referralOptions.find((r) => String(r.id) === String(value));
    setForm((f) => ({
      ...f,
      referral_id: value,
      affiliate_link_code: '',
      partner_id: ref ? ref.partner_id : f.partner_id,
      customer_name: ref ? (ref.customer_name ?? '') : f.customer_name,
      customer_phone: ref ? (ref.customer_phone ?? '') : f.customer_phone,
      commission_rate: ref?.commission_percent != null ? Number(ref.commission_percent) : f.commission_rate,
    }));
  };

  const openEdit = (row) => {
    const c = row.commission;
    const derivedRate = c && Number(c.base_amount) ? +(c.commission_amount / c.base_amount * 100).toFixed(2) : '';
    setEditingId(row.id);
    setForm({
      partner_id: row.partner_id,
      customer_name: row.customer_name ?? '',
      customer_phone: row.customer_phone ?? '',
      referral_id: row.referral_id ?? '',
      product_id: row.product_id ? String(row.product_id) : CUSTOM_OPTION,
      product_name: row.product_name ?? '',
      unit_price: row.unit_price ?? '',
      quantity: row.quantity,
      sale_amount: row.sale_amount ?? '',
      sale_date: row.sale_date,
      commission_rate: row.commission_percent != null ? Number(row.commission_percent) : derivedRate,
      payment_status: row.payment_status ?? '',
      amount_paid: row.amount_paid != null ? Number(row.amount_paid) : '',
      payment_method: row.payment_method ?? '',
      reference_number: row.reference_number ?? '',
      notes: row.notes ?? '',
    });
    setError('');
    setOpen(true);
  };

  // Product picked → auto-fill its price and commission rate.
  const pickProduct = (value) => {
    const prod = (products ?? []).find((p) => String(p.id) === String(value));
    set({
      product_id: value,
      unit_price: prod ? prod.amount : form.unit_price,
      // A referral's or affiliate link's agreed rate stays; otherwise the product's standard %.
      commission_rate: selectedReferral?.commission_percent != null || selectedLink?.commission_percent != null ? form.commission_rate
        : prod ? Number(prod.commission_percent) : form.commission_rate,
      // Re-suggest the Sale Amount from the new product's price.
      sale_amount: prod ? round2(Number(prod.amount) * Number(form.quantity || 1)) : form.sale_amount,
    });
  };

  // Affiliate link picked → its product (and price) and its commission %. The backend then
  // attributes the sale to the link and adds 1 to its conversions.
  const pickAffiliateLink = (code) => {
    const link = linkOptions.find((l) => l.code === code);
    const prod = link && (products ?? []).find((p) => p.id === link.product_id);
    set({
      affiliate_link_code: code,
      ...(prod && {
        product_id: String(prod.id),
        unit_price: prod.amount,
        sale_amount: round2(Number(prod.amount) * Number(form.quantity || 1)),
      }),
      ...(link && {
        commission_rate: link.commission_percent != null ? Number(link.commission_percent)
          : prod ? Number(prod.commission_percent) : form.commission_rate,
      }),
    });
  };

  // Payment Status and Amount Paid stay in step, whichever the admin changes.
  const pickPaymentStatus = (status) => {
    if (status === 'paid') set({ payment_status: status, amount_paid: total });
    else if (status === 'unpaid') set({ payment_status: status, amount_paid: 0 });
    else set({ payment_status: status, amount_paid: paymentStatusFor(form.amount_paid, total) === 'partial' ? form.amount_paid : '' });
  };
  const changeAmountPaid = (value) => set({ amount_paid: value, payment_status: paymentStatusFor(value, total) });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const usingProduct = form.product_id && form.product_id !== CUSTOM_OPTION;
    const payload = {
      customer_name: form.customer_name || null,
      customer_phone: form.customer_phone || null,
      ...(usingProduct
        ? { product_id: form.product_id, unit_price: form.unit_price === '' ? null : form.unit_price }
        : { product_id: null, product_name: form.product_name, unit_price: form.unit_price }),
      quantity: form.quantity,
      sale_amount: form.sale_amount === '' ? null : form.sale_amount,
      sale_date: form.sale_date,
      commission_rate: form.commission_rate === '' ? null : form.commission_rate,
      // Older sales have no payment tracking ('') — leave it that way unless the admin sets it.
      // For Fully Paid / Unpaid the backend works the amount out from the saved total itself.
      ...(form.payment_status && {
        payment_status: form.payment_status,
        amount_paid: form.payment_status === 'partial' ? form.amount_paid : null,
      }),
      payment_method: form.payment_method || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await api.put(`/sales/${editingId}`, payload);
      } else {
        await api.post('/sales', {
          ...payload, partner_id: form.partner_id, referral_id: form.referral_id || null,
          affiliate_link_code: form.affiliate_link_code || null,
          affiliate_enquiry_id: form.affiliate_enquiry_id || null,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'record'} sale`);
      return;
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const run = async (fn, fallback) => {
    try {
      await fn();
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? fallback);
    }
  };

  const remove = (id) => {
    if (!window.confirm('Delete this sale? Its commission record stays for history if already actioned.')) return;
    run(() => api.delete(`/sales/${id}`), 'Could not delete sale');
  };
  const commissionAction = (commissionId, action) => run(() => api.post(`/commissions/${commissionId}/${action}`), `Could not ${action} commission`);
  const setSaleStatus = (id, status) => run(() => api.put(`/sales/${id}`, { status }), 'Could not update sale status');
  const markFullyPaid = (row) => run(() => api.put(`/sales/${row.id}`, { amount_paid: row.sale_amount }), 'Could not mark the sale as paid');

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v) => v || '—' },
    { field: 'partner', headerName: 'Partner', flex: 1, minWidth: 120, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'customer_name', headerName: 'Customer', flex: 1, minWidth: 120, valueGetter: (v) => v || '—' },
    { field: 'referral', headerName: 'Referral', width: 120, valueGetter: (v, row) => row.referral?.reference_number ?? '—' },
    { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 130 },
    { field: 'quantity', headerName: 'Qty', width: 60 },
    { field: 'sale_amount', headerName: 'Total', width: 110, valueGetter: (v) => money(v) },
    { field: 'sale_date', headerName: 'Date', width: 110 },
    { field: 'status', headerName: 'Sale Status', width: 120, renderCell: (p) => <StatusChip status={p.row.status} /> },
    {
      field: 'payment_status', headerName: 'Customer Payment', width: 190, sortable: false,
      renderCell: (p) => (p.row.payment_status ? (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <StatusChip status={p.row.payment_status} label={PAYMENT_STATUS_LABEL[p.row.payment_status]} />
          {p.row.payment_status === 'partial' && <Typography variant="caption">{money(p.row.amount_paid)}</Typography>}
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">—</Typography>),
    },
    {
      field: 'commission_percent', headerName: 'Comm. %', width: 85, sortable: false,
      valueGetter: (v, row) => (row.commission && Number(row.commission.base_amount) ? `${+(row.commission.commission_amount / row.commission.base_amount * 100).toFixed(2)}%` : '—'),
    },
    {
      field: 'commission', headerName: 'Commission', width: 170, sortable: false,
      renderCell: (params) => {
        const c = params.row.commission;
        if (!c) return <Typography variant="body2" color="text.secondary">—</Typography>;
        const held = c.status === 'pending' && ['unpaid', 'partial'].includes(params.row.payment_status);
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2">{money(c.commission_amount)}</Typography>
            <StatusChip status={held ? 'on hold' : c.status} label={held ? 'Awaiting payment' : undefined} />
          </Stack>
        );
      },
    },
    {
      field: '_actions', headerName: 'Actions', width: 380, sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const c = row.commission;
        const customerPaid = !row.payment_status || row.payment_status === 'paid';
        const buttons = [];
        if (can('commissions.edit')) {
          buttons.push(<Button key="e" size="small" onClick={() => openEdit(row)}>Edit</Button>);
          if (row.payment_status && row.payment_status !== 'paid' && row.status !== 'cancelled') {
            buttons.push(<Button key="p" size="small" color="success" onClick={() => markFullyPaid(row)}>Mark Fully Paid</Button>);
          }
        }
        if (can('commissions.edit') && row.status === 'pending') {
          buttons.push(<Button key="c" size="small" color="success" onClick={() => setSaleStatus(row.id, 'confirmed')}>Confirm</Button>);
          buttons.push(<Button key="x" size="small" color="error" onClick={() => setSaleStatus(row.id, 'cancelled')}>Cancel</Button>);
        }
        // A commission only becomes approvable (payable) once the customer has fully paid.
        if (can('commissions.approve') && c?.status === 'pending' && customerPaid) {
          buttons.push(<Button key="a" size="small" color="success" onClick={() => commissionAction(c.id, 'approve')}>Approve</Button>);
          buttons.push(<Button key="r" size="small" color="error" onClick={() => commissionAction(c.id, 'reject')}>Reject</Button>);
        }
        if (can('commissions.delete')) {
          buttons.push(<Button key="d" size="small" color="error" onClick={() => remove(row.id)}>Delete</Button>);
        }
        return buttons.length ? <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>{buttons}</Stack> : null;
      },
    },
  ];

  const paidExceedsTotal = form.payment_status === 'partial' && form.amount_paid !== '' && Number(form.amount_paid) > total + 0.005;

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={5000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Every product sale a partner made. Its commission becomes payable once the customer has fully paid.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={() => openCreate()}>Record Sale</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Sale' : 'Record Sale'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {form.affiliate_enquiry_id && (
                <Alert severity="info">
                  Converting the enquiry from {enquiry?.customer_name ?? '…'}{enquiry?.partner ? ` (${enquiry.partner.name})` : ''} — saving marks it converted and creates the commission.
                </Alert>
              )}
              {!editingId && !form.affiliate_enquiry_id && (
                <TextField
                  select label="Referral Reference (optional)" value={form.referral_id} onChange={(e) => pickReferral(e.target.value)} fullWidth
                  helperText={selectedReferral
                    ? `Links this sale to ${selectedReferral.partner?.name}'s referral — their commission is calculated from the Sale Amount`
                    : 'Pick the partner\'s referral this sale came from, if any'}
                >
                  <MenuItem value="">None — not from a referral</MenuItem>
                  {referralOptions.map((r) => (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.reference_number} — {r.customer_name}{r.customer_phone ? ` (${r.customer_phone})` : ''} · {r.partner?.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {editingId && form.referral_id && (
                <Alert severity="info">Recorded for referral {data?.data?.find((s) => s.id === editingId)?.referral?.reference_number}.</Alert>
              )}
              {!editingId && (
                <TextField
                  select label="Partner" value={form.partner_id} onChange={(e) => set({ partner_id: e.target.value, affiliate_link_code: '' })}
                  required disabled={!!form.referral_id || !!form.affiliate_enquiry_id}
                  helperText={form.referral_id ? 'From the referral' : form.affiliate_enquiry_id ? 'From the enquiry' : ''} fullWidth
                >
                  {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  {/* The referral's partner may not be in the list (e.g. a referral-only partner filter). */}
                  {selectedReferral && !(partners?.data ?? []).some((p) => p.id === selectedReferral.partner_id) && (
                    <MenuItem value={selectedReferral.partner_id}>{selectedReferral.partner?.name}</MenuItem>
                  )}
                </TextField>
              )}
              {!editingId && !form.referral_id && form.partner_id && (
                <TextField
                  select label="Affiliate Link (optional)" value={form.affiliate_link_code} onChange={(e) => pickAffiliateLink(e.target.value)} fullWidth
                  helperText={linkOptions.length
                    ? "Uses the link's product and commission %, and adds 1 to its conversions"
                    : 'This partner has no active affiliate links'}
                >
                  <MenuItem value="">None</MenuItem>
                  {linkOptions.map((l) => (
                    <MenuItem key={l.id} value={l.code}>
                      {l.code} — {l.product?.name ?? 'No product'}{l.commission_percent != null ? ` (${Number(l.commission_percent)}%)` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Customer Name" value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} fullWidth />
                <TextField label="Customer Phone" value={form.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} slotProps={{ htmlInput: { maxLength: 20 } }} fullWidth />
              </Stack>

              <TextField
                select label="Product / Service" value={form.product_id} onChange={(e) => pickProduct(e.target.value)} required fullWidth
                helperText="From the Products / Services catalog"
              >
                {/* Only an older free-text sale being edited keeps its custom entry. */}
                {form.product_id === CUSTOM_OPTION && <MenuItem value={CUSTOM_OPTION}>{form.product_name || 'Custom / Other'} (older entry)</MenuItem>}
                {(products ?? []).map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {productLabel(p)} — {money(p.amount)} ({Number(p.commission_percent)}% commission)
                  </MenuItem>
                ))}
              </TextField>
              {form.product_id === CUSTOM_OPTION && (
                <TextField label="Product Name" value={form.product_name} onChange={(e) => set({ product_name: e.target.value })} required fullWidth />
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  type="number" label="Unit Price" value={form.unit_price}
                  onChange={(e) => set({
                    unit_price: e.target.value,
                    // Keep the suggested amount in step unless admin typed their own.
                    sale_amount: form.sale_amount === '' || round2(form.sale_amount) === listTotal
                      ? round2(Number(e.target.value || 0) * Number(form.quantity || 0)) : form.sale_amount,
                  })}
                  required={!selectedProduct}
                  helperText={selectedProduct ? 'From the product — change it to override' : ''}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
                />
                <TextField
                  type="number" label="Quantity" value={form.quantity}
                  onChange={(e) => set({
                    quantity: e.target.value,
                    // Keep the suggested amount in step unless admin typed their own.
                    sale_amount: form.sale_amount === '' || round2(form.sale_amount) === listTotal
                      ? round2(unitPrice * Number(e.target.value || 0)) : form.sale_amount,
                  })}
                  required slotProps={{ htmlInput: { min: 1, step: 1 } }} fullWidth
                />
              </Stack>
              <TextField
                type="number" label="Sale Amount" value={form.sale_amount === '' ? listTotal : form.sale_amount}
                onChange={(e) => set({ sale_amount: e.target.value })} required
                helperText={`The actual amount charged — suggested ${money(listTotal)} (Unit Price × Quantity). The commission is calculated on this.`}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
              />
              <TextField
                type="date" label="Sale Date" value={form.sale_date} onChange={(e) => set({ sale_date: e.target.value })}
                required slotProps={{ inputLabel: { shrink: true } }} fullWidth
              />

              <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Commission</Typography></Divider>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  type="number" label="Commission Rate %" value={form.commission_rate}
                  onChange={(e) => set({ commission_rate: e.target.value })}
                  helperText={selectedProduct ? 'From the product — change it to override' : 'Blank = partner\'s commission rule'}
                  slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }} fullWidth
                />
                <TextField
                  label="Commission Amount" value={commissionAmount === null ? 'From commission rule' : money(commissionAmount)}
                  slotProps={{ input: { readOnly: true } }} helperText="Total × Commission Rate" fullWidth
                />
              </Stack>

              <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Customer Payment</Typography></Divider>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField select label="Payment Status" value={form.payment_status} onChange={(e) => pickPaymentStatus(e.target.value)} fullWidth>
                  {form.payment_status === '' && <MenuItem value="">Not tracked (older sale)</MenuItem>}
                  {Object.entries(PAYMENT_STATUS_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
                <TextField
                  type="number" label="Amount Paid" value={form.payment_status === 'paid' ? total : form.amount_paid}
                  onChange={(e) => changeAmountPaid(e.target.value)} disabled={form.payment_status === ''}
                  required={form.payment_status === 'partial'} error={paidExceedsTotal}
                  helperText={paidExceedsTotal ? `Can't exceed ${money(total)}`
                    : form.payment_status === 'paid' ? 'Full total' : `Balance: ${money(Math.max(total - Number(form.amount_paid || 0), 0))}`}
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
                />
              </Stack>
              <TextField select label="Payment Method" value={form.payment_method} onChange={(e) => set({ payment_method: e.target.value })} fullWidth>
                <MenuItem value="">—</MenuItem>
                {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                {form.payment_method && !PAYMENT_METHODS.includes(form.payment_method) && <MenuItem value={form.payment_method}>{form.payment_method}</MenuItem>}
              </TextField>
              {form.payment_status !== '' && (
                <Alert severity={form.payment_status === 'paid' ? 'success' : 'info'}>
                  {form.payment_status === 'paid'
                    ? 'Customer has fully paid — the commission can be approved and paid out.'
                    : 'The commission stays on hold until the customer has fully paid this sale.'}
                </Alert>
              )}

              <TextField label="Reference Number" placeholder="Order # (optional)" value={form.reference_number} onChange={(e) => set({ reference_number: e.target.value })} fullWidth />
              <TextField label="Notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} multiline minRows={2} fullWidth />
              {editingId && (
                <Typography variant="caption" color="text.secondary">
                  Price, quantity and rate changes recalculate the commission only while it's still waiting for approval.
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={paidExceedsTotal}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
