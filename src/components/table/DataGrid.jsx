import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';
import { DataGrid as MuiDataGrid, gridClasses, useGridApiRef } from '@mui/x-data-grid';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { TruncatedText } from './truncate';

const PLAIN_TEXT_SKIP_TYPES = ['actions', 'boolean', 'checkboxSelection'];
const SEARCH_DELAY_MS = 300;

/**
 * The text a cell shows, lower-cased, for the table search box: the column's own
 * valueGetter/valueFormatter when it has one (so "Partner" matches the partner's name, not an
 * object), else the raw field. Underscores read as spaces, like status chips display them.
 */
function searchableText(col, row, apiRef) {
  let value = row[col.field];
  try {
    if (col.valueGetter) value = col.valueGetter(value, row, col, apiRef);
    if (col.valueFormatter) value = col.valueFormatter(value, row, col, apiRef);
  } catch {
    // A getter that needs live grid state — fall back to the raw value.
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).toLowerCase().replace(/_/g, ' ')
    : '';
}
// Room for the sort arrow that appears next to a header title on hover.
const HEADER_ICON_RESERVE = 28;

/**
 * Applies the app-wide column rules to one column definition without changing its behaviour
 * (sorting/filtering still use the original values):
 *  - header text truncated to 21 chars, full name on hover
 *  - plain text cells truncated to 21 chars, full text on hover
 *  - custom-rendered cells (chips, buttons, stacks) vertically centred via display: 'flex'
 */
function withTableRules(col) {
  const next = { ...col };

  if (!col.renderHeader && col.headerName) {
    next.renderHeader = () => (
      <TruncatedText text={col.headerName} className={gridClasses.columnHeaderTitle} block />
    );
  }

  if (col.renderCell) {
    next.display = col.display ?? 'flex';
  } else if (!PLAIN_TEXT_SKIP_TYPES.includes(col.type)) {
    next.renderCell = (params) => {
      const value = params.formattedValue ?? params.value;
      return value === null || value === undefined ? null : <TruncatedText text={value} />;
    };
  }

  return next;
}

/**
 * Natural (unclipped) width of every rendered header and cell, per field. Uses the grid's own
 * `autosizing` class — the same measurement MUI's autosize uses — applied and removed in one
 * synchronous pass, so nothing is painted in between.
 */
function measureContentWidths(root) {
  const widths = {};
  const take = (field, width) => { widths[field] = Math.max(widths[field] ?? 0, Math.ceil(width)); };

  root.classList.add(gridClasses.autosizing);
  try {
    // Loading skeleton rows are placeholders, not content — skip them.
    root.querySelectorAll(`.${gridClasses.cell}[data-field]:not(.${gridClasses.cellSkeleton})`).forEach((cell) => {
      take(cell.dataset.field, cell.getBoundingClientRect().width);
    });
    root.querySelectorAll(`.${gridClasses.columnHeader}[data-field]`).forEach((header) => {
      const title = header.querySelector(`.${gridClasses.columnHeaderTitleContainer}`);
      if (!title) return;
      const style = window.getComputedStyle(header);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const content = Array.from(title.children).reduce((sum, child) => sum + child.scrollWidth, 0);
      const menu = header.querySelector(`.${gridClasses.menuIcon}`)?.clientWidth ?? 0;
      take(header.dataset.field, content + padding + menu + HEADER_ICON_RESERVE);
    });
  } finally {
    root.classList.remove(gridClasses.autosizing);
  }
  return widths;
}

/**
 * Drop-in replacement for MUI's DataGrid — use this for every grid in the app.
 *
 * Every column gets a minimum width equal to its measured header/content width, so a column
 * can never be squeezed into "Su…" by its neighbours. Declared `width`/`flex` still apply above
 * that minimum (the layout looks the same when there's room); when there isn't, the grid
 * scrolls horizontally instead of collapsing columns.
 *
 * A search box above the grid filters the loaded rows (every grid here holds all its rows and
 * pages them in the browser) across all visible text columns, case-insensitively. Sorting and
 * paging stay the grid's own. A `?search=` in the URL (set by the global search) pre-fills it.
 */
export function DataGrid({ columns, rows, apiRef: externalApiRef, localeText, ...props }) {
  const internalApiRef = useGridApiRef();
  const apiRef = externalApiRef ?? internalApiRef;
  const [contentWidths, setContentWidths] = useState({});

  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [term, setTerm] = useState(urlSearch.trim().toLowerCase());
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  // Picking another global-search result on the same page changes ?search= without remounting.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim().toLowerCase()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);
  // A new search starts from the first page.
  useEffect(() => { apiRef.current?.setPage?.(0); }, [apiRef, term]);

  const visibleRows = useMemo(() => {
    if (!term || !rows) return rows;
    const hidden = props.columnVisibilityModel ?? {};
    const searchable = columns.filter((col) => !PLAIN_TEXT_SKIP_TYPES.includes(col.type)
      && !col.field.startsWith('_') && hidden[col.field] !== false);
    return rows.filter((row) => searchable.some((col) => searchableText(col, row, apiRef).includes(term)));
  }, [rows, columns, term, apiRef, props.columnVisibilityModel]);

  const baseColumns = useMemo(() => columns.map(withTableRules), [columns]);

  const gridColumns = useMemo(
    () => baseColumns.map((col) => {
      const measured = contentWidths[col.field];
      if (!measured) return col;
      return { ...col, minWidth: Math.min(Math.max(col.minWidth ?? 0, measured), col.maxWidth ?? Infinity) };
    }),
    [baseColumns, contentWidths],
  );

  // Re-measure after every row render (data load, paging, sorting, scrolling) — the grid paints
  // rows asynchronously, so hook its own events rather than guessing from props. Widths only
  // ever grow, so a transient state (loading, an empty page) never collapses a column again.
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = apiRef.current?.rootElementRef?.current;
        if (!root) return;
        const measured = measureContentWidths(root);
        setContentWidths((prev) => {
          const grown = Object.keys(measured).filter((f) => measured[f] > (prev[f] ?? 0));
          if (!grown.length) return prev;
          const next = { ...prev };
          grown.forEach((f) => { next[f] = measured[f]; });
          return next;
        });
      });
    };
    schedule();
    const unsubscribe = ['rowsSet', 'renderedRowsIntervalChange', 'paginationModelChange', 'sortModelChange']
      .map((event) => apiRef.current?.subscribeEvent?.(event, schedule));
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe.forEach((fn) => fn?.());
    };
  }, [apiRef, visibleRows, baseColumns, props.loading]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 280 } }}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearch('')}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          } }}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MuiDataGrid
          apiRef={apiRef}
          columns={gridColumns}
          rows={visibleRows}
          // App grids have a dozen columns at most: render them all (not just the visible ones)
          // so off-screen columns such as Actions are measured too.
          columnBufferPx={4000}
          localeText={term ? { ...localeText, noRowsLabel: 'No results found' } : localeText}
          {...props}
        />
      </Box>
    </Box>
  );
}
