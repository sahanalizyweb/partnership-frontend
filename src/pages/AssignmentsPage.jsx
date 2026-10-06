import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar } from '@mui/material';
import { DataGrid } from '../components/table';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { api } from '../api/client';
import { DELIVERY_PAYMENT_METHODS } from '../config/money';
import { productLabel } from '../config/products';

const TYPE_OPTIONS = ['lead', 'order', 'service', 'task', 'delivery'];
const emptyForm = (type) => ({
  title: '', assignment_type: type || 'lead', business_id: '', partner_id: '', location: '', assigned_date: '', due_date: '',
  transaction_amount: '', commission_percent: '', payment_direction: ['service', 'delivery'].includes(type) ? 'customer_pays_lizyweb' : '',
  customer_name: '', customer_phone: '', delivery_address: '', product_id: '',
});

/** Plain-language preview of who pays whom for a service/delivery job, before it's saved. */
function MoneyPreview({ form }) {
  const amount = Number(form.transaction_amount);
  const rate = Number(form.commission_percent);
  if (!amount || form.commission_percent === '') return null;
  const fmt = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const ours = (amount * rate) / 100;
  let text;
  if (form.assignment_type === 'delivery') {
    const cod = form.payment_direction === 'customer_pays_partner'
      ? <>The customer pays the delivery partner <b>{fmt(amount)}</b> on delivery (COD), to be handed over to Lizy. </>
      : null;
    text = <>{cod}When delivered, the partner earns <b>{fmt(ours)}</b> ({rate}% of {fmt(amount)}) and Lizy pays it.</>;
  } else if (form.payment_direction === 'customer_pays_partner') {
    text = <>The customer pays the partner <b>{fmt(amount)}</b>. The partner then pays Lizy <b>{fmt(ours)}</b> commission ({rate}%).</>;
  } else {
    text = <>The customer pays Lizy <b>{fmt(amount)}</b>. Lizy keeps <b>{fmt(ours)}</b> ({rate}%) and pays the partner <b>{fmt(amount - ours)}</b>.</>;
  }
  return <Alert severity="success" icon={false}>{text} The commission is created automatically when the job is completed.</Alert>;
}

const STATUS_OPTIONS = ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled', 'reassigned'];

// `assignmentType` pins the list to one kind of work (Service / Delivery Assignments menus).
export function AssignmentsPage({ assignmentType = '', title = 'Assignments' }) {
  const { can, user } = useAuth();
  const needsBusiness = !user?.business_id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const partnerId = searchParams.get('partner_id') ?? '';
  const partnerName = searchParams.get('partner_name') ?? '';
  const commissionStatus = searchParams.get('commission_status') ?? '';
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);

  const { data, isLoading } = useList('assignments', { status, partner_id: partnerId, assignment_type: assignmentType, per_page: 100 });

  // Commission status isn't a filterable column on assignments — filtered client-side against
  // the commissions already eager-loaded per row (see AssignmentController::index).
  const rows = (data?.data ?? []).filter((a) => !commissionStatus || (a.commissions ?? []).some((c) => c.status === commissionStatus));

  const clearPartnerFilter = () => setSearchParams((params) => {
    params.delete('partner_id');
    params.delete('partner_name');
    return params;
  });

  const clearCommissionFilter = () => setSearchParams((params) => {
    params.delete('commission_status');
    return params;
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assignments'] });

  const [actionError, setActionError] = useState('');

  const runAction = async (id, action, payload) => {
    try {
      await api.post(`/assignments/${id}/${action}`, payload);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? `Could not ${action} assignment`);
    }
  };

  const commissionAction = async (commissionId, action) => {
    try {
      await api.post(`/commissions/${commissionId}/${action}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? `Could not ${action} commission`);
    }
  };

  const [form, setForm] = useState(emptyForm(assignmentType));
  // Only partners holding the matching role: service work -> Service Partners, deliveries -> Delivery Partners.
  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR[form.assignment_type] ?? '' });
  const { data: products } = useList('products', { status: 'active' }, { enabled: createOpen && form.assignment_type === 'delivery' });
  const { data: categories } = useList('partner-categories');
  const categoryName = (id) => (categories ?? []).find((c) => String(c.id) === String(id))?.name;

  // The category the chosen partner picked for this kind of work (their Service/Delivery role),
  // else their own category — the backend defaults the assignment to the same one on save.
  const selectedPartner = (partners?.data ?? []).find((p) => String(p.id) === String(form.partner_id));
  const partnerCategory = (() => {
    if (!selectedPartner) return null;
    const role = (selectedPartner.enrollments ?? []).find((e) => e.partner_type?.code === form.assignment_type);
    return categoryName(role?.partner_category_id) ?? selectedPartner.partner_category?.name ?? null;
  })();
  const { data: reassignPartners } = useList(
    'partners',
    { per_page: 200, partner_type_code: PARTNER_CODES_FOR[reassignTarget?.assignment_type] ?? '' },
    { enabled: !!reassignTarget },
  );
  const { data: businesses } = useList('businesses', {}, { enabled: needsBusiness && createOpen });
  const [createError, setCreateError] = useState('');

  const createAssignment = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      await api.post('/assignments', payload);
    } catch (err) {
      setCreateError(err.response?.data?.message ?? 'Could not create assignment');
      return;
    }
    setCreateOpen(false);
    setForm(emptyForm(assignmentType));
    invalidate();
  };

  const columns = [
    { field: 'reference_number', headerName: 'Reference #', width: 150, valueGetter: (v) => v || '—' },
    { field: 'title', headerName: 'Title', flex: 1 },
    { field: 'assignment_type', headerName: 'Type', width: 110 },
    { field: 'partner_category', headerName: 'Category', width: 140, valueGetter: (v, row) => row.partner_category?.name ?? '—' },
    { field: 'partner', headerName: 'Partner', flex: 1, valueGetter: (v, row) => row.partner?.name ?? 'Unassigned' },
    { field: 'due_date', headerName: 'Due', width: 120 },
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'transaction_amount', headerName: 'Amount', width: 110, valueGetter: (v) => (v ? `₹${Number(v).toLocaleString('en-IN')}` : '—') },
    { field: 'commission_percent', headerName: 'Comm. %', width: 90, valueGetter: (v) => (v !== null && v !== undefined ? `${Number(v)}%` : '—') },
    { field: 'payment_direction', headerName: 'Payment Flow', width: 170, valueGetter: (v) => ({ customer_pays_partner: 'Customer → Partner', customer_pays_lizyweb: 'Customer → Us' }[v] ?? '—') },
    {
      field: 'commission',
      headerName: 'Commission',
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const commission = params.row.commissions?.[0];
        if (!commission) return <Typography variant="body2" color="text.secondary">—</Typography>;
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="body2">₹{Number(commission.commission_amount).toLocaleString('en-IN')}</Typography>
            <StatusChip status={commission.status} />
          </Stack>
        );
      },
    },
    {
      field: '_actions',
      headerName: 'Actions',
      width: 340,
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const commission = row.commissions?.[0];
        const buttons = [];

        if (can('assignments.edit')) {
          if (row.status === 'pending') {
            buttons.push(<Button key="accept" size="small" onClick={() => runAction(row.id, 'accept')}>Accept</Button>);
            buttons.push(<Button key="reject" size="small" color="error" onClick={() => runAction(row.id, 'reject')}>Reject</Button>);
          }
          if (row.status === 'accepted') {
            buttons.push(<Button key="start" size="small" onClick={() => runAction(row.id, 'start')}>Start</Button>);
          }
          if (row.status === 'in_progress') {
            buttons.push(<Button key="complete" size="small" onClick={() => setCompleteTarget(row)}>Complete</Button>);
          }
          if (!['completed', 'cancelled', 'reassigned'].includes(row.status)) {
            buttons.push(<Button key="reassign" size="small" onClick={() => setReassignTarget(row)}>Reassign</Button>);
          }
        }

        if (can('commissions.approve') && commission?.status === 'pending') {
          buttons.push(<Button key="approve-commission" size="small" color="success" onClick={() => commissionAction(commission.id, 'approve')}>Approve Comm.</Button>);
          buttons.push(<Button key="reject-commission" size="small" color="error" onClick={() => commissionAction(commission.id, 'reject')}>Reject Comm.</Button>);
        }

        return buttons.length ? (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>{buttons}</Stack>
        ) : null;
      },
    },
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        {can('assignments.create') && <Button variant="contained" onClick={() => setCreateOpen(true)}>New Assignment</Button>}
      </Box>
      <TextField select label="Status" size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 220, mb: 2 }}>
        <MenuItem value="">All</MenuItem>
        {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
      </TextField>
      {partnerId && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={clearPartnerFilter}>Clear filter</Button>}
        >
          Showing assignments for <strong>{partnerName || `partner #${partnerId}`}</strong> only.
        </Alert>
      )}
      {commissionStatus && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={clearCommissionFilter}>Clear filter</Button>}
        >
          Showing assignments with <strong>{commissionStatus}</strong> commissions only.
        </Alert>
      )}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/app/assignments/${params.row.id}`)}
          sx={{ cursor: 'pointer' }}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={createAssignment}>
          <DialogTitle>New Assignment</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
              <TextField
                select label="Type" value={form.assignment_type} disabled={!!assignmentType}
                onChange={(e) => setForm({ ...form, assignment_type: e.target.value, partner_id: '' })} fullWidth
              >
                {TYPE_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField select label="Partner" value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} fullWidth>
                <MenuItem value="">Unassigned</MenuItem>
                {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
              {form.partner_id && (
                <TextField
                  label="Category" value={partnerCategory ?? 'No category set for this partner'} disabled fullWidth
                  helperText="The category this partner chose — saved on the assignment"
                />
              )}
              {needsBusiness && !form.partner_id && (
                <TextField
                  select label="Business" value={form.business_id}
                  onChange={(e) => setForm({ ...form, business_id: e.target.value })}
                  helperText="Required for an unassigned job (otherwise taken from the partner)" required fullWidth
                >
                  {(businesses ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
              )}
              <TextField
                label={{ delivery: 'Pickup Location', service: 'Customer Location' }[form.assignment_type] ?? 'Location'}
                placeholder="e.g. Andheri West, Mumbai" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth
              />
              <TextField type="date" label="Assigned Date" value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField type="date" label="Due Date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              {form.assignment_type === 'delivery' && (
                <>
                  <TextField
                    select label="Product" value={form.product_id}
                    onChange={(e) => {
                      const prod = (products ?? []).find((p) => String(p.id) === String(e.target.value));
                      // Pre-fill the order amount from the product's price, unless already typed.
                      setForm({ ...form, product_id: e.target.value, transaction_amount: form.transaction_amount || (prod?.amount ?? '') });
                    }}
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    {(products ?? []).map((p) => <MenuItem key={p.id} value={String(p.id)}>{productLabel(p)}</MenuItem>)}
                  </TextField>
                </>
              )}
              {/* Service and delivery jobs are for a customer — capture their details up front. */}
              {['service', 'delivery'].includes(form.assignment_type) && (
                <>
                  <TextField label="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} fullWidth />
                  <TextField
                    label="Customer Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 20 } }} fullWidth
                  />
                </>
              )}
              {form.assignment_type === 'delivery' && (
                <TextField label="Delivery Address" value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} multiline minRows={2} fullWidth />
              )}
              <TextField
                type="number" label={form.assignment_type === 'delivery' ? 'Product Amount' : form.assignment_type === 'service' ? 'Work Amount' : 'Transaction Amount'}
                value={form.transaction_amount} onChange={(e) => setForm({ ...form, transaction_amount: e.target.value })} fullWidth
              />
              {['service', 'delivery'].includes(form.assignment_type) && (
                <TextField
                  type="number" label="Commission %" value={form.commission_percent}
                  onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                  helperText={form.assignment_type === 'delivery' ? 'Partner earns this % of the amount' : 'Lizy’s commission % on this job'}
                  slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }} fullWidth
                />
              )}
              {form.assignment_type === 'service' && (
                <TextField select label="Who does the customer pay?" value={form.payment_direction} onChange={(e) => setForm({ ...form, payment_direction: e.target.value })} fullWidth>
                  <MenuItem value="customer_pays_lizyweb">Customer pays Lizy → Lizy pays the partner their share</MenuItem>
                  <MenuItem value="customer_pays_partner">Customer pays the partner → partner pays Lizy the commission</MenuItem>
                </TextField>
              )}
              {form.assignment_type === 'delivery' && (
                <TextField select label="Payment Method" value={form.payment_direction} onChange={(e) => setForm({ ...form, payment_direction: e.target.value })} fullWidth>
                  {Object.entries(DELIVERY_PAYMENT_METHODS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
              )}
              <MoneyPreview form={form} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!completeTarget} onClose={() => setCompleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Assignment</DialogTitle>
        <DialogContent>
          <TextField
            type="number" label="Transaction Amount" fullWidth sx={{ mt: 1 }}
            defaultValue={completeTarget?.transaction_amount ?? ''}
            onChange={(e) => setCompleteTarget((t) => ({ ...t, _amount: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await runAction(completeTarget.id, 'complete', { transaction_amount: completeTarget._amount || completeTarget.transaction_amount });
              setCompleteTarget(null);
            }}
          >
            Complete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!reassignTarget} onClose={() => setReassignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reassign to Partner</DialogTitle>
        <DialogContent>
          <TextField
            select label="New Partner" fullWidth sx={{ mt: 1 }}
            value={reassignTarget?._newPartnerId ?? ''}
            onChange={(e) => setReassignTarget((t) => ({ ...t, _newPartnerId: e.target.value }))}
          >
            {(reassignPartners?.data ?? []).filter((p) => p.id !== reassignTarget?.partner_id).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!reassignTarget?._newPartnerId}
            onClick={async () => {
              await runAction(reassignTarget.id, 'reassign', { partner_id: reassignTarget._newPartnerId });
              setReassignTarget(null);
            }}
          >
            Reassign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
