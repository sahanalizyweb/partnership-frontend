import { useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Chip,
} from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { StatusChip } from '../../components/crud/ResourceListPage';

const EMPTY_FORM = { name: '', details: '', standard_price: '', status: 'active' };

/**
 * The catalog of products/materials this Supplier Partner supplies to us. A supplier can add
 * their own entries here (and edit/delete them) the same way an Affiliate/Sales/Referral
 * partner self-records their own Sales. Only products linked to this supplier are listed —
 * never another supplier's.
 */
export function PortalSupplierProductsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useList('supplier-products', {});
  // Same queryKey PortalLayout uses for the same endpoint, so the request/cache is shared.
  const { data: partner } = useQuery({
    queryKey: ['me-partner'],
    queryFn: async () => (await api.get('/me/partner')).data,
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['supplier-products'] });

  const isMine = (row) => String(row.partner_id) === String(partner?.id);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name, details: row.details ?? '', standard_price: row.standard_price ?? '', status: row.status });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/supplier-products/${editingId}`, form);
      } else {
        await api.post('/supplier-products', form);
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'add'} product`);
      return;
    }
    setOpen(false);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product/material entry?')) return;
    await api.delete(`/supplier-products/${id}`);
    invalidate();
  };

  // The supplier's category (Manufacturer / Distributor / …) — from their Supplier role, else their profile.
  const rows = Array.isArray(data) ? data : [];
  const category = rows.find((r) => r.supplier_category)?.supplier_category ?? partner?.partner_category?.name ?? null;

  const columns = [
    { field: 'name', headerName: 'Product / Material', flex: 1 },
    { field: 'supplier_category', headerName: 'Category', width: 140, valueGetter: (v) => v || category || '—' },
    { field: 'details', headerName: 'Details', flex: 1.5, valueGetter: (v, row) => row.details || '—' },
    { field: 'standard_price', headerName: 'Standard Price', width: 150, valueGetter: (v, row) => (row.standard_price ? `₹${Number(row.standard_price).toLocaleString('en-IN')}` : '—') },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => <StatusChip status={params.row.status} /> },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      renderCell: (params) => {
        if (!isMine(params.row)) {
          return <Typography variant="body2" color="text.secondary">Added by Admin</Typography>;
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h5">Products / Supplies</Typography>
            {category && <Chip size="small" label={`Your category: ${category}`} color="primary" variant="outlined" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            The products/materials you supply to us.
          </Typography>
        </Box>
        {can('supplies.create') && <Button variant="contained" onClick={openCreate}>Add Product</Button>}
      </Box>
      <Paper sx={{ height: 560 }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editingId ? 'Edit Product / Material' : 'Add Product / Material'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Product / Material Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
              <TextField label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} multiline minRows={2} fullWidth />
              <TextField type="number" label="Standard Price (optional)" value={form.standard_price} onChange={(e) => setForm({ ...form, standard_price: e.target.value })} fullWidth />
              <TextField select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
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
