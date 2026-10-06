import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Button, MenuItem, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, IconButton, Link, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid } from '../components/table';
import { useList, useCreate, useUpdate, useRemove } from '../api/resource';
import { useAuth } from '../auth/AuthContext';
import { StatusChip } from '../components/crud/ResourceListPage';
import { PRODUCT_TYPES, slugify } from '../config/products';

const EMPTY_FORM = {
  business_id: '', type: 'product', name: '', slug: '', lizymart_url: '', page_url: '',
  description: '', amount: '', commission_percent: '', status: 'active',
};

// Lizyweb sells services (opened on lizyweb.in); Lizy Mart and others sell shop products.
const defaultTypeFor = (businessCode) => (businessCode === 'lizyweb' ? 'service' : 'product');

/**
 * Products / Services catalog. A Service (Lizyweb) opens AFFILIATE_SERVICE_BASE_URL?slug=…
 * unless it has its own Website Page URL; a Product (Lizy Mart) opens its Lizy Mart shop page.
 * The slug fills in from the name and stays editable; it must be unique per business.
 */
export function ProductsPage() {
  const { can, user } = useAuth();
  const isGlobal = !user?.business_id;
  const [typeFilter, setTypeFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionError, setActionError] = useState('');

  const { data: businessData } = useList('businesses');
  const businesses = Array.isArray(businessData) ? businessData : (businessData?.data ?? []);
  const ownBusinessCode = businesses.find((b) => b.id === user?.business_id)?.code;
  const { data, isLoading } = useList('products', { type: typeFilter || undefined, business_id: businessFilter || undefined });
  const { data: links } = useList('products/link-settings');
  const createMutation = useCreate('products');
  const updateMutation = useUpdate('products');
  const removeMutation = useRemove('products');

  const isService = form.type === 'service';

  // The page the affiliate link will open — shown read-only under the page field.
  const finalLink = isService
    ? form.page_url || (form.slug && links ? `${links.service_base_url}?slug=${form.slug}` : '')
    : form.lizymart_url || (form.slug && links ? `${links.storefront_url}/products/${form.slug}` : '');

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => {
    const lizyweb = businesses.find((b) => b.code === 'lizyweb');
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      business_id: isGlobal ? (lizyweb?.id ?? '') : '',
      type: defaultTypeFor(isGlobal ? lizyweb?.code : ownBusinessCode),
    });
    setSlugTouched(false);
    setError('');
    setFieldErrors({});
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      business_id: row.business_id, type: row.type ?? 'product', name: row.name, slug: row.slug ?? '',
      lizymart_url: row.lizymart_url ?? '', page_url: row.page_url ?? '', description: row.description ?? '',
      amount: row.amount, commission_percent: row.commission_percent, status: row.status ?? 'active',
    });
    setSlugTouched(true);
    setError('');
    setFieldErrors({});
    setOpen(true);
  };

  const pickBusiness = (id) => {
    const code = businesses.find((b) => String(b.id) === String(id))?.code;
    set({ business_id: id, type: defaultTypeFor(code) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const payload = {
      name: form.name,
      type: form.type,
      slug: form.slug || null,
      description: form.description || null,
      amount: form.amount,
      commission_percent: form.commission_percent,
      status: form.status,
      // A service may have its own Website Page URL; a product its Lizy Mart Page.
      ...(isService
        ? { page_url: form.page_url || null }
        : { lizymart_url: form.lizymart_url || null, page_url: null }),
      ...(!editing && isGlobal && { business_id: form.business_id }),
    };
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload });
      else await createMutation.mutateAsync(payload);
    } catch (err) {
      setFieldErrors(err.response?.data?.errors ?? {});
      setError(err.response?.data?.message ?? 'Could not save');
      return;
    }
    setOpen(false);
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      await removeMutation.mutateAsync(row.id);
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Could not delete');
    }
  };

  const columns = [
    { field: 'name', headerName: 'Product / Service', flex: 1, minWidth: 180 },
    {
      field: 'type', headerName: 'Type', width: 100,
      renderCell: (p) => <Chip size="small" label={p.value === 'service' ? 'Service' : 'Product'} color={p.value === 'service' ? 'primary' : 'default'} variant="outlined" />,
    },
    ...(isGlobal ? [{ field: 'business', headerName: 'Business', width: 120, valueGetter: (v, row) => row.business?.name ?? '—' }] : []),
    { field: 'slug', headerName: 'Slug', width: 200, valueGetter: (v) => v || '—' },
    {
      field: 'website_url', headerName: 'Page', flex: 1, minWidth: 220, sortable: false,
      renderCell: (p) => (p.value
        ? <Link href={p.value} target="_blank" rel="noopener noreferrer" variant="body2">{p.value}</Link>
        : <Typography variant="body2" color="text.secondary">—</Typography>),
    },
    { field: 'amount', headerName: 'Amount', width: 120, valueGetter: (v, row) => `₹${Number(row.amount).toLocaleString('en-IN')}` },
    { field: 'commission_percent', headerName: 'Commission %', width: 120, valueGetter: (v, row) => `${Number(row.commission_percent)}%` },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    ...(can('products.edit') || can('products.delete') ? [{
      field: '_actions', headerName: 'Actions', width: 100, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          {can('products.edit') && <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>}
          {can('products.delete') && <IconButton size="small" onClick={() => remove(p.row)}><DeleteIcon fontSize="small" /></IconButton>}
        </Stack>
      ),
    }] : []),
  ];

  return (
    <Box>
      <Snackbar open={!!actionError} autoHideDuration={4000} onClose={() => setActionError('')}>
        <Alert severity="error" onClose={() => setActionError('')}>{actionError}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5">Products / Services</Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All types</MenuItem>
            {PRODUCT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          {isGlobal && (
            <TextField select size="small" label="Business" value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="">All businesses</MenuItem>
              {businesses.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          )}
          {can('products.create') && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add</Button>}
        </Stack>
      </Box>
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={Array.isArray(data) ? data : (data?.data ?? [])}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={submit}>
          <DialogTitle>{editing ? 'Edit Product / Service' : 'Add Product / Service'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {isGlobal && !editing && (
                <TextField select label="Business" value={form.business_id} onChange={(e) => pickBusiness(e.target.value)} required fullWidth>
                  {businesses.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </TextField>
              )}
              <TextField
                select label="Type" value={form.type} onChange={(e) => set({ type: e.target.value })} required fullWidth
                helperText={isService ? 'A service opens its page on the Lizyweb website — no stock, no shop sync' : 'A product opens its page on the Lizy Mart shop'}
              >
                {PRODUCT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <TextField
                label="Name" value={form.name} required fullWidth
                onChange={(e) => set({ name: e.target.value, ...(!slugTouched && { slug: slugify(e.target.value) }) })}
              />
              <TextField
                label="Slug" value={form.slug} fullWidth
                onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') }); }}
                error={!!fieldErrors.slug}
                helperText={fieldErrors.slug?.[0] ?? 'Filled in from the name (lowercase, dashes) — you can change it. Unique per business.'}
              />
              {isService ? (
                <TextField
                  label="Website Page URL (optional)" value={form.page_url} onChange={(e) => set({ page_url: e.target.value })} fullWidth
                  placeholder="Leave empty to use the standard service page"
                  error={!!fieldErrors.page_url} helperText={fieldErrors.page_url?.[0] ?? `Link opens: ${finalLink || '— set a slug'}`}
                />
              ) : (
                <TextField
                  label="Lizy Mart Page" value={form.lizymart_url} onChange={(e) => set({ lizymart_url: e.target.value })} fullWidth
                  placeholder="https://lizymart.com/products/coconut-scraper"
                  helperText={`The product's page on Lizy Mart (sets the slug). Link opens: ${finalLink || '—'}`}
                />
              )}
              <TextField label="Description" value={form.description} onChange={(e) => set({ description: e.target.value })} multiline minRows={2} fullWidth />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField type="number" label="Amount" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth />
                <TextField type="number" label="Fixed Standard Commission %" value={form.commission_percent} onChange={(e) => set({ commission_percent: e.target.value })} required slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }} fullWidth />
              </Stack>
              <TextField select label="Status" value={form.status} onChange={(e) => set({ status: e.target.value })} fullWidth>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
