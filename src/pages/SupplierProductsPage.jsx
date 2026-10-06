import { Chip, Typography } from '@mui/material';
import { ResourceListPage } from '../components/crud/ResourceListPage';
import { useList } from '../api/resource';
import { PARTNER_CODES_FOR } from '../config/navigation';

const columns = [
  { field: 'partner', headerName: 'Supplier Partner', flex: 1, valueGetter: (v, row) => row.partner?.name ?? 'Not set' },
  {
    field: 'supplier_category', headerName: 'Category', width: 150,
    renderCell: (p) => (p.value
      ? <Chip size="small" label={p.value} color="primary" variant="outlined" />
      : <Typography variant="body2" color="text.secondary">—</Typography>),
  },
  { field: 'name', headerName: 'Product / Material', flex: 1 },
  { field: 'details', headerName: 'Details', flex: 1.5, valueGetter: (v, row) => row.details || '—' },
  { field: 'standard_price', headerName: 'Standard Price', width: 150, valueGetter: (v, row) => (row.standard_price ? `₹${Number(row.standard_price).toLocaleString('en-IN')}` : '—') },
  { field: 'status', headerName: 'Status', width: 120 },
];

/**
 * Each product/material belongs to one Supplier Partner — the same product from two suppliers
 * is two entries, each with its own price/details. Suppliers see only their own in the portal.
 */
export function SupplierProductsPage() {
  const { data: suppliers } = useList('partners', { per_page: 200, partner_type_code: PARTNER_CODES_FOR.supplier });

  const fields = [
    {
      name: 'partner_id', label: 'Supplier Partner', type: 'select', required: true,
      options: (suppliers?.data ?? []).map((p) => ({
        value: p.id,
        label: [p.partner_code ? `${p.name} (${p.partner_code})` : p.name, p.partner_category?.name].filter(Boolean).join(' — '),
      })),
    },
    { name: 'name', label: 'Product / Material Name', type: 'text', required: true },
    { name: 'details', label: 'Product Name / Details', type: 'textarea' },
    { name: 'standard_price', label: 'Standard Price (optional default)', type: 'number' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  return (
    <ResourceListPage
      path="supplier-products"
      title="Supplier Products"
      columns={columns}
      fields={fields}
      permissionPrefix="supplies"
    />
  );
}
