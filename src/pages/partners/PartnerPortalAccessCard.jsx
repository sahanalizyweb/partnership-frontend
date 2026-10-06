import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Paper, Typography, Stack, TextField, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

/**
 * Manages the partner's portal login account (a `users` row linked via partner_id) directly
 * from the Partner Details page — the Users & Roles admin page never lists these accounts.
 */
export function PartnerPortalAccessCard({ partnerId, partner }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['partners', 'one', partnerId] });

  const [email, setEmail] = useState(partner.user?.email ?? '');
  const [savedEmail, setSavedEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '' });
  const [createError, setCreateError] = useState('');
  // Set when the email is already another partner's login — i.e. the same person in another role.
  const [linkTarget, setLinkTarget] = useState(null);
  const [linking, setLinking] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetForm, setResetForm] = useState({ admin_password: '', password: '' });
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    setEmail(partner.user?.email ?? '');
  }, [partner.user?.email]);

  if (!can('users.edit')) return null;

  const saveEmail = async () => {
    setEmailError('');
    try {
      await api.put(`/partners/${partnerId}/portal-account/email`, { email });
      invalidate();
      setSavedEmail(true);
      setTimeout(() => setSavedEmail(false), 2000);
    } catch (err) {
      setEmailError(err.response?.data?.message ?? 'Could not update email');
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setCreateError('');
    setLinkTarget(null);
    try {
      await api.post(`/partners/${partnerId}/portal-account`, createForm);
      setCreateOpen(false);
      setCreateForm({ email: '', password: '' });
      invalidate();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.existing_partner) {
        setLinkTarget(err.response.data.existing_partner);
        return;
      }
      setCreateError(err.response?.data?.message ?? 'Could not create portal login');
    }
  };

  // Moves this profile's role(s) and records onto the existing partner, so the person keeps
  // one login and their dashboard shows every role. This profile is removed afterwards.
  const linkToExisting = async () => {
    setCreateError('');
    setLinking(true);
    try {
      const { data } = await api.post(`/partners/${partnerId}/portal-account`, { email: createForm.email, link_existing: true });
      setCreateOpen(false);
      setLinkTarget(null);
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      navigate(`/app/partners/${data.merged_into}`, { replace: true });
    } catch (err) {
      setCreateError(err.response?.data?.message ?? 'Could not link to the existing partner');
    } finally {
      setLinking(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    try {
      await api.post(`/partners/${partnerId}/portal-account/reset-password`, resetForm);
      setResetOpen(false);
      setResetForm({ admin_password: '', password: '' });
    } catch (err) {
      setResetError(err.response?.data?.message ?? 'Could not reset password');
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Portal Login</Typography>

      {!partner.user ? (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No portal login yet.</Typography>
          <Button size="small" variant="outlined" onClick={() => { setLinkTarget(null); setCreateError(''); setCreateOpen(true); }}>Create Portal Login</Button>
        </>
      ) : (
        <Stack spacing={1}>
          {savedEmail && <Alert severity="success" sx={{ py: 0 }}>Email updated.</Alert>}
          {emailError && <Alert severity="error" sx={{ py: 0 }}>{emailError}</Alert>}
          <TextField
            label="Login Email" size="small" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} fullWidth
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" disabled={email === partner.user.email} onClick={saveEmail}>
              Save Email
            </Button>
            <Button size="small" color="warning" variant="outlined" onClick={() => setResetOpen(true)}>
              Reset Password
            </Button>
          </Stack>
        </Stack>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={createAccount}>
          <DialogTitle>Create Portal Login</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              {linkTarget && (
                <Alert
                  severity="warning"
                  action={(
                    <Button color="inherit" size="small" onClick={linkToExisting} disabled={linking}>
                      Link
                    </Button>
                  )}
                >
                  <strong>{createForm.email}</strong> is already the login of <strong>{linkTarget.name}</strong> ({linkTarget.partner_code}).
                  Link this role to that partner? They'll keep the same login, and their dashboard will show all their roles.
                  This profile's role and records move to {linkTarget.partner_code}.
                </Alert>
              )}
              <TextField
                label="Email" type="email" value={createForm.email}
                onChange={(e) => { setLinkTarget(null); setCreateForm({ ...createForm, email: e.target.value }); }} required fullWidth
              />
              <TextField
                label="Initial Password" type="password" value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required fullWidth helperText="At least 8 characters"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={resetPassword}>
          <DialogTitle>Reset Partner's Password</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {resetError && <Alert severity="error">{resetError}</Alert>}
              <Alert severity="info">Confirm it's you: enter your own admin password to continue.</Alert>
              <TextField
                label="Your Admin Password" type="password" value={resetForm.admin_password}
                onChange={(e) => setResetForm({ ...resetForm, admin_password: e.target.value })} required fullWidth
              />
              <TextField
                label="New Password for Partner" type="password" value={resetForm.password}
                onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                required fullWidth helperText="At least 8 characters"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="warning">Reset Password</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
