import { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Button, Stack, TableHead, TableBody, TableRow } from '@mui/material';
import { Table, TableCell } from '../../components/table';
import DownloadIcon from '@mui/icons-material/Download';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

const SECTIONS = [
  { key: 'agreements', label: 'Agreements', columns: ['agreement_number', 'agreement_type', 'status', 'start_date', 'end_date'] },
  { key: 'commissions', label: 'Commissions', columns: ['base_amount', 'commission_amount', 'status', 'created_at'] },
  { key: 'payments', label: 'Payments', columns: ['payment_type', 'direction', 'amount', 'status', 'payment_date'] },
  { key: 'settlements', label: 'Settlements', columns: ['settlement_number', 'period_start', 'period_end', 'net_payable', 'status'] },
  { key: 'performance', label: 'Performance', columns: ['period', 'conversions', 'conversion_rate', 'completion_rate', 'commission_generated', 'rank'] },
];

export function PartnerReportTab({ partnerId }) {
  const [tab, setTab] = useState(0);
  const section = SECTIONS[tab];

  const { data, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'report'],
    queryFn: async () => (await api.get(`/partners/${partnerId}/report`)).data,
  });

  const rows = data?.[section.key] ?? [];

  const exportCsv = async () => {
    const response = await api.get(`/partners/${partnerId}/report/export`, { params: { type: section.key }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${section.key}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {SECTIONS.map((s) => <Tab key={s.key} label={s.label} />)}
        </Tabs>
        <Button startIcon={<DownloadIcon />} onClick={exportCsv} variant="outlined" size="small">Export CSV</Button>
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {section.columns.map((c) => <TableCell key={c}>{c.replace(/_/g, ' ')}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id ?? i} hover>
                {section.columns.map((c) => (
                  <TableCell key={c}>{typeof row[c] === 'number' ? row[c].toLocaleString('en-IN') : (row[c] ?? '—')}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={section.columns.length}><Typography color="text.secondary">No data yet.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
