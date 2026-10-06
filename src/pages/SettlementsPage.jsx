import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar } from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';

const STATUS_OPTIONS = ['draft', 'pending_approval', 'approved', 'paid', 'rejected'];
// Dashboard's "Pending Settlements" stat spans two statuses (see DashboardController::pending_settlements).
const PENDING_SETTLEMENT_STATUSES = ['draft', 'pending_approval'];

export function SettlementsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const { data: partners } = useList('partners', { per_page: 200 });
  const { data, isLoading } = useList('settlements', {
    status: status === 'pending' ? '' : status,
    per_page: 100,
  });
  const rows = (data?.data ?? []).filter((s) => (status === 'pending' ? PENDING_SETTLEMENT_STATUSES.includes(s.status) : true));

  const [form, setForm] = useState({ partner_id: '', period_start: '', period_end: '' });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['settlements'] });

  const [error, setError] = useState('');

  const run = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/settlements', form);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not run settlement');
      return;
    }
    setOpen(false);
    setForm({ partner_id: '', period_start: '', period_end: '' });
    invalidate();
  };

  const [actionError, setActionError] = useState('');

  const approve = async (id) => {
    try {
      await api.post(`/settlements/${id}/approve`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not approve settlement');
    }
  };

  const columns = [
    { field: 'settlement_number', headerName: 'Number', width: 160 },
    { field: 'partner', headerName: 'Partner', flex: 1, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'period_start', headerName: 'From', width: 120 },
    { field: 'period_end', headerName: 'To', width: 120 },
    { field: 'net_payable', headerName: 'Net Payable', width: 130 },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: '_actions', headerName: 'Actions', width: 150, sortable: false,
      renderCell: (params) => can('settlements.approve') && ['draft', 'pending_approval'].includes(params.row.status) ? (
        <Button size="small" onClick={() => approve(params.row.id)}>Approve</Button>
      ) : null,
    },
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Settlements</Typography>
        {can('settlements.create') && <Button variant="contained" onClick={() => setOpen(true)}>Run Settlement</Button>}
      </Box>
      <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 220, mb: 2 }}>
        <MenuItem value="">All</MenuItem>
        <MenuItem value="pending">Pending</MenuItem>
        {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
      </TextField>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick pageSizeOptions={[20, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 20 } } }} />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={run}>
          <DialogTitle>Run Settlement</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField select label="Partner" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} required fullWidth>
                {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              <TextField type="date" label="Period Start" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField type="date" label="Period End" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Run</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
