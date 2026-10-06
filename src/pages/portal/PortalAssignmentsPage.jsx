import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { api } from '../../api/client';

const TYPE_OPTIONS = ['lead', 'order', 'service', 'task'];
const EMPTY_FORM = { title: '', assignment_type: 'lead', location: '', due_date: '', transaction_amount: '', description: '' };

export function PortalAssignmentsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useList('assignments', { per_page: 100 });
  // Same queryKey PortalLayout uses, so the request is shared. Service and Delivery Partners
  // only receive jobs assigned by admin — they don't create their own.
  const { data: enrollments } = useQuery({
    queryKey: ['me-enrollments'],
    queryFn: async () => (await api.get('/me/enrollments')).data,
  });
  const adminAssignsOnly = (enrollments ?? []).some((e) => ['service', 'delivery'].includes(e.partner_type?.code));
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assignments'] });

  const act = async (id, action) => {
    await api.post(`/assignments/${id}/${action}`);
    invalidate();
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    await api.post('/assignments', form);
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    invalidate();
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'assignment_type', headerName: 'Type', width: 110 },
    { field: 'due_date', headerName: 'Due', width: 120 },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'transaction_amount', headerName: 'Amount', width: 110, valueGetter: (v) => (v ? `₹${Number(v).toLocaleString('en-IN')}` : '—') },
    { field: 'commission_percent', headerName: 'Comm. %', width: 90, valueGetter: (v) => (v !== null && v !== undefined ? `${Number(v)}%` : '—') },
    { field: 'payment_direction', headerName: 'Payment Flow', width: 170, valueGetter: (v) => ({ customer_pays_partner: 'Customer → Partner', customer_pays_lizyweb: 'Customer → Us' }[v] ?? '—') },
    {
      field: '_actions', headerName: 'Actions', width: 220, sortable: false,
      renderCell: (params) => {
        // Self-submitted assignments can only be actioned by admin staff from here on.
        if (params.row.was_submitted_by_partner) return null;
        return (
          <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
            {params.row.status === 'pending' && <Button size="small" onClick={() => act(params.row.id, 'accept')}>Accept</Button>}
            {params.row.status === 'pending' && <Button size="small" color="error" onClick={() => act(params.row.id, 'reject')}>Reject</Button>}
            {params.row.status === 'accepted' && <Button size="small" onClick={() => act(params.row.id, 'start')}>Start</Button>}
            {params.row.status === 'in_progress' && <Button size="small" onClick={() => act(params.row.id, 'complete')}>Complete</Button>}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">My Assignments</Typography>
        {can('assignments.create') && !adminAssignsOnly && <Button variant="contained" onClick={() => setCreateOpen(true)}>New Assignment</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/portal/assignments/${params.row.id}`)}
          sx={{ cursor: 'pointer' }}
        />
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={createAssignment}>
          <DialogTitle>New Assignment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
              <TextField select label="Type" value={form.assignment_type} onChange={(e) => setForm({ ...form, assignment_type: e.target.value })} fullWidth>
                {TYPE_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField
                label="Location" placeholder="e.g. Andheri West, Mumbai" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth
              />
              <TextField type="date" label="Due Date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField type="number" label="Transaction Amount" value={form.transaction_amount} onChange={(e) => setForm({ ...form, transaction_amount: e.target.value })} fullWidth />
              <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
