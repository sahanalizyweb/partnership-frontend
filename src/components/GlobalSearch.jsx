import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, ClickAwayListener, InputAdornment, LinearProgress, List, ListItemButton, ListItemText,
  ListSubheader, Paper, Popper, TextField, Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { api } from '../api/client';

const MIN_CHARS = 2;
const DELAY_MS = 300;

/**
 * Top-bar search over GET /search. The backend decides what this user may see (per-group
 * permissions, business scope, and only their own records for a partner-portal login), so the
 * same component serves the admin app and the Partner Portal. "/" or Ctrl+K focuses it.
 */
export function GlobalSearch({ placeholder = 'Search...', width = 360 }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const enabled = q.length >= MIN_CHARS;
  const { data, isFetching } = useQuery({
    queryKey: ['global-search', q],
    queryFn: async () => (await api.get('/search', { params: { q } })).data,
    enabled,
    staleTime: 30_000,
  });
  const groups = enabled ? (data?.groups ?? []) : [];

  const go = (url) => {
    setOpen(false);
    setText('');
    inputRef.current?.blur();
    navigate(url);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={setAnchorEl} sx={{ width: { xs: '100%', sm: width }, maxWidth: '100%' }}>
        <TextField
          inputRef={inputRef}
          size="small"
          fullWidth
          placeholder={placeholder}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } }}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
            ),
          } }}
        />
        <Popper open={open && text.trim().length >= MIN_CHARS} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: (t) => t.zIndex.modal }}>
          <Paper elevation={8} sx={{ mt: 0.75, width: anchorEl?.offsetWidth, maxHeight: 440, overflow: 'auto' }}>
            {isFetching && <LinearProgress sx={{ height: 2 }} />}
            {!isFetching && enabled && !groups.length && (
              <Typography sx={{ p: 2, fontSize: 14, color: 'text.secondary' }}>No results found</Typography>
            )}
            {groups.map((group) => (
              <List key={group.key} dense disablePadding subheader={<ListSubheader sx={{ lineHeight: '32px', fontWeight: 700 }}>{group.label}</ListSubheader>}>
                {group.items.map((item) => (
                  <ListItemButton key={`${group.key}-${item.id}`} onClick={() => go(item.url)}>
                    <ListItemText primary={item.title} secondary={item.subtitle} slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }} />
                  </ListItemButton>
                ))}
              </List>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
