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
import { SupplyAmountFields, supplyTotal } from '../../components/supplies/SupplyAmountFields';

const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const EMPTY_FORM = {
  supplier_product_id: '', product_name: '', product_details: '', quantity: 1,
  unit_price: '', amount: '', supply_date: '', invoice_number: '', notes: '',
};

// A supplier can only edit/delete their own supply while nothing has been paid against it yet
// — once Admin records a payment, it's locked (enforced server-side regardless of this check).
const isEditableByPartner = (row) => row.payment_status === 'unpaid' && Number(row.amount_paid) <= 0;

/** History of everything logged as received from this supplier — self-reportable, like Sales. */
export function PortalSupplyHistoryPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useList('supplies', { per_page: 100 });
  const { data: supplierProducts } = useList('supplier-products', { status: 'active' });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const selectedProduct = (supplierProducts ?? []).find((p) => String(p.id) === String(form.supplier_product_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
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
    setError('');
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
        await api.put(`/me/supplies/${editingId}`, payload);
      } else {
        await api.post('/supplies', payload);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'log'} supply`);
      return;
    }
    setOpen(false);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this supply record?')) return;
    try {
      await api.delete(`/me/supplies/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete this supply');
    }
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'product_name', headerName: 'Product / Details', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'supply_date', headerName: 'Supply Date', width: 130 },
    { field: 'invoice_number', headerName: 'Invoice / Reference #', width: 180, valueGetter: (v, row) => row.invoice_number || '—' },
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
            {can('supplies.edit') && <Button size="small" onClick={() => openEdit(params.row)}>Edit</Button>}
            {can('supplies.delete') && <Button size="small" color="error" onClick={() => remove(params.row.id)}>Delete</Button>}
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
          <Typography variant="h5">Supply History</Typography>
          <Typography variant="body2" color="text.secondary">
            Everything you've supplied to us. You can edit or delete an entry until Admin records a payment against it.
          </Typography>
        </Box>
        {can('supplies.create') && <Button variant="contained" onClick={openCreate}>Add Supply</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Supply' : 'Add Supply'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select label="Product / Material" value={form.supplier_product_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const prod = (supplierProducts ?? []).find((p) => String(p.id) === String(val));
                  setForm({ ...form, supplier_product_id: val, unit_price: prod ? (prod.standard_price ?? '') : '' });
                }}
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
    </Box>
  );
}
