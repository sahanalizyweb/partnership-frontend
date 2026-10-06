import { useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert,
} from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { productLabel } from '../../config/products';

const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const EMPTY_FORM = { product_id: '', product_name: '', quantity: 1, unit_price: '', purchase_date: '', notes: '' };

// A reseller can only edit/delete their own purchase while nothing has been paid against it
// yet — once Admin records a payment, it's locked (enforced server-side regardless of this).
const isEditableByPartner = (row) => row.payment_status === 'unpaid' && Number(row.amount_paid) <= 0;

/** History of everything this reseller has bought from us — self-reportable, like Supply History. */
export function PortalResellerPurchasesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useList('reseller-purchases', { per_page: 100 });
  const { data: products } = useList('products', { status: 'active' });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const selectedProduct = (products ?? []).find((p) => String(p.id) === String(form.product_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reseller-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      product_id: row.product_id ? String(row.product_id) : '',
      product_name: row.product_name,
      quantity: row.quantity,
      unit_price: row.unit_price ?? '',
      purchase_date: row.purchase_date,
      notes: row.notes ?? '',
    });
    setError('');
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
      notes: form.notes,
    };
    try {
      if (editingId) {
        await api.put(`/me/reseller-purchases/${editingId}`, payload);
      } else {
        await api.post('/reseller-purchases', payload);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'log'} purchase`);
      return;
    }
    setOpen(false);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this purchase record?')) return;
    try {
      await api.delete(`/me/reseller-purchases/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete this purchase');
    }
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v, row) => row.reference_number || '—' },
    { field: 'product_name', headerName: 'Product / Service', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'purchase_date', headerName: 'Purchase Date', width: 130 },
    { field: 'amount', headerName: 'Amount', width: 130, valueGetter: (v, row) => `₹${Number(row.amount).toLocaleString('en-IN')}` },
    { field: 'amount_paid', headerName: 'Amount Paid', width: 130, valueGetter: (v, row) => `₹${Number(row.amount_paid).toLocaleString('en-IN')}` },
    { field: 'balance_amount', headerName: 'Balance', width: 130, valueGetter: (v, row) => `₹${Number(row.balance_amount).toLocaleString('en-IN')}` },
    {
      field: 'payment_status',
      headerName: 'Payment Status',
      width: 160,
      renderCell: (params) => <StatusChip status={params.row.payment_status} label={PAYMENT_STATUS_LABEL[params.row.payment_status]} />,
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
            {can('resellers.edit') && <Button size="small" onClick={() => openEdit(params.row)}>Edit</Button>}
            {can('resellers.delete') && <Button size="small" color="error" onClick={() => remove(params.row.id)}>Delete</Button>}
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
          <Typography variant="h5">My Purchases</Typography>
          <Typography variant="body2" color="text.secondary">
            Everything you've bought from us. You can edit or delete an entry until Admin records a payment against it.
          </Typography>
        </Box>
        {can('resellers.create') && <Button variant="contained" onClick={openCreate}>Log Purchase</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Purchase' : 'Log Purchase'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
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
              <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} fullWidth />
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
