import { useState } from 'react';
import { Box, Typography, Paper, TableHead, TableBody, TableRow, Stack, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';

const EMPTY_METRIC = {
  period: '', leads_received: '', leads_contacted: '', conversions: '', sales_value: '',
  assignments_completed: '', response_time_avg: '', completion_rate: '', avg_rating: '',
  complaints_count: '', commission_generated: '',
};

export function PartnerPerformanceTab({ partnerId }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { data: metrics, isLoading } = useList('performance', { partner_id: partnerId });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_METRIC);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const openAdd = (existing) => {
    setForm(existing ? { ...EMPTY_METRIC, ...existing } : EMPTY_METRIC);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/performance', { ...form, partner_id: partnerId });
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['performance'] });
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Performance History</Typography>
        {can('performance.edit') && <Button variant="outlined" onClick={() => openAdd(null)}>Add / Update Period</Button>}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell align="right">Leads</TableCell>
              <TableCell align="right">Conversions</TableCell>
              <TableCell align="right">Conv. Rate %</TableCell>
              <TableCell align="right">Completion %</TableCell>
              <TableCell align="right">Rating</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell align="right">Rank</TableCell>
              {can('performance.edit') && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {(metrics ?? []).map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>{m.period}</TableCell>
                <TableCell align="right">{m.leads_received}</TableCell>
                <TableCell align="right">{m.conversions}</TableCell>
                <TableCell align="right">{m.conversion_rate}</TableCell>
                <TableCell align="right">{m.completion_rate}</TableCell>
                <TableCell align="right">{m.avg_rating ?? '—'}</TableCell>
                <TableCell align="right">₹{Number(m.commission_generated).toLocaleString('en-IN')}</TableCell>
                <TableCell align="right">{m.rank ?? '—'}</TableCell>
                {can('performance.edit') && (
                  <TableCell align="right">
                    <Button size="small" onClick={() => openAdd(m)}>Edit</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(metrics ?? []).length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={9}><Typography color="text.secondary">No performance data recorded yet.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>Add / Update Performance Metric</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Period (YYYY-MM)" placeholder="2026-08" value={form.period} onChange={(e) => set('period', e.target.value)} required fullWidth />
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Leads Received" value={form.leads_received} onChange={(e) => set('leads_received', e.target.value)} fullWidth />
                <TextField type="number" label="Leads Contacted" value={form.leads_contacted} onChange={(e) => set('leads_contacted', e.target.value)} fullWidth />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Conversions" value={form.conversions} onChange={(e) => set('conversions', e.target.value)} fullWidth />
                <TextField type="number" label="Sales Value" value={form.sales_value} onChange={(e) => set('sales_value', e.target.value)} fullWidth />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Assignments Completed" value={form.assignments_completed} onChange={(e) => set('assignments_completed', e.target.value)} fullWidth />
                <TextField type="number" label="Completion Rate %" value={form.completion_rate} onChange={(e) => set('completion_rate', e.target.value)} fullWidth />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Avg Rating (0-5)" value={form.avg_rating} onChange={(e) => set('avg_rating', e.target.value)} fullWidth />
                <TextField type="number" label="Complaints" value={form.complaints_count} onChange={(e) => set('complaints_count', e.target.value)} fullWidth />
              </Stack>
              <TextField type="number" label="Commission Generated" value={form.commission_generated} onChange={(e) => set('commission_generated', e.target.value)} fullWidth />
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
