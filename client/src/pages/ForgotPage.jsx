// client/src/pages/ForgotPage.jsx
// Step 1: Enter username → fetch their security question
// Step 2: Answer question + set new password
// Step 3: Success
import { useState }   from 'react';
import { Link }       from 'react-router-dom';
import api            from '../utils/api';
import { pwStrength, STR_LABEL, STR_COLOR } from '../utils/helpers';
import styles         from './AuthPage.module.css';

const ForgotPage = () => {
  const [step, setStep]       = useState(1);
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const str = pwStrength(newPw);

  // Step 1 — look up security question for username
  const fetchQuestion = async () => {
    if (!username.trim()) return setErr('Please enter your username');
    setBusy(true); setErr('');
    try {
      const { data } = await api.get(`/api/auth/security-question/${username.trim()}`);
      setQuestion(data.question);
      setStep(2);
    } catch (e) {
      setErr(e.response?.data?.message || 'Username not found');
    } finally { setBusy(false); }
  };

  // Step 2 — verify answer + set new password
  const resetPassword = async () => {
    if (!answer.trim())   return setErr('Please enter your security answer');
    if (newPw.length < 6) return setErr('New password must be at least 6 characters');
    if (newPw !== confirm) return setErr('Passwords do not match');
    setBusy(true); setErr('');
    try {
      await api.post('/api/auth/forgot-password', {
        username:       username.trim(),
        securityAnswer: answer.trim(),
        newPassword:    newPw,
      });
      setStep(3);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not reset password');
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>GhostTalk</div>
          <p className={styles.tagline}>
            {step === 1 && 'Forgot your password?'}
            {step === 2 && 'Answer your security question'}
            {step === 3 && 'Password reset!'}
          </p>
        </div>

        {/* Progress dots */}
        <div className={styles.steps}>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`${styles.stepDot} ${step >= s ? styles.stepActive : ''}`}>{s}</div>
          ))}
        </div>

        {/* ── STEP 1 — username ── */}
        {step === 1 && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Your Username</label>
              <div className={styles.prefixWrap}>
                <span className={styles.prefix}>@</span>
                <input
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchQuestion()}
                  autoFocus
                />
              </div>
            </div>
            {err && <p className={styles.err} style={{ marginBottom: 12 }}>⚠ {err}</p>}
            <button className={styles.submit} onClick={fetchQuestion} disabled={busy}>
              {busy ? 'Looking up…' : 'Continue →'}
            </button>
          </>
        )}

        {/* ── STEP 2 — security question + new password ── */}
        {step === 2 && (
          <>
            {/* Show the question */}
            <div className={styles.questionBox}>
              <div className={styles.questionLabel}>Your Security Question:</div>
              <div className={styles.questionText}>❓ {question}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Your Answer</label>
              <input
                placeholder="Type your answer…"
                value={answer}
                onChange={(e) => { setAnswer(e.target.value); setErr(''); }}
              />
              <p className={styles.hint}>Not case-sensitive — type it as you remember it.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setErr(''); }}
              />
              {newPw && (
                <><div className={styles.strBar}><div className={styles.strFill} style={{ width: `${str * 20}%`, background: STR_COLOR[str] }} /></div>
                <p style={{ fontSize: 11, color: STR_COLOR[str], marginTop: 3 }}>{STR_LABEL[str]}</p></>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && resetPassword()}
              />
            </div>

            {err && <p className={styles.err} style={{ marginBottom: 12 }}>⚠ {err}</p>}
            <button className={styles.submit} onClick={resetPassword} disabled={busy}>
              {busy ? 'Resetting…' : 'Reset Password →'}
            </button>
            <p className={styles.switch} style={{ marginTop: 10 }}>
              <span onClick={() => { setStep(1); setErr(''); }} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                ← Try a different username
              </span>
            </p>
          </>
        )}

        {/* ── STEP 3 — success ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>
              Password reset successfully!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
              You can now sign in with your new password.
            </div>
            <Link to="/login" className={styles.submit} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Go to Sign In →
            </Link>
          </div>
        )}

        {step !== 3 && (
          <p className={styles.switch} style={{ marginTop: 14 }}>
            <Link to="/login" style={{ color: 'var(--accent)' }}>← Back to Sign In</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPage;
