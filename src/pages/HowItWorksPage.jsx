import { Box, Typography, Paper, Stack, Chip, Grid, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

// One entry per partner type: what they do, the steps, and how money moves. `admin` steps are
// what Lizy staff do; `partner` steps are what the partner sees/does in their portal.
const GUIDE = [
  {
    key: 'supplier', codes: ['supplier'], title: 'Supplier Partner', subtitle: 'Manufacturer / Distributor / Wholesaler — supplies products to us',
    flow: 'Lizy pays the supplier', flowColor: 'primary',
    steps: [
      'The supplier (or admin) records a supply: product, quantity and the bill amount. A reference number (SUPPLY-…) is created automatically.',
      'The bill appears as “Balance” — the amount Lizy still owes the supplier.',
      'When Lizy pays, admin opens Supplier Management → Supplies → Record Payment (full or part payment).',
      'The balance goes down; when it reaches ₹0 the supply shows “Paid”.',
    ],
    where: { admin: 'Supplier Management → Supplies', partner: 'Supply History, Outstanding Balance, Payment History' },
    example: 'Supplier sends 10 pumps worth ₹60,000. Lizy pays ₹40,000 now → balance ₹20,000. Lizy pays ₹20,000 later → Paid.',
  },
  {
    key: 'service', codes: ['service'], title: 'Service Partner', subtitle: 'Plumbing / Electrical / IT services — we assign work to them',
    flow: 'Either way — depends on who the customer paid', flowColor: 'secondary',
    steps: [
      'Admin creates a Service Assignment with the work amount, commission % and the payment flow.',
      'The partner accepts, starts and completes the work.',
      'On completion a commission is created automatically (Waiting for approval).',
      'Admin approves it in Finance → Commissions & Payouts, then records the payment.',
    ],
    ways: [
      { label: 'Customer pays the partner', text: 'The partner collected the full amount, so the partner pays Lizy our commission %. Admin clicks “Record received” when it arrives.' },
      { label: 'Customer pays Lizy', text: 'Lizy collected the full amount, keeps its commission % and pays the partner the rest. Admin clicks “Pay partner”.' },
    ],
    where: { admin: 'Service Management → Service Assignments; Finance → Commissions & Payouts', partner: 'My Assignments, My Earnings & Payments' },
    example: 'Job ₹10,000 at 20%. Customer paid partner → partner pays Lizy ₹2,000. Customer paid Lizy → Lizy pays partner ₹8,000.',
  },
  {
    key: 'delivery', codes: ['delivery'], title: 'Delivery Partner', subtitle: 'Delivers our products to customers',
    flow: 'Lizy pays the delivery partner', flowColor: 'primary',
    steps: [
      'Admin creates a Delivery Assignment with the customer, delivery address, amount and commission %.',
      'The partner marks it Picked up → Out for delivery → Delivered (or Failed).',
      'When marked Delivered, the partner’s commission (amount × commission %) is created automatically.',
      'Admin approves it and clicks “Pay partner” in Finance → Commissions & Payouts.',
    ],
    where: { admin: 'Delivery Management → Delivery Assignments; Finance → Commissions & Payouts', partner: 'My Assignments, My Earnings & Payments' },
    example: 'Delivery of ₹5,000 at 5% → partner earns ₹250 once delivered.',
  },
  {
    key: 'sales', codes: ['sales', 'affiliate', 'referral'], title: 'Affiliate / Referral / Sales Partner', subtitle: 'Promotes or refers our products / services',
    flow: 'Lizy pays the partner', flowColor: 'primary',
    steps: [
      'A sale or referral is recorded (by the partner or admin) against a Product / Service from our catalog, with its amount. A reference number (SAL-…) is created automatically.',
      'The product’s fixed standard commission % is applied automatically → commission is created (Waiting for approval).',
      'Admin confirms the sale, approves the commission and clicks “Pay partner”.',
    ],
    where: { admin: 'Sales & Channel Management → Sales / Referrals; Finance → Commissions & Payouts', partner: 'My Sales (Sales / Affiliate), My Referrals (Referral), My Earnings & Payments' },
    example: 'Partner sells a ₹50,000 service with 10% standard commission → partner earns ₹5,000.',
  },
  {
    key: 'reseller', codes: ['reseller'], title: 'Reseller Partner', subtitle: 'Like a dealer — buys our products / services and resells them',
    flow: 'The reseller pays Lizy', flowColor: 'error',
    steps: [
      'A purchase is recorded: product, quantity and amount. A reference number (RES-…) is created automatically.',
      'The bill appears as “Balance” — the amount the reseller still owes Lizy.',
      'When the reseller pays, admin opens Reseller Management → Reseller Purchases → Record Payment (full or part).',
      'The balance goes down; at ₹0 the purchase shows “Paid”.',
    ],
    where: { admin: 'Reseller Management → Reseller Purchases', partner: 'My Purchases, Payment Due, Payment History' },
    example: 'Reseller buys 5 units for ₹25,000, pays ₹15,000 → still owes ₹10,000.',
  },
];

function GuideCard({ g, audience }) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 800 }}>{g.title}</Typography>
        <Chip size="small" color={g.flowColor} label={g.flow} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{g.subtitle}</Typography>
      <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75, fontSize: 14 } }}>
        {g.steps.map((s) => <li key={s}>{s}</li>)}
      </Box>
      {g.ways && (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {g.ways.map((w) => (
            <Alert key={w.label} severity="info" icon={false} sx={{ py: 0.25 }}>
              <b>{w.label}:</b> {w.text}
            </Alert>
          ))}
        </Stack>
      )}
      <Typography variant="body2" sx={{ mt: 1.5 }}><b>Example:</b> {g.example}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        <b>Where to look:</b> {g.where[audience]}
      </Typography>
    </Paper>
  );
}

/**
 * Plain-language guide to each partner type and how money moves. Admin sees every type; a
 * partner sees only the roles they hold.
 */
export function HowItWorksPage({ audience = 'admin' }) {
  const { data: enrollments } = useQuery({
    queryKey: ['me-enrollments'],
    queryFn: async () => (await api.get('/me/enrollments')).data,
    enabled: audience === 'partner',
  });
  const myCodes = (enrollments ?? []).map((e) => e.partner_type?.code);
  const guides = audience === 'partner' ? GUIDE.filter((g) => g.codes.some((c) => myCodes.includes(c))) : GUIDE;

  return (
    <Box>
      <Typography variant="h5">How It Works</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {audience === 'admin'
          ? 'How each partner type works, and how payments and commissions move between Lizy and partners.'
          : 'How your partnership works and how you get paid.'}
      </Typography>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Every commission follows 3 simple steps</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Chip color="warning" label="1. Waiting for approval" />
          <Typography color="text.secondary">→</Typography>
          <Chip color="info" label="2. Approved — money due" />
          <Typography color="text.secondary">→</Typography>
          <Chip color="success" label="3. Paid / Received" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {audience === 'admin'
            ? 'Commissions are created automatically. Admin approves them and records the payment in Finance → Commissions & Payouts — one click updates the partner’s balance and their portal.'
            : 'Commissions are created automatically from your sales, jobs and deliveries. Lizy checks and approves them, then pays you (or records your payment). You can follow every step under My Earnings & Payments.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
          <Alert severity="info" sx={{ flex: 1 }}><b>Lizy pays the partner:</b> Supplier bills, Sales / Affiliate / Referral commissions, Delivery commissions, Service jobs paid to Lizy.</Alert>
          <Alert severity="warning" sx={{ flex: 1 }}><b>Partner pays Lizy:</b> Reseller purchases, and our commission on Service jobs the customer paid the partner for.</Alert>
        </Stack>
      </Paper>

      {audience === 'partner' && !guides.length && (
        <Alert severity="info">Your partner role hasn’t been set up yet — contact Lizy.</Alert>
      )}
      <Grid container spacing={2}>
        {guides.map((g) => (
          <Grid key={g.key} size={{ xs: 12, lg: 6 }}>
            <GuideCard g={g} audience={audience} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
