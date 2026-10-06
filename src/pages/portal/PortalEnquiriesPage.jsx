import { useState } from 'react';
import { Box, Typography, Paper, Stack, Button, Alert, Chip } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../../components/table';
import { useList } from '../../api/resource';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { EnquiryDialog } from '../../components/EnquiryDialog';
import { EnquiryStatusChip } from '../AffiliateEnquiriesPage';
import { SOURCE_LABEL } from '../../config/enquiries';
import { productLabel } from '../../config/products';

/**
 * Affiliate partner's own enquiries — from their links on the website, or added by hand. The
 * backend only ever returns this partner's enquiries, with the customer's first name and the
 * phone masked to its last 2 digits. A hand-entered enquiry can be changed while it's "new".
 */
export function PortalEnquiriesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); // { enquiry } — null enquiry = Add
  const [error, setError] = useState('');
  const { data, isLoading } = useList('affiliate-enquiries', { per_page: 200 });

  const openEdit = async (row) => {
    setError('');
    try {
      const { data: full } = await api.get(`/affiliate-enquiries/${row.id}`);
      setDialog({ enquiry: full });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not open this enquiry');
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await api.delete(`/me/affiliate-enquiries/${row.id}`);
      queryClient.invalidateQueries({ queryKey: ['affiliate-enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not delete this enquiry');
    }
  };

  const columns = [
    { field: 'enquiry_date', headerName: 'Date', width: 110 },
    { field: 'product', headerName: 'Service', flex: 1, minWidth: 170, valueGetter: (v, row) => (row.product ? productLabel(row.product) : row.service_slug || '—') },
    { field: 'customer_name', headerName: 'Customer', flex: 1, minWidth: 120 },
    { field: 'customer_phone', headerName: 'Phone', width: 130 },
    {
      field: 'source', headerName: 'Source', width: 100,
      valueGetter: (v) => SOURCE_LABEL[v] ?? v,
      renderCell: (p) => <Chip size="small" variant="outlined" label={p.value} />,
    },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <EnquiryStatusChip status={p.row.status} /> },
    {
      field: '_actions', headerName: 'Actions', width: 150, sortable: false,
      renderCell: ({ row }) => (row.can_edit ? (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" onClick={() => openEdit(row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => remove(row)}>Delete</Button>
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">Locked</Typography>),
    },
  ];

  return (
    <Box>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Box>
          <Typography variant="h5">My Enquiries</Typography>
          <Typography variant="body2" color="text.secondary">
            Customers who enquired through your links, or that you added. You can change an enquiry you added while it is still New.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={() => setDialog({ enquiry: null })}>Add Enquiry</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick localeText={{ noRowsLabel: 'No enquiries yet' }} />
      </Paper>
      {dialog && <EnquiryDialog key={dialog.enquiry?.id ?? 'new'} open enquiry={dialog.enquiry} onClose={() => setDialog(null)} />}
    </Box>
  );
}
