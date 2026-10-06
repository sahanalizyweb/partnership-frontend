// Plain-language wording for the money flow, shared by the admin and partner screens so both
// sides describe the same commission the same way.
//
// Every commission follows one path:
//   Waiting for approval  ->  Approved (money due)  ->  Paid / Received
//
// direction 'to_partner'   = Lizy pays the partner
// direction 'from_partner' = the partner pays Lizy (service job where the customer paid the partner)

export const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * A sale commission can't be approved (become payable) until the customer has paid the sale in
 * full. Needs the commission's `sale` with its payment_status; untracked sales (null) are never held.
 */
export const awaitingCustomerPayment = (c) => c?.status === 'pending' && ['unpaid', 'partial'].includes(c?.sale?.payment_status);

/** Status label + colour for a commission, from the admin's point of view. */
export function commissionStatus(c) {
  const toPartner = (c?.direction ?? 'to_partner') === 'to_partner';
  switch (c?.status) {
    case 'pending':
      if (awaitingCustomerPayment(c)) return { label: 'Waiting for customer payment', color: 'default' };
      return { label: 'Waiting for approval', color: 'warning' };
    case 'approved':
    case 'payable':
      return { label: toPartner ? 'Approved — to pay' : 'Approved — to collect', color: 'info' };
    case 'paid':
      return { label: toPartner ? 'Paid to partner' : 'Received from partner', color: 'success' };
    case 'rejected':
      return { label: 'Rejected', color: 'default' };
    default:
      return { label: c?.status ?? '—', color: 'default' };
  }
}

/** Same statuses, worded for the partner reading their own portal. */
export function partnerCommissionStatus(c) {
  const toPartner = (c?.direction ?? 'to_partner') === 'to_partner';
  switch (c?.status) {
    case 'pending':
      if (awaitingCustomerPayment(c)) return { label: 'Waiting for customer payment', color: 'default' };
      return { label: toPartner ? 'Waiting for Lizy approval' : 'Being checked by Lizy', color: 'warning' };
    case 'approved':
    case 'payable':
      return { label: toPartner ? 'Approved — Lizy will pay you' : 'Approved — please pay Lizy', color: 'info' };
    case 'paid':
      return { label: toPartner ? 'Paid to you' : 'Paid by you', color: 'success' };
    case 'rejected':
      return { label: 'Rejected', color: 'default' };
    default:
      return { label: c?.status ?? '—', color: 'default' };
  }
}

/** A delivery assignment's Payment Method, stored in payment_direction (same values the service flow uses). */
export const DELIVERY_PAYMENT_METHODS = {
  customer_pays_lizyweb: 'Customer Pays Lizy',
  customer_pays_partner: 'Customer Pays Delivery Partner (COD)',
};

export const directionLabel = (direction) => (direction === 'from_partner' ? 'Partner pays us' : 'We pay partner');
export const partnerDirectionLabel = (direction) => (direction === 'from_partner' ? 'You pay Lizy' : 'Lizy pays you');

/** What a commission was earned for: a sale, a service job or a delivery. */
export function commissionSource(c) {
  if (c?.sale) return `Sale — ${c.sale.product_name ?? c.sale.reference_number}`;
  if (c?.assignment) {
    const kind = c.assignment.assignment_type === 'delivery' ? 'Delivery' : c.assignment.assignment_type === 'service' ? 'Service job' : 'Job';
    return `${kind} — ${c.assignment.title ?? c.assignment.reference_number}`;
  }
  return c?.transaction_reference ?? '—';
}

export const commissionPercent = (c) => (Number(c?.base_amount) ? `${+(c.commission_amount / c.base_amount * 100).toFixed(2)}%` : '—');
