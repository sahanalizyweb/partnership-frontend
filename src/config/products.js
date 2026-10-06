/** Products / Services catalog helpers shared by every product dropdown. */

export const PRODUCT_TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
];

/** "Name", or "Name (Service)" for a service — the label every dropdown shows. */
export const productLabel = (p) => (p ? `${p.name}${p.type === 'service' ? ' (Service)' : ''}` : '');

/** static-website-development from "Static Website Development". */
export const slugify = (text) => String(text ?? '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
