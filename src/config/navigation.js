import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';

// Locations, Document Types, Agreements, Commission, Performance and Reports are no longer
// top-level admin sections — they're managed per-partner from the Partner Details page.
// Related pages are grouped under one main menu (`children`); hovering a main menu reveals
// its pages, each still its own route/permission.
// "How It Works" is hidden from both the admin and partner menus (and the dashboard link to
// it). The page and its routes are kept — set this to true to show it again.
export const SHOW_HOW_IT_WORKS = false;

export const ADMIN_NAV = [
  { label: 'Admin Dashboard', path: '/app', permission: 'dashboard.view', icon: SpaceDashboardRoundedIcon },
  ...(SHOW_HOW_IT_WORKS ? [{ label: 'How It Works', path: '/app/how-it-works', permission: 'dashboard.view', icon: HelpOutlineRoundedIcon }] : []),
  {
    label: 'Partner Management', icon: GroupsRoundedIcon,
    children: [
      { label: 'Partners', path: '/app/partners', permission: 'partners.view', icon: PeopleAltRoundedIcon },
      { label: 'Partner Types', path: '/app/partner-types', permission: 'partner-types.view', icon: CategoryRoundedIcon },
      { label: 'Partner Categories', path: '/app/partner-categories', permission: 'partner-categories.view', icon: SellRoundedIcon },
    ],
  },
  {
    label: 'Supplier Management', icon: Inventory2RoundedIcon,
    children: [
      { label: 'Supplier Products', path: '/app/supplier-products', permission: 'supplies.view', icon: Inventory2RoundedIcon },
      { label: 'Supplies', path: '/app/supplies', permission: 'supplies.view', icon: LocalShippingRoundedIcon },
    ],
  },
  {
    label: 'Sales & Channel Management', icon: WorkRoundedIcon,
    children: [
      { label: 'Sales', path: '/app/sales', permission: 'commissions.view', icon: PointOfSaleRoundedIcon },
      { label: 'Affiliate Links', path: '/app/affiliate-links', permission: 'commissions.view', icon: RequestQuoteRoundedIcon },
      { label: 'Affiliate Enquiries', path: '/app/affiliate-enquiries', permission: 'commissions.view', icon: QuestionAnswerRoundedIcon },
      { label: 'Referrals', path: '/app/referrals', permission: 'commissions.view', icon: ShareRoundedIcon },
    ],
  },
  {
    label: 'Reseller Management', icon: StorefrontRoundedIcon,
    children: [
      { label: 'Reseller Purchases', path: '/app/reseller-purchases', permission: 'resellers.view', icon: ShoppingCartRoundedIcon },
    ],
  },
  {
    label: 'Service Management', icon: BuildRoundedIcon,
    children: [
      { label: 'Service Assignments', path: '/app/service-assignments', permission: 'assignments.view', icon: AssignmentTurnedInRoundedIcon },
      { label: 'Service Payments', path: '/app/service-payments', permission: 'payments.view', icon: PaymentsRoundedIcon },
    ],
  },
  {
    label: 'Delivery Management', icon: LocalShippingRoundedIcon,
    children: [
      { label: 'Delivery Assignments', path: '/app/deliveries', permission: 'assignments.view', icon: LocalShippingRoundedIcon },
      { label: 'Delivery Payments', path: '/app/delivery-payments', permission: 'payments.view', icon: PaymentsRoundedIcon },
    ],
  },
  {
    label: 'Finance', icon: AccountBalanceWalletRoundedIcon,
    children: [
      // Commissions are approved and paid here in one place (replaces the old Settlements batch step).
      { label: 'Commissions & Payouts', path: '/app/commissions', permission: 'commissions.view', icon: RequestQuoteRoundedIcon },
      { label: 'Payments', path: '/app/payments', permission: 'payments.view', icon: PaymentsRoundedIcon },
      { label: 'Ledger', path: '/app/ledger', permission: 'ledger.view', icon: ReceiptLongRoundedIcon },
    ],
  },
  {
    label: 'Business Management', icon: BusinessRoundedIcon,
    children: [
      { label: 'Products / Services', path: '/app/products', permission: 'products.view', icon: Inventory2RoundedIcon },
      { label: 'Business Sources', path: '/app/business-sources', permission: 'partner-types.view', icon: CategoryRoundedIcon },
    ],
  },
  {
    label: 'Administration', icon: SettingsRoundedIcon,
    children: [
      { label: 'Users & Roles', path: '/app/users', permission: 'users.view', icon: AdminPanelSettingsRoundedIcon },
    ],
  },
];

/**
 * Partner-type codes allowed in the partner dropdown for each kind of record, so e.g. a
 * delivery assignment can only be given to a Delivery Partner. Empty = any partner.
 */
export const PARTNER_CODES_FOR = {
  supplier: 'supplier',
  reseller: 'reseller',
  sales: 'sales,affiliate,referral',
  referral: 'referral',
  affiliate: 'affiliate',
  service: 'service',
  delivery: 'delivery',
};

/** Drops pages the user can't see, and any group left empty. */
export function filterNavByPermission(items, can) {
  return items
    .map((item) => (item.children ? { ...item, children: item.children.filter((c) => can(c.permission)) } : item))
    .filter((item) => (item.children ? item.children.length > 0 : can(item.permission)));
}

// Every partner-facing nav is built from these two fixed ends — Dashboard always first,
// Profile always last (requirement: "My Profile" must never sit in the middle of
// supplier/service/affiliate/reseller-specific navigation) — plus a type-specific middle
// section picked per the partner's active partner-type enrollment(s).
const DASHBOARD_ITEM = { label: 'Partner Dashboard', path: '/portal', icon: SpaceDashboardRoundedIcon };
const PROFILE_ITEM = { label: 'My Profile', path: '/portal/profile', icon: PersonRoundedIcon };
const HOW_ITEM = { label: 'How It Works', path: '/portal/how-it-works', icon: HelpOutlineRoundedIcon };

// Affiliate / Sales Partner: record what they sold, against the admin-defined Product/Service
// catalog, to earn commission.
const SALES_TYPE_NAV = [
  { label: 'My Sales', path: '/portal/sales', icon: PointOfSaleRoundedIcon },
  { label: 'My Earnings & Payments', path: '/portal/commission-payments', icon: RequestQuoteRoundedIcon },
];

// Affiliate Partner: the sales menu plus the enquiries customers sent through their links.
const AFFILIATE_TYPE_NAV = [
  { label: 'My Sales', path: '/portal/sales', icon: PointOfSaleRoundedIcon },
  { label: 'My Enquiries', path: '/portal/enquiries', icon: QuestionAnswerRoundedIcon },
  { label: 'My Earnings & Payments', path: '/portal/commission-payments', icon: RequestQuoteRoundedIcon },
];

// Referral Partner: reports referred customers only — Lizy records the actual sale.
const REFERRAL_TYPE_NAV = [
  { label: 'My Referrals', path: '/portal/referrals', icon: ShareRoundedIcon },
  { label: 'My Earnings & Payments', path: '/portal/commission-payments', icon: RequestQuoteRoundedIcon },
];

// Service / Delivery Partner: assignment-driven earning model (one Assignment record type
// covers both — see Assignment.assignment_type) instead of the Sales-record model above.
const ASSIGNMENT_TYPE_NAV = [
  { label: 'My Assignments', path: '/portal/assignments', icon: AssignmentIndRoundedIcon },
  { label: 'My Earnings & Payments', path: '/portal/commission-payments', icon: RequestQuoteRoundedIcon },
];

// Supplier Partner (Manufacturer/Distributor/Wholesaler) — the Supplier -> Our Company flow.
const SUPPLIER_TYPE_NAV = [
  { label: 'Products / Supplies', path: '/portal/supplier-products', icon: Inventory2RoundedIcon },
  { label: 'Supply History', path: '/portal/supplies', icon: LocalShippingRoundedIcon },
  { label: 'Outstanding Balance', path: '/portal/outstanding-balance', icon: AccountBalanceRoundedIcon },
  { label: 'Payment History', path: '/portal/payment-history', icon: HistoryRoundedIcon },
];

// Reseller Partner — the mirror of SUPPLIER_TYPE_NAV: the Lizyweb -> Reseller flow, where the
// reseller owes us rather than us owing them.
const RESELLER_TYPE_NAV = [
  { label: 'My Purchases', path: '/portal/reseller-purchases', icon: LocalShippingRoundedIcon },
  { label: 'Payment Due', path: '/portal/reseller-payments-due', icon: PaymentsRoundedIcon },
  { label: 'Payment History', path: '/portal/reseller-payment-history', icon: HistoryRoundedIcon },
];

// Maps an active PartnerType.code (see PartnerTypeSeeder) to the middle nav section it
// contributes.
const NAV_BY_TYPE_CODE = {
  sales: SALES_TYPE_NAV,
  affiliate: AFFILIATE_TYPE_NAV,
  referral: REFERRAL_TYPE_NAV,
  service: ASSIGNMENT_TYPE_NAV,
  delivery: ASSIGNMENT_TYPE_NAV,
  supplier: SUPPLIER_TYPE_NAV,
  reseller: RESELLER_TYPE_NAV,
};

// Fallback middle section for a partner-type code not in the map above (e.g. Business/Agent
// Partner) — preserves the previous combined sales+assignments behaviour rather than showing
// an empty menu.
const FALLBACK_TYPE_NAV = [...SALES_TYPE_NAV, ...ASSIGNMENT_TYPE_NAV];

// Menu group title per role, used when a partner holds more than one role.
const GROUP_BY_TYPE_CODE = {
  sales: { label: 'Sales', icon: PointOfSaleRoundedIcon },
  affiliate: { label: 'Affiliate', icon: QuestionAnswerRoundedIcon },
  referral: { label: 'Referrals', icon: ShareRoundedIcon },
  service: { label: 'Service / Delivery', icon: AssignmentIndRoundedIcon },
  delivery: { label: 'Service / Delivery', icon: AssignmentIndRoundedIcon },
  supplier: { label: 'Supplier', icon: LocalShippingRoundedIcon },
  reseller: { label: 'Reseller', icon: StorefrontRoundedIcon },
};

/**
 * A partner enrolled in multiple roles (e.g. Supplier + Service + Sales) logs in once and
 * sees every role's menu — and only those, never modules for roles they don't hold.
 * Dashboard is always first and Profile always last. With a single role its pages are listed
 * directly; with several, each role becomes its own main menu whose pages show on hover.
 */
export function mergePortalNav(typeCodes = []) {
  const codes = [...new Set(typeCodes)].filter((code) => NAV_BY_TYPE_CODE[code]);
  const sets = [];
  for (const code of codes) {
    if (!sets.some((s) => s.items === NAV_BY_TYPE_CODE[code])) {
      sets.push({ ...GROUP_BY_TYPE_CODE[code], items: NAV_BY_TYPE_CODE[code] });
    }
  }
  if (!sets.length) sets.push({ label: 'Partner', icon: RequestQuoteRoundedIcon, items: FALLBACK_TYPE_NAV });

  const middle = sets.length === 1
    ? sets[0].items.filter((item, i, all) => all.findIndex((x) => x.path === item.path) === i)
    : sets.map((set) => ({ label: set.label, icon: set.icon, children: set.items }));

  return [DASHBOARD_ITEM, ...middle, ...(SHOW_HOW_IT_WORKS ? [HOW_ITEM] : []), PROFILE_ITEM];
}
