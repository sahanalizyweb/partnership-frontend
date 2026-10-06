import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Paper, Grid, Stack, TextField, MenuItem, Button, Chip, Alert } from '@mui/material';
import { api } from '../../api/client';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
];

const EMPTY = {
  partner_type_id: '', partner_category_id: '', entity_type: 'individual', name: '', email: '',
  phone: '', alt_phone: '', gstin: '', pan: '', address: '', location: '',
  bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '',
};

export function PortalProfilePage() {
  const queryClient = useQueryClient();
  const { data: partner, isLoading } = useQuery({
    queryKey: ['me', 'partner'],
    queryFn: async () => (await api.get('/me/partner')).data,
  });
  // Only the partner types the admin has added for this partner (their enrollments) — never
  // every type in the system.
  const types = (partner?.enrollments ?? [])
    .map((e) => e.partner_type)
    .filter(Boolean)
    .filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i);
  const { data: categories } = useList('partner-categories');

  const [values, setValues] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!partner) return;
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
      location: partner.location ?? '',
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
    setSaving(true);
    try {
      await api.put('/me/partner', values);
      // Partner type drives the sidebar menus and dashboard — refresh them all.
      ['me', 'me-partner', 'me-enrollments', 'dashboard', 'partner-earnings-summary'].forEach(
        (key) => queryClient.invalidateQueries({ queryKey: [key] })
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !partner) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5">My Profile</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Chip label={partner.partner_code} size="small" />
          <StatusChip status={partner.status} />
        </Stack>
      </Box>

      <Paper sx={{ p: 3, maxWidth: 760 }}>
        <form onSubmit={save}>
          {saved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated.</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select label="Partner Type" value={types.length ? values.partner_type_id : ''}
                onChange={(e) => {
                  set('partner_type_id', e.target.value);
                  set('partner_category_id', '');
                }}
                required fullWidth disabled={types.length <= 1}
                helperText={types.length > 1 ? 'Your main role — all your roles stay active' : 'Assigned by admin'}
              >
                {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select label="Partner Category" value={values.partner_category_id}
                onChange={(e) => set('partner_category_id', e.target.value)} fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {categoryOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Entity Type" value={values.entity_type} onChange={(e) => set('entity_type', e.target.value)} fullWidth>
                {ENTITY_TYPES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} required fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Alt Phone" value={values.alt_phone} onChange={(e) => set('alt_phone', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="GSTIN" value={values.gstin} onChange={(e) => set('gstin', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="PAN" value={values.pan} onChange={(e) => set('pan', e.target.value)} fullWidth />
            </Grid>
            <Grid size={12}>
              <TextField label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} multiline minRows={2} fullWidth />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Primary Location"
                placeholder="Full address — building/street, area, city, state, PIN code"
                value={values.location} onChange={(e) => set('location', e.target.value)} multiline minRows={2} fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Account Name" value={values.bank_account_name} onChange={(e) => set('bank_account_name', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Name" value={values.bank_name} onChange={(e) => set('bank_name', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank Account Number" value={values.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} fullWidth />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bank IFSC" value={values.bank_ifsc} onChange={(e) => set('bank_ifsc', e.target.value)} fullWidth />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Save Profile</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
