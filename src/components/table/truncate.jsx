/**
 * Shared truncation rule for every table in the app (DataGrid and plain MUI tables):
 * text longer than MAX_CELL_CHARS is cut with "..." and the full text stays available
 * as a hover tooltip. CSS ellipsis (see theme.js) still applies when a column is narrower.
 */
export const MAX_CELL_CHARS = 21;

export function truncateText(text, max = MAX_CELL_CHARS) {
  const chars = Array.from(String(text));
  return chars.length > max ? `${chars.slice(0, max).join('').trimEnd()}...` : chars.join('');
}

const ellipsisStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };

export function TruncatedText({ text, className, block = false }) {
  if (text === null || text === undefined) return null;
  const full = String(text);
  const shown = truncateText(full);
  return (
    <span
      className={className}
      title={shown !== full ? full : undefined}
      style={block ? { ...ellipsisStyle, display: 'block' } : ellipsisStyle}
    >
      {shown}
    </span>
  );
}
