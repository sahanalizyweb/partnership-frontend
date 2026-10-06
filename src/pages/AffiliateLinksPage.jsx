import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, Autocomplete, InputAdornment, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../components/table';
import { useList } from '../api/resource';
import { api } from '../api/client';
import { PARTNER_CODES_FOR } from '../config/navigation';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { productLabel } from '../config/products';

const EMPTY_FORM = { partner: null, product: null, commission_percent: '', clicks_count: 0, enquiries_count: 0, conversions_count: 0, notes: '' };
const COUNT_INPUT = { htmlInput: { min: 0, step: 1 } };
const countValue = (v) => (v === '' ? 0 : Number(v));

const COUNTS = [
  { key: 'clicks_count', label: 'Clicks' },
  { key: 'enquiries_count', label: 'Enquiries' },
  { key: 'conversions_count', label: 'Sales' },
];

/** Clicks / Enquiries / Sales — counted automatically, correctable by hand (whole numbers, never below 0). */
function CountFields({ form, setForm }) {
  return (
    <Stack direction="row" spacing={2}>
      {COUNTS.map((c) => (
        <TextField
          key={c.key} type="number" label={c.label} value={form[c.key]} slotProps={COUNT_INPUT} fullWidth
          onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
        />
      ))}
    </Stack>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Tooltip title={copied ? 'Copied' : 'Copy'}>
      <IconButton
        size="small" edge="end"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        <ContentCopyRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

/**
 * Method A attribution (requirement #8) — a partner's unique affiliate link for one product.
 * Admin only picks Partner + Product; the code, tracking URL and commission % are generated
 * by the backend (commission % stays editable for admin to verify). Clicks, enquiries and sales
 * are counted automatically (website click/enquiry API, recorded sales); admin can correct them.
 */
export function AffiliateLinksPage() {
  const { can, user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null); // { code, target_url, commission_percent, commission_source }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // { id, code, commission_percent, clicks_count, conversions_count, notes }

  const { data, isLoading } = useList('affiliate-links', { per_page: 100 });
  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR.affiliate }, { enabled: open });
  const { data: products } = useList('products', { status: 'active' }, { enabled: open });

  const partnerId = form.partner?.id;
  const productId = form.product?.id;

  // Partner + Product chosen → fetch a fresh code, the tracking URL and the applicable commission %.
  useEffect(() => {
    if (!open || !partnerId || !productId) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setError('');
    api.get('/affiliate-links/preview', { params: { partner_id: partnerId, product_id: productId } })
      .then(({ data: p }) => {
        if (cancelled) return;
        setPreview(p);
        setForm((f) => ({ ...f, commission_percent: p.commission_percent ?? '' }));
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(err.response?.data?.message ?? 'Could not generate the affiliate link');
        }
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [open, partnerId, productId]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['affiliate-links'] });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPreview(null);
    setError('');
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!preview) return;
    setError('');
    setSaving(true);
    try {
      await api.post('/affiliate-links', {
        partner_id: partnerId,
        product_id: productId,
        code: preview.code,
        commission_percent: form.commission_percent === '' ? null : form.commission_percent,
        clicks_count: countValue(form.clicks_count),
        enquiries_count: countValue(form.enquiries_count),
        conversions_count: countValue(form.conversions_count),
        notes: form.notes || null,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not create affiliate link');
      setSaving(false);
      return;
    }
    setSaving(false);
    setOpen(false);
    invalidate();
  };

  const setStatus = async (row, status) => {
    try {
      await api.put(`/affiliate-links/${row.id}`, { status });
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not update link');
    }
  };

  // Manual counting: +1 / -1 on a row's clicks or conversions.
  const adjustCount = async (row, field, change) => {
    try {
      await api.post(`/affiliate-links/${row.id}/count`, { field, change });
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not update the count');
    }
  };

  const openEdit = (row) => {
    setError('');
    setEditing({
      id: row.id,
      code: row.code,
      commission_percent: row.commission_percent != null ? Number(row.commission_percent) : '',
      clicks_count: row.clicks_count ?? 0,
      enquiries_count: row.enquiries_count ?? 0,
      conversions_count: row.conversions_count ?? 0,
      notes: row.notes ?? '',
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/affiliate-links/${editing.id}`, {
        commission_percent: editing.commission_percent === '' ? null : editing.commission_percent,
        clicks_count: countValue(editing.clicks_count),
        enquiries_count: countValue(editing.enquiries_count),
        conversions_count: countValue(editing.conversions_count),
        notes: editing.notes || null,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not update affiliate link');
      return;
    }
    setEditing(null);
    invalidate();
  };

  const canEdit = can('commissions.edit');
  const isGlobal = !user?.business_id;
  // A count with -1 / +1 next to it, so admin can correct the automatic count by hand.
  const stepButton = { minWidth: 0, px: 0.75, py: 0, color: 'text.secondary' };
  const countCell = (field) => (p) => (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
      {canEdit && (
        <Tooltip title="-1"><span>
          <Button size="small" color="inherit" sx={stepButton} disabled={!(p.value > 0)} onClick={() => adjustCount(p.row, field, -1)}>-1</Button>
        </span></Tooltip>
      )}
      <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{p.value ?? 0}</Typography>
      {canEdit && (
        <Tooltip title="+1"><Button size="small" color="inherit" sx={stepButton} onClick={() => adjustCount(p.row, field, 1)}>+1</Button></Tooltip>
      )}
    </Stack>
  );

  const remove = async (id) => {
    if (!window.confirm('Delete this affiliate link? Sales already attributed through it are kept.')) return;
    try {
      await api.delete(`/affiliate-links/${id}`);
      invalidate();
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete link');
    }
  };

  const columns = [
    { field: 'code', headerName: 'Code', width: 220 },
    { field: 'partner', headerName: 'Partner', flex: 1, minWidth: 130, valueGetter: (v, row) => row.partner?.name ?? '—' },
    { field: 'product', headerName: 'Product / Service', flex: 1, minWidth: 150, valueGetter: (v, row) => (row.product ? productLabel(row.product) : '—') },
    ...(isGlobal ? [{ field: 'business', headerName: 'Business', width: 110, valueGetter: (v, row) => row.business?.name ?? '—' }] : []),
    { field: 'commission_percent', headerName: 'Commission %', width: 120, valueGetter: (v) => (v != null ? `${Number(v)}%` : '—') },
    {
      field: 'target_url', headerName: 'Tracking URL', flex: 1.4, minWidth: 200, sortable: false,
      renderCell: (p) => (p.value ? (
        <Stack direction="row" sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="body2" noWrap title={p.value}>{p.value}</Typography>
          <CopyButton text={p.value} />
        </Stack>
      ) : '—'),
    },
    { field: 'clicks_count', headerName: 'Clicks', width: 120, renderCell: countCell('clicks') },
    { field: 'enquiries_count', headerName: 'Enquiries', width: 120, renderCell: countCell('enquiries') },
    { field: 'conversions_count', headerName: 'Sales', width: 120, renderCell: countCell('conversions') },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    {
      field: '_actions', headerName: 'Actions', width: 230, sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const buttons = [];
        if (canEdit) {
          buttons.push(<Button key="e" size="small" onClick={() => openEdit(row)}>Edit</Button>);
          buttons.push(row.status === 'active'
            ? <Button key="s" size="small" onClick={() => setStatus(row, 'inactive')}>Deactivate</Button>
            : <Button key="s" size="small" color="success" onClick={() => setStatus(row, 'active')}>Activate</Button>);
        }
        if (can('commissions.delete')) {
          buttons.push(<Button key="d" size="small" color="error" onClick={() => remove(row.id)}>Delete</Button>);
        }
        return buttons.length ? <Stack direction="row" spacing={0.5}>{buttons}</Stack> : null;
      },
    },
  ];

  const pendingPreview = !partnerId || !productId;

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5">Affiliate Links</Typography>
          <Typography variant="body2" color="text.secondary">
            Each link is one partner promoting one product or service. Counts are automatic. You can also correct them by hand.
          </Typography>
        </Box>
        {can('commissions.create') && <Button variant="contained" onClick={openCreate}>Create Affiliate Link</Button>}
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>Create Affiliate Link</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Autocomplete
                options={partners?.data ?? []}
                value={form.partner}
                onChange={(e, v) => setForm({ ...form, partner: v })}
                getOptionLabel={(p) => (p.partner_code ? `${p.name} (${p.partner_code})` : p.name)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Partner" required placeholder="Select affiliate partner" />}
              />
              <Autocomplete
                options={products ?? []}
                value={form.product}
                onChange={(e, v) => setForm({ ...form, product: v })}
                getOptionLabel={productLabel}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText="No matching product/service — add it under Products / Services first"
                renderInput={(params) => <TextField {...params} label="Product / Service" required placeholder="Search products and services" />}
              />
              <TextField
                label="Unique Code" value={preview?.code ?? ''} fullWidth
                placeholder={pendingPreview ? 'Generated after Partner + Product are selected' : ''}
                helperText="Auto-generated and checked for uniqueness"
                slotProps={{
                  inputLabel: { shrink: true },
                  input: { readOnly: true, endAdornment: previewLoading ? <CircularProgress size={18} /> : null },
                }}
              />
              <TextField
                type="number" label="Commission %" value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                disabled={pendingPreview}
                helperText={
                  pendingPreview ? 'Loaded from the product / commission rule once selected'
                    : preview?.commission_source ? `From: ${preview.commission_source} — verify before saving`
                      : 'No rate found for this product — enter one, or leave blank'
                }
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, max: 100, step: '0.01' } }}
                fullWidth
              />
              <TextField
                label="Target URL" value={preview?.target_url ?? ''} fullWidth
                placeholder={pendingPreview ? 'Generated after Partner + Product are selected' : ''}
                helperText="Auto-generated tracking link — share this with the partner"
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    readOnly: true,
                    endAdornment: preview?.target_url ? <InputAdornment position="end"><CopyButton text={preview.target_url} /></InputAdornment> : null,
                  },
                }}
              />
              <CountFields form={form} setForm={setForm} />
              <TextField label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!preview || previewLoading || saving}>
              {saving ? 'Creating...' : 'Create Affiliate Link'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        {editing && (
          <form onSubmit={submitEdit}>
            <DialogTitle>Edit Affiliate Link — {editing.code}</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  type="number" label="Commission %" value={editing.commission_percent}
                  onChange={(e) => setEditing({ ...editing, commission_percent: e.target.value })}
                  slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }} fullWidth
                />
                <CountFields form={editing} setForm={setEditing} />
                <TextField label="Notes (optional)" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} multiline minRows={2} fullWidth />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="contained">Save</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
}
