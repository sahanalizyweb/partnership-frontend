import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
} from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerCommissionStatus } from '../../config/money';
import { useList } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { api } from '../../api/client';
import { productLabel } from '../../config/products';

const EMPTY_FORM = { product_id: '', product_name: '', unit_price: '', quantity: 1, sale_date: '', reference_number: '' };
const CUSTOM_OPTION = '__custom__';

// A partner can only edit/delete their own sale/referral while it's still pending review —
// once it's confirmed, or its commission has been approved/rejected/paid, it's locked (see
// SaleController::isEditableByPartner on the backend, which enforces this regardless).
const isEditableByPartner = (row) => row.status === 'pending' && (!row.commission || row.commission.status === 'pending');

/**
 * Two separate portal pages over the partner's Sale records:
 *   mode="referrals" → My Referrals (Referral Partner): referred customers only.
 *   mode="sales"     → My Sales (Affiliate / Sales Partner): product sales only.
 * A partner holding both kinds of role gets both menu items; a referral-only partner never
 * sees the product-sales table.
 */
export function PortalSalesPage({ mode = 'sales' }) {
  const { data: enrollments, isLoading: rolesLoading } = useQuery({
    queryKey: ['me-enrollments'],
    queryFn: async () => (await api.get('/me/enrollments')).data,
  });
  const { data, isLoading } = useList('sales', { per_page: 100 });

  if (rolesLoading) return <Typography color="text.secondary">Loading...</Typography>;

  const roles = (enrollments ?? []).map((e) => e.partner_type?.code);
  const sellsProducts = roles.some((r) => ['sales', 'affiliate'].includes(r));
  const all = data?.data ?? [];

  // Old "My Sales / Referrals" links from a referral-only partner land on their referrals.
  if (mode === 'sales' && roles.includes('referral') && !sellsProducts) {
    return <Navigate to="/portal/referrals" replace />;
  }

  return mode === 'referrals'
    ? <PortalReferralsSection rows={all.filter((r) => r.sale_type === 'referral')} loading={isLoading} />
    // A sale Lizy recorded for one of the partner's referrals shows on that referral, not here too.
    : <PortalProductSalesSection rows={all.filter((r) => r.sale_type !== 'referral' && !r.referral_id)} loading={isLoading} />;
}

const REFERRAL_EMPTY_FORM = { customer_name: '', customer_phone: '', notes: '', expected_amount: '' };
const REFERRAL_STATUS_LABEL = { pending: 'Pending', confirmed: 'Completed', cancelled: 'Cancelled' };
const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * A Referral Partner reports a referred customer — name, phone, what they need and an optional
 * expected amount. The reference number is generated automatically. Lizy records the actual
 * sale; its final amount, the commission and its payment status appear here once completed.
 */
function PortalReferralsSection({ rows, loading }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(REFERRAL_EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openForm = (row = null) => {
    setEditingId(row?.id ?? null);
    setForm(row
      ? { customer_name: row.customer_name ?? '', customer_phone: row.customer_phone ?? '', notes: row.notes ?? '', expected_amount: row.expected_amount ?? '' }
      : REFERRAL_EMPTY_FORM);
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes || null,
      expected_amount: form.expected_amount === '' ? null : form.expected_amount,
    };
    try {
      if (editingId) await api.put(`/me/sales/${editingId}`, payload);
      else await api.post('/sales', { ...payload, sale_type: 'referral' });
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'record'} referral`);
      return;
    }
    setOpen(false);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this referral?')) return;
    try {
      await api.delete(`/me/sales/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete this referral');
    }
  };

  // The actual Sale Lizy recorded and linked to this referral (older referrals were completed
  // with their own amount/commission instead). Nothing shows until that has happened.
  const saleOf = (row) => row.linked_sale ?? (row.status === 'confirmed' && Number(row.sale_amount) ? row : null);
  const commissionOf = (row) => (row.linked_sale?.commission
    ? { ...row.linked_sale.commission, sale: row.linked_sale }
    : row.commission ?? null);
  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v) => v || '—' },
    { field: 'customer_name', headerName: 'Customer', flex: 1, minWidth: 130, valueGetter: (v) => v || '—' },
    { field: 'customer_phone', headerName: 'Phone', width: 130, valueGetter: (v) => v || '—' },
    { field: 'expected_amount', headerName: 'Expected Amount', width: 140, valueGetter: (v) => (v != null ? money(v) : '—') },
    { field: 'sale_date', headerName: 'Referred On', width: 115 },
    {
      field: 'status', headerName: 'Referral Status', width: 140,
      renderCell: (p) => <StatusChip status={p.row.status} label={REFERRAL_STATUS_LABEL[p.row.status]} />,
    },
    // Filled in once Lizy records the actual sale for this referral.
    {
      field: 'sale_amount', headerName: 'Final Sale Amount', width: 150, sortable: false,
      valueGetter: (v, row) => (saleOf(row) ? money(saleOf(row).sale_amount) : '—'),
    },
    {
      field: 'commission', headerName: 'Commission', width: 130, sortable: false,
      valueGetter: (v, row) => (commissionOf(row) ? money(commissionOf(row).commission_amount) : '—'),
    },
    {
      field: 'commission_status', headerName: 'Payment Status', width: 210, sortable: false,
      renderCell: (p) => {
        const c = commissionOf(p.row);
        if (!c) return <Typography variant="body2" color="text.secondary">—</Typography>;
        const s = partnerCommissionStatus(c);
        return <Chip size="small" label={s.label} color={s.color} variant={s.color === 'default' ? 'outlined' : 'filled'} />;
      },
    },
    {
      field: '_actions', headerName: 'Actions', width: 150, sortable: false,
      renderCell: (p) => (isEditableByPartner(p.row) ? (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => openForm(p.row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => remove(p.row.id)}>Delete</Button>
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">Locked</Typography>),
    },
  ];

  return (
    <Box>
      {actionError && <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">My Referrals</Typography>
          <Typography variant="body2" color="text.secondary">
            Refer a customer to Lizy. Once Lizy completes their order, the final sale amount and your commission appear here.
            You can edit or delete a referral while it's still pending.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={() => openForm()}>Record Referral</Button>}
      </Box>
      <Paper sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Referral' : 'Record Referral'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required fullWidth />
              <TextField
                label="Phone Number" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                required slotProps={{ htmlInput: { maxLength: 20 } }} fullWidth
              />
              <TextField
                label="Requirement / Notes (optional)" placeholder="What the customer is looking for"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} fullWidth
              />
              <TextField
                type="number" label="Expected Amount (optional)" value={form.expected_amount}
                onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
                helperText="Your estimate only — the final amount is set by Lizy when the sale is completed"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
              />
              {!editingId && (
                <Typography variant="caption" color="text.secondary">A reference number is generated automatically.</Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingId ? 'Save' : 'Record Referral'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

/** Affiliate / Sales partners: log a product/service they sold (unchanged). */
function PortalProductSalesSection({ rows, loading }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: products } = useList('products', { status: 'active' });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const selectedProduct = (products ?? []).find((p) => String(p.id) === String(form.product_id));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      product_id: row.product_id ? String(row.product_id) : '',
      product_name: row.product_name,
      unit_price: row.unit_price,
      quantity: row.quantity,
      sale_date: row.sale_date,
      reference_number: row.reference_number ?? '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const usingProduct = form.product_id && form.product_id !== CUSTOM_OPTION;
    const productFields = usingProduct
      ? { product_id: form.product_id, unit_price: form.unit_price === '' ? null : form.unit_price, quantity: form.quantity }
      : { product_id: null, product_name: form.product_name, unit_price: form.unit_price, quantity: form.quantity };
    const payload = { sale_date: form.sale_date, reference_number: form.reference_number, ...productFields };

    try {
      if (editingId) {
        await api.put(`/me/sales/${editingId}`, payload);
      } else {
        await api.post('/sales', payload);
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

  const remove = async (id) => {
    if (!window.confirm('Delete this sale/referral?')) return;
    try {
      await api.delete(`/me/sales/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete this sale/referral');
    }
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'product_name', headerName: 'Product / Service', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    { field: 'sale_amount', headerName: 'Sale Amount', width: 130, valueGetter: (v, row) => `₹${Number(row.sale_amount).toLocaleString('en-IN')}` },
    { field: 'sale_date', headerName: 'Date', width: 120 },
    { field: 'status', headerName: 'Sale Status', width: 150, renderCell: (params) => <StatusChip status={params.row.status} /> },
    { field: 'commission_percent', headerName: 'Comm. %', width: 90, sortable: false, valueGetter: (v, row) => (row.commission && Number(row.commission.base_amount) ? `${+(row.commission.commission_amount / row.commission.base_amount * 100).toFixed(2)}%` : '—') },
    {
      field: 'commission',
      headerName: 'Commission',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const c = params.row.commission;
        if (!c) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2">₹{Number(c.commission_amount).toLocaleString('en-IN')}</Typography>
            <StatusChip status={c.status} />
          </Stack>
        );
      },
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        if (!isEditableByPartner(params.row)) {
          return <Typography variant="body2" color="text.secondary">Locked</Typography>;
        }
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" onClick={() => openEdit(params.row)}>Edit</Button>
            <Button size="small" color="error" onClick={() => remove(params.row.id)}>Delete</Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      {actionError && <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>{actionError}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">My Sales</Typography>
          <Typography variant="body2" color="text.secondary">
            Log a product/service you sold to earn commission on it. You can edit or delete an entry
            while it's still pending review.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={openCreate}>Record Sale</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Sale' : 'Record Sale'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select label="Product / Service" value={form.product_id}
                onChange={(e) => {
                  // Pre-fill the product's price; it stays editable below.
                  const prod = (products ?? []).find((p) => String(p.id) === String(e.target.value));
                  setForm({ ...form, product_id: e.target.value, unit_price: prod ? prod.amount : form.unit_price });
                }} fullWidth
                helperText="Pick from the catalog to use its standard amount and fixed commission %, or choose Custom"
              >
                <MenuItem value={CUSTOM_OPTION}>Custom / Other</MenuItem>
                {(products ?? []).map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {productLabel(p)} — ₹{Number(p.amount).toLocaleString('en-IN')} ({Number(p.commission_percent)}% commission)
                  </MenuItem>
                ))}
              </TextField>

              {!selectedProduct && (
                <TextField
                  label="Product / Service Name" placeholder="e.g. Organic Almonds 500g" value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })} required fullWidth
                />
              )}
              <TextField
                type="number" label="Unit Price" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                required={!selectedProduct} helperText={selectedProduct ? 'From the product — change it if you sold at a different price' : ''}
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
              />

              <TextField type="number" label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required fullWidth />
              {selectedProduct && (() => {
                const saleAmount = Math.round(Number(form.unit_price !== '' ? form.unit_price : selectedProduct.amount) * Number(form.quantity || 0) * 100) / 100;
                const rate = Number(selectedProduct.commission_percent);
                return (
                  <Alert severity="info">
                    Sale Amount: ₹{saleAmount.toLocaleString('en-IN')} · Commission ({rate}%): ₹{(Math.round(saleAmount * rate) / 100).toLocaleString('en-IN')}
                  </Alert>
                );
              })()}
              <TextField type="date" label="Sale Date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Reference Number" placeholder="Order/referral # (optional)" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
