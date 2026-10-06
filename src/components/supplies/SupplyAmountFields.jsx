import { Stack, TextField } from '@mui/material';

const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Total supply value: quantity × unit price when a price is known (the backend does the same). */
export function supplyTotal(form) {
  if (form.unit_price === '' || form.unit_price == null) return form.amount === '' ? null : Number(form.amount);
  return Math.round(Number(form.quantity || 0) * Number(form.unit_price) * 100) / 100;
}

/**
 * Quantity, Unit Price and Total Supply Amount for the supply forms (supplier portal, admin
 * Supplies, partner Supplies tab). A product's standard price is filled in automatically but
 * can be changed, and the total is always worked out as quantity × unit price; it's only typed
 * by hand when there's no unit price.
 */
export function SupplyAmountFields({ form, setForm, selectedProduct }) {
  const fixedPrice = selectedProduct && selectedProduct.standard_price != null && selectedProduct.standard_price !== '';
  const hasPrice = form.unit_price !== '' && form.unit_price != null;
  const total = supplyTotal(form);

  return (
    <>
      <Stack direction="row" spacing={2}>
        <TextField
          type="number" label="Quantity Supplied" value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          required slotProps={{ htmlInput: { min: 1, step: 1 } }} fullWidth
        />
        <TextField
          type="number" label={fixedPrice ? 'Unit Price' : 'Unit Price (optional)'}
          value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          helperText={fixedPrice ? 'From the product — change it to override' : ''}
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
        />
      </Stack>
      {hasPrice ? (
        <TextField
          label="Total Supply Amount" value={money(total)} slotProps={{ input: { readOnly: true } }}
          helperText={`Quantity × Unit Price (${form.quantity || 0} × ${money(form.unit_price)})`} fullWidth
        />
      ) : (
        <TextField
          type="number" label="Total Supply Amount" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required helperText="No unit price — enter the total value of this supply"
          slotProps={{ htmlInput: { min: 0, step: '0.01' } }} fullWidth
        />
      )}
    </>
  );
}
