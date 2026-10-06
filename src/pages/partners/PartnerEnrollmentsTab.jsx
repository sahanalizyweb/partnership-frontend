import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Paper, TableHead, TableBody, TableRow, Typography,
  Stack, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';

const EMPTY_FORM = { partner_type_id: '', partner_category_id: '' };
const EMPTY_BRAND_FORM = { brand_mode: 'lizyweb', brand_name: '' };

/**
 * One Partner Profile -> many Partner Type Enrollments (requirement #1-3). Each enrollment is
 * independently activated/suspended and carries its own earnings (see PartnerEarningsTab).
 */
export function PartnerEnrollmentsTab({ partnerId }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [brandRow, setBrandRow] = useState(null);
  const [brandForm, setBrandForm] = useState(EMPTY_BRAND_FORM);

  const { data: enrollments, isLoading } = useList(`partners/${partnerId}/enrollments`);
  const { data: partnerTypes } = useList('partner-types');
  const { data: partnerCategories } = useList('partner-categories');

  const rows = enrollments ?? [];
  const enrolledTypeIds = new Set(rows.map((r) => r.partner_type_id));
  const availableTypes = (partnerTypes ?? []).filter((t) => !enrolledTypeIds.has(t.id));
  const categoryOptions = (partnerCategories ?? []).filter((c) => String(c.partner_type_id) === String(form.partner_type_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`partners/${partnerId}/enrollments`] });
    queryClient.invalidateQueries({ queryKey: ['partners', 'one', partnerId] });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/partners/${partnerId}/enrollments`, {
        partner_type_id: form.partner_type_id,
        partner_category_id: form.partner_category_id || null,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not add enrollment');
      return;
    }
    setOpen(false);
    invalidate();
  };

  const doAction = async (enrollment, action) => {
    await api.post(`/partners/${partnerId}/enrollments/${enrollment.id}/${action}`);
    invalidate();
  };

  const remove = async (enrollment) => {
    if (enrollment.is_primary) return;
    if (!window.confirm(`Remove the ${enrollment.partner_type?.name} enrollment?`)) return;
    await api.delete(`/partners/${partnerId}/enrollments/${enrollment.id}`);
    invalidate();
  };

  const openBrand = (enrollment) => {
    setBrandRow(enrollment);
    setBrandForm({
      brand_mode: enrollment.settings?.brand_mode ?? 'lizyweb',
      brand_name: enrollment.settings?.brand_name ?? '',
    });
    setError('');
  };

  const saveBrand = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/partners/${partnerId}/enrollments/${brandRow.id}`, {
        settings: {
          ...(brandRow.settings ?? {}),
          brand_mode: brandForm.brand_mode,
          brand_name: brandForm.brand_mode === 'own_brand' ? brandForm.brand_name : null,
          brand_mode_status: brandForm.brand_mode === 'own_brand' ? 'pending' : undefined,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save brand mode');
      return;
    }
    setBrandRow(null);
    invalidate();
  };

  const approveBrand = async (enrollment) => {
    await api.post(`/partners/${partnerId}/enrollments/${enrollment.id}/approve-brand-mode`);
    invalidate();
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
        {can('partners.edit') && availableTypes.length > 0 && (
          <Button variant="outlined" onClick={openCreate}>Add Enrollment</Button>
        )}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Enrollment Code</TableCell>
              <TableCell>Partner Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.enrollment_code}</TableCell>
                <TableCell>
                  {r.partner_type?.name}
                  {r.is_primary && <Chip label="Primary" size="small" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{r.partner_category?.name ?? '—'}</TableCell>
                <TableCell>
                  <StatusChip status={r.status} />
                  {r.partner_type?.code === 'reseller' && r.settings?.brand_mode === 'own_brand' && (
                    <Chip
                      size="small" sx={{ ml: 1 }}
                      label={`Own Brand${r.settings?.brand_mode_status ? ` (${r.settings.brand_mode_status})` : ''}`}
                      color={r.settings?.brand_mode_status === 'approved' ? 'success' : 'default'}
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {r.partner_type?.code === 'reseller' && can('partners.edit') && (
                      <Button size="small" onClick={() => openBrand(r)}>Brand Mode</Button>
                    )}
                    {r.partner_type?.code === 'reseller' && r.settings?.brand_mode === 'own_brand' && r.settings?.brand_mode_status !== 'approved' && can('partners.approve') && (
                      <Button size="small" color="success" onClick={() => approveBrand(r)}>Approve Brand</Button>
                    )}
                    {can('partners.approve') && r.status !== 'active' && (
                      <Button size="small" color="success" onClick={() => doAction(r, 'activate')}>Activate</Button>
                    )}
                    {can('partners.approve') && r.status === 'active' && (
                      <Button size="small" color="warning" onClick={() => doAction(r, 'suspend')}>Suspend</Button>
                    )}
                    {can('partners.delete') && !r.is_primary && (
                      <Button size="small" color="error" onClick={() => remove(r)}>Remove</Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">No enrollments yet.</Typography></TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={create}>
          <DialogTitle>Add Partner Type Enrollment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select label="Partner Type" value={form.partner_type_id}
                onChange={(e) => setForm({ ...form, partner_type_id: e.target.value, partner_category_id: '' })}
                required fullWidth
              >
                {availableTypes.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>
              {categoryOptions.length > 0 && (
                <TextField
                  select label="Category (optional)" value={form.partner_category_id}
                  onChange={(e) => setForm({ ...form, partner_category_id: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  {categoryOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!brandRow} onClose={() => setBrandRow(null)} maxWidth="sm" fullWidth>
        <form onSubmit={saveBrand}>
          <DialogTitle>Reseller Brand Mode — {brandRow?.enrollment_code}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select label="Brand Mode" value={brandForm.brand_mode}
                onChange={(e) => setBrandForm({ ...brandForm, brand_mode: e.target.value })}
                fullWidth
              >
                <MenuItem value="lizyweb">Lizyweb / LizyMart Brand</MenuItem>
                <MenuItem value="own_brand">Reseller Own Brand (white-label)</MenuItem>
              </TextField>
              {brandForm.brand_mode === 'own_brand' && (
                <>
                  <TextField
                    label="Reseller Brand Name" value={brandForm.brand_name}
                    onChange={(e) => setBrandForm({ ...brandForm, brand_name: e.target.value })}
                    required fullWidth
                  />
                  <Alert severity="info">Own-brand/white-label selling requires admin approval before it takes effect.</Alert>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBrandRow(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
