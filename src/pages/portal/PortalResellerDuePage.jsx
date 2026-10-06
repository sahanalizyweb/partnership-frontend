import { Box, Typography, Paper, Alert } from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { api } from '../../api/client';
import { StatusChip } from '../../components/crud/ResourceListPage';

const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };

const columns = [
  { field: 'reference_number', headerName: 'Reference #', width: 140, valueGetter: (v, row) => row.reference_number || '—' },
  { field: 'product_name', headerName: 'Product / Service', flex: 1 },
  { field: 'purchase_date', headerName: 'Purchase Date', width: 130 },
  { field: 'amount', headerName: 'Amount', width: 130, valueGetter: (v, row) => `₹${Number(row.amount).toLocaleString('en-IN')}` },
  { field: 'amount_paid', headerName: 'Paid', width: 130, valueGetter: (v, row) => `₹${Number(row.amount_paid).toLocaleString('en-IN')}` },
  { field: 'balance_amount', headerName: 'Balance Due', width: 140, valueGetter: (v, row) => `₹${Number(row.balance_amount).toLocaleString('en-IN')}` },
  {
    field: 'payment_status',
    headerName: 'Payment Status',
    width: 160,
    renderCell: (params) => <StatusChip status={params.row.payment_status} label={PAYMENT_STATUS_LABEL[params.row.payment_status]} />,
  },
];

/**
 * Reseller portal "Payment Due": the headline total the reseller owes us, plus the purchases
 * not yet fully paid that make it up. Mirrors PortalSupplierDuePage, except this is what the
 * reseller owes us, not what we owe them.
 */
export function PortalResellerDuePage() {
  const { data, isLoading } = useList('reseller-purchases', { payment_status: 'unpaid', per_page: 100 });
  const { data: partial } = useList('reseller-purchases', { payment_status: 'partial', per_page: 100 });
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  const rows = [...(data?.data ?? []), ...(partial?.data ?? [])].sort((a, b) => b.id - a.id);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Payment Due</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total amount you currently owe us, and the purchases behind it.
      </Typography>
      <Alert severity={Number(dashboard?.total_outstanding ?? 0) > 0 ? 'warning' : 'success'} sx={{ mb: 2, fontSize: 16 }}>
        Total Due: <strong>₹{Number(dashboard?.total_outstanding ?? 0).toLocaleString('en-IN')}</strong>
      </Alert>
      <Paper sx={{ height: 560 }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>
    </Box>
  );
}
