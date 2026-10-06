import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Drawer, Toolbar, Typography,
  IconButton, Avatar, Menu, MenuItem, Divider, Chip, alpha,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { mergePortalNav } from '../config/navigation';
import { SidebarNav } from '../components/SidebarNav';
import { GlobalSearch } from '../components/GlobalSearch';
import { brandTokens } from '../theme';

const DRAWER_WIDTH = 250;

export function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // A partner can hold multiple simultaneous partner-type enrollments (e.g. Service + Sales +
  // Reseller at once) and should see the union of every enrolled type's menu after one login,
  // not just one. `me/partner` stays for the fallback (legacy primary type only, if the
  // enrollments list is still loading/empty) — `me/enrollments` drives the real nav.
  const { data: partner } = useQuery({
    queryKey: ['me-partner'],
    queryFn: async () => (await api.get('/me/partner')).data,
    refetchOnWindowFocus: true,
  });
  const { data: enrollments } = useQuery({
    queryKey: ['me-enrollments'],
    queryFn: async () => (await api.get('/me/enrollments')).data,
    // Admin may change this partner's roles while they're logged in.
    refetchOnWindowFocus: true,
  });
  const typeCodes = enrollments?.length
    ? enrollments.map((e) => e.partner_type?.code).filter(Boolean)
    : [partner?.partner_type?.code].filter(Boolean);
  const navItems = mergePortalNav(typeCodes);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${brandTokens.ink}, #070B14)`, color: '#fff' }}>
      <Toolbar sx={{ px: 3, py: 2.5, gap: 1.25 }}>
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${brandTokens.gold}, ${brandTokens.indigo})`,
            boxShadow: `0 4px 14px ${alpha(brandTokens.gold, 0.45)}`,
          }}
        >
          <HubRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
            Partner Portal
          </Typography>
          <Typography sx={{ fontSize: 11, color: alpha('#fff', 0.5), letterSpacing: 0.4 }}>
            LIZY GROUP
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: alpha('#fff', 0.08), mx: 2 }} />
      <SidebarNav items={navItems} rootPath="/portal" activeBg={alpha(brandTokens.gold, 0.2)} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0} sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 72 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, mx: { xs: 1, sm: 0 }, mr: 2, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: 15, color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
              Welcome back, {user?.name?.split(' ')[0]}
            </Typography>
            <GlobalSearch placeholder="Search my records..." width={280} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label="Partner"
              size="small"
              sx={{ bgcolor: alpha(brandTokens.gold, 0.14), color: '#8A5F14', fontWeight: 700, border: `1px solid ${alpha(brandTokens.gold, 0.3)}` }}
            />
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1, py: 0.5, borderRadius: 3, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: brandTokens.gold, fontSize: 14, fontWeight: 700 }}>
                {user?.name?.charAt(0)}
              </Avatar>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>
          </Box>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, background: `linear-gradient(180deg, ${brandTokens.ink}, #070B14)` } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', background: `linear-gradient(180deg, ${brandTokens.ink}, #070B14)` } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3.5 }, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar sx={{ minHeight: '72px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
