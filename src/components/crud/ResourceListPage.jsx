import { useMemo, useState } from 'react';
import { Box, Typography, Button, Paper, IconButton, Chip, Stack, Snackbar, Alert, alpha } from '@mui/material';
import { DataGrid } from '../table';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useList, useCreate, useUpdate, useRemove } from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { ResourceForm } from './ResourceForm';

/**
 * Config-driven list+create+edit+delete page for simple master-data modules
 * (Partner Types, Partner Categories, Locations, Document Types, ...).
 *
 * `businessScoped`: the backend requires a business_id on create for global users (e.g. Super
 * Administrator, business_id null), so a Business picker is prepended to the create form for them.
 */
export function ResourceListPage({ path, title, columns, fields, permissionPrefix, extraParams = {}, businessScoped = false }) {
  const { can, user } = useAuth();
  const needsBusiness = businessScoped && !user?.business_id;
  const { data: businesses } = useList('businesses', {}, { enabled: needsBusiness });
  const { data, isLoading } = useList(path, extraParams);
  const createMutation = useCreate(path);
  const updateMutation = useUpdate(path);
  const removeMutation = useRemove(path);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const rows = Array.isArray(data) ? data : (data?.data ?? []);

  const formFields = useMemo(() => {
    // business_id can't be changed after creation, so the picker only shows on create.
    if (!needsBusiness || editing) return fields;
    const options = (Array.isArray(businesses) ? businesses : (businesses?.data ?? []))
      .map((b) => ({ value: b.id, label: b.name }));
    return [{ name: 'business_id', label: 'Business', type: 'select', required: true, options }, ...fields];
  }, [needsBusiness, editing, businesses, fields]);

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong');
    }
  };

  const canCreate = can(`${permissionPrefix}.create`);
  const canEdit = can(`${permissionPrefix}.edit`);
  const canDelete = can(`${permissionPrefix}.delete`);

  const gridColumns = [
    ...columns,
    ...(canEdit || canDelete
      ? [
          {
            field: '_actions',
            headerName: 'Actions',
            sortable: false,
            filterable: false,
            width: 110,
            renderCell: (params) => (
              <Stack direction="row" spacing={0.5}>
                {canEdit && (
                  <IconButton size="small" onClick={() => { setEditing(params.row); setFormOpen(true); }} sx={{ '&:hover': { color: 'primary.main', bgcolor: alpha('#0F6B5C', 0.08) } }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton
                    size="small"
                    sx={{ '&:hover': { color: 'error.main', bgcolor: alpha('#C43A3A', 0.08) } }}
                    onClick={async () => {
                      if (window.confirm('Delete this record?')) {
                        await removeMutation.mutateAsync(params.row.id);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5">{title}</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            Add
          </Button>
        )}
      </Box>
      <Paper sx={{ height: 600, width: '100%', overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={gridColumns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
          sx={{ border: 'none' }}
        />
      </Paper>
      <ResourceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        fields={formFields}
        initialValues={editing ?? {}}
        title={editing ? `Edit ${title}` : `Add ${title}`}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}

const STATUS_TONES = {
  success: { fg: '#1C8A5A', bg: alpha('#1C8A5A', 0.12) },
  warning: { fg: '#9A6A16', bg: alpha('#B67F1E', 0.14) },
  error: { fg: '#B3382E', bg: alpha('#C43A3A', 0.12) },
  default: { fg: '#5B6472', bg: alpha('#5B6472', 0.1) },
};

export function StatusChip({ status, label }) {
  const tone = ['active', 'approved', 'completed', 'paid', 'verified', 'accepted', 'delivered', 'resold'].includes(status)
    ? 'success'
    : ['pending', 'draft', 'pending_approval', 'verification_pending', 'partial', 'picked_up', 'out_for_delivery'].includes(status)
    ? 'warning'
    : ['rejected', 'cancelled', 'suspended', 'inactive', 'expired', 'terminated', 'unpaid', 'failed'].includes(status)
    ? 'error'
    : 'default';
  const { fg, bg } = STATUS_TONES[tone];
  return (
    <Chip
      label={label ?? status?.replace(/_/g, ' ')}
      size="small"
      icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: fg, ml: '8px !important' }} />}
      sx={{ textTransform: 'capitalize', color: fg, bgcolor: bg, fontWeight: 700, border: 'none', '& .MuiChip-icon': { color: fg } }}
    />
  );
}
