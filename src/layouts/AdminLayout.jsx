import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Drawer, IconButton, Toolbar,
  Typography, Menu, MenuItem, Avatar, Chip, Divider, alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { useAuth } from '../auth/AuthContext';
import { ADMIN_NAV, filterNavByPermission } from '../config/navigation';
import { SidebarNav } from '../components/SidebarNav';
import { GlobalSearch } from '../components/GlobalSearch';
import { brandTokens } from '../theme';

const DRAWER_WIDTH = 264;

export function AdminLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const items = filterNavByPermission(ADMIN_NAV, can);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${brandTokens.ink}, #070B14)`, color: '#fff' }}>
      <Toolbar sx={{ px: 3, py: 2.5, gap: 1.25 }}>
        <Box
          sx={{
            width: 38, height: 38, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${brandTokens.teal}, ${brandTokens.indigo})`,
            boxShadow: `0 4px 14px ${alpha(brandTokens.teal, 0.45)}`,
          }}
        >
          <HubRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
            Partnership Hub
          </Typography>
          <Typography sx={{ fontSize: 11, color: alpha('#fff', 0.5), letterSpacing: 0.4 }}>
            LIZY GROUP
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: alpha('#fff', 0.08), mx: 2 }} />
      <SidebarNav items={items} rootPath="/app" activeBg={alpha(brandTokens.teal, 0.22)} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0} sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', minHeight: 72 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1, mx: { xs: 1, sm: 0 }, mr: 2 }}>
            <GlobalSearch placeholder="Search partners, products, supplies, sales..." width={420} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={user?.roles?.[0] ?? 'User'}
              size="small"
              sx={{ bgcolor: alpha(brandTokens.gold, 0.14), color: '#8A5F14', fontWeight: 700, border: `1px solid ${alpha(brandTokens.gold, 0.3)}` }}
            />
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1, py: 0.5, borderRadius: 3, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: brandTokens.teal, fontSize: 14, fontWeight: 700 }}>
                {user?.name?.charAt(0)}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.name}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{user?.email}</Typography>
              </Box>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
              <MenuItem
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
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
