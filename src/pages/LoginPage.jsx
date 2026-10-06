import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Stack, InputAdornment, IconButton, alpha } from '@mui/material';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { useAuth } from '../auth/AuthContext';
import { brandTokens } from '../theme';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.is_partner_user ? '/portal' : '/app');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#fff',
          background: `radial-gradient(120% 120% at 15% 10%, ${brandTokens.indigo} 0%, ${brandTokens.ink} 60%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${brandTokens.teal}, ${brandTokens.gold})`,
            }}
          >
            <HubRoundedIcon />
          </Box>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 20 }}>
            Partnership Hub
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 40, lineHeight: 1.15, mb: 2 }}>
            One engine for every partner relationship across the Lizy group.
          </Typography>
          <Typography sx={{ color: alpha('#fff', 0.7), fontSize: 16, maxWidth: 440 }}>
            Sales, delivery, service, referral, agent and affiliate partners — registration
            through settlement, in a single connected workflow.
          </Typography>
        </Box>

        {/* Empty bottom slot: keeps space-between holding the headline in the middle. */}
        <Box />
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your Partnership Management account
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                size="medium"
                slotProps={{ input: { startAdornment: (
                  <InputAdornment position="start"><EmailRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
                ) } }}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                size="medium"
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position="start"><LockRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                } }}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.3, fontSize: 15 }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
