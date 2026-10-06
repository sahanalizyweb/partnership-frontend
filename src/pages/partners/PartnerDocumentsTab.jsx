import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Paper, TableHead, TableBody, TableRow, Typography,
  Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar,
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { StatusChip } from '../../components/crud/ResourceListPage';

export function PartnerDocumentsTab({ partnerId }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'documents'],
    queryFn: async () => (await api.get(`/partners/${partnerId}/documents`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'documents'] });

  const upload = async (e) => {
    e.preventDefault();
    setError('');
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    try {
      await api.post(`/partners/${partnerId}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not upload document');
      return;
    }
    setOpen(false);
    setDocumentType('');
    setFile(null);
    setExpiryDate('');
    invalidate();
  };

  const verify = async (docId) => {
    try {
      await api.post(`/documents/${docId}/verify`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not verify document');
    }
  };
  const reject = async (docId) => {
    try {
      await api.post(`/documents/${docId}/reject`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not reject document');
    }
  };
  const remove = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/documents/${docId}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete document');
    }
  };

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
        {can('documents.create') && <Button variant="outlined" onClick={() => setOpen(true)}>Upload Document</Button>}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Document Type</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(documents ?? []).map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell>{doc.document_type?.name}</TableCell>
                <TableCell>{doc.expiry_date ?? '—'}</TableCell>
                <TableCell><StatusChip status={doc.verification_status} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    {can('documents.approve') && doc.verification_status === 'pending' && (
                      <>
                        <Button size="small" onClick={() => verify(doc.id)}>Verify</Button>
                        <Button size="small" color="error" onClick={() => reject(doc.id)}>Reject</Button>
                      </>
                    )}
                    {can('documents.delete') && (
                      <Button size="small" color="error" onClick={() => remove(doc.id)}>Delete</Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {(documents ?? []).length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={4}><Typography color="text.secondary">No documents uploaded yet.</Typography></TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={4}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={upload}>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Document Type" placeholder="e.g. PAN Card, GST Certificate"
                value={documentType} onChange={(e) => setDocumentType(e.target.value)} required fullWidth
              />
              <TextField
                type="date" label="Expiry Date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button component="label" variant="outlined">
                {file ? file.name : 'Choose File'}
                <input type="file" hidden onChange={(e) => setFile(e.target.files[0])} required />
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!file || !documentType}>Upload</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
