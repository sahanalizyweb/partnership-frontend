import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Snackbar,
} from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';

const EMPTY_FORM = {
  partner_id: '', customer_name: '', customer_phone: '', expected_amount: '', sale_date: '',
  commission_percent: '', reference_number: '', notes: '',
};
// Referrals reuse the sale status column: 'confirmed' is shown as Completed here.
const REFERRAL_STATUS_LABEL = { pending: 'Pending', confirmed: 'Completed', cancelled: 'Cancelled' };
const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`;

/**
 * Admin Referral Management. A referral is only the referred customer — no sale and no
 * commission of its own. Admin completes it by recording the actual Sale (Sales → Record
 * Sale, selecting this Referral Reference); that sale's amount and commission show here.
 */
export function ReferralsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR.referral });
  const { data, isLoading } = useList('sales', { sale_type: 'referral', per_page: 100 });

  // Older referrals were completed with their own amount/commission; new ones via a linked sale.
  const saleOf = (row) => row.linked_sale ?? (row.status === 'confirmed' && Number(row.sale_amount) ? row : null);
  const commissionOf = (row) => row.linked_sale?.commission ?? row.commission ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
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
      partner_id: row.partner_id,
      customer_name: row.customer_name ?? '',
      customer_phone: row.customer_phone ?? '',
      expected_amount: row.expected_amount ?? '',
      sale_date: row.sale_date,
      commission_percent: row.commission_percent ?? '',
      reference_number: row.reference_number ?? '',
      notes: row.notes ?? '',
    });
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      expected_amount: form.expected_amount === '' ? null : form.expected_amount,
      sale_date: form.sale_date,
      commission_percent: form.commission_percent === '' ? null : form.commission_percent,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    };
    try {
      if (editingId) {
        await api.put(`/sales/${editingId}`, payload);
      } else {
        await api.post('/sales', { ...payload, sale_type: 'referral', partner_id: form.partner_id });
      }
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${editingId ? 'update' : 'record'} referral`);
      return;
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const setStatus = async (id, status) => {
    try {
      await api.put(`/sales/${id}`, { status });
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not update referral status');
    }
  };

  const commissionAction = async (commissionId, action) => {
    try {
      await api.post(`/commissions/${commissionId}/${action}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? `Could not ${action} commission`);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this referral? Its commission record stays for history if already actioned.')) return;
    try {
      await api.delete(`/sales/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete referral');
    }
  };

  // The referral's own % if set; for older rows, derived from the generated commission.
  const commissionPercent = (row) => {
    const c = commissionOf(row);
    if (c && Number(c.base_amount)) return `${+(c.commission_amount / c.base_amount * 100).toFixed(2)}%`;
    return row.commission_percent != null ? `${Number(row.commission_percent)}%` : '—';
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v) => v || '—' },
    { field: 'partner', headerName: 'Partner', flex: 1, minWidth: 130, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'customer_name', headerName: 'Customer Name', flex: 1, minWidth: 130, valueGetter: (v) => v || '—' },
    { field: 'customer_phone', headerName: 'Customer Phone', width: 140, valueGetter: (v) => v || '—' },
    { field: 'expected_amount', headerName: 'Expected', width: 110, valueGetter: (v) => (v != null ? money(v) : '—') },
    {
      field: 'sale_amount', headerName: 'Sale Amount', width: 150, sortable: false,
      renderCell: (p) => {
        const s = saleOf(p.row);
        if (!s) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Stack sx={{ lineHeight: 1.2 }}>
            <Typography variant="body2">{money(s.sale_amount)}</Typography>
            {p.row.linked_sale && <Typography variant="caption" color="text.secondary">{p.row.linked_sale.reference_number}</Typography>}
          </Stack>
        );
      },
    },
    { field: 'sale_date', headerName: 'Date', width: 110 },
    {
      field: 'status', headerName: 'Referral Status', width: 140,
      renderCell: (p) => <StatusChip status={p.row.status} label={REFERRAL_STATUS_LABEL[p.row.status]} />,
    },
    { field: 'commission_percent', headerName: 'Commission %', width: 120, sortable: false, valueGetter: (v, row) => commissionPercent(row) },
    {
      field: 'commission',
      headerName: 'Commission Amount',
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const c = commissionOf(params.row);
        if (!c) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2">{money(c.commission_amount)}</Typography>
            <StatusChip status={c.status} />
          </Stack>
        );
      },
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 380,
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const c = row.commission;
        const buttons = [];
        if (can('commissions.edit')) {
          buttons.push(<Button key="e" size="small" onClick={() => openEdit(row)}>Edit</Button>);
        }
        if (can('commissions.edit') && row.status === 'pending') {
          // Completing a referral = recording its actual Sale (with this Referral Reference selected).
          if (can('commissions.create')) {
            buttons.push(<Button key="s" size="small" color="success" onClick={() => navigate(`/app/sales?referral_id=${row.id}`)}>Record Sale</Button>);
          }
          buttons.push(<Button key="x" size="small" color="error" onClick={() => setStatus(row.id, 'cancelled')}>Cancel</Button>);
        }
        // Only an older referral's own commission is approved here; a linked sale's commission
        // is approved on the Sales page (once the customer has paid).
        if (can('commissions.approve') && c?.status === 'pending') {
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

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5">Referrals</Typography>
          <Typography variant="body2" color="text.secondary">
            Customers referred by partners. Complete a referral with <b>Record Sale</b> — the partner's commission is calculated from that sale's amount.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={openCreate}>Record Referral</Button>}
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
          <DialogTitle>{editingId ? 'Edit Referral' : 'Record Referral'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {!editingId && (
                <TextField select label="Partner" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} required fullWidth>
                  {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required fullWidth />
              <TextField label="Customer Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} slotProps={{ htmlInput: { maxLength: 20 } }} fullWidth />
              <TextField
                type="date" label="Date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                required slotProps={{ inputLabel: { shrink: true } }} fullWidth
              />
              <TextField
                type="number" label="Commission %" value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                helperText="Agreed rate for this referral — pre-fills when its Sale is recorded (blank = the product's standard %)"
                slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }} fullWidth
              />
              <TextField
                type="number" label="Expected Amount (optional)" value={form.expected_amount}
                onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
                helperText="Estimate only — the actual amount is the Sale recorded for this referral"
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
              />
              <TextField label="Reference Number" placeholder="Leave blank to auto-generate" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} fullWidth />
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
