import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Stack, Chip, Alert, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '../../components/table';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useList, useRemove } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { StatusChip } from '../../components/crud/ResourceListPage';
import { PartnerFormDialog } from './PartnerFormDialog';

const STATUS_OPTIONS = ['applied', 'verification_pending', 'verified', 'agreement_pending', 'active', 'inactive', 'suspended', 'rejected'];

// Dashboard's "Pending Applications" stat spans two statuses (see DashboardController::pending_applications) —
// the Partners status column only supports one value at a time, so this pseudo-value is resolved client-side.
const PENDING_APPLICATION_STATUSES = ['applied', 'verification_pending'];

// The community DataGrid has no column pinning — keep the Actions column on the right edge
// with sticky positioning instead (header and cells).
const PINNED_ACTIONS_SX = {
  '& .MuiDataGrid-columnHeader[data-field="_actions"], & .MuiDataGrid-cell[data-field="_actions"]': {
    position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper', boxShadow: '-6px 0 8px -6px rgba(0,0,0,0.15)',
  },
};

function partnerRoles(row) {
  const names = [...(row.enrollments ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((e) => e.partner_type?.name)
    .filter(Boolean);
  if (!names.length && row.partner_type?.name) names.push(row.partner_type.name);
  return [...new Set(names)];
}

export function PartnersListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const queryClient = useQueryClient();
  const removeMutation = useRemove('partners');

  const confirmDelete = async () => {
    setDeleteError('');
    try {
      await removeMutation.mutateAsync(deleteTarget.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message ?? 'Could not delete this partner');
      return;
    }
    setDeleteTarget(null);
    setDeleted(true);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const idsFilter = searchParams.get('ids');
  const idsList = idsFilter ? idsFilter.split(',').map(Number) : null;

  const { data, isLoading } = useList('partners', {
    search,
    status: status === 'pending_applications' ? '' : status,
    per_page: 100,
  });
  const rows = (data?.data ?? [])
    .filter((r) => (status === 'pending_applications' ? PENDING_APPLICATION_STATUSES.includes(r.status) : true))
    .filter((r) => (idsList ? idsList.includes(r.id) : true));

  const clearIdsFilter = () => setSearchParams((params) => {
    params.delete('ids');
    params.delete('context');
    return params;
  });

  const columns = [
    { field: 'partner_code', headerName: 'Code', width: 130 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      // Every role this partner holds (primary first), not only the primary type.
      field: 'partner_type', headerName: 'Partner Roles', flex: 1.4, minWidth: 200,
      valueGetter: (v, row) => partnerRoles(row).join(', '),
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%', flexWrap: 'wrap', rowGap: 0.5 }}>
          {partnerRoles(params.row).map((name) => <Chip key={name} label={name} size="small" variant="outlined" />)}
        </Stack>
      ),
    },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'status', headerName: 'Status', width: 160, renderCell: (params) => <StatusChip status={params.value} /> },
    {
      field: 'assignments_count',
      headerName: 'Assignments',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Chip
          icon={<AssignmentIndRoundedIcon fontSize="small" />}
          label={params.value ?? 0}
          size="small"
          clickable={can('assignments.view')}
          onClick={can('assignments.view') ? (e) => {
            e.stopPropagation();
            navigate(`/app/assignments?partner_id=${params.row.id}&partner_name=${encodeURIComponent(params.row.name)}`);
          } : undefined}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    ...(can('partners.delete') ? [{
      field: '_actions', headerName: 'Actions', width: 90, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title="Delete partner">
          <IconButton
            size="small" color="error"
            onClick={(e) => { e.stopPropagation(); setDeleteError(''); setDeleteTarget(params.row); }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    }] : []),
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Partners</Typography>
        {can('partners.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Add Partner
          </Button>
        )}
      </Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField label="Search" size="small" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} />
        <TextField
          label="Status"
          select
          size="small"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ width: 220 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending_applications">Pending Applications</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
          ))}
        </TextField>
      </Stack>
      {idsList && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={clearIdsFilter}>Clear filter</Button>}
        >
          Showing {searchParams.get('context') || 'the selected'} partners only.
        </Alert>
      )}
      <Paper sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/app/partners/${params.row.id}`)}
          sx={{ cursor: 'pointer', ...PINNED_ACTIONS_SX }}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
        />
      </Paper>
      <PartnerFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete partner</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography>Delete {deleteTarget?.name}? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={removeMutation.isPending}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={deleted} autoHideDuration={3000} onClose={() => setDeleted(false)}>
        <Alert severity="success" onClose={() => setDeleted(false)}>Partner deleted</Alert>
      </Snackbar>
    </Box>
  );
}
