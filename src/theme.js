import { createTheme, alpha } from '@mui/material/styles';

const brand = {
  ink: '#0B1220',
  indigo: '#3B3086',
  indigoDeep: '#241C5E',
  teal: '#0F6B5C',
  gold: '#C08A28',
  surface: '#F6F7FB',
  border: '#E4E7EF',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.teal, dark: '#0A4A3F', light: '#3E8C7D', contrastText: '#fff' },
    secondary: { main: brand.gold, dark: '#96691B', light: '#D6A951', contrastText: '#1A1207' },
    background: { default: brand.surface, paper: '#FFFFFF' },
    text: { primary: '#14181F', secondary: '#5B6472' },
    success: { main: '#1C8A5A' },
    warning: { main: '#B67F1E' },
    error: { main: '#C43A3A' },
    divider: brand.border,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ['Inter', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h4: { fontFamily: '"Plus Jakarta Sans", Inter, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontFamily: '"Plus Jakarta Sans", Inter, sans-serif', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.015em' },
    h6: { fontFamily: '"Plus Jakarta Sans", Inter, sans-serif', fontWeight: 700, fontSize: '1.08rem' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 700, color: brand.ink, fontSize: '0.8rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.05)',
    '0 2px 4px rgba(15,23,42,0.06)',
    '0 3px 8px rgba(15,23,42,0.07)',
    '0 5px 12px rgba(15,23,42,0.08)',
    '0 7px 16px rgba(15,23,42,0.09)',
    '0 7px 16px rgba(15,23,42,0.09)',
    '0 9px 20px rgba(15,23,42,0.10)',
    '0 9px 20px rgba(15,23,42,0.10)',
    '0 11px 24px rgba(15,23,42,0.11)',
    '0 11px 24px rgba(15,23,42,0.11)',
    '0 13px 28px rgba(15,23,42,0.12)',
    '0 13px 28px rgba(15,23,42,0.12)',
    '0 15px 32px rgba(15,23,42,0.13)',
    '0 15px 32px rgba(15,23,42,0.13)',
    '0 17px 36px rgba(15,23,42,0.14)',
    '0 17px 36px rgba(15,23,42,0.14)',
    '0 19px 40px rgba(15,23,42,0.15)',
    '0 19px 40px rgba(15,23,42,0.15)',
    '0 21px 44px rgba(15,23,42,0.16)',
    '0 21px 44px rgba(15,23,42,0.16)',
    '0 23px 48px rgba(15,23,42,0.17)',
    '0 23px 48px rgba(15,23,42,0.17)',
    '0 25px 52px rgba(15,23,42,0.18)',
    '0 25px 52px rgba(15,23,42,0.18)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brand.surface,
          backgroundImage: `radial-gradient(1100px 480px at 100% -10%, ${alpha(brand.indigo, 0.06)}, transparent 60%), radial-gradient(900px 420px at -5% 0%, ${alpha(brand.teal, 0.06)}, transparent 55%)`,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: { boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 0 rgba(15,23,42,0.04)', border: `1px solid ${brand.border}` },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${brand.border}`,
          boxShadow: '0 2px 6px rgba(15,23,42,0.07)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 18, paddingBlock: 8.5, fontWeight: 700, transition: 'box-shadow 0.15s ease, transform 0.15s ease' },
        contained: {
          boxShadow: '0 2px 6px rgba(15,23,42,0.12)',
          '&:hover': { boxShadow: '0 8px 18px rgba(15,23,42,0.20)', transform: 'translateY(-1px)' },
        },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${brand.teal}, #0A4A3F)`,
        },
        containedSecondary: {
          backgroundImage: `linear-gradient(135deg, ${brand.gold}, #96691B)`,
        },
        outlined: { borderColor: brand.border, borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: 8, paddingInline: 2 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FFFFFF', 0.85),
          backdropFilter: 'blur(10px)',
          color: '#14181F',
          borderBottom: `1px solid ${brand.border}`,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02), 0 4px 16px rgba(15,23,42,0.04)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { border: 'none', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10, backgroundColor: '#fff',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        // App-wide column rules for plain tables: one line per cell, overflow ends in "..."
        // instead of wrapping/pushing neighbouring columns (text truncation: components/table).
        root: {
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          verticalAlign: 'middle',
          '&[colspan]': { whiteSpace: 'normal' },
        },
        head: { fontWeight: 700, color: brand.ink, backgroundColor: '#FAFBFD', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 18, boxShadow: '0 32px 72px rgba(11,18,32,0.28)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: 18, padding: '20px 24px' },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '8px 24px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '16px 24px', borderTop: `1px solid ${brand.border}` },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: brand.border },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700, boxShadow: `0 0 0 3px ${alpha('#FFFFFF', 0.9)}, 0 2px 6px rgba(15,23,42,0.18)` },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${brand.border}` },
        indicator: { height: 3, borderRadius: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 600, fontSize: 14, minHeight: 44,
          '&.Mui-selected': { color: brand.teal, fontWeight: 700 },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '--DataGrid-rowBorderColor': brand.border,
          fontFamily: 'Inter, sans-serif',
          // Custom-rendered cells (chips/buttons) stay on one centred line inside their column.
          '& .MuiDataGrid-cell--flex > .MuiStack-root': { flexWrap: 'nowrap', minWidth: 0, overflow: 'hidden' },
          '& .MuiDataGrid-columnHeaderTitleContainerContent': { minWidth: 0 },
        },
        columnHeaders: {
          backgroundColor: '#F7F8FB',
          borderBottom: `2px solid ${brand.border}`,
        },
        columnHeaderTitle: { fontWeight: 700, color: brand.ink, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
        row: {
          '&:nth-of-type(even)': { backgroundColor: alpha(brand.surface, 0.6) },
          '&:hover': { backgroundColor: alpha(brand.teal, 0.06) },
        },
        cell: { outline: 'none' },
        footerContainer: { borderTop: `1px solid ${brand.border}`, backgroundColor: '#FAFBFD' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: alpha(brand.teal, 0.04) },
        },
      },
    },
  },
});

export const brandTokens = brand;
