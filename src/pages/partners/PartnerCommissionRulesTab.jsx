import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Paper, TableHead, TableBody, TableRow, Typography,
  Stack, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton,
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';

const RULE_TYPES = [
  { value: 'percentage', label: 'Percentage of sale' },
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'product', label: 'Per product' },
  { value: 'category', label: 'Per category' },
  { value: 'slab', label: 'Slab-based (tiered rates)' },
];

const EMPTY_FORM = { name: '', rule_type: 'percentage', value: '', product_ref: '', effective_from: '', effective_to: '' };
const EMPTY_SLAB = { min_value: '', max_value: '', rate: '' };

export function PartnerCommissionRulesTab({ partnerId, partner }) {
  const { can, user } = useAuth();
  const needsBusiness = !user?.business_id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [slabs, setSlabs] = useState([{ ...EMPTY_SLAB }]);

  const { data: rules, isLoading } = useList('commission-rules', { partner_id: partnerId });

  const rows = (rules ?? []).filter((r) => String(r.partner_id) === String(partnerId));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSlabs([{ ...EMPTY_SLAB }]);
    setError('');
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, partner_id: partnerId };
    if (needsBusiness) payload.business_id = partner?.business_id;
    if (form.rule_type === 'slab') {
      payload.slabs = slabs
        .filter((s) => s.min_value !== '' && s.rate !== '')
        .map((s) => ({ min_value: s.min_value, max_value: s.max_value || null, rate: s.rate }));
      delete payload.value;
    }
    try {
      await api.post('/commission-rules', payload);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not create commission rule');
      return;
    }
    setOpen(false);
    resetForm();
    invalidate();
  };

  const deactivate = async (id) => {
    await api.put(`/commission-rules/${id}`, { status: 'inactive' });
    invalidate();
  };

  const updateSlab = (idx, key, value) => {
    setSlabs((s) => s.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
        {can('commissions.create') && (
          <Button variant="outlined" onClick={() => { resetForm(); setOpen(true); }}>New Commission Rule</Button>
        )}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Effective</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{RULE_TYPES.find((t) => t.value === r.rule_type)?.label ?? r.rule_type}</TableCell>
                <TableCell>
                  {r.rule_type === 'slab'
                    ? (r.slabs ?? []).map((s) => `${s.min_value}-${s.max_value ?? '∞'}: ${s.rate}`).join(', ')
                    : r.value ?? '—'}
                </TableCell>
                <TableCell>{r.effective_from} to {r.effective_to ?? 'open'}</TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell align="right">
                  {can('commissions.edit') && r.status === 'active' && (
                    <Button size="small" color="error" onClick={() => deactivate(r.id)}>Deactivate</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No commission rules yet.</Typography></TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={create}>
          <DialogTitle>New Commission Rule</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
              <TextField select label="Rule Type" value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })} required fullWidth>
                {RULE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>

              {form.rule_type !== 'slab' && (
                <TextField
                  label={form.rule_type === 'percentage' ? 'Rate (%)' : 'Amount'}
                  type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                  fullWidth
                />
              )}
              {form.rule_type === 'product' && (
                <TextField label="Product Reference" value={form.product_ref} onChange={(e) => setForm({ ...form, product_ref: e.target.value })} fullWidth />
              )}

              {form.rule_type === 'slab' && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Slabs (tiered rates by sale value)</Typography>
                  {slabs.map((s, idx) => (
                    <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                      <TextField label="Min" type="number" size="small" value={s.min_value} onChange={(e) => updateSlab(idx, 'min_value', e.target.value)} />
                      <TextField label="Max (optional)" type="number" size="small" value={s.max_value} onChange={(e) => updateSlab(idx, 'max_value', e.target.value)} />
                      <TextField label="Rate" type="number" size="small" value={s.rate} onChange={(e) => updateSlab(idx, 'rate', e.target.value)} />
                      <IconButton size="small" onClick={() => setSlabs((cur) => cur.filter((_, i) => i !== idx))} disabled={slabs.length === 1}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setSlabs((cur) => [...cur, { ...EMPTY_SLAB }])}>
                    Add Slab
                  </Button>
                </Box>
              )}

              <TextField type="date" label="Effective From" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField type="date" label="Effective To" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
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
