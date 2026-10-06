import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ requirePermission, section }) {
  const { user, loading, can, isPartnerUser } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (section === 'portal' && !isPartnerUser) {
    return <Navigate to="/app" replace />;
  }
  if (section === 'app' && isPartnerUser) {
    return <Navigate to="/portal" replace />;
  }

  if (requirePermission && !can(requirePermission)) {
    return <Navigate to={isPartnerUser ? '/portal' : '/app'} replace />;
  }

  return <Outlet />;
}
