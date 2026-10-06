import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, TextField, MenuItem } from '@mui/material';
import { DataGrid } from '../components/table';
import { useList } from '../api/resource';

export function LedgerPage() {
  const [searchParams] = useSearchParams();
  const [partnerId, setPartnerId] = useState('');
  const [balance, setBalance] = useState(() => searchParams.get('balance') ?? '');
  const { data: partners } = useList('partners', { per_page: 200 });
  const { data, isLoading } = useList('ledger', { partner_id: partnerId, per_page: 100 });
  const rows = (data?.data ?? []).filter((r) => {
    if (balance === 'payable') return Number(r.running_balance) > 0;
    if (balance === 'receivable') return Number(r.running_balance) < 0;
    return true;
  });

  const columns = [
    { field: 'entry_date', headerName: 'Date', width: 120 },
    { field: 'partner', headerName: 'Partner', flex: 1, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'transaction_type', headerName: 'Type', width: 140 },
    { field: 'description', headerName: 'Description', flex: 1.5 },
    { field: 'debit', headerName: 'Debit', width: 110 },
    { field: 'credit', headerName: 'Credit', width: 110 },
    { field: 'running_balance', headerName: 'Balance', width: 120 },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Ledger</Typography>
      <TextField select label="Partner" size="small" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} sx={{ width: 260, mb: 2, mr: 2 }}>
        <MenuItem value="">All Partners</MenuItem>
        {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
      </TextField>
      <TextField select label="Balance" size="small" value={balance} onChange={(e) => setBalance(e.target.value)} sx={{ width: 220, mb: 2 }}>
        <MenuItem value="">All</MenuItem>
        <MenuItem value="payable">Payable (owed to partner)</MenuItem>
        <MenuItem value="receivable">Receivable (owed by partner)</MenuItem>
      </TextField>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
        />
      </Paper>
    </Box>
  );
}
