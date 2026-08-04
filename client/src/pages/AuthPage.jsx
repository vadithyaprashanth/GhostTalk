// client/src/pages/AuthPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link }   from 'react-router-dom';
import { useAuth }             from '../context/AuthContext';
import api                     from '../utils/api';
import { pwStrength, STR_LABEL, STR_COLOR } from '../utils/helpers';
import toast                   from 'react-hot-toast';
import styles                  from './AuthPage.module.css';

const AuthPage = () => {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [mode, setMode]           = useState('login');
  const [busy, setBusy]           = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [questions, setQuestions] = useState([]);
  const [f, setF]                 = useState({ username: '', password: '', confirm: '', securityQuestion: '', securityAnswer: '' });
  const [err, setErr]             = useState({});

  useEffect(() => {
    api.get('/api/auth/security-questions')
      .then(({ data }) => setQuestions(data))
      .catch(() => {});
  }, []);

  const upd = (k, v) => {
    setF(p => ({ ...p, [k]: v }));
    setErr(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!f.username.trim())                               e.username = 'Username is required';
    else if (f.username.trim().length < 3)                e.username = 'At least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(f.username.trim())) e.username = 'Letters, numbers and _ only';
    if (!f.password)                                      e.password = 'Password is required';
    else if (mode === 'signup' && f.password.length < 6)  e.password = 'At least 6 characters';
    if (mode === 'signup') {
      if (f.password && f.confirm && f.password !== f.confirm) e.confirm = 'Passwords do not match';
      if (!f.securityQuestion)      e.securityQuestion = 'Please choose a security question';
      if (!f.securityAnswer.trim()) e.securityAnswer   = 'Security answer is required';
    }
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate() || busy) return;
    setBusy(true);
    try {
      const payload = { username: f.username.trim(), password: f.password };
      if (mode === 'signup') {
        payload.securityQuestion = f.securityQuestion;
        payload.securityAnswer   = f.securityAnswer.trim();
      }
      const { data } = await api.post(
        mode === 'signup' ? '/api/auth/signup' : '/api/auth/login',
        payload
      );
      login(data.token, data.user);

      if (data.mustChangePassword) {
        toast('🔑 Please change your temporary password now.', { duration: 5000 });
        navigate('/change-password');
        return;
      }

      toast.success(mode === 'signup'
        ? `Welcome, ${data.user.username}! 🎉`
        : `Welcome back, ${data.user.username}!`
      );

      // Admin goes to admin panel, regular user goes to home
      if (data.user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }

    } catch (e) {
      const msg = e.response?.data?.message || 'Something went wrong';
      if (msg.toLowerCase().includes('username'))      setErr({ username: msg });
      else if (msg.toLowerCase().includes('password')) setErr({ password: msg });
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  const switchMode = (m) => {
    setMode(m);
    setErr({});
    setF({ username: '', password: '', confirm: '', securityQuestion: '', securityAnswer: '' });
  };

  const str = pwStrength(f.password);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>GhostTalk</div>
          <p className={styles.tagline}>Pick a username — that's your identity here</p>
        </div>

        {/* Mode toggle */}
        <div className={styles.seg}>
          <button className={`${styles.segBtn} ${mode === 'login'  ? styles.on : ''}`} onClick={() => switchMode('login')}>Sign In</button>
          <button className={`${styles.segBtn} ${mode === 'signup' ? styles.on : ''}`} onClick={() => switchMode('signup')}>Create Account</button>
        </div>

        {/* Username */}
        <div className={styles.field}>
          <label className={styles.label}>Username</label>
          <div className={styles.prefixWrap}>
            <span className={styles.prefix}>@</span>
            <input
              placeholder="your_username"
              value={f.username}
              onChange={e => upd('username', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && submit()}
              autoFocus
            />
          </div>
          {err.username && <p className={styles.err}>⚠ {err.username}</p>}
          {mode === 'signup' && !err.username && <p className={styles.hint}>This name appears on all your messages.</p>}
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <div className={styles.pwWrap}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={f.password}
              onChange={e => upd('password', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && mode === 'login' && submit()}
            />
            <button className={styles.showBtn} onClick={() => setShowPw(p => !p)}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {mode === 'signup' && f.password && (
            <>
              <div className={styles.strBar}>
                <div className={styles.strFill} style={{ width: `${str * 20}%`, background: STR_COLOR[str] }} />
              </div>
              <p style={{ fontSize: 11, color: STR_COLOR[str], marginTop: 3 }}>{STR_LABEL[str]}</p>
            </>
          )}
          {err.password && <p className={styles.err}>⚠ {err.password}</p>}
        </div>

        {/* Confirm Password — signup only */}
        {mode === 'signup' && (
          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <div className={styles.pwWrap}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={f.confirm}
                onChange={e => upd('confirm', e.target.value)}
              />
            </div>
            {err.confirm && <p className={styles.err}>⚠ {err.confirm}</p>}
          </div>
        )}

        {/* Security Question — signup only */}
        {mode === 'signup' && (
          <>
            <div className={styles.divider}>Recovery Setup — for forgot password</div>

            <div className={styles.field}>
              <label className={styles.label}>Security Question</label>
              <select
                className={styles.select}
                value={f.securityQuestion}
                onChange={e => upd('securityQuestion', e.target.value)}
              >
                <option value="">— Choose a question —</option>
                {questions.map((q, i) => <option key={i} value={q}>{q}</option>)}
              </select>
              {err.securityQuestion && <p className={styles.err}>⚠ {err.securityQuestion}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Your Answer</label>
              <input
                placeholder="Answer (not case sensitive)"
                value={f.securityAnswer}
                onChange={e => upd('securityAnswer', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
              {err.securityAnswer && <p className={styles.err}>⚠ {err.securityAnswer}</p>}
              <p className={styles.hint}>💡 Remember this — it resets your password if forgotten.</p>
            </div>
          </>
        )}

        <button className={styles.submit} onClick={submit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Link to="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
          </div>
        )}

        <p className={styles.switch}>
          {mode === 'login' ? 'No account? ' : 'Already have one? '}
          <span onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Create one →' : 'Sign in →'}
          </span>
        </p>

        <div className={styles.privacy}>
          🔒 Only your username &amp; password are stored. No email, no tracking.
        </div>
      </div>
    </div>
  );
};

export default AuthPage;