import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Snackbar, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';
import { productLabel } from '../config/products';

const EMPTY_FORM = {
  partner_id: '', product_id: '', product_name: '', quantity: 1, unit_price: '',
  purchase_date: '', resale_customer_name: '', resale_amount: '', resale_date: '', notes: '',
};
const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const EMPTY_PAYMENT_FORM = { amount: '', payment_date: '', payment_method: '', reference_number: '', notes: '' };

/** Lizyweb -> Reseller -> Customer: what a reseller bought from our catalog to resell. Mirrors SuppliesPage. */
export function ResellerPurchasesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [paymentDialog, setPaymentDialog] = useState(null); // the purchase row, or null
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR.reseller });
  const { data: products } = useList('products', { status: 'active' });
  const { data, isLoading } = useList('reseller-purchases', { per_page: 100 });
  const { data: purchasePayments } = useList('reseller-payments', { reseller_purchase_id: paymentDialog?.id, per_page: 50 }, { enabled: !!paymentDialog });

  const selectedProduct = (products ?? []).find((p) => String(p.id) === String(form.product_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reseller-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['reseller-payments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      partner_id: row.partner_id,
      product_id: row.product_id ? String(row.product_id) : '',
      product_name: row.product_name,
      quantity: row.quantity,
      unit_price: row.unit_price ?? '',
      purchase_date: row.purchase_date,
      resale_customer_name: row.resale_customer_name ?? '',
      resale_amount: row.resale_amount ?? '',
      resale_date: row.resale_date ?? '',
      notes: row.notes ?? '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const usingProduct = form.product_id && form.product_id !== CUSTOM_OPTION;
    const payload = {
      product_id: usingProduct ? form.product_id : null,
      product_name: usingProduct ? undefined : form.product_name,
      quantity: form.quantity,
      unit_price: form.unit_price,
      purchase_date: form.purchase_date,
      resale_customer_name: form.resale_customer_name || null,
      resale_amount: form.resale_amount || null,
      resale_date: form.resale_date || null,
      notes: form.notes,
    };
    try {
      if (editingId) {
        await api.put(`/reseller-purchases/${editingId}`, payload);
      } else {
        await api.post('/reseller-purchases', { ...payload, partner_id: form.partner_id });
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'log'} purchase`);
      return;
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this purchase record? Its payment history goes with it.')) return;
    try {
      await api.delete(`/reseller-purchases/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete purchase');
    }
  };

  const openPayment = (row) => {
    setPaymentDialog(row);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: row.balance_amount });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/reseller-payments', { ...paymentForm, reseller_purchase_id: paymentDialog.id });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record payment');
      return;
    }
    setPaymentDialog(null);
    setPaymentForm(EMPTY_PAYMENT_FORM);
    invalidate();
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v, row) => row.reference_number || '—' },
    { field: 'partner', headerName: 'Reseller', flex: 1, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'product_name', headerName: 'Product / Service', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    { field: 'purchase_date', headerName: 'Purchase Date', width: 120 },
    { field: 'amount', headerName: 'Amount', width: 120, valueGetter: (v, row) => `₹${Number(row.amount).toLocaleString('en-IN')}` },
    { field: 'amount_paid', headerName: 'Paid', width: 120, valueGetter: (v, row) => `₹${Number(row.amount_paid).toLocaleString('en-IN')}` },
    { field: 'balance_amount', headerName: 'Balance', width: 120, valueGetter: (v, row) => `₹${Number(row.balance_amount).toLocaleString('en-IN')}` },
    {
      field: 'payment_status',
      headerName: 'Payment Status',
      width: 150,
      renderCell: (params) => <StatusChip status={params.row.payment_status} label={PAYMENT_STATUS_LABEL[params.row.payment_status]} />,
    },
    {
      field: 'resale_status',
      headerName: 'Resold?',
      width: 110,
      renderCell: (params) => <StatusChip status={params.row.resale_status} label={params.row.resale_status === 'resold' ? 'Resold' : 'Not Resold'} />,
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 260,
      sortable: false,
      renderCell: (params) => {
        const buttons = [];
        if (can('resellers.edit')) {
          buttons.push(<Button key="e" size="small" onClick={() => openEdit(params.row)}>Edit</Button>);
        }
        if (can('resellers.create') && params.row.balance_amount > 0) {
          buttons.push(<Button key="p" size="small" color="success" onClick={() => openPayment(params.row)}>Add Payment</Button>);
        }
        if (can('resellers.delete')) {
          buttons.push(<Button key="d" size="small" color="error" onClick={() => remove(params.row.id)}>Delete</Button>);
        }
        return buttons.length ? <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>{buttons}</Stack> : null;
      },
    },
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5">Reseller Purchases</Typography>
          <Typography variant="body2" color="text.secondary">The Lizyweb → Reseller flow: what's been bought from our catalog, and what the reseller still owes us for it.</Typography>
        </Box>
        {can('resellers.create') && <Button variant="contained" onClick={openCreate}>Log Purchase</Button>}
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
          <DialogTitle>{editingId ? 'Edit Purchase' : 'Log Purchase'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {!editingId && (
                <TextField select label="Reseller" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} required fullWidth>
                  {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}
              <TextField
                select label="Product / Service" value={form.product_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const prod = (products ?? []).find((p) => String(p.id) === String(val));
                  setForm({ ...form, product_id: val, unit_price: prod?.amount ?? form.unit_price });
                }}
                fullWidth
              >
                <MenuItem value={CUSTOM_OPTION}>Custom / Other</MenuItem>
                {(products ?? []).map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>{productLabel(p)}</MenuItem>
                ))}
              </TextField>
              {!selectedProduct && (
                <TextField label="Product Name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required fullWidth />
              )}
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required fullWidth />
                <TextField type="number" label="Unit Price" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required fullWidth />
              </Stack>
              <TextField type="date" label="Purchase Date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <Divider textAlign="left">Resale Tracking (optional)</Divider>
              <TextField label="Resold To (Customer)" value={form.resale_customer_name} onChange={(e) => setForm({ ...form, resale_customer_name: e.target.value })} fullWidth />
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Resale Amount" value={form.resale_amount} onChange={(e) => setForm({ ...form, resale_amount: e.target.value })} fullWidth />
                <TextField type="date" label="Resale Date" value={form.resale_date} onChange={(e) => setForm({ ...form, resale_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Stack>
              <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!paymentDialog} onClose={() => setPaymentDialog(null)} maxWidth="sm" fullWidth>
        <form onSubmit={submitPayment}>
          <DialogTitle>Add Payment — {paymentDialog?.product_name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Alert severity="info">
                Amount: ₹{Number(paymentDialog?.amount ?? 0).toLocaleString('en-IN')} · Paid: ₹{Number(paymentDialog?.amount_paid ?? 0).toLocaleString('en-IN')} · Balance: ₹{Number(paymentDialog?.balance_amount ?? 0).toLocaleString('en-IN')}
              </Alert>
              <TextField type="number" label="Payment Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required fullWidth />
              <TextField type="date" label="Payment Date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Payment Method" placeholder="e.g. Bank Transfer, UPI, Cheque" value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} fullWidth />
              <TextField label="Reference Number" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} helperText="Leave blank to auto-generate" fullWidth />
              <TextField label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} multiline minRows={2} fullWidth />
              {purchasePayments?.data?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Payment History</Typography>
                  <List dense>
                    {purchasePayments.data.map((p) => (
                      <ListItem key={p.id} disableGutters>
                        <ListItemText
                          primary={`₹${Number(p.amount).toLocaleString('en-IN')} — ${p.payment_date}`}
                          secondary={[p.payment_method, p.reference_number].filter(Boolean).join(' · ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialog(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Payment</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
