import { ResourceListPage } from '../components/crud/ResourceListPage';
import { useList } from '../api/resource';

const columns = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'partner_type', headerName: 'Partner Type', flex: 1, valueGetter: (value, row) => row.partner_type?.name ?? '' },
  { field: 'status', headerName: 'Status', width: 120 },
];

export function PartnerCategoriesPage() {
  const { data: types } = useList('partner-types');

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    {
      name: 'partner_type_id',
      label: 'Partner Type',
      type: 'select',
      required: true,
      options: (types ?? []).map((t) => ({ value: t.id, label: t.name })),
    },
    { name: 'description', label: 'Description', type: 'textarea' },
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
      path="partner-categories"
      title="Partner Categories"
      columns={columns}
      fields={fields}
      permissionPrefix="partner-categories"
    />
  );
}
