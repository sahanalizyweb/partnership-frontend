import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Paper, Stack, Button, TextField, Alert } from '@mui/material';
import { useUpdate } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';

export function PartnerLocationTab({ partnerId, partner }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const updateMutation = useUpdate('partners');

  const [location, setLocation] = useState(partner.location ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocation(partner.location ?? '');
  }, [partner.location]);

  const canEdit = can('partners.edit');

  const save = async () => {
    await updateMutation.mutateAsync({ id: partnerId, payload: { location: location || null } });
    queryClient.invalidateQueries({ queryKey: ['partners', 'one', partnerId] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Location</Typography>
        {saved && <Alert severity="success" sx={{ mb: 2 }}>Saved.</Alert>}
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField
            label="Primary Location"
            placeholder="Full address — building/street, area, city, state, PIN code"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={!canEdit} fullWidth multiline minRows={3}
          />
          {canEdit && (
            <Box>
              <Button variant="contained" onClick={save} disabled={updateMutation.isPending}>
                Save Location
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
