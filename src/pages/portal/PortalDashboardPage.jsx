import {
  Box, Grid, Paper, Typography, Stack, Chip, CardActionArea, Button,
  TableHead, TableBody, TableRow, 
} from '@mui/material';
import { Table, TableCell } from '../../components/table';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { StatusChip } from '../../components/crud/ResourceListPage';

// Every card opens the page holding the records behind its number.
function StatCard({ label, value, color, to }) {
  const navigate = useNavigate();
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Paper sx={{ height: '100%', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': to ? { boxShadow: 4, transform: 'translateY(-2px)' } : undefined }}>
        <CardActionArea disabled={!to} onClick={() => navigate(to)} sx={{ p: 2.5, height: '100%' }}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
        </CardActionArea>
      </Paper>
    </Grid>
  );
}

const TO = {
  earnings: '/portal/commission-payments',
  sales: '/portal/sales',
  referrals: '/portal/referrals',
  enquiries: '/portal/enquiries',
  assignments: '/portal/assignments',
  supplies: '/portal/supplies',
  suppliesDue: '/portal/outstanding-balance',
  supplierOutstanding: '/portal/outstanding-balance',
  supplierPaid: '/portal/payment-history',
  resellerPurchases: '/portal/reseller-purchases',
  resellerOutstanding: '/portal/reseller-payments-due',
  resellerPaid: '/portal/reseller-payment-history',
  resellerDue: '/portal/reseller-payments-due',
  supplierProducts: '/portal/supplier-products',
};

// Where a per-role summary tile leads.
const TO_BY_TYPE = {
  supplier: TO.supplies,
  reseller: TO.resellerPurchases,
  service: TO.assignments,
  delivery: TO.assignments,
  sales: TO.sales,
  affiliate: TO.sales,
  referral: TO.referrals,
};

const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`;

// One card-grid block per partner type, reading the fields DashboardController's
// partnerDashboard() computes for that type (see backend/app/Http/Controllers/Api/
// DashboardController.php). Supplier/Reseller mirror each other (who owes whom flips); the
// generic block is the fallback for Business/Agent Partner.
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v)}%`);
const DIRECTION_LABELS = {
  customer_pays_partner: 'Customer → Partner (partner pays our commission)',
  customer_pays_lizyweb: 'Customer → Us (we pay partner)',
};

// Latest records behind a dashboard, so each partner type can track its items (product,
// quantity, amount, status, commission %) without leaving the dashboard.
function RecentTable({ title, rows, columns, to }) {
  const navigate = useNavigate();
  return (
    <Paper sx={{ mt: 2, overflowX: 'auto' }}>
      <Stack direction="row" sx={{ px: 2, pt: 1.5, pb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Button size="small" onClick={() => navigate(to)}>View all</Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>{columns.map((c) => <TableCell key={c.label} align={c.align}>{c.label}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {(rows ?? []).map((row) => (
            <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(to)}>
              {columns.map((c) => <TableCell key={c.label} align={c.align}>{c.render(row)}</TableCell>)}
            </TableRow>
          ))}
          {!(rows ?? []).length && (
            <TableRow><TableCell colSpan={columns.length}><Typography variant="body2" color="text.secondary">No records yet.</Typography></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

const REF_COL = { label: 'Reference #', render: (r) => r.reference_number ?? '—' };
const WORK_COLUMNS = (workLabel) => [
  REF_COL,
  { label: workLabel, render: (r) => r.title },
  { label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  { label: 'Amount', align: 'right', render: (r) => money(r.amount) },
  { label: 'Commission %', align: 'right', render: (r) => pct(r.commission_percent) },
  { label: 'Commission', align: 'right', render: (r) => money(r.commission_amount) },
];

const DASHBOARDS = {
  supplier: (data) => (
    <>
      <Grid container spacing={2}>
        <StatCard label="Total Supplied" value={money(data.total_supplied_amount)} to={TO.supplies} />
        <StatCard label="Total Paid" value={money(data.total_paid_amount)} color="success.main" to={TO.supplierPaid} />
        <StatCard label="Outstanding Balance" value={money(data.outstanding_balance)} color="warning.main" to={TO.supplierOutstanding} />
        <StatCard label="Supplies Awaiting Payment" value={data.pending_supplies_count} to={TO.suppliesDue} />
        <StatCard label="Products Received" value={data.products_supplied_count ?? 0} to={TO.supplierProducts} />
        <StatCard label="Total Quantity Received" value={data.total_quantity_received ?? 0} to={TO.supplies} />
        <StatCard label="Supply Records" value={data.total_supplies_count ?? 0} to={TO.supplies} />
        <StatCard label="Payments Recorded" value={data.supplier_payments_count ?? 0} to={TO.supplierPaid} />
      </Grid>
      <RecentTable
        title="Recent Supplies" to={TO.supplies} rows={data.recent_supplies}
        columns={[
          REF_COL,
          { label: 'Product', render: (r) => r.product_name },
          { label: 'Qty', align: 'right', render: (r) => r.quantity },
          { label: 'Amount', align: 'right', render: (r) => money(r.amount) },
          { label: 'Paid', align: 'right', render: (r) => money(r.amount_paid) },
          { label: 'Balance', align: 'right', render: (r) => money(r.balance_amount) },
          { label: 'Status', render: (r) => <StatusChip status={r.payment_status} /> },
        ]}
      />
    </>
  ),
  reseller: (data) => (
    <>
      <Grid container spacing={2}>
        <StatCard label="Total Purchases" value={data.total_purchases} to={TO.resellerPurchases} />
        <StatCard label="Total Purchase Value" value={money(data.total_purchase_value)} to={TO.resellerPurchases} />
        <StatCard label="Total Paid" value={money(data.total_paid)} color="success.main" to={TO.resellerPaid} />
        <StatCard label="Total Outstanding" value={money(data.total_outstanding)} color="warning.main" to={TO.resellerOutstanding} />
        <StatCard label="Products Purchased" value={data.products_purchased_count ?? 0} to={TO.resellerPurchases} />
        <StatCard label="Total Quantity Purchased" value={data.total_quantity_purchased ?? 0} to={TO.resellerPurchases} />
        <StatCard label="Purchases Awaiting Payment" value={data.pending_payments_count ?? 0} to={TO.resellerDue} />
        <StatCard label="Payments Made" value={data.reseller_payments_count ?? 0} to={TO.resellerPaid} />
      </Grid>
      <RecentTable
        title="Recent Purchases" to={TO.resellerPurchases} rows={data.recent_purchases}
        columns={[
          REF_COL,
          { label: 'Product / Service', render: (r) => r.product_name },
          { label: 'Qty', align: 'right', render: (r) => r.quantity },
          { label: 'Amount', align: 'right', render: (r) => money(r.amount) },
          { label: 'Paid', align: 'right', render: (r) => money(r.amount_paid) },
          { label: 'Balance', align: 'right', render: (r) => money(r.balance_amount) },
          { label: 'Status', render: (r) => <StatusChip status={r.payment_status} /> },
        ]}
      />
    </>
  ),
  service: (data) => (
    <>
      <Grid container spacing={2}>
        <StatCard label="Pending Work" value={data.pending_work} to={TO.assignments} />
        <StatCard label="In Progress" value={data.in_progress_work ?? 0} to={TO.assignments} />
        <StatCard label="Completed Work" value={data.completed_work} to={TO.assignments} />
        <StatCard label="Total Work Amount" value={money(data.total_work_amount)} to={TO.assignments} />
        <StatCard label="Lizy owes you (not yet paid)" value={money(data.payout_pending)} color="warning.main" to={TO.earnings} />
        <StatCard label="Paid to you" value={money(data.payout_paid)} color="success.main" to={TO.earnings} />
        <StatCard label="You owe Lizy (our commission)" value={money(data.commission_due_to_lizyweb)} color="error.main" to={TO.earnings} />
        <StatCard label="You paid Lizy" value={money(data.commission_owed_to_lizyweb_paid)} to={TO.earnings} />
      </Grid>
      <RecentTable
        title="Recent Service Work" to={TO.assignments} rows={data.recent_work}
        columns={[
          ...WORK_COLUMNS('Service / Work'),
          { label: 'Payment Flow', render: (r) => DIRECTION_LABELS[r.payment_direction] ?? '—' },
        ]}
      />
    </>
  ),
  delivery: (data) => (
    <>
      <Grid container spacing={2}>
        <StatCard label="Pending Assignments" value={data.pending_assignments} to={TO.assignments} />
        <StatCard label="Picked Up" value={data.picked_up_count} to={TO.assignments} />
        <StatCard label="Out for Delivery" value={data.out_for_delivery_count} to={TO.assignments} />
        <StatCard label="Delivered" value={data.delivered_count} color="success.main" to={TO.assignments} />
        <StatCard label="Failed" value={data.failed_count} color="error.main" to={TO.assignments} />
        <StatCard label="Total Deliveries" value={data.total_deliveries ?? 0} to={TO.assignments} />
        <StatCard label="Total Delivery Amount" value={money(data.total_delivery_amount)} to={TO.assignments} />
        <StatCard label="Commission earned" value={money(data.commission_earned)} to={TO.earnings} />
        <StatCard label="Paid to you" value={money(data.commission_paid)} color="success.main" to={TO.earnings} />
        <StatCard label="Lizy owes you (not yet paid)" value={money(data.commission_pending)} color="warning.main" to={TO.earnings} />
      </Grid>
      <RecentTable
        title="Recent Deliveries" to={TO.assignments} rows={data.recent_work}
        columns={[
          REF_COL,
          { label: 'Delivery', render: (r) => r.title },
          { label: 'Customer / Address', render: (r) => [r.customer_name, r.delivery_address].filter(Boolean).join(' — ') || '—' },
          ...WORK_COLUMNS('').slice(2),
        ]}
      />
    </>
  ),
};

// Affiliate/Referral/Sales Partner share the same underlying Sale-based numbers — only the
// vocabulary differs.
const REFERRAL_STATUS_LABEL = { pending: 'Pending', confirmed: 'Completed', cancelled: 'Cancelled' };

const PIPELINE_LABELS = {
  affiliate: { total: 'Total Referrals', conversions: 'Total Conversions' },
  referral: { total: 'Total Leads', conversions: 'Converted' },
  sales: { total: 'Total Sales', conversions: 'Closed / Won' },
};

function pipelineDashboard(data, typeCode) {
  // Referral partners' tiles lead to My Referrals; affiliate/sales partners' to My Sales.
  const listTo = typeCode === 'referral' ? TO.referrals : TO.sales;
  const labels = PIPELINE_LABELS[typeCode] ?? { total: 'Total Sales', conversions: 'Conversions' };
  return (
    <>
      <Grid container spacing={2}>
        {typeCode === 'affiliate' && (
          <>
            <StatCard label="Link Clicks" value={data.link_clicks ?? 0} to={listTo} />
            <StatCard label="Enquiries" value={data.link_enquiries ?? 0} to={TO.enquiries} />
            <StatCard label="Link Sales (Conversions)" value={data.link_conversions ?? 0} to={listTo} />
          </>
        )}
        <StatCard label={labels.total} value={data.total_sales} to={listTo} />
        <StatCard label={labels.conversions} value={data.total_conversions} to={listTo} />
        <StatCard label="Total Sales Value" value={money(data.total_sales_value)} to={listTo} />
        <StatCard label="Commission earned" value={money(data.total_commission)} to={TO.earnings} />
        <StatCard label="Paid to you" value={money(data.commission_paid)} color="success.main" to={TO.earnings} />
        <StatCard label="Lizy owes you (not yet paid)" value={money(data.commission_pending)} color="warning.main" to={TO.earnings} />
      </Grid>
      {typeCode === 'referral' ? (
        // A referral partner reports customers, not products — amounts appear once Lizy completes the sale.
        <RecentTable
          title="Recent Referrals" to={listTo} rows={data.recent_sales}
          columns={[
            REF_COL,
            { label: 'Customer', render: (r) => r.customer_name ?? '—' },
            { label: 'Final Sale Amount', align: 'right', render: (r) => (r.status === 'confirmed' ? money(r.sale_amount) : '—') },
            { label: 'Commission', align: 'right', render: (r) => (r.commission_amount ? money(r.commission_amount) : '—') },
            { label: 'Status', render: (r) => <StatusChip status={r.status} label={REFERRAL_STATUS_LABEL[r.status]} /> },
          ]}
        />
      ) : (
        <RecentTable
          title="Recent Sales / Referrals" to={listTo} rows={data.recent_sales}
          columns={[
            REF_COL,
            { label: 'Product / Service', render: (r) => r.product_name },
            { label: 'Qty', align: 'right', render: (r) => r.quantity },
            { label: 'Amount', align: 'right', render: (r) => money(r.sale_amount) },
            { label: 'Commission %', align: 'right', render: (r) => pct(r.commission_percent) },
            { label: 'Commission', align: 'right', render: (r) => money(r.commission_amount) },
            { label: 'Status', render: (r) => <StatusChip status={r.status} /> },
          ]}
        />
      )}
    </>
  );
}

// Renders the correct type-specific block for one dataset (either the flat top-level `data`
// for a single-type partner, or one entry of `data.by_type` for a multi-enrollment partner).
function renderTypeDashboard(typeCode, dataset) {
  if (DASHBOARDS[typeCode]) return DASHBOARDS[typeCode](dataset);
  if (['affiliate', 'referral', 'sales'].includes(typeCode)) return pipelineDashboard(dataset, typeCode);
  return genericDashboard(dataset);
}

// A partner enrolled in multiple active partner types (e.g. Service + Supplier) sees one
// card-grid section per active type instead of only their primary type's — the shared Total
// My Money block above already covers the combined money figures, so
// this only needs to avoid repeating identical operational card-grids for the same type.
function MultiTypeDashboards({ byType }) {
  return (
    <Stack spacing={3}>
      {Object.entries(byType).map(([code, dataset]) => (
        <Box key={code}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{dataset.partner_type_name || code}</Typography>
          {renderTypeDashboard(code, dataset)}
        </Box>
      ))}
    </Stack>
  );
}

function genericDashboard(data) {
  return (
    <Grid container spacing={2}>
      <StatCard label="Commission earned" value={money(data.commission_earned)} to={TO.earnings} />
      <StatCard label="Paid to you" value={money(data.commission_paid)} color="success.main" to={TO.earnings} />
      <StatCard label="Lizy owes you (not yet paid)" value={money(data.commission_pending)} color="warning.main" to={TO.earnings} />
      <StatCard label="My Pending Assignments" value={data.pending_assignments} to={TO.assignments} />
    </Grid>
  );
}

// The partner's whole money picture in plain words, across every role they hold — computed
// by the backend (DashboardController::partnerMoneySummary).
function MyMoneyBlock({ m }) {
  if (!m) return null;
  const owedParts = [
    m.commission_owed_to_you > 0 && `${money(m.commission_owed_to_you)} approved commission`,
    m.supplies_owed_to_you > 0 && `${money(m.supplies_owed_to_you)} unpaid supply bills`,
  ].filter(Boolean).join(' + ');
  const oweParts = [
    m.commission_you_owe > 0 && `${money(m.commission_you_owe)} commission on jobs the customer paid you for`,
    m.purchases_you_owe > 0 && `${money(m.purchases_you_owe)} unpaid purchases`,
  ].filter(Boolean).join(' + ');

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>My Money</Typography>
      <Grid container spacing={2}>
        <StatCard label="Lizy owes you" value={money(m.owed_to_you)} color="primary.main" to={TO.earnings} />
        <StatCard label="Waiting for Lizy approval" value={money(m.waiting_approval)} color="warning.main" to={TO.earnings} />
        <StatCard label="You owe Lizy" value={money(m.you_owe)} color="error.main" to={TO.earnings} />
        <StatCard label="Paid to you so far" value={money(m.paid_to_you)} color="success.main" to={TO.earnings} />
      </Grid>
      {(owedParts || oweParts) && (
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          {owedParts && <Typography variant="body2" color="text.secondary">Lizy owes you: {owedParts}.</Typography>}
          {oweParts && <Typography variant="body2" color="text.secondary">You owe Lizy: {oweParts}.</Typography>}
        </Stack>
      )}
    </Box>
  );
}

export function PortalDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  const typeCode = data?.partner_type?.code;
  // One login can hold several partner roles — list them all, primary first.
  const roles = data?.partner_types?.length ? data.partner_types : [data?.partner_type].filter(Boolean);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Welcome, {user?.name}{roles.length > 0 && ` — ${roles.map((r) => r.name).join(' & ')}`}
      </Typography>
      {data?.partner && (
        <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Chip label={data.partner.partner_code} size="small" />
          {roles.map((r) => <Chip key={r.id} label={r.name} size="small" color="primary" variant="outlined" />)}
          <StatusChip status={data.partner.status} />
        </Stack>
      )}

      <MyMoneyBlock m={data?.money} />

      {isLoading || !data ? (
        <Typography>Loading...</Typography>
      ) : data.by_type ? (
        <MultiTypeDashboards byType={data.by_type} />
      ) : (
        renderTypeDashboard(typeCode, data)
      )}
    </Box>
  );
}
