import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, MenuItem, Button, Alert } from '@mui/material';
import { useList, useUpdate } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
];

const EMPTY = {
  partner_type_id: '', partner_category_id: '', entity_type: 'individual', name: '', email: '',
  phone: '', alt_phone: '', gstin: '', pan: '', address: '',
  bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '',
};

/** Full editable profile for any partner — admin-only; Location has its own dedicated tab. */
export function PartnerProfileTab({ partnerId, partner }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const updateMutation = useUpdate('partners');
  const { data: types } = useList('partner-types');
  const { data: categories } = useList('partner-categories');

  const canEdit = can('partners.edit');

  const [values, setValues] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValues({
      partner_type_id: partner.partner_type_id ?? '',
      partner_category_id: partner.partner_category_id ?? '',
      entity_type: partner.entity_type ?? 'individual',
      name: partner.name ?? '',
      email: partner.email ?? '',
      phone: partner.phone ?? '',
      alt_phone: partner.alt_phone ?? '',
      gstin: partner.gstin ?? '',
      pan: partner.pan ?? '',
      address: partner.address ?? '',
      bank_account_name: partner.bank_account_name ?? '',
      bank_account_number: partner.bank_account_number ?? '',
      bank_ifsc: partner.bank_ifsc ?? '',
      bank_name: partner.bank_name ?? '',
    });
  }, [partner]);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const categoryOptions = (categories ?? []).filter(
    (c) => !values.partner_type_id || c.partner_type_id === values.partner_type_id
  );

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateMutation.mutateAsync({ id: partnerId, payload: values });
      queryClient.invalidateQueries({ queryKey: ['partners', 'one', partnerId] });
      // Primary enrollment follows the partner type (backend syncs it) — refresh the Enrollments tab too.
      queryClient.invalidateQueries({ queryKey: [`partners/${partnerId}/enrollments`] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save profile');
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 760 }} elevation={0}>
      <form onSubmit={save}>
        {saved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select label="Partner Type" value={values.partner_type_id} disabled={!canEdit}
              onChange={(e) => set('partner_type_id', e.target.value)} required fullWidth
            >
              {(types ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select label="Partner Category" value={values.partner_category_id} disabled={!canEdit}
              onChange={(e) => set('partner_category_id', e.target.value)} fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {categoryOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select label="Entity Type" value={values.entity_type} disabled={!canEdit} onChange={(e) => set('entity_type', e.target.value)} fullWidth>
              {ENTITY_TYPES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Name" value={values.name} disabled={!canEdit} onChange={(e) => set('name', e.target.value)} required fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Phone" value={values.phone} disabled={!canEdit} onChange={(e) => set('phone', e.target.value)} required fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Alt Phone" value={values.alt_phone} disabled={!canEdit} onChange={(e) => set('alt_phone', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Email" type="email" value={values.email} disabled={!canEdit} onChange={(e) => set('email', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="GSTIN" value={values.gstin} disabled={!canEdit} onChange={(e) => set('gstin', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="PAN" value={values.pan} disabled={!canEdit} onChange={(e) => set('pan', e.target.value)} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField label="Address" value={values.address} disabled={!canEdit} onChange={(e) => set('address', e.target.value)} multiline minRows={2} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Bank Account Name" value={values.bank_account_name} disabled={!canEdit} onChange={(e) => set('bank_account_name', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Bank Name" value={values.bank_name} disabled={!canEdit} onChange={(e) => set('bank_name', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Bank Account Number" value={values.bank_account_number} disabled={!canEdit} onChange={(e) => set('bank_account_number', e.target.value)} fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Bank IFSC" value={values.bank_ifsc} disabled={!canEdit} onChange={(e) => set('bank_ifsc', e.target.value)} fullWidth />
          </Grid>
        </Grid>
        {canEdit && (
          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>Save Profile</Button>
          </Box>
        )}
      </form>
    </Paper>
  );
}
