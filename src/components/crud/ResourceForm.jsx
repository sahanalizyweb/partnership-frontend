import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * field: { name, label, type: 'text'|'number'|'select'|'textarea'|'checkbox'|'date', options?, required? }
 */
export function ResourceForm({ open, onClose, onSubmit, fields, initialValues = {}, title, submitting }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (open) {
      const defaults = {};
      fields.forEach((f) => {
        defaults[f.name] = initialValues[f.name] ?? (f.type === 'checkbox' ? false : '');
      });
      setValues(defaults);
    }
  }, [open, initialValues, fields]);

  const handleChange = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {fields.map((f) => {
              if (f.type === 'checkbox') {
                return (
                  <FormControlLabel
                    key={f.name}
                    control={
                      <Checkbox
                        checked={!!values[f.name]}
                        onChange={(e) => handleChange(f.name, e.target.checked)}
                      />
                    }
                    label={f.label}
                  />
                );
              }
              if (f.type === 'select') {
                return (
                  <TextField
                    key={f.name}
                    select
                    label={f.label}
                    value={values[f.name] ?? ''}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={f.required}
                    fullWidth
                  >
                    {(f.options ?? []).map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              return (
                <TextField
                  key={f.name}
                  label={f.label}
                  type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  required={f.required}
                  multiline={f.type === 'textarea'}
                  minRows={f.type === 'textarea' ? 3 : undefined}
                  placeholder={f.placeholder}
                  helperText={f.helperText}
                  fullWidth
                  slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
