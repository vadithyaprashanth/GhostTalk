// client/src/components/Topbar.jsx
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import Avatar        from './Avatar';
import { pickColor } from '../utils/helpers';
import toast         from 'react-hot-toast';
import styles        from './Topbar.module.css';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out.');
    navigate('/login');
  };

  return (
    <header className={styles.bar}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <span className={styles.dot} />
        GhostTalk
      </div>
      {user && (
        <div className={styles.right}>
          {user.isAdmin && (
            <Link to="/admin" className={styles.adminLink}>
              🛡 Admin Panel
            </Link>
          )}
          <div className={styles.chip}>
            <Avatar username={user.username} size={26} />
            <span style={{ color: pickColor(user.username) }}>@{user.username}</span>
            {user.isAdmin && <span className={styles.adminBadge}>Admin</span>}
          </div>
          <button className={styles.signout} onClick={handleLogout}>Sign out</button>
        </div>
      )}
    </header>
  );
};

export default Topbar;