import { ResourceListPage } from '../components/crud/ResourceListPage';

const columns = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'code', headerName: 'Code', width: 140 },
  { field: 'status', headerName: 'Status', width: 120 },
];

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text', required: true },
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

/** Configurable earning-source lookup — LizyMart, LizyNet, Service, Referral, Affiliate, Sales, Reseller, Other. */
export function BusinessSourcesPage() {
  return (
    <ResourceListPage
      path="business-sources"
      title="Business Sources"
      columns={columns}
      fields={fields}
      permissionPrefix="partner-types"
    />
  );
}
