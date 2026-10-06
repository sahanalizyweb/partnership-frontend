import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useList } from '../api/resource';
import { api } from '../api/client';
import { productLabel } from '../config/products';
import { ENQUIRY_STATUSES } from '../config/enquiries';

const today = () => new Date().toISOString().slice(0, 10);

const fromEnquiry = (e) => ({
  partner_id: e?.partner_id ?? '',
  product_id: e?.product_id ? String(e.product_id) : '',
  customer_name: e?.customer_name ?? '',
  customer_phone: e?.customer_phone ?? '',
  customer_email: e?.customer_email ?? '',
  message: e?.message ?? '',
  enquiry_date: e?.enquiry_date ?? today(),
  status: e?.status ?? 'new',
  notes: e?.notes ?? '',
});

/**
 * Add / edit an affiliate enquiry by hand. `admin`: picks the affiliate partner and can set the
 * status and notes. Partner portal: always the logged-in partner (enforced by the backend), and
 * only their own hand-entered enquiry while it's still "new".
 */
export function EnquiryDialog({ open, onClose, enquiry = null, admin = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => fromEnquiry(enquiry));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: partners } = useList('partners', { per_page: 200, partner_type_code: 'affiliate' }, { enabled: open && admin });
  const { data: products } = useList('products', { status: 'active' }, { enabled: open });
  const partner = (partners?.data ?? []).find((p) => String(p.id) === String(form.partner_id));
  // An enquiry belongs to the business of its product/service — offer the partner's business only.
  const productOptions = (products ?? []).filter((p) => !partner || p.business_id === partner.business_id);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      product_id: form.product_id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email || null,
      message: form.message || null,
      enquiry_date: form.enquiry_date || null,
      ...(admin && { status: form.status, notes: form.notes || null }),
      ...(admin && !enquiry && { partner_id: form.partner_id }),
    };
    try {
      if (!enquiry) await api.post('/affiliate-enquiries', payload);
      else if (admin) await api.put(`/affiliate-enquiries/${enquiry.id}`, payload);
      else await api.put(`/me/affiliate-enquiries/${enquiry.id}`, payload);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not save the enquiry');
      setSaving(false);
      return;
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['affiliate-enquiries'] });
    queryClient.invalidateQueries({ queryKey: ['affiliate-links'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>{enquiry ? 'Edit Enquiry' : 'Add Enquiry'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {admin && !enquiry && (
              <TextField select label="Affiliate Partner" value={form.partner_id} onChange={(e) => set({ partner_id: e.target.value, product_id: '' })} required fullWidth>
                {(partners?.data ?? []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name} ({p.partner_code})</MenuItem>)}
              </TextField>
            )}
            <TextField select label="Service / Product" value={form.product_id} onChange={(e) => set({ product_id: e.target.value })} required fullWidth>
              {productOptions.map((p) => <MenuItem key={p.id} value={String(p.id)}>{productLabel(p)}</MenuItem>)}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Customer Name" value={form.customer_name} onChange={(e) => set({ customer_name: e.target.value })} required fullWidth />
              <TextField label="Customer Phone" value={form.customer_phone} onChange={(e) => set({ customer_phone: e.target.value })} required slotProps={{ htmlInput: { maxLength: 20 } }} fullWidth />
            </Stack>
            <TextField type="email" label="Customer Email (optional)" value={form.customer_email} onChange={(e) => set({ customer_email: e.target.value })} fullWidth />
            <TextField label="Message / Notes (optional)" value={form.message} onChange={(e) => set({ message: e.target.value })} multiline minRows={2} fullWidth />
            <TextField type="date" label="Date" value={form.enquiry_date} onChange={(e) => set({ enquiry_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            {admin && (
              <>
                <TextField select label="Status" value={form.status} onChange={(e) => set({ status: e.target.value })} fullWidth
                  helperText={enquiry?.status === 'converted' ? 'Converted through its sale' : 'Use Convert to Sale to mark it converted'}>
                  {ENQUIRY_STATUSES.filter((s) => s.value !== 'converted' || enquiry?.status === 'converted').map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Admin Notes (optional)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} multiline minRows={2} fullWidth />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
