import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Paper, TableHead, TableBody, TableRow, Typography,
  Stack, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useList } from '../../api/resource';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { SupplyAmountFields, supplyTotal } from '../../components/supplies/SupplyAmountFields';

const CUSTOM_OPTION = '__custom__';
const PAYMENT_STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid' };
const EMPTY_FORM = {
  supplier_product_id: '', product_name: '', product_details: '', quantity: 1,
  unit_price: '', amount: '', supply_date: '', invoice_number: '', notes: '',
};
const EMPTY_PAYMENT_FORM = { amount: '', payment_date: '', payment_method: '', reference_number: '', notes: '' };

/** Supplier Partner's own "add supplies / log what they delivered" tab — the Supplier
 * -> Our Company counterpart of PartnerCommissionRulesTab, scoped to this one partner. */
export function PartnerSuppliesTab({ partnerId }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [paymentRow, setPaymentRow] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  // Only this supplier's own products (+ the general catalog) — never another supplier's.
  const { data: supplierProducts } = useList('supplier-products', { status: 'active', partner_id: partnerId });
  const { data: supplies, isLoading } = useList('supplies', { partner_id: partnerId, per_page: 100 });
  const rows = supplies?.data ?? [];
  const selectedProduct = (supplierProducts ?? []).find((p) => String(p.id) === String(form.supplier_product_id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    const usingProduct = form.supplier_product_id && form.supplier_product_id !== CUSTOM_OPTION;
    const payload = {
      partner_id: partnerId,
      supplier_product_id: usingProduct ? form.supplier_product_id : null,
      product_name: usingProduct ? undefined : form.product_name,
      product_details: form.product_details,
      quantity: form.quantity,
      unit_price: form.unit_price || null,
      amount: supplyTotal(form),
      supply_date: form.supply_date,
      invoice_number: form.invoice_number,
      notes: form.notes,
    };
    try {
      await api.post('/supplies', payload);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not log supply');
      return;
    }
    setOpen(false);
    invalidate();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this supply record?')) return;
    await api.delete(`/supplies/${id}`);
    invalidate();
  };

  const openPayment = (row) => {
    setPaymentRow(row);
    setPaymentForm({ ...EMPTY_PAYMENT_FORM, amount: row.balance_amount });
    setError('');
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/supplier-payments', { ...paymentForm, supply_id: paymentRow.id });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not record payment');
      return;
    }
    setPaymentRow(null);
    invalidate();
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
        {can('supplies.create') && (
          <Button variant="outlined" onClick={openCreate}>Add Supply</Button>
        )}
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product / Details</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Supply Date</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.supply_date}</TableCell>
                <TableCell>{r.invoice_number || '—'}</TableCell>
                <TableCell>₹{Number(r.amount).toLocaleString('en-IN')}</TableCell>
                <TableCell>₹{Number(r.amount_paid).toLocaleString('en-IN')}</TableCell>
                <TableCell>₹{Number(r.balance_amount).toLocaleString('en-IN')}</TableCell>
                <TableCell><StatusChip status={r.payment_status} label={PAYMENT_STATUS_LABEL[r.payment_status]} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {can('supplies.create') && r.balance_amount > 0 && (
                      <Button size="small" color="success" onClick={() => openPayment(r)}>Add Payment</Button>
                    )}
                    {can('supplies.delete') && (
                      <Button size="small" color="error" onClick={() => remove(r.id)}>Delete</Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !isLoading && (
              <TableRow><TableCell colSpan={9}><Typography color="text.secondary">No supplies logged yet.</Typography></TableCell></TableRow>
            )}
            {isLoading && (
              <TableRow><TableCell colSpan={9}><Typography color="text.secondary">Loading...</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={create}>
          <DialogTitle>Add Supply</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select label="Product / Material" value={form.supplier_product_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const prod = (supplierProducts ?? []).find((p) => String(p.id) === String(val));
                  setForm({ ...form, supplier_product_id: val, unit_price: prod ? (prod.standard_price ?? '') : '' });
                }}
                fullWidth
              >
                <MenuItem value={CUSTOM_OPTION}>Custom / Other</MenuItem>
                {(supplierProducts ?? []).map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                ))}
              </TextField>
              {!selectedProduct && (
                <TextField label="Product Name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required fullWidth />
              )}
              <TextField label="Product Details" value={form.product_details} onChange={(e) => setForm({ ...form, product_details: e.target.value })} multiline minRows={2} fullWidth />
              <SupplyAmountFields form={form} setForm={setForm} selectedProduct={selectedProduct} />
              <TextField type="date" label="Supply / Received Date" value={form.supply_date} onChange={(e) => setForm({ ...form, supply_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Supplier Invoice / Reference Number" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} fullWidth />
              <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!paymentRow} onClose={() => setPaymentRow(null)} maxWidth="sm" fullWidth>
        <form onSubmit={submitPayment}>
          <DialogTitle>Add Payment — {paymentRow?.product_name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Alert severity="info">
                Amount: ₹{Number(paymentRow?.amount ?? 0).toLocaleString('en-IN')} · Paid: ₹{Number(paymentRow?.amount_paid ?? 0).toLocaleString('en-IN')} · Balance: ₹{Number(paymentRow?.balance_amount ?? 0).toLocaleString('en-IN')}
              </Alert>
              <TextField type="number" label="Payment Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required fullWidth />
              <TextField type="date" label="Payment Date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Payment Method" placeholder="e.g. Bank Transfer, UPI, Cheque" value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} fullWidth />
              <TextField label="Reference Number" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} helperText="Leave blank to auto-generate" fullWidth />
              <TextField label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} multiline minRows={2} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentRow(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Payment</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
