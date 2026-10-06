import { Box, Typography, Paper } from '@mui/material';
import { DataGrid } from '../../components/table';
import { useList } from '../../api/resource';

/** Full chronological log of payments this reseller has made to us. Mirrors PortalSupplierPaymentHistoryPage. */
export function PortalResellerPaymentHistoryPage() {
  const { data, isLoading } = useList('reseller-payments', { per_page: 100 });

  const columns = [
    { field: 'payment_date', headerName: 'Date', width: 130 },
    { field: 'amount', headerName: 'Amount', width: 130, valueGetter: (v, row) => `₹${Number(row.amount).toLocaleString('en-IN')}` },
    { field: 'payment_method', headerName: 'Payment Method', width: 160, valueGetter: (v, row) => row.payment_method || '—' },
    { field: 'reference_number', headerName: 'Reference #', width: 160, valueGetter: (v, row) => row.reference_number || '—' },
    { field: 'purchase', headerName: 'Against Purchase', flex: 1, valueGetter: (v, row) => row.reseller_purchase?.reference_number || row.reseller_purchase?.product_name || '—' },
    { field: 'notes', headerName: 'Notes', flex: 1, valueGetter: (v, row) => row.notes || '' },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Payment History</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every payment you've made to us.
      </Typography>
      <Paper sx={{ height: 560 }}>
        <DataGrid rows={data?.data ?? []} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>
    </Box>
  );
}
