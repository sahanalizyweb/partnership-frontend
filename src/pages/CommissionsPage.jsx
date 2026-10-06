import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Button, TextField, Alert, Snackbar, Chip, Tabs, Tab, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { money, commissionStatus, commissionSource, commissionPercent, directionLabel, awaitingCustomerPayment } from '../config/money';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'approved', label: 'Approved — due' },
  { value: 'paid', label: 'Paid / Received' },
  { value: 'rejected', label: 'Rejected' },
];

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_PAY = { payment_date: today(), payment_method: '', reference_number: '', notes: '' };

/**
 * The one place commission money is handled. Every commission goes:
 *   Waiting for approval -> Approved (due) -> Paid / Received
 * "We pay partners" = sales/affiliate/referral/delivery commissions and service jobs the
 * customer paid us for. "Partners pay us" = service jobs where the customer paid the partner.
 */
export function CommissionsPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const direction = searchParams.get('direction') ?? '';
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState(EMPTY_PAY);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useList('commissions', { status, direction, per_page: 100 });
  const { data: all } = useList('commissions', { direction, per_page: 500 });
  const rows = data?.data ?? [];
  const allRows = all?.data ?? [];
  const sumOf = (fn) => allRows.filter(fn).reduce((t, c) => t + Number(c.commission_amount), 0);

  const setParam = (key, value) => setSearchParams((params) => {
    if (value) params.set(key, value); else params.delete(key);
    return params;
  });

  const refresh = () => ['commissions', 'sales', 'assignments', 'payments', 'dashboard', 'ledger']
    .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

  const act = async (row, action) => {
    setError('');
    try {
      await api.post(`/commissions/${row.id}/${action}`);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message ?? `Could not ${action} commission`);
    }
  };

  const openPay = (row) => {
    setPayForm({ ...EMPTY_PAY, payment_date: today() });
    setPayTarget(row);
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/commissions/${payTarget.id}/record-payment`, payForm);
      setPayTarget(null);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record the payment');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: 'transaction_reference', headerName: 'Reference', width: 140, valueGetter: (v, row) => row.sale?.reference_number ?? row.assignment?.reference_number ?? v ?? `#${row.id}` },
    { field: 'partner', headerName: 'Partner', flex: 1, minWidth: 140, valueGetter: (v, row) => row.partner?.name ?? '' },
    { field: 'source', headerName: 'Earned for', flex: 1.2, minWidth: 180, valueGetter: (v, row) => commissionSource(row) },
    { field: 'direction', headerName: 'Who pays', width: 140, valueGetter: (v) => directionLabel(v) },
    { field: 'base_amount', headerName: 'Deal amount', width: 120, valueGetter: (v) => money(v) },
    { field: 'rate', headerName: 'Share', width: 80, sortable: false, valueGetter: (v, row) => commissionPercent(row) },
    { field: 'commission_amount', headerName: 'Amount', width: 120, valueGetter: (v) => money(v) },
    {
      field: 'status', headerName: 'Status', width: 190,
      renderCell: (params) => {
        const s = commissionStatus(params.row);
        return <Chip size="small" label={s.label} color={s.color} variant={s.color === 'default' ? 'outlined' : 'filled'} />;
      },
    },
    {
      field: 'paid', headerName: 'Paid on / Ref', width: 170, sortable: false,
      valueGetter: (v, row) => {
        const p = row.payments?.[0];
        return p ? `${p.payment_date} · ${p.reference_number}` : '—';
      },
    },
    {
      field: 'actions', headerName: 'Next step', width: 250, sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const toPartner = row.direction !== 'from_partner';
        const payable = ['pending', 'approved', 'payable'].includes(row.status) && Number(row.commission_amount) > 0;
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }} onClick={(e) => e.stopPropagation()}>
            {row.status === 'pending' && awaitingCustomerPayment(row) && (
              <Typography variant="caption" color="text.secondary">Customer paid {money(row.sale?.amount_paid)} of {money(row.sale?.sale_amount)}</Typography>
            )}
            {row.status === 'pending' && !awaitingCustomerPayment(row) && can('commissions.approve') && (
              <>
                <Button size="small" onClick={() => act(row, 'approve')}>Approve</Button>
                <Button size="small" color="error" onClick={() => act(row, 'reject')}>Reject</Button>
              </>
            )}
            {payable && row.status !== 'pending' && can('payments.create') && (
              <Button size="small" variant="contained" color={toPartner ? 'primary' : 'success'} onClick={() => openPay(row)}>
                {toPartner ? 'Pay partner' : 'Record received'}
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  const cards = [
    { label: 'Waiting for your approval', value: money(sumOf((c) => c.status === 'pending')), hint: `${allRows.filter((c) => c.status === 'pending' && !awaitingCustomerPayment(c)).length} to check · ${allRows.filter(awaitingCustomerPayment).length} waiting for customer payment`, filter: { status: 'pending' }, color: 'warning.main' },
    { label: 'We need to pay partners', value: money(sumOf((c) => ['approved', 'payable'].includes(c.status) && c.direction !== 'from_partner')), hint: 'Approved, not yet paid', filter: { status: 'approved', direction: 'to_partner' }, color: 'primary.main' },
    { label: 'Partners need to pay us', value: money(sumOf((c) => ['approved', 'payable'].includes(c.status) && c.direction === 'from_partner')), hint: 'Approved, not yet received', filter: { status: 'approved', direction: 'from_partner' }, color: 'error.main' },
    { label: 'Settled', value: money(sumOf((c) => c.status === 'paid')), hint: 'Paid out + received', filter: { status: 'paid' }, color: 'success.main' },
  ];

  return (
    <Box>
      <Typography variant="h5">Commissions &amp; Payouts</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every commission is created automatically when a sale is recorded or a job/delivery is completed.
        Check it and <b>Approve</b>, then <b>Pay partner</b> (or <b>Record received</b> when the partner owes us).
        Recording the payment updates the partner&apos;s balance and shows in their portal straight away.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {cards.map((c) => (
          <Grid key={c.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              onClick={() => setSearchParams(new URLSearchParams(c.filter))}
              sx={{ p: 2, cursor: 'pointer', height: '100%', '&:hover': { boxShadow: 4 } }}
            >
              <Typography variant="body2" color="text.secondary">{c.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: c.color }}>{c.value}</Typography>
              <Typography variant="caption" color="text.secondary">{c.hint}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={direction} onChange={(e, v) => setParam('direction', v)} variant="scrollable">
          <Tab value="" label="All commissions" />
          <Tab value="to_partner" label="We pay partners" />
          <Tab value="from_partner" label="Partners pay us" />
        </Tabs>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value} label={f.label} clickable
            color={status === f.value ? 'primary' : 'default'} variant={status === f.value ? 'filled' : 'outlined'}
            onClick={() => setParam('status', f.value)}
          />
        ))}
      </Stack>

      <Paper sx={{ height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          onRowClick={(params) => {
            if (params.row.assignment_id) navigate(`/app/assignments/${params.row.assignment_id}`);
            else if (params.row.sale_id) navigate('/app/sales');
          }}
          sx={{ cursor: 'pointer' }}
          localeText={{ noRowsLabel: 'No commissions here yet' }}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>

      <Dialog open={!!payTarget} onClose={() => setPayTarget(null)} maxWidth="xs" fullWidth>
        <form onSubmit={submitPay}>
          <DialogTitle>{payTarget?.direction === 'from_partner' ? 'Record payment received' : 'Pay partner'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="info">
                {payTarget?.direction === 'from_partner'
                  ? <><b>{payTarget?.partner?.name}</b> pays us <b>{money(payTarget?.commission_amount)}</b> for {commissionSource(payTarget)}.</>
                  : <>We pay <b>{payTarget?.partner?.name}</b> <b>{money(payTarget?.commission_amount)}</b> for {commissionSource(payTarget)}.</>}
              </Alert>
              <TextField type="date" label="Payment date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Payment method" placeholder="UPI / Bank transfer / Cash / Cheque" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} fullWidth />
              <TextField label="Transaction / Reference number" value={payForm.reference_number} onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })} helperText="Leave blank to auto-generate" fullWidth />
              <TextField label="Notes" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {payTarget?.direction === 'from_partner' ? 'Save — received' : 'Save — paid'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
