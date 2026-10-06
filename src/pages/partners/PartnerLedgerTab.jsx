import { useQuery } from '@tanstack/react-query';
import { Box, TableHead, TableBody, TableRow, Typography } from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { api } from '../../api/client';

export function PartnerLedgerTab({ partnerId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['partners', partnerId, 'statement'],
    queryFn: async () => (await api.get(`/partners/${partnerId}/statement`)).data,
  });

  if (isLoading || !data) return <Box>Loading...</Box>;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Current Balance: <strong>₹{Number(data.current_balance).toLocaleString('en-IN')}</strong>
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Debit</TableCell>
            <TableCell align="right">Credit</TableCell>
            <TableCell align="right">Balance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.entry_date}</TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>{entry.transaction_type.replace(/_/g, ' ')}</TableCell>
              <TableCell>{entry.description}</TableCell>
              <TableCell align="right">{Number(entry.debit) ? Number(entry.debit).toLocaleString('en-IN') : ''}</TableCell>
              <TableCell align="right">{Number(entry.credit) ? Number(entry.credit).toLocaleString('en-IN') : ''}</TableCell>
              <TableCell align="right">{Number(entry.running_balance).toLocaleString('en-IN')}</TableCell>
            </TableRow>
          ))}
          {data.entries.length === 0 && (
            <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No ledger activity yet.</Typography></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
