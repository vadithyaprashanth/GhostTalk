// client/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth }        from './context/AuthContext';
import Topbar             from './components/Topbar';
import AuthPage           from './pages/AuthPage';
import HomePage           from './pages/HomePage';
import AdminPage          from './pages/AdminPage';
import ForgotPage         from './pages/ForgotPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

const Guest = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.isAdmin ? children : <Navigate to="/" replace />;
};

const App = () => (
  <>
    <Topbar />
    <Routes>
      <Route path="/login"           element={<Guest><AuthPage /></Guest>} />
      <Route path="/forgot-password" element={<Guest><ForgotPage /></Guest>} />
      <Route path="/change-password" element={<Protected><ChangePasswordPage /></Protected>} />
      <Route path="/"                element={<Protected><HomePage /></Protected>} />
      <Route path="/admin"           element={<AdminOnly><AdminPage /></AdminOnly>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  </>
);

export default App;