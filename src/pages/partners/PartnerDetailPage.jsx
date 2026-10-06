import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Tabs, Tab, Grid, Button, Stack, Chip, alpha } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { brandTokens } from '../../theme';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { PartnerProfileTab } from './PartnerProfileTab';
import { PartnerLocationTab } from './PartnerLocationTab';
import { PartnerDocumentsTab } from './PartnerDocumentsTab';
import { PartnerAgreementsTab } from './PartnerAgreementsTab';
import { PartnerCommissionRulesTab } from './PartnerCommissionRulesTab';
import { PartnerSuppliesTab } from './PartnerSuppliesTab';
import { PartnerEnrollmentsTab } from './PartnerEnrollmentsTab';
import { PartnerEarningsTab } from './PartnerEarningsTab';
import { PartnerPerformanceTab } from './PartnerPerformanceTab';
import { PartnerLedgerTab } from './PartnerLedgerTab';
import { PartnerReportTab } from './PartnerReportTab';
import { PartnerPortalAccessCard } from './PartnerPortalAccessCard';

// Commission is intentionally not a tab here — it's shown per-assignment on the Assignments page instead.
// Every tab below is passed { partnerId, partner } so any of them can read/edit the full record.
const COMMON_TAB_DEFS = [
  { label: 'Profile', Component: PartnerProfileTab },
  { label: 'Enrollments', Component: PartnerEnrollmentsTab },
  { label: 'Earnings', Component: PartnerEarningsTab },
  { label: 'Location', Component: PartnerLocationTab },
  { label: 'Documents', Component: PartnerDocumentsTab },
  { label: 'Agreements', Component: PartnerAgreementsTab },
  { label: 'Commission Rules', Component: PartnerCommissionRulesTab },
  { label: 'Performance', Component: PartnerPerformanceTab },
  { label: 'Ledger', Component: PartnerLedgerTab },
  { label: 'Report', Component: PartnerReportTab },
];

// Supplier Partner tracks the Supplier -> Our Company flow (supplies + what we owe them)
// instead of commission-earning — this tab (with its own "Add Supply" button, mirroring
// Commission Rules' "New Commission Rule" button above) only makes sense for that type.
const SUPPLIES_TAB = { label: 'Supplies', Component: PartnerSuppliesTab };

export function PartnerDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partners', 'one', id],
    queryFn: async () => (await api.get(`/partners/${id}`)).data,
  });

  const doAction = async (action) => {
    await api.post(`/partners/${id}/${action}`);
    queryClient.invalidateQueries({ queryKey: ['partners', 'one', id] });
  };

  if (isLoading || !partner) return <Typography>Loading...</Typography>;

  const isSupplier = partner.partner_type?.code === 'supplier';
  const TAB_DEFS = isSupplier ? [...COMMON_TAB_DEFS, SUPPLIES_TAB] : COMMON_TAB_DEFS;
  // Guards against a stale tab index when navigating (without remounting) from a partner with
  // more tabs (a Supplier, 9 tabs) to one with fewer (8) — React Router keeps this component's
  // local state across a param-only navigation between two `partners/:id` routes.
  const activeTab = Math.min(tab, TAB_DEFS.length - 1);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5">{partner.name}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip label={partner.partner_code} size="small" />
            <StatusChip status={partner.status} />
          </Stack>
        </Box>
        {can('partners.approve') && (
          <Stack direction="row" spacing={1}>
            {(partner.status === 'applied' || partner.status === 'verification_pending') && (
              <Button variant="outlined" onClick={() => doAction('verify')}>Mark Verified</Button>
            )}
            {partner.status === 'verified' && (
              <Button variant="outlined" color="success" onClick={() => doAction('reactivate')}>Activate</Button>
            )}
            {partner.status === 'active' && (
              <Button variant="outlined" color="warning" onClick={() => doAction('suspend')}>Suspend</Button>
            )}
            {partner.status === 'suspended' && (
              <Button variant="outlined" color="success" onClick={() => doAction('reactivate')}>Reactivate</Button>
            )}
          </Stack>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.25, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${brandTokens.indigo}, ${alpha(brandTokens.indigo, 0.35)})` }} />
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(brandTokens.indigo, 0.12), color: brandTokens.indigo }}>
                <PhoneRoundedIcon sx={{ fontSize: 17 }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{partner.phone}</Typography>
            <Typography variant="body2" color="text.secondary">{partner.email ?? '—'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.25, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${brandTokens.teal}, ${alpha(brandTokens.teal, 0.35)})` }} />
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(brandTokens.teal, 0.12), color: brandTokens.teal }}>
                <SellRoundedIcon sx={{ fontSize: 17 }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type / Category</Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{partner.partner_type?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{partner.partner_category?.name ?? '—'}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2.25, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${brandTokens.gold}, ${alpha(brandTokens.gold, 0.35)})` }} />
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(brandTokens.gold, 0.14), color: '#8A5F14' }}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 17 }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Balance</Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }} color={partner.current_balance >= 0 ? 'success.main' : 'error.main'}>
              ₹{Number(partner.current_balance ?? 0).toLocaleString('en-IN')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <PartnerPortalAccessCard partnerId={id} partner={partner} />
        </Grid>
      </Grid>

      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1 }}>
          {TAB_DEFS.map(({ label }) => <Tab key={label} label={label} />)}
        </Tabs>
        <Box sx={{ p: 2.5 }}>
          {(() => {
            const { Component } = TAB_DEFS[activeTab];
            return <Component partnerId={id} partner={partner} />;
          })()}
        </Box>
      </Paper>
    </Box>
  );
}
