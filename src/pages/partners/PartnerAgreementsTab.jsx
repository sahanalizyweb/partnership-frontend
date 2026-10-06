import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Paper, TableHead, TableBody, TableRow, Typography,
  Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';

export function PartnerAgreementsTab({ partnerId }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ agreement_type: '', start_date: '', end_date: '', payment_terms: '', responsibilities: '' });

  const { data: agreements, isLoading } = useList('agreements', { partner_id: partnerId, per_page: 100 });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['agreements'] });
    queryClient.invalidateQueries({ queryKey: ['partners', 'one', partnerId] });
  };

  const create = async (e) => {
    e.preventDefault();
    await api.post('/agreements', { ...form, partner_id: partnerId });
    setOpen(false);
    setForm({ agreement_type: '', start_date: '', end_date: '', payment_terms: '', responsibilities: '' });
    invalidate();
  };

  const activate = async (id) => {
    await api.post(`/agreements/${id}/activate`);
    invalidate();
  };

  const terminate = async (id) => {
    await api.post(`/agreements/${id}/terminate`);
    invalidate();
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
        {can('agreements.create') && <Button variant="outlined" onClick={() => setOpen(true)}>New Agreement</Button>}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Agreement</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(agreements?.data ?? []).map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.agreement_number}</TableCell>
                <TableCell>{a.agreement_type ?? '—'}</TableCell>
                <TableCell>{a.start_date} to {a.end_date ?? 'open'}</TableCell>
                <TableCell><StatusChip status={a.status} /></TableCell>
                <TableCell align="right">
                  {can('agreements.approve') && a.status === 'draft' && (
                    <Button size="small" onClick={() => activate(a.id)}>Activate</Button>
                  )}
                  {can('agreements.approve') && a.status === 'active' && (
                    <Button size="small" color="error" onClick={() => terminate(a.id)}>Terminate</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(agreements?.data ?? []).length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No agreements yet.</Typography></TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={create}>
          <DialogTitle>New Agreement</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Agreement Type" value={form.agreement_type} onChange={(e) => setForm({ ...form, agreement_type: e.target.value })} fullWidth />
              <TextField type="date" label="Start Date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField type="date" label="End Date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Payment Terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} multiline minRows={2} fullWidth />
              <TextField label="Responsibilities" value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} multiline minRows={2} fullWidth />
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
