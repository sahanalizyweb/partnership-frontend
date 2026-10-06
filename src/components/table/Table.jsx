import { Table as MuiTable, TableContainer } from '@mui/material';

/**
 * Drop-in replacement for MUI's Table: wraps it in a horizontally scrollable container so
 * nowrap/truncated columns never squeeze into each other on narrow screens.
 */
export function Table(props) {
  return (
    <TableContainer>
      <MuiTable {...props} />
    </TableContainer>
  );
}
