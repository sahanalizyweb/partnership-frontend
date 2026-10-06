import { Box, Typography, Paper, Alert } from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery } from '@tanstack/react-query';
import { useList } from '../../api/resource';
import { api } from '../../api/client';
import { StatusChip } from '../../components/crud/ResourceListPage';

const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };

const columns = [
  { field: 'product_name', headerName: 'Product / Details', flex: 1 },
  { field: 'invoice_number', headerName: 'Invoice / Reference #', width: 180, valueGetter: (v, row) => row.invoice_number || '—' },
  { field: 'supply_date', headerName: 'Supply Date', width: 130 },
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
 * Supplier portal "Outstanding Balance": the headline total still owed to the supplier, plus
 * the supplies (invoices) not yet fully paid that make it up.
 */
export function PortalSupplierDuePage() {
  const { data, isLoading } = useList('supplies', { payment_status: 'unpaid', per_page: 100 });
  const { data: partial } = useList('supplies', { payment_status: 'partial', per_page: 100 });
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  const rows = [...(data?.data ?? []), ...(partial?.data ?? [])].sort((a, b) => b.id - a.id);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Outstanding Balance</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total amount currently owed to you, and the invoices behind it.
      </Typography>
      <Alert severity={Number(dashboard?.outstanding_balance ?? 0) > 0 ? 'warning' : 'success'} sx={{ mb: 2, fontSize: 16 }}>
        Total Outstanding: <strong>₹{Number(dashboard?.outstanding_balance ?? 0).toLocaleString('en-IN')}</strong>
      </Alert>
      <Paper sx={{ height: 560 }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} disableRowSelectionOnClick />
      </Paper>
    </Box>
  );
}
