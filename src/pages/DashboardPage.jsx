import { Box, Grid, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, Stack, alpha } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { SHOW_HOW_IT_WORKS } from '../config/navigation';
import { useQuery } from '@tanstack/react-query';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import AssignmentLateRoundedIcon from '@mui/icons-material/AssignmentLateRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { api } from '../api/client';
import { brandTokens } from '../theme';

function StatCard({ label, value, icon: Icon, color, to, hint }) {
  return (
    <Paper
      component={to ? RouterLink : 'div'}
      to={to}
      sx={{
        position: 'relative', overflow: 'hidden', p: 2.5, height: '100%',
        display: 'flex', flexDirection: 'column', gap: 1.5,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        textDecoration: 'none', color: 'inherit',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(15,23,42,0.10)' },
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.35)})`,
        },
      }}
    >
      <Box
        sx={{
          width: 44, height: 44, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${alpha(color, 0.18)}, ${alpha(color, 0.08)})`, color,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 27, color: brandTokens.ink, mt: 0.25 }}>
          {value}
        </Typography>
        {hint && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>{hint}</Typography>}
      </Box>
    </Paper>
  );
}

// One card per partner type, showing what that type's flow tracks (see requirements):
// every row links to the page holding those records.
function PartnerTypeCard({ title, color, to, rows }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      sx={{
        p: 2.25, height: '100%', display: 'block', textDecoration: 'none', color: 'inherit',
        borderTop: `3px solid ${color}`, transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 24px rgba(15,23,42,0.10)' },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.25, color }}>{title}</Typography>
      <Stack spacing={0.6}>
        {rows.map(([label, value, rowColor]) => (
          <Stack key={label} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: rowColor }}>{value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function PartnerTypeOverview({ byType, money }) {
  if (!byType) return null;
  const { supplier, service, delivery, sales, reseller } = byType;
  const cards = [
    {
      title: 'Supplier Partners', color: brandTokens.indigo, to: '/app/supplies',
      rows: [
        ['Suppliers', supplier.partners],
        ['Supplies received', supplier.supply_count],
        ['Quantity received', supplier.total_quantity],
        ['Total supplied', money(supplier.total_amount)],
        ['Paid to suppliers', money(supplier.total_paid), '#1C8A5A'],
        ['Balance payable', money(supplier.balance), '#B67F1E'],
      ],
    },
    {
      title: 'Service Partners', color: brandTokens.teal, to: '/app/service-assignments',
      rows: [
        ['Service partners', service.partners],
        ['Open / completed work', `${service.open_count} / ${service.completed_count}`],
        ['Work amount', money(service.total_amount)],
        ['Commission due to us', money(service.commission_due_to_us), '#B67F1E'],
        ['Commission received', money(service.commission_received), '#1C8A5A'],
        ['Payouts pending / paid', `${money(service.payout_pending)} / ${money(service.payout_paid)}`],
      ],
    },
    {
      title: 'Delivery Partners', color: '#7C4DDB', to: '/app/deliveries',
      rows: [
        ['Delivery partners', delivery.partners],
        ['Open / delivered', `${delivery.open_count} / ${delivery.completed_count}`],
        ['Failed deliveries', delivery.failed_count, delivery.failed_count ? '#C43A3A' : undefined],
        ['Delivery amount', money(delivery.total_amount)],
        ['Commission payout pending', money(delivery.payout_pending), '#B67F1E'],
        ['Commission payout paid', money(delivery.payout_paid), '#1C8A5A'],
      ],
    },
    {
      title: 'Affiliate / Referral / Sales', color: '#B67F1E', to: '/app/sales',
      rows: [
        ['Partners', sales.partners],
        ['Sales / referrals', sales.sales_count],
        ['Sales value', money(sales.sales_value)],
        ['Commission total', money(sales.commission_total)],
        ['Commission paid', money(sales.commission_paid), '#1C8A5A'],
        ['Commission pending', money(sales.commission_pending), '#B67F1E'],
      ],
    },
    {
      title: 'Reseller Partners', color: '#C43A3A', to: '/app/reseller-purchases',
      rows: [
        ['Resellers', reseller.partners],
        ['Purchases from us', reseller.purchase_count],
        ['Quantity sold to resellers', reseller.total_quantity],
        ['Purchase value', money(reseller.total_amount)],
        ['Received from resellers', money(reseller.total_received), '#1C8A5A'],
        ['Balance receivable', money(reseller.balance), '#B67F1E'],
      ],
    },
  ];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>Partner Type Overview</Typography>
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.title} size={{ xs: 12, sm: 6, lg: 4 }}>
            <PartnerTypeCard {...c} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  if (isLoading || !data) return <Typography color="text.secondary">Loading dashboard...</Typography>;

  const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const topPartnerIds = data.top_performing_partners.map((row) => row.partner_id).join(',');
  const expiringDocPartnerIds = [...new Set(data.expiring_documents.map((doc) => doc.partner?.id).filter(Boolean))].join(',');
  const topPartnersLink = topPartnerIds
    ? `/app/partners?${new URLSearchParams({ ids: topPartnerIds, context: 'top performing' })}`
    : '/app/partners';
  const expiringDocsLink = expiringDocPartnerIds
    ? `/app/partners?${new URLSearchParams({ ids: expiringDocPartnerIds, context: 'with documents expiring soon' })}`
    : '/app/partners';

  const stats = [
    { label: 'Total Partners', value: data.total_partners, icon: PeopleAltRoundedIcon, color: brandTokens.indigo, to: '/app/partners' },
    { label: 'Active Partners', value: data.active_partners, icon: CheckCircleRoundedIcon, color: '#1C8A5A', to: '/app/partners?status=active' },
    { label: 'Pending Applications', value: data.pending_applications, icon: HourglassTopRoundedIcon, color: '#B67F1E', to: '/app/partners?status=pending_applications' },
    { label: 'Pending Assignments', value: data.pending_assignments, icon: AssignmentLateRoundedIcon, color: '#B67F1E', to: '/app/assignments?status=pending' },
  ];

  // The money picture in plain words — each card opens the list that needs action.
  const m = data.money ?? {};
  const moneyCards = [
    {
      label: 'Waiting for your approval', value: money(Number(m.awaiting_approval_to_pay ?? 0) + Number(m.awaiting_approval_to_collect ?? 0)),
      icon: PercentRoundedIcon, color: '#B67F1E', to: '/app/commissions?status=pending',
      hint: `${m.awaiting_approval_count ?? 0} commission(s) to check and approve`,
    },
    {
      label: 'We need to pay partners', value: money(m.total_to_pay), icon: ArrowUpwardRoundedIcon, color: '#C43A3A', to: '/app/commissions?status=approved&direction=to_partner',
      hint: `${money(m.commissions_to_pay)} commissions + ${money(m.supplier_bills_to_pay)} supplier bills`,
    },
    {
      label: 'Partners need to pay us', value: money(m.total_to_collect), icon: ArrowDownwardRoundedIcon, color: '#1C8A5A', to: '/app/commissions?status=approved&direction=from_partner',
      hint: `${money(m.commissions_to_collect)} service commissions + ${money(m.reseller_bills_to_collect)} reseller bills`,
    },
    {
      label: 'This month', value: `${money(m.paid_out_this_month)} out`, icon: AccountBalanceWalletRoundedIcon, color: brandTokens.indigo, to: '/app/payments',
      hint: `${money(m.collected_this_month)} collected from partners`,
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3, p: { xs: 2.5, sm: 3 }, borderRadius: 3.5,
          background: `linear-gradient(120deg, ${brandTokens.ink} 0%, ${brandTokens.indigoDeep} 100%)`,
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: alpha(brandTokens.teal, 0.25), filter: 'blur(10px)' }} />
        <Typography variant="h5" sx={{ position: 'relative', mb: 0.5 }}>Admin Dashboard</Typography>
        <Typography variant="body2" sx={{ position: 'relative', color: alpha('#fff', 0.72) }}>
          Partnership operations at a glance
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 16 }}>Money Overview</Typography>
          {SHOW_HOW_IT_WORKS && (
            <Typography component={RouterLink} to="/app/how-it-works" variant="body2" sx={{ color: 'primary.main' }}>
              How do payments &amp; commissions work?
            </Typography>
          )}
        </Stack>
        <Grid container spacing={2}>
          {moneyCards.map((c) => (
            <Grid key={c.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard {...c} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <PartnerTypeOverview byType={data.by_partner_type} money={money} />

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            component={RouterLink}
            to={topPartnersLink}
            sx={{ p: 2.5, height: '100%', display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(brandTokens.gold, 0.14) }}>
                <EmojiEventsRoundedIcon sx={{ color: brandTokens.gold, fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontSize: 16 }}>Top Performing Partners</Typography>
            </Stack>
            <List dense disablePadding>
              {data.top_performing_partners.map((row, i) => (
                <ListItem key={row.partner_id} divider={i < data.top_performing_partners.length - 1} disableGutters sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(brandTokens.teal, 0.12), color: brandTokens.teal, fontWeight: 700, fontSize: 14 }}>
                      {row.partner?.name?.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={row.partner?.name} secondary={row.partner?.partner_code} />
                  <Chip label={money(row.total)} size="small" sx={{ bgcolor: alpha('#1C8A5A', 0.12), color: '#1C8A5A', fontWeight: 700 }} />
                </ListItem>
              ))}
              {data.top_performing_partners.length === 0 && (
                <Typography variant="body2" color="text.secondary">No commission data yet.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            component={RouterLink}
            to={expiringDocsLink}
            sx={{ p: 2.5, height: '100%', display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#B67F1E', 0.14) }}>
                <WarningAmberRoundedIcon sx={{ color: '#B67F1E', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontSize: 16 }}>Documents Expiring Soon</Typography>
            </Stack>
            <List dense disablePadding>
              {data.expiring_documents.map((doc, i) => (
                <ListItem key={doc.id} divider={i < data.expiring_documents.length - 1} disableGutters sx={{ py: 1 }}>
                  <ListItemText
                    primary={`${doc.partner?.name} — ${doc.document_type?.name}`}
                    secondary={`Expires ${doc.expiry_date}`}
                  />
                </ListItem>
              ))}
              {data.expiring_documents.length === 0 && (
                <Typography variant="body2" color="text.secondary">Nothing expiring in the next 30 days.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
        <Grid size={12}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ fontSize: 16, mb: 1.5 }}>Recent Activity</Typography>
            <Stack spacing={1}>
              {data.recent_activity.map((activity) => (
                <Typography key={activity.id} variant="body2" color="text.secondary">
                  {activity.description} — {activity.subject_type?.split('\\').pop()} #{activity.subject_id}
                </Typography>
              ))}
              {data.recent_activity.length === 0 && (
                <Typography variant="body2" color="text.secondary">No recent activity recorded.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
