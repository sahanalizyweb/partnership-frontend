import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Alert, Divider, Typography,
  Chip, Box,
} from '@mui/material';
import { useList, useCreate } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
];

const EMPTY_LOGIN = { login_email: '', login_password: '' };

export function PartnerFormDialog({ open, onClose }) {
  const { can, user } = useAuth();
  const needsBusiness = !user?.business_id;
  const { data: types } = useList('partner-types');
  const { data: categories } = useList('partner-categories');
  const { data: businesses } = useList('businesses');
  const createMutation = useCreate('partners');
  const [error, setError] = useState('');
  const [login, setLogin] = useState(EMPTY_LOGIN);
  // Set when the email/phone belonged to an existing partner and the role was added to them.
  const [merged, setMerged] = useState(null);

  const [values, setValues] = useState({
    entity_type: 'individual', name: '', phone: '', email: '', partner_type_id: '',
    partner_category_id: '', location: '', address: '', business_id: '', additional_partner_type_ids: [],
  });

  useEffect(() => {
    if (open) {
      setValues({
        entity_type: 'individual', name: '', phone: '', email: '', partner_type_id: '',
        partner_category_id: '', location: '', address: '', business_id: '', additional_partner_type_ids: [],
      });
      setLogin(EMPTY_LOGIN);
      setError('');
      setMerged(null);
    }
  }, [open]);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const wantsLogin = login.login_email || login.login_password;
    if (wantsLogin && (!login.login_email || !login.login_password)) {
      setError('Provide both a portal login email and password, or leave both blank.');
      return;
    }

    let partner;
    try {
      partner = await createMutation.mutateAsync(values);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not create partner');
      return;
    }

    // An existing person keeps their one portal login — only create one if they never had it.
    const hasLogin = partner.merged && partner.user_id;
    if (can('users.edit') && login.login_email && login.login_password && !hasLogin) {
      try {
        await api.post(`/partners/${partner.id}/portal-account`, {
          email: login.login_email,
          password: login.login_password,
        });
      } catch (err) {
        setError(err.response?.data?.message ?? 'Partner was created, but the portal login could not be set up — add it from Partner Details instead.');
        return;
      }
    }

    if (partner.merged) {
      setMerged(partner);
      return;
    }
    onClose();
  };

  const categoryOptions = (categories ?? []).filter((c) => !values.partner_type_id || c.partner_type_id === values.partner_type_id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add Partner</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {merged && (
              <Alert severity="success">
                <strong>{merged.name}</strong> ({merged.partner_code}) is already a partner, so{' '}
                <strong>{(merged.added_partner_types ?? []).join(', ')}</strong> was added to their existing profile.{' '}
                {merged.user?.email
                  ? <>They log in with the same account (<strong>{merged.user.email}</strong>) and their dashboard now shows every role.</>
                  : 'Set up their portal login from Partner Details — one login covers every role.'}
              </Alert>
            )}
            {!merged && (
              <Alert severity="info" variant="outlined">
                Adding someone who is already a partner? Use the same email or phone — the new role is added to their
                existing profile and they keep one login for all roles.
              </Alert>
            )}
            {needsBusiness && (
              <TextField
                select label="Business" value={values.business_id}
                onChange={(e) => set('business_id', e.target.value)} required fullWidth
              >
                {(businesses ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            )}
            <TextField select label="Entity Type" value={values.entity_type} onChange={(e) => set('entity_type', e.target.value)} fullWidth>
              {ENTITY_TYPES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} required fullWidth />
            <TextField label="Phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} required fullWidth />
            <TextField label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} fullWidth />
            <TextField
              select label="Partner Type" value={values.partner_type_id}
              onChange={(e) => {
                set('partner_type_id', e.target.value);
                set('additional_partner_type_ids', values.additional_partner_type_ids.filter((id) => id !== e.target.value));
              }}
              required fullWidth helperText="Primary role"
            >
              {(types ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField
              select label="Additional Partner Roles (optional)" fullWidth
              value={values.additional_partner_type_ids}
              onChange={(e) => set('additional_partner_type_ids', e.target.value)}
              helperText="Same person joining as more than one partner role (e.g. Supplier + Sales + Service)"
              slotProps={{
                select: {
                  multiple: true,
                  renderValue: (selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => <Chip key={id} size="small" label={(types ?? []).find((t) => t.id === id)?.name ?? id} />)}
                    </Box>
                  ),
                },
              }}
            >
              {(types ?? []).filter((t) => t.id !== values.partner_type_id).map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Partner Category" value={values.partner_category_id}
              onChange={(e) => set('partner_category_id', e.target.value)} fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {categoryOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField
              label="Primary Location"
              placeholder="Full address — building/street, area, city, state, PIN code"
              value={values.location}
              onChange={(e) => set('location', e.target.value)} fullWidth multiline minRows={2}
            />
            <TextField label="Address" value={values.address} onChange={(e) => set('address', e.target.value)} multiline minRows={2} fullWidth />

            {can('users.edit') && (
              <>
                <Divider />
                <Typography variant="subtitle2" color="text.secondary">
                  Portal Login (optional — you can set this up later from Partner Details instead)
                </Typography>
                <TextField
                  label="Portal Login Email" type="email" value={login.login_email}
                  onChange={(e) => setLogin((l) => ({ ...l, login_email: e.target.value }))} fullWidth
                />
                <TextField
                  label="Portal Login Password" type="password" value={login.login_password}
                  onChange={(e) => setLogin((l) => ({ ...l, login_password: e.target.value }))}
                  fullWidth helperText="At least 8 characters. Leave both fields blank to skip for now."
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {merged ? (
            <Button variant="contained" onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createMutation.isPending}>Save</Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
