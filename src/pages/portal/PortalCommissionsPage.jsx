import { Box, Typography, Paper, Grid, Chip, Alert, Stack } from '@mui/material';
import { DataGrid } from '../../components/table';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useList } from '../../api/resource';
import { money, partnerCommissionStatus, partnerDirectionLabel, commissionSource, commissionPercent } from '../../config/money';

/**
 * Partner's own money page: what Lizy owes them, what they owe Lizy, every commission and
 * where it is in the 3-step flow, and every payment made either way.
 */
export function PortalCommissionsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });
  const { data: commissions, isLoading } = useList('commissions', { per_page: 200 });
  const { data: payments, isLoading: paymentsLoading } = useList('payments', { per_page: 200 });
  const m = dashboard?.money ?? {};

  const cards = [
    { label: 'Lizy owes you', value: m.commission_owed_to_you, color: 'primary.main', hint: 'Approved — payment on the way' },
    { label: 'Waiting for approval', value: m.waiting_approval, color: 'warning.main', hint: 'Lizy is checking these' },
    { label: 'You owe Lizy', value: m.commission_you_owe, color: 'error.main', hint: 'Commission on jobs where the customer paid you' },
    { label: 'Paid to you so far', value: m.paid_to_you, color: 'success.main', hint: 'All payments received from Lizy' },
  ];

  const commissionColumns = [
    { field: 'ref', headerName: 'Reference', width: 140, valueGetter: (v, row) => row.sale?.reference_number ?? row.assignment?.reference_number ?? row.transaction_reference },
    { field: 'source', headerName: 'Earned for', flex: 1, minWidth: 180, valueGetter: (v, row) => commissionSource(row) },
    { field: 'base_amount', headerName: 'Deal amount', width: 120, valueGetter: (v) => money(v) },
    { field: 'rate', headerName: 'Share', width: 80, valueGetter: (v, row) => commissionPercent(row) },
    { field: 'commission_amount', headerName: 'Amount', width: 120, valueGetter: (v) => money(v) },
    { field: 'direction', headerName: 'Who pays', width: 130, valueGetter: (v) => partnerDirectionLabel(v) },
    {
      field: 'status', headerName: 'Status', width: 230,
      renderCell: (params) => {
        const s = partnerCommissionStatus(params.row);
        return <Chip size="small" label={s.label} color={s.color} variant={s.color === 'default' ? 'outlined' : 'filled'} />;
      },
    },
    { field: 'paid', headerName: 'Paid on', width: 120, valueGetter: (v, row) => row.payments?.[0]?.payment_date ?? '—' },
  ];

  const paymentColumns = [
    { field: 'payment_date', headerName: 'Date', width: 120 },
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'direction', headerName: 'Direction', width: 160, valueGetter: (v) => (v === 'from_partner' ? 'You paid Lizy' : 'Lizy paid you') },
    { field: 'amount', headerName: 'Amount', width: 130, valueGetter: (v) => money(v) },
    { field: 'payment_method', headerName: 'Method', width: 140, valueGetter: (v) => v || '—' },
    { field: 'notes', headerName: 'Notes', flex: 1, valueGetter: (v) => v || '' },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>My Earnings &amp; Payments</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Each commission goes: <b>Waiting for approval</b> → <b>Approved</b> → <b>Paid</b>.
        Commissions are created automatically from your sales, completed jobs and deliveries.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c) => (
          <Grid key={c.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: c.color }}>{money(c.value)}</Typography>
              <Typography variant="caption" color="text.secondary">{c.hint}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Stack sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>My Commissions</Typography>
      </Stack>
      <Paper sx={{ height: 420, mb: 3 }}>
        <DataGrid
          rows={commissions?.data ?? []} columns={commissionColumns} loading={isLoading} disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No commissions yet' }}
        />
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Payment History</Typography>
      <Paper sx={{ height: 380 }}>
        <DataGrid
          rows={payments?.data ?? []} columns={paymentColumns} loading={paymentsLoading} disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No payments yet' }}
        />
      </Paper>
    </Box>
  );
}
