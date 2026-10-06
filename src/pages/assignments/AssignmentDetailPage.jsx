import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Stack, Button, TextField, MenuItem, Chip, List, ListItem,
  ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { PARTNER_CODES_FOR } from '../../config/navigation';
import { DELIVERY_PAYMENT_METHODS } from '../../config/money';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { productLabel } from '../../config/products';

/**
 * Shared by both /app/assignments/:id (admin, editable) and /portal/assignments/:id
 * (partner portal, read-only) — the same assignment, the same data, but a partner-portal
 * account can never edit the assignment's own fields, only respond to it (accept/reject/
 * start/complete), which the backend enforces independently of whatever this page renders.
 */
export function AssignmentDetailPage({ basePath }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, isPartnerUser } = useAuth();
  const queryClient = useQueryClient();

  const canEditFields = !isPartnerUser && can('assignments.edit');
  const canReassign = !isPartnerUser && can('assignments.edit');

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignments', 'one', id],
    queryFn: async () => (await api.get(`/assignments/${id}`)).data,
  });

  const { data: categories } = useList('partner-categories');
  const { data: partnerTypes } = useList('partner-types');
  const isDelivery = assignment?.assignment_type === 'delivery';
  const { data: products } = useList('products', { status: 'active' }, { enabled: isDelivery && !isPartnerUser });

  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeAmount, setCompleteAmount] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignPartnerId, setReassignPartnerId] = useState('');
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliverError, setDeliverError] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  // Service/Delivery matching (requirement #12) — filters candidate partners by an active
  // enrollment of the matching type + category + location/service area, using the existing
  // AssignmentMatchingService::suggestPartners backend endpoint. Falls back to an unfiltered
  // partner list for assignment types with no corresponding partner type (lead/order/task).
  const matchingPartnerTypeId = (partnerTypes ?? []).find((t) => t.code === assignment?.assignment_type)?.id;
  const { data: suggestedPartners } = useList(
    'assignments/suggest-partners',
    {
      business_id: assignment?.business_id,
      location_id: assignment?.location_id ?? undefined,
      partner_category_id: assignment?.partner_category_id ?? undefined,
      partner_type_id: matchingPartnerTypeId,
    },
    { enabled: reassignOpen && !!assignment?.business_id && !!matchingPartnerTypeId }
  );
  const { data: allPartners } = useList(
    'partners',
    { per_page: 200, partner_type_code: PARTNER_CODES_FOR[assignment?.assignment_type] ?? '' },
    { enabled: reassignOpen && !matchingPartnerTypeId },
  );
  const partners = matchingPartnerTypeId ? { data: suggestedPartners ?? [] } : allPartners;

  useEffect(() => {
    if (assignment) {
      setForm({
        title: assignment.title ?? '',
        description: assignment.description ?? '',
        customer_name: assignment.customer_name ?? '',
        customer_phone: assignment.customer_phone ?? '',
        delivery_address: assignment.delivery_address ?? '',
        location: assignment.location ?? '',
        partner_category_id: assignment.partner_category_id ?? '',
        product_id: assignment.product_id ? String(assignment.product_id) : '',
        assigned_date: assignment.assigned_date ?? '',
        due_date: assignment.due_date ?? '',
        transaction_amount: assignment.transaction_amount ?? '',
        commission_percent: assignment.commission_percent ?? '',
        payment_direction: assignment.payment_direction ?? '',
      });
    }
  }, [assignment]);

  // Local preview of the photo picked in the Delivered dialog.
  useEffect(() => {
    if (!deliveryPhoto) {
      setDeliveryPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(deliveryPhoto);
    setDeliveryPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [deliveryPhoto]);

  // An uploaded proof photo lives behind the authenticated API, so load it as a blob.
  const hasUploadedProof = assignment?.delivery_proof?.startsWith('delivery-proofs/');
  useEffect(() => {
    if (!hasUploadedProof) {
      setProofImageUrl('');
      return undefined;
    }
    let url = '';
    let cancelled = false;
    api.get(`/assignments/${id}/delivery-proof`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        url = URL.createObjectURL(data);
        setProofImageUrl(url);
      })
      .catch(() => setProofImageUrl(''));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasUploadedProof, assignment?.delivery_proof]);

  const closeDeliver = () => {
    setDeliverOpen(false);
    setDeliveryPhoto(null);
    setDeliveryNote('');
    setDeliverError('');
  };

  const submitDelivered = async () => {
    setDeliverError('');
    setDelivering(true);
    const formData = new FormData();
    if (deliveryPhoto) formData.append('delivery_photo', deliveryPhoto);
    if (deliveryNote) formData.append('delivery_proof', deliveryNote);
    try {
      await api.post(`/assignments/${id}/deliver`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      setDeliverError(err.response?.data?.message ?? 'Could not mark as delivered');
      setDelivering(false);
      return;
    }
    setDelivering(false);
    closeDeliver();
    invalidate();
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assignments', 'one', id] });
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
  };

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const saveChanges = async () => {
    setError('');
    try {
      await api.put(`/assignments/${id}`, form);
      invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save changes');
    }
  };

  const runAction = async (action, payload) => {
    await api.post(`/assignments/${id}/${action}`, payload);
    invalidate();
  };

  const commissionAction = async (commissionId, action) => {
    await api.post(`/commissions/${commissionId}/${action}`);
    invalidate();
  };

  if (isLoading || !assignment || !form) return <Typography>Loading...</Typography>;

  const commission = assignment.commissions?.[0];
  const status = assignment.status;
  // Self-submitted assignments can only be actioned by admin staff from here on.
  const canRespond = !isPartnerUser || !assignment.was_submitted_by_partner;
  const locationLabel = { delivery: 'Pickup Location', service: 'Customer Location' }[assignment.assignment_type] ?? 'Location';
  // A delivery partner's commission is a % of the product amount.
  const amountLabel = assignment.assignment_type === 'delivery' ? 'Product Amount' : 'Transaction Amount';

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(basePath)}>Back to Assignments</Button>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5">{assignment.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            {assignment.reference_number && <Chip label={assignment.reference_number} size="small" />}
            <Chip label={assignment.assignment_type} size="small" sx={{ textTransform: 'capitalize' }} />
            <StatusChip status={status} />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {canRespond && status === 'pending' && (
            <>
              <Button variant="outlined" onClick={() => runAction('accept')}>Accept</Button>
              <Button variant="outlined" color="error" onClick={() => runAction('reject')}>Reject</Button>
            </>
          )}
          {assignment.assignment_type !== 'delivery' && canRespond && status === 'accepted' && (
            <Button variant="outlined" onClick={() => runAction('start')}>Start</Button>
          )}
          {assignment.assignment_type !== 'delivery' && canRespond && status === 'in_progress' && (
            <Button variant="outlined" onClick={() => { setCompleteAmount(assignment.transaction_amount ?? ''); setCompleteOpen(true); }}>
              Complete
            </Button>
          )}
          {assignment.assignment_type === 'delivery' && canRespond && status === 'accepted' && (
            <Button variant="outlined" onClick={() => runAction('pick-up')}>Pick Up</Button>
          )}
          {assignment.assignment_type === 'delivery' && canRespond && status === 'picked_up' && (
            <Button variant="outlined" onClick={() => runAction('out-for-delivery')}>Out for Delivery</Button>
          )}
          {assignment.assignment_type === 'delivery' && canRespond && status === 'out_for_delivery' && (
            <>
              <Button variant="outlined" color="success" onClick={() => setDeliverOpen(true)}>
                Delivered
              </Button>
              <Button variant="outlined" color="error" onClick={() => setFailOpen(true)}>Mark Failed</Button>
            </>
          )}
          {canReassign && !['completed', 'cancelled', 'reassigned'].includes(status) && (
            <Button variant="outlined" onClick={() => setReassignOpen(true)}>Reassign</Button>
          )}
        </Stack>
      </Box>

      {isPartnerUser && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {assignment.was_submitted_by_partner
            ? 'You submitted this assignment yourself — only admin staff can respond to it or edit its details from here.'
            : 'You can respond to this assignment, but only admin staff can edit its details.'}
        </Alert>
      )}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Changes saved.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Details</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Partner</Typography>
                <Typography variant="body2">{assignment.partner?.name ?? 'Unassigned'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Assignment Type</Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{assignment.assignment_type}</Typography>
              </Grid>

              <Grid size={12}>
                {canEditFields ? (
                  <TextField label="Title" value={form.title} onChange={(e) => set('title', e.target.value)} fullWidth />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">Title</Typography>
                    <Typography variant="body2">{assignment.title}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={12}>
                {canEditFields ? (
                  <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} multiline minRows={2} fullWidth />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{assignment.description || '—'}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                {canEditFields ? (
                  <TextField label={locationLabel} value={form.location} onChange={(e) => set('location', e.target.value)} fullWidth />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">{locationLabel}</Typography>
                    <Typography variant="body2">{assignment.location || '—'}</Typography>
                  </>
                )}
              </Grid>

              {(assignment.assignment_type === 'service' || assignment.assignment_type === 'delivery') && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {canEditFields ? (
                      <TextField label="Customer" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} fullWidth />
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">Customer</Typography>
                        <Typography variant="body2">{assignment.customer_name || '—'}</Typography>
                      </>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {canEditFields ? (
                      <TextField label="Customer Contact" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} fullWidth />
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">Customer Contact</Typography>
                        <Typography variant="body2">{assignment.customer_phone || '—'}</Typography>
                      </>
                    )}
                  </Grid>
                </>
              )}

              {assignment.assignment_type === 'delivery' && (
                <Grid size={12}>
                  {canEditFields ? (
                    <TextField label="Delivery Address" value={form.delivery_address} onChange={(e) => set('delivery_address', e.target.value)} multiline minRows={2} fullWidth />
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
                      <Typography variant="body2">{assignment.delivery_address || '—'}</Typography>
                    </>
                  )}
                  {assignment.delivery_proof && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Delivery proof</Typography>
                      {hasUploadedProof ? (
                        proofImageUrl ? (
                          <Box component="a" href={proofImageUrl} target="_blank" rel="noopener noreferrer">
                            <Box
                              component="img" src={proofImageUrl} alt="Delivery proof"
                              sx={{ mt: 0.5, maxWidth: 240, maxHeight: 240, borderRadius: 1, border: 1, borderColor: 'divider', display: 'block' }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Loading photo...</Typography>
                        )
                      ) : (
                        <Typography variant="body2">{assignment.delivery_proof}</Typography>
                      )}
                    </Box>
                  )}
                  {assignment.completed_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Completed: {assignment.completed_at}
                    </Typography>
                  )}
                  {assignment.failure_reason && (
                    <Alert severity="error" sx={{ mt: 1 }}>Failure reason: {assignment.failure_reason}</Alert>
                  )}
                </Grid>
              )}

              {assignment.assignment_type === 'delivery' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  {canEditFields ? (
                    <TextField select label="Payment Method" value={form.payment_direction} onChange={(e) => set('payment_direction', e.target.value)} fullWidth>
                      <MenuItem value="">Not set</MenuItem>
                      {Object.entries(DELIVERY_PAYMENT_METHODS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                    </TextField>
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                      <Typography variant="body2">{DELIVERY_PAYMENT_METHODS[assignment.payment_direction] ?? '—'}</Typography>
                      {assignment.payment_direction === 'customer_pays_partner' && assignment.transaction_amount != null && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Collect ₹{Number(assignment.transaction_amount).toLocaleString('en-IN')} from the customer on delivery (COD).
                        </Alert>
                      )}
                    </>
                  )}
                </Grid>
              )}

              {assignment.assignment_type === 'service' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {canEditFields ? (
                      <TextField
                        select label="Payment Direction" value={form.payment_direction}
                        onChange={(e) => set('payment_direction', e.target.value)} fullWidth
                      >
                        <MenuItem value="">Not set</MenuItem>
                        <MenuItem value="customer_pays_partner">Customer pays partner directly (partner owes us commission)</MenuItem>
                        <MenuItem value="customer_pays_lizyweb">Customer pays Lizyweb (we pay partner their share)</MenuItem>
                      </TextField>
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">Payment Direction</Typography>
                        <Typography variant="body2">
                          {assignment.payment_direction === 'customer_pays_partner' ? 'Customer pays partner directly'
                            : assignment.payment_direction === 'customer_pays_lizyweb' ? 'Customer pays Lizyweb' : '—'}
                        </Typography>
                      </>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {canEditFields ? (
                      <TextField
                        type="number" label="Commission %" value={form.commission_percent}
                        onChange={(e) => set('commission_percent', e.target.value)} fullWidth
                      />
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary">Commission %</Typography>
                        <Typography variant="body2">{assignment.commission_percent != null ? `${assignment.commission_percent}%` : '—'}</Typography>
                      </>
                    )}
                  </Grid>
                  {assignment.transaction_amount != null && assignment.commission_percent != null && assignment.payment_direction && (
                    <Grid size={12}>
                      <Alert severity="info">
                        {assignment.payment_direction === 'customer_pays_partner' ? (
                          <>Partner collects ₹{Number(assignment.transaction_amount).toLocaleString('en-IN')} from the customer directly, and owes Lizyweb ₹{Number(assignment.transaction_amount * assignment.commission_percent / 100).toLocaleString('en-IN')} commission.</>
                        ) : (
                          <>Lizyweb collects ₹{Number(assignment.transaction_amount).toLocaleString('en-IN')} from the customer — Lizyweb keeps ₹{Number(assignment.transaction_amount * assignment.commission_percent / 100).toLocaleString('en-IN')}, partner is paid out ₹{Number(assignment.transaction_amount * (100 - assignment.commission_percent) / 100).toLocaleString('en-IN')}.</>
                        )}
                      </Alert>
                    </Grid>
                  )}
                </>
              )}

              {isDelivery ? (
                // Deliveries are for one of our listed Products, not a partner Category.
                <Grid size={{ xs: 12, sm: 6 }}>
                  {canEditFields ? (
                    <TextField
                      select label="Product" value={form.product_id}
                      onChange={(e) => set('product_id', e.target.value)} fullWidth
                    >
                      <MenuItem value="">None</MenuItem>
                      {(products ?? []).map((p) => <MenuItem key={p.id} value={String(p.id)}>{productLabel(p)}</MenuItem>)}
                    </TextField>
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary">Product</Typography>
                      <Typography variant="body2">{assignment.product?.name ?? '—'}</Typography>
                    </>
                  )}
                </Grid>
              ) : (
                <Grid size={{ xs: 12, sm: 6 }}>
                  {canEditFields ? (
                    <TextField
                      select label="Category" value={form.partner_category_id}
                      onChange={(e) => set('partner_category_id', e.target.value)} fullWidth
                    >
                      <MenuItem value="">None</MenuItem>
                      {(categories ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </TextField>
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary">Category</Typography>
                      <Typography variant="body2">{assignment.partner_category?.name ?? '—'}</Typography>
                    </>
                  )}
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                {canEditFields ? (
                  <TextField
                    type="date" label="Assigned Date" value={form.assigned_date}
                    onChange={(e) => set('assigned_date', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth
                  />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">Assigned Date</Typography>
                    <Typography variant="body2">{assignment.assigned_date || '—'}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                {canEditFields ? (
                  <TextField
                    type="date" label="Due Date" value={form.due_date}
                    onChange={(e) => set('due_date', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth
                  />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">Due Date</Typography>
                    <Typography variant="body2">{assignment.due_date || '—'}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                {canEditFields ? (
                  <TextField
                    type="number" label={amountLabel} value={form.transaction_amount}
                    onChange={(e) => set('transaction_amount', e.target.value)} fullWidth
                  />
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">{amountLabel}</Typography>
                    <Typography variant="body2">
                      {assignment.transaction_amount != null ? `₹${Number(assignment.transaction_amount).toLocaleString('en-IN')}` : '—'}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>

            {canEditFields && (
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={saveChanges}>Save Changes</Button>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {commission?.direction === 'from_partner' ? 'Owed to Lizyweb' : 'Commission'}
            </Typography>
            {commission ? (
              <Stack spacing={1}>
                <Typography variant="h6">₹{Number(commission.commission_amount).toLocaleString('en-IN')}</Typography>
                {commission.direction === 'from_partner' && (
                  <Typography variant="caption" color="text.secondary">What the partner owes Lizyweb (they collected payment directly from the customer).</Typography>
                )}
                <StatusChip status={commission.status} />
                {can('commissions.approve') && !isPartnerUser && commission.status === 'pending' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" color="success" variant="outlined" onClick={() => commissionAction(commission.id, 'approve')}>Approve</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => commissionAction(commission.id, 'reject')}>Reject</Button>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No commission generated yet.</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>History</Typography>
            <List dense disablePadding>
              {(assignment.history ?? []).map((h) => (
                <ListItem key={h.id} divider disableGutters sx={{ py: 1 }}>
                  <ListItemText
                    primary={`${h.from_status ?? 'created'} → ${h.to_status}`}
                    secondary={
                      <>
                        {h.changed_by?.name ?? 'System'} · {h.created_at}
                        {h.notes && <Box component="span" sx={{ display: 'block' }}>{h.notes}</Box>}
                      </>
                    }
                  />
                </ListItem>
              ))}
              {(assignment.history ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">No history yet.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Assignment</DialogTitle>
        <DialogContent>
          <TextField
            type="number" label="Transaction Amount" fullWidth sx={{ mt: 1 }}
            value={completeAmount} onChange={(e) => setCompleteAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await runAction('complete', { transaction_amount: completeAmount || assignment.transaction_amount });
              setCompleteOpen(false);
            }}
          >
            Complete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reassign to Partner</DialogTitle>
        <DialogContent>
          <TextField
            select label="New Partner" fullWidth sx={{ mt: 1 }}
            value={reassignPartnerId} onChange={(e) => setReassignPartnerId(e.target.value)}
          >
            {(partners?.data ?? []).filter((p) => p.id !== assignment.partner_id).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!reassignPartnerId}
            onClick={async () => {
              const { data: newAssignment } = await api.post(`/assignments/${id}/reassign`, { partner_id: reassignPartnerId });
              setReassignOpen(false);
              navigate(`${basePath}/${newAssignment.id}`);
            }}
          >
            Reassign
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deliverOpen} onClose={closeDeliver} maxWidth="xs" fullWidth>
        <DialogTitle>Mark as Delivered</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {deliverError && <Alert severity="error">{deliverError}</Alert>}
            <Button component="label" variant="outlined">
              {deliveryPhoto ? 'Change Photo' : 'Upload Delivery Photo'}
              <input
                type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { setDeliveryPhoto(e.target.files[0] ?? null); e.target.value = ''; }}
              />
            </Button>
            {deliveryPhotoPreview && (
              <Box>
                <Box
                  component="img" src={deliveryPhotoPreview} alt="Selected delivery photo"
                  sx={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" noWrap>{deliveryPhoto.name}</Typography>
                  <Button size="small" color="error" onClick={() => setDeliveryPhoto(null)}>Remove</Button>
                </Stack>
              </Box>
            )}
            <TextField
              label="Note (optional)" placeholder="e.g. Handed to customer at gate"
              value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 255 } }} fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              Photo is optional, but recommended as proof of delivery (max 10 MB).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeliver} disabled={delivering}>Cancel</Button>
          <Button variant="contained" color="success" onClick={submitDelivered} disabled={delivering}>
            {delivering ? 'Saving...' : 'Mark Delivered'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={failOpen} onClose={() => setFailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark Delivery Failed</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason" fullWidth multiline minRows={2} sx={{ mt: 1 }}
            value={failReason} onChange={(e) => setFailReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFailOpen(false)}>Cancel</Button>
          <Button
            variant="contained" color="error" disabled={!failReason}
            onClick={async () => {
              await runAction('fail', { reason: failReason });
              setFailOpen(false);
              setFailReason('');
            }}
          >
            Mark Failed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
