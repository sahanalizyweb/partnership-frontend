import { useState } from 'react';
import { Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert } from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

export function UsersPage() {
  const { can, user } = useAuth();
  const needsBusiness = !user?.business_id;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { data: users, isLoading } = useList('users');
  const { data: roles } = useList('roles');
  const { data: businesses } = useList('businesses');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', business_id: '' });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not create user');
      return;
    }
    setOpen(false);
    setForm({ name: '', email: '', password: '', role: '', business_id: '' });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 1, renderCell: (p) => <Chip size="small" label={p.row.roles?.[0]?.name ?? '—'} /> },
    { field: 'status', headerName: 'Status', width: 110 },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Users & Roles</Typography>
        {can('users.create') && <Button variant="contained" onClick={() => setOpen(true)}>Add User</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={users ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>Add User</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {needsBusiness && (
                <TextField
                  select label="Business" value={form.business_id}
                  onChange={(e) => setForm({ ...form, business_id: e.target.value })} required fullWidth
                >
                  {(businesses ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
              )}
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth />
              <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required fullWidth />
              <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required fullWidth>
                {(roles ?? []).map((r) => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
              </TextField>
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
