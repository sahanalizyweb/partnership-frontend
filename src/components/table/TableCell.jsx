import { TableCell as MuiTableCell } from '@mui/material';
import { TruncatedText } from './truncate';

/**
 * Drop-in replacement for MUI's TableCell: plain text/number content gets the app-wide
 * 21-char truncation (full text on hover). Rich content (chips, buttons, typography) and
 * full-width colSpan cells (empty states) are left untouched.
 */
export function TableCell({ children, colSpan, ...props }) {
  // `₹{amount}` arrives as ['₹', 1200] — still plain text.
  const parts = Array.isArray(children) ? children : [children];
  const isPlain = !(colSpan > 1) && parts.length > 0
    && parts.every((c) => typeof c === 'string' || typeof c === 'number');
  return (
    <MuiTableCell colSpan={colSpan} {...props}>
      {isPlain ? <TruncatedText text={parts.join('')} /> : children}
    </MuiTableCell>
  );
}
