/** Affiliate enquiry statuses (with the StatusChip tone each one borrows) and sources. */
export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New', tone: 'pending' },
  { value: 'contacted', label: 'Contacted', tone: 'partial' },
  { value: 'converted', label: 'Converted', tone: 'completed' },
  { value: 'lost', label: 'Lost', tone: 'cancelled' },
];

export const SOURCE_LABEL = { link: 'Link', manual: 'Manual' };
