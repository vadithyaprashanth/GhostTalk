// client/src/pages/ChangePasswordPage.jsx
// Shown when user logs in with an admin-set temp password
import { useState }   from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }    from '../context/AuthContext';
import api            from '../utils/api';
import { pwStrength, STR_LABEL, STR_COLOR } from '../utils/helpers';
import toast          from 'react-hot-toast';
import styles         from './AuthPage.module.css';

const ChangePasswordPage = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [f, setF]        = useState({ current: '', newPw: '', confirm: '' });
  const [err, setErr]    = useState({});
  const [busy, setBusy]  = useState(false);
  const str = pwStrength(f.newPw);

  const upd = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: '' })); };

  const submit = async () => {
    const e = {};
    if (!f.current)         e.current = 'Current password is required';
    if (f.newPw.length < 6) e.newPw   = 'New password must be at least 6 characters';
    if (f.newPw !== f.confirm) e.confirm = 'Passwords do not match';
    setErr(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: f.current,
        newPassword:     f.newPw,
      });
      toast.success('Password changed! Please sign in again.');
      logout();
      navigate('/login');
    } catch (ex) {
      const msg = ex.response?.data?.message || 'Failed to change password';
      if (msg.toLowerCase().includes('current')) setErr({ current: msg });
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>GhostTalk</div>
          <p className={styles.tagline}>Change your password</p>
        </div>

        <div className={styles.infoBox}>
          🔑 You signed in with a temporary password set by the admin.
          Please set a new personal password now.
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Temporary / Current Password</label>
          <input type="password" placeholder="••••••••" value={f.current} onChange={e => upd('current', e.target.value)} />
          {err.current && <p className={styles.err}>⚠ {err.current}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>New Password</label>
          <input type="password" placeholder="••••••••" value={f.newPw} onChange={e => upd('newPw', e.target.value)} />
          {f.newPw && (
            <><div className={styles.strBar}><div className={styles.strFill} style={{ width: `${str * 20}%`, background: STR_COLOR[str] }} /></div>
            <p style={{ fontSize: 11, color: STR_COLOR[str], marginTop: 3 }}>{STR_LABEL[str]}</p></>
          )}
          {err.newPw && <p className={styles.err}>⚠ {err.newPw}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confirm New Password</label>
          <input type="password" placeholder="••••••••" value={f.confirm} onChange={e => upd('confirm', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
          {err.confirm && <p className={styles.err}>⚠ {err.confirm}</p>}
        </div>

        <button className={styles.submit} onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : 'Set New Password →'}
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
