import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Button, MenuItem, TextField, Alert, Snackbar, Chip } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../components/table';
import { useList } from '../api/resource';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { EnquiryDialog } from '../components/EnquiryDialog';
import { productLabel } from '../config/products';
import { ENQUIRY_STATUSES, SOURCE_LABEL } from '../config/enquiries';

export function EnquiryStatusChip({ status }) {
  const s = ENQUIRY_STATUSES.find((x) => x.value === status);
  return <StatusChip status={s?.tone ?? status} label={s?.label ?? status} />;
}

/**
 * Enquiries credited to affiliate partners — from the website (?ref= link) or entered by hand.
 * "Convert to Sale" opens Record Sale pre-filled; saving it marks the enquiry converted, creates
 * the commission (business source Affiliate) and counts the link's conversion.
 */
export function AffiliateEnquiriesPage() {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState(null); // { enquiry } — null enquiry = Add
  const [actionError, setActionError] = useState('');
  const isGlobal = !user?.business_id;

  const { data, isLoading } = useList('affiliate-enquiries', { status: status || undefined, per_page: 200 });

  const run = async (fn, fallback) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ['affiliate-enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-links'] });
    } catch (err) {
      setActionError(err.response?.data?.message ?? fallback);
    }
  };
  const setEnquiryStatus = (row, value) => run(() => api.put(`/affiliate-enquiries/${row.id}`, { status: value }), 'Could not update the enquiry');
  const remove = (row) => {
    if (!window.confirm('Delete this enquiry?')) return;
    run(() => api.delete(`/affiliate-enquiries/${row.id}`), 'Could not delete the enquiry');
  };

  const columns = [
    { field: 'enquiry_date', headerName: 'Date', width: 110 },
    { field: 'partner', headerName: 'Partner', flex: 1, minWidth: 140, valueGetter: (v, row) => row.partner?.name ?? '—' },
    ...(isGlobal ? [{ field: 'business', headerName: 'Business', width: 110, valueGetter: (v, row) => row.business?.name ?? '—' }] : []),
    { field: 'product', headerName: 'Service', flex: 1, minWidth: 160, valueGetter: (v, row) => (row.product ? productLabel(row.product) : row.service_slug || '—') },
    { field: 'customer_name', headerName: 'Customer', flex: 1, minWidth: 130 },
    { field: 'customer_phone', headerName: 'Phone', width: 130 },
    {
      field: 'source', headerName: 'Source', width: 100,
      valueGetter: (v) => SOURCE_LABEL[v] ?? v,
      renderCell: (p) => <Chip size="small" variant="outlined" label={p.value} />,
    },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <EnquiryStatusChip status={p.row.status} /> },
    { field: 'sale', headerName: 'Sale', width: 120, valueGetter: (v, row) => row.sale?.reference_number ?? '—' },
    {
      field: '_actions', headerName: 'Actions', width: 420, sortable: false,
      renderCell: ({ row }) => {
        const open = row.status !== 'converted';
        return (
          <Stack direction="row" spacing={0.5}>
            {can('commissions.edit') && row.status === 'new' && (
              <Button size="small" onClick={() => setEnquiryStatus(row, 'contacted')}>Mark Contacted</Button>
            )}
            {can('commissions.edit') && open && row.status !== 'lost' && (
              <Button size="small" color="error" onClick={() => setEnquiryStatus(row, 'lost')}>Mark Lost</Button>
            )}
            {can('commissions.create') && open && (
              <Button size="small" variant="outlined" color="success" onClick={() => navigate(`/app/sales?enquiry_id=${row.id}`)}>Convert to Sale</Button>
            )}
            {can('commissions.edit') && <Button size="small" onClick={() => setDialog({ enquiry: row })}>Edit</Button>}
            {can('commissions.delete') && open && <Button size="small" color="error" onClick={() => remove(row)}>Delete</Button>}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5">Affiliate Enquiries</Typography>
          <Typography variant="body2" color="text.secondary">
            Customer enquiries from affiliate links on the website, or added by hand. Convert one to a Sale when the customer buys.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            {ENQUIRY_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
          {can('commissions.create') && <Button variant="contained" onClick={() => setDialog({ enquiry: null })}>Add Enquiry</Button>}
        </Stack>
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
          localeText={{ noRowsLabel: 'No enquiries yet' }}
        />
      </Paper>
      {dialog && (
        <EnquiryDialog key={dialog.enquiry?.id ?? 'new'} open admin enquiry={dialog.enquiry} onClose={() => setDialog(null)} />
      )}
    </Box>
  );
}
