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
import { SupplyAmountFields, supplyTotal } from '../components/supplies/SupplyAmountFields';

const EMPTY_FORM = {
  partner_id: '', supplier_product_id: '', product_name: '', product_details: '',
  quantity: 1, unit_price: '', amount: '', supply_date: '', invoice_number: '', notes: '',
};
const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const EMPTY_PAYMENT_FORM = { amount: '', payment_date: '', payment_method: '', reference_number: '', notes: '' };

export function SuppliesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [paymentDialog, setPaymentDialog] = useState(null); // the supply row, or null
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR.supplier });
  // Only the chosen supplier's own products (+ the general catalog) — never another supplier's.
  const { data: supplierProducts } = useList(
    'supplier-products',
    { status: 'active', partner_id: form.partner_id },
    { enabled: open && !!form.partner_id },
  );
  const { data, isLoading } = useList('supplies', { per_page: 100 });
  const { data: supplyPayments } = useList('supplier-payments', { supply_id: paymentDialog?.id, per_page: 50 }, { enabled: !!paymentDialog });

  const selectedProduct = (supplierProducts ?? []).find((p) => String(p.id) === String(form.supplier_product_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
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
      supplier_product_id: row.supplier_product_id ? String(row.supplier_product_id) : '',
      product_name: row.product_name,
      product_details: row.product_details ?? '',
      quantity: row.quantity,
      unit_price: row.unit_price ?? '',
      amount: row.amount,
      supply_date: row.supply_date,
      invoice_number: row.invoice_number ?? '',
      notes: row.notes ?? '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const usingProduct = form.supplier_product_id && form.supplier_product_id !== CUSTOM_OPTION;
    const payload = {
      supplier_product_id: usingProduct ? form.supplier_product_id : null,
      product_name: usingProduct ? undefined : form.product_name,
      product_details: form.product_details,
      quantity: form.quantity,
      unit_price: form.unit_price || null,
      amount: supplyTotal(form),
      supply_date: form.supply_date,
      invoice_number: form.invoice_number,
      notes: form.notes,
    };
    try {
      if (editingId) {
        await api.put(`/supplies/${editingId}`, payload);
      } else {
        await api.post('/supplies', { ...payload, partner_id: form.partner_id });
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'log'} supply`);
      return;
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this supply record? Its payment history goes with it.')) return;
    try {
      await api.delete(`/supplies/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete supply');
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
      await api.post('/supplier-payments', { ...paymentForm, supply_id: paymentDialog.id });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record payment');
      return;
    }
    setPaymentDialog(null);
    setPaymentForm(EMPTY_PAYMENT_FORM);
    invalidate();
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'partner', headerName: 'Supplier', flex: 1, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'product_name', headerName: 'Product / Details', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 70 },
    { field: 'supply_date', headerName: 'Supply Date', width: 120 },
    { field: 'invoice_number', headerName: 'Invoice #', width: 140, valueGetter: (v, row) => row.invoice_number || '—' },
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
      field: '_actions',
      headerName: 'Actions',
      width: 260,
      sortable: false,
      renderCell: (params) => {
        const buttons = [];
        if (can('supplies.edit')) {
          buttons.push(<Button key="e" size="small" onClick={() => openEdit(params.row)}>Edit</Button>);
        }
        if (can('supplies.create') && params.row.balance_amount > 0) {
          buttons.push(<Button key="p" size="small" color="success" onClick={() => openPayment(params.row)}>Add Payment</Button>);
        }
        if (can('supplies.delete')) {
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
          <Typography variant="h5">Supplies</Typography>
          <Typography variant="body2" color="text.secondary">The Supplier → Our Company flow: what's been received, and what we owe for it.</Typography>
        </Box>
        {can('supplies.create') && <Button variant="contained" onClick={openCreate}>Log Supply</Button>}
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
          <DialogTitle>{editingId ? 'Edit Supply' : 'Log Supply'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {!editingId && (
                <TextField
                  select label="Supplier" value={form.partner_id} required fullWidth
                  // A product (and its price) chosen for the previous supplier may not belong to this one.
                  onChange={(e) => setForm({ ...form, partner_id: e.target.value, supplier_product_id: '', unit_price: '' })}
                >
                  {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}
              <TextField
                select label="Product / Material" value={form.supplier_product_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const prod = (supplierProducts ?? []).find((p) => String(p.id) === String(val));
                  setForm({
                    ...form, supplier_product_id: val,
                    unit_price: prod ? (prod.standard_price ?? '') : '',
                  });
                }}
                disabled={!form.partner_id}
                helperText={form.partner_id ? '' : 'Select a supplier first to see their products'}
                fullWidth
              >
                <MenuItem value={CUSTOM_OPTION}>Custom / Other</MenuItem>
                {(supplierProducts ?? []).map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                ))}
              </TextField>
              {!selectedProduct && (
                <TextField label="Product Name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required fullWidth />
              )}
              <TextField label="Product Details" value={form.product_details} onChange={(e) => setForm({ ...form, product_details: e.target.value })} multiline minRows={2} fullWidth />
              <SupplyAmountFields form={form} setForm={setForm} selectedProduct={selectedProduct} />
              <TextField type="date" label="Supply / Received Date" value={form.supply_date} onChange={(e) => setForm({ ...form, supply_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Supplier Invoice / Reference Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} fullWidth />
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
              {supplyPayments?.data?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Payment History</Typography>
                  <List dense>
                    {supplyPayments.data.map((p) => (
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
