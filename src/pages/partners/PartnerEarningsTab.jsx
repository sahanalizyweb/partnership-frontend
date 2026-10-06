import {
  Box, Paper, Grid, Typography, Stack, TableHead, TableBody, TableRow, 
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';

const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`;

function StatCard({ label, value, color }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color }}>{value}</Typography>
      </Paper>
    </Grid>
  );
}

/**
 * Admin mirror of the partner-portal "Total Partner Earnings" view (requirement #24) — backend
 * calculated via PartnerEarningsService, never summed on the frontend. Underlying transactions
 * stay separated by partner type/business source (see the transaction feed below the summary).
 */
export function PartnerEarningsTab({ partnerId }) {
  const { data: earnings, isLoading } = useList(`partners/${partnerId}/earnings`);
  const { data: transactions } = useList(`partners/${partnerId}/earnings/transactions`);

  if (isLoading || !earnings) return <Typography color="text.secondary">Loading...</Typography>;

  const { overall, by_type: byType } = earnings;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <StatCard label="Total Partner Earnings" value={money(overall.total_earnings)} color="primary.main" />
        <StatCard label="Paid Earnings" value={money(overall.paid_earnings)} color="success.main" />
        <StatCard label="Pending Earnings" value={money(overall.pending_earnings)} color="warning.main" />
        <StatCard label="Total Revenue Generated" value={money(overall.total_revenue)} />
      </Grid>

      {Object.keys(byType).length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {Object.entries(byType).map(([code, row]) => (
            <Grid key={code} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>{row.partner_type_name}</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Revenue: {money(row.revenue)}</Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main' }}>Earnings: {money(row.earnings_total)}</Typography>
                  <Typography variant="caption" sx={{ color: 'success.main' }}>Paid: {money(row.earnings_paid)}</Typography>
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>Pending: {money(row.earnings_pending)}</Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>Partner Type</TableCell>
              <TableCell>Business Source</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Earning</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(transactions ?? []).map((t, i) => (
              <TableRow key={i} hover>
                <TableCell>{t.reference ?? '—'}</TableCell>
                <TableCell>{t.enrollment_type ?? '—'}</TableCell>
                <TableCell>{t.business_source ?? '—'}</TableCell>
                <TableCell>{money(t.revenue)}</TableCell>
                <TableCell>{money(t.earning)}</TableCell>
                <TableCell><StatusChip status={t.status} /></TableCell>
                <TableCell>{t.date ?? '—'}</TableCell>
              </TableRow>
            ))}
            {(!transactions || transactions.length === 0) && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No earning transactions yet.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
