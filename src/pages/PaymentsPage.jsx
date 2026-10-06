import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar } from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';

// Commission payouts/collections are recorded from Finance → Commissions & Payouts (linked to
// the commission). This dialog is only for other money moving between us and a partner.
const PAYMENT_TYPES = [
  { value: 'advance', label: 'Advance (paid before work is done)' },
  { value: 'refund', label: 'Refund' },
  { value: 'adjustment', label: 'Adjustment / correction' },
];
const DIRECTION_LABELS = {
  to_partner: 'Paid to partner',
  from_partner: 'Received from partner',
};
const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`;

// `assignmentType` narrows to payments for that kind of work (Service / Delivery Payments menus).
export function PaymentsPage({ assignmentType = '', title = 'Payments' }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR[assignmentType] ?? '' });
  const { data, isLoading } = useList('payments', { status, assignment_type: assignmentType, per_page: 100 });

  const EMPTY_FORM = { partner_id: '', assignment_id: '', payment_type: 'advance', direction: 'to_partner', amount: '', payment_date: '', payment_method: '', reference_number: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const { data: partnerAssignments } = useList('assignments', { partner_id: form.partner_id, assignment_type: assignmentType, per_page: 100 });
  const assignmentOptions = (partnerAssignments?.data ?? []).filter((a) => String(a.partner_id) === String(form.partner_id));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payments'] });

  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payments', { ...form, assignment_id: form.assignment_id || null });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record payment');
      return;
    }
    setOpen(false);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const [actionError, setActionError] = useState('');

  const complete = async (id) => {
    try {
      await api.post(`/payments/${id}/complete`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not complete payment');
    }
  };
  const cancel = async (id) => {
    try {
      await api.post(`/payments/${id}/cancel`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not cancel payment');
    }
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v) => v || '—' },
    { field: 'partner', headerName: 'Partner', flex: 1, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'assignment', headerName: 'Assignment', flex: 1, valueGetter: (v, row) => row.assignment?.title ?? '—' },
    { field: 'payment_type', headerName: 'Type', width: 120, valueGetter: (v) => (v ? v[0].toUpperCase() + v.slice(1) : '') },
    { field: 'direction', headerName: 'Direction', width: 170, valueGetter: (v) => DIRECTION_LABELS[v] ?? v },
    { field: 'amount', headerName: 'Amount', width: 120, valueGetter: (v) => money(v) },
    { field: 'payment_date', headerName: 'Date', width: 120 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: '_actions', headerName: 'Actions', width: 200, sortable: false,
      renderCell: (params) => params.row.status === 'pending' ? (
        <Stack direction="row" spacing={1}>
          {can('payments.approve') && <Button size="small" onClick={() => complete(params.row.id)}>Complete</Button>}
          {can('payments.edit') && <Button size="small" color="error" onClick={() => cancel(params.row.id)}>Cancel</Button>}
        </Stack>
      ) : null,
    },
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        {can('payments.create') && <Button variant="contained" onClick={() => setOpen(true)}>Record Other Payment</Button>}
      </Box>
      <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 220, mb: 2 }}>
        {['', 'pending', 'completed', 'failed', 'cancelled'].map((s) => <MenuItem key={s} value={s}>{s || 'All'}</MenuItem>)}
      </TextField>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[20, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 20 } } }} />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>Record Other Payment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Alert severity="info">
                To pay or collect a <b>commission</b>, use <RouterLink to="/app/commissions">Finance → Commissions &amp; Payouts</RouterLink> —
                it links the payment to the commission automatically. Use this form only for advances, refunds or corrections.
                The payment is saved as completed and updates the partner&apos;s balance.
              </Alert>
              <TextField
                select label="Partner" value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value, assignment_id: '' })}
                required fullWidth
              >
                {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              <TextField
                select label="Assignment" value={form.assignment_id}
                onChange={(e) => {
                  // Default the direction from the job's payment flow: if the customer paid the
                  // partner, the partner owes us commission; if the customer paid us, we pay the partner.
                  const job = assignmentOptions.find((a) => a.id === e.target.value);
                  const direction = job?.payment_direction === 'customer_pays_partner' ? 'from_partner'
                    : job?.payment_direction === 'customer_pays_lizyweb' ? 'to_partner' : form.direction;
                  setForm({ ...form, assignment_id: e.target.value, direction });
                }}
                disabled={!form.partner_id} helperText={!form.partner_id ? 'Select a partner first' : 'Optional — link this payment to a specific assignment'}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {assignmentOptions.map((a) => <MenuItem key={a.id} value={a.id}>{[a.reference_number, a.title].filter(Boolean).join(' — ')}</MenuItem>)}
              </TextField>
              <TextField select label="Payment Type" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} fullWidth>
                {PAYMENT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField select label="Direction" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} fullWidth>
                <MenuItem value="to_partner">We pay the partner (payout)</MenuItem>
                <MenuItem value="from_partner">Partner pays us (our commission)</MenuItem>
              </TextField>
              <TextField type="number" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required fullWidth />
              <TextField type="date" label="Payment Date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} fullWidth />
              <TextField label="Reference Number" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} helperText="Leave blank to auto-generate" fullWidth />
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
