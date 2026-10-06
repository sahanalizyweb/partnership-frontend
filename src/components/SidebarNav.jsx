import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Box, Collapse, IconButton, List, ListItemButton, ListItemIcon, ListItemText, alpha } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { brandTokens } from '../theme';

const itemSx = (activeBg) => ({
  borderRadius: 2.5,
  mb: 0.5,
  py: 1.1,
  position: 'relative',
  color: alpha('#fff', 0.68),
  '& .MuiListItemIcon-root': { color: alpha('#fff', 0.5), minWidth: 36 },
  '&:hover': { bgcolor: alpha('#fff', 0.06) },
  '&.active': {
    bgcolor: activeBg,
    color: '#fff',
    '&::before': {
      content: '""', position: 'absolute', left: -12, top: '20%', bottom: '20%', width: 3,
      borderRadius: 3, background: brandTokens.gold,
    },
    '& .MuiListItemIcon-root': { color: brandTokens.gold },
    '& .MuiListItemText-primary': { fontWeight: 600 },
  },
});

function NavItem({ item, rootPath, activeBg, nested }) {
  const Icon = item.icon;
  return (
    <ListItemButton
      component={NavLink}
      to={item.path}
      end={item.path === rootPath}
      sx={{ ...itemSx(activeBg), ...(nested && { pl: 4.5, py: 0.8 }) }}
    >
      <ListItemIcon>{Icon && <Icon fontSize="small" />}</ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: nested ? 13.5 : 14 } } }} />
    </ListItemButton>
  );
}

/**
 * Sidebar menu shared by the Admin and Partner Portal layouts. An entry with `children` is a
 * main menu grouping related pages:
 * - hovering it shows its pages; clicking its name opens the first one;
 * - it stays expanded while one of its pages is open;
 * - clicking its arrow while expanded closes it — and, if you're on one of its pages, goes
 *   back to the previous page. A fresh hover shows the pages again.
 */
export function SidebarNav({ items, rootPath, activeBg }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [dismissed, setDismissed] = useState(null);

  const isChildActive = (group) => group.children.some((c) => pathname === c.path || pathname.startsWith(`${c.path}/`));

  const goBack = () => {
    // React Router records the history index; with nothing to go back to, fall back to the dashboard.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(rootPath);
  };

  return (
    <List sx={{ px: 1.5, py: 2, flex: 1, overflowY: 'auto' }}>
      {items.map((item) => {
        if (!item.children) {
          return <NavItem key={item.path} item={item} rootPath={rootPath} activeBg={activeBg} />;
        }

        const Icon = item.icon;
        const childActive = isChildActive(item);
        const open = dismissed !== item.label && (hovered === item.label || childActive);

        const toggle = (e) => {
          e.stopPropagation();
          if (open) {
            setDismissed(item.label);
            setHovered(null);
            if (childActive) goBack();
          } else {
            setDismissed(null);
            setHovered(item.label);
          }
        };

        return (
          <Box
            key={item.label}
            onMouseEnter={() => {
              setHovered(item.label);
              setDismissed((d) => (d === item.label ? null : d));
            }}
            onMouseLeave={() => setHovered((h) => (h === item.label ? null : h))}
          >
            <ListItemButton
              onClick={() => {
                setDismissed(null);
                navigate(item.children[0].path);
              }}
              sx={{
                ...itemSx(activeBg),
                ...(childActive && { color: '#fff', '& .MuiListItemIcon-root': { color: brandTokens.gold, minWidth: 36 } }),
              }}
            >
              <ListItemIcon>{Icon && <Icon fontSize="small" />}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: 14, fontWeight: childActive ? 600 : 500 } } }}
              />
              <IconButton
                size="small"
                onClick={toggle}
                aria-label={open ? `Close ${item.label}` : `Open ${item.label}`}
                sx={{ mr: -0.75, color: alpha('#fff', 0.55), '&:hover': { bgcolor: alpha('#fff', 0.1), color: '#fff' } }}
              >
                <KeyboardArrowDownRoundedIcon
                  sx={{ fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
                />
              </IconButton>
            </ListItemButton>
            <Collapse in={open} timeout={180} unmountOnExit>
              {item.children.map((child) => (
                <NavItem key={child.path} item={child} rootPath={rootPath} activeBg={activeBg} nested />
              ))}
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
}
