// client/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import Avatar      from '../components/Avatar';
import { pickColor, relTime } from '../utils/helpers';
import api         from '../utils/api';
import toast       from 'react-hot-toast';
import styles      from './AdminPage.module.css';

const StatCard = ({ label, value, color }) => (
  <div className={styles.statCard}>
    <div className={styles.statVal} style={{ color }}>{value ?? '…'}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
);

const AdminPage = () => {
  const [tab,      setTab]      = useState('reports');
  const [users,    setUsers]    = useState([]);
  const [reports,  setReports]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  // Admin reset password modal state
  const [resetModal, setResetModal] = useState(null); // { userId, username }
  const [tempPw,     setTempPw]     = useState('');
  const [resetResult, setResetResult] = useState(null); // { tempPassword, username }

  const fetchStats   = () => api.get('/api/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  const fetchUsers   = () => { setLoading(true); api.get('/api/admin/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false)); };
  const fetchReports = () => { setLoading(true); api.get('/api/admin/reports').then(({ data }) => setReports(data)).finally(() => setLoading(false)); };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    if (tab === 'users')   fetchUsers();
    if (tab === 'reports') fetchReports();
  }, [tab]);

  const handleBlock = async (userId) => {
    try {
      const { data } = await api.patch(`/api/admin/users/${userId}/block`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, is_blocked: data.user.is_blocked } : x));
      toast.success(data.message); fetchStats();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const handleTogglePosting = async (userId) => {
    try {
      const { data } = await api.patch(`/api/admin/users/${userId}/posting`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, can_post: data.user.can_post } : x));
      toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const handleAdminReset = async () => {
    if (!tempPw || tempPw.length < 6) return toast.error('Temp password must be at least 6 characters');
    try {
      const { data } = await api.post(`/api/admin/users/${resetModal.userId}/reset-password`, { tempPassword: tempPw });
      setResetResult({ tempPassword: data.tempPassword, username: data.username });
      setUsers(u => u.map(x => x.id === resetModal.userId ? { ...x, hasTempPassword: true } : x));
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const closeResetModal = () => { setResetModal(null); setTempPw(''); setResetResult(null); };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await api.delete(`/api/admin/posts/${postId}`);
      setReports(r => r.filter(x => x.postId !== postId));
      toast.success('Post deleted.'); fetchStats();
    } catch { toast.error('Failed to delete post'); }
  };

  const handleDismiss = async (postId) => {
    try {
      await api.delete(`/api/admin/reports/${postId}`);
      setReports(r => r.filter(x => x.postId !== postId));
      toast.success('Reports dismissed.'); fetchStats();
    } catch { toast.error('Failed to dismiss'); }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛡 Admin Panel</h1>
        <p className={styles.sub}>Manage users, review reports, reset passwords</p>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Total Users"   value={stats?.totalUsers}   color="var(--accent)" />
        <StatCard label="Total Posts"   value={stats?.totalPosts}   color="var(--green)" />
        <StatCard label="Total Reports" value={stats?.totalReports} color="var(--amber)" />
        <StatCard label="Blocked Users" value={stats?.blockedUsers} color="var(--red)" />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'reports' ? styles.on : ''}`} onClick={() => setTab('reports')}>
          🚩 Reports {reports.length > 0 && <span className={styles.badge}>{reports.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'users' ? styles.on : ''}`} onClick={() => setTab('users')}>
          👥 Users
        </button>
      </div>

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div>
          {loading && <div className={styles.loading}>Loading reports…</div>}
          {!loading && reports.length === 0 && (
            <div className={styles.empty}><div style={{ fontSize: 36 }}>✅</div><div style={{ marginTop: 10, color: 'var(--text2)' }}>No reports — community looks clean!</div></div>
          )}
          {reports.map(r => (
            <div key={r.postId} className={`${styles.reportCard} ${r.reportCount >= 3 ? styles.urgent : ''}`}>
              <div className={styles.reportHead}>
                <div className={styles.reportMeta}>
                  <span className={styles.reportCount}>🚩 {r.reportCount} report{r.reportCount !== 1 ? 's' : ''}</span>
                  <span className={styles.postAuthor}>by <strong style={{ color: pickColor(r.postAuthor) }}>@{r.postAuthor}</strong></span>
                </div>
                <div className={styles.reportActions}>
                  <button className={styles.btnDismiss} onClick={() => handleDismiss(r.postId)}>✓ Dismiss all</button>
                  <button className={styles.btnDelete}  onClick={() => handleDeletePost(r.postId)}>🗑 Delete post</button>
                </div>
              </div>
              <div className={styles.postBody}>{r.postBody}</div>
              <div className={styles.reportersTitle}>Reported by ({r.reportCount}):</div>
              <div className={styles.reportersList}>
                {r.reporters.map(rep => (
                  <div key={rep.reportId} className={styles.reporter}>
                    <Avatar username={rep.username} size={22} />
                    <span style={{ color: pickColor(rep.username), fontWeight: 600, fontSize: 13 }}>@{rep.username}</span>
                    <span className={styles.reason}>{rep.reason}</span>
                    <span className={styles.repTime}>{relTime(rep.reportedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div className={styles.searchWrap}>
            <input placeholder="Search by username…" value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
          </div>
          {loading && <div className={styles.loading}>Loading users…</div>}
          <div className={styles.userList}>
            {filteredUsers.map(u => (
              <div key={u.id} className={`${styles.userCard} ${u.is_blocked ? styles.blockedCard : ''}`}>
                <div className={styles.userLeft}>
                  <Avatar username={u.username} size={38} />
                  <div>
                    <div className={styles.userName} style={{ color: pickColor(u.username) }}>
                      @{u.username}
                      {u.is_admin        && <span className={styles.adminTag}>Admin</span>}
                      {u.is_blocked      && <span className={styles.blockedTag}>Blocked</span>}
                      {!u.can_post && !u.is_blocked && <span className={styles.restrictedTag}>No Posting</span>}
                      {u.hasTempPassword && <span className={styles.tempTag}>⏳ Temp PW</span>}
                    </div>
                    <div className={styles.userSub}>
                      Joined {relTime(u.created_at)}
                      {u.security_question && <span className={styles.hasQ}> · 🔒 Q set</span>}
                    </div>
                  </div>
                </div>

                {!u.is_admin && (
                  <div className={styles.userActions}>
                    <button className={`${styles.actionBtn} ${u.can_post ? styles.btnRevoke : styles.btnAllow}`} onClick={() => handleTogglePosting(u.id)}>
                      {u.can_post ? '🔕 Revoke Posting' : '🔔 Allow Posting'}
                    </button>
                    <button className={`${styles.actionBtn} ${u.is_blocked ? styles.btnUnblock : styles.btnBlock}`} onClick={() => handleBlock(u.id)}>
                      {u.is_blocked ? '🔓 Unblock' : '🔒 Block'}
                    </button>
                    <button className={`${styles.actionBtn} ${styles.btnReset}`} onClick={() => { setResetModal({ userId: u.id, username: u.username }); setTempPw(''); setResetResult(null); }}>
                      🔑 Reset PW
                    </button>
                  </div>
                )}
                {u.is_admin && <div className={styles.adminProtected}>Protected</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL (Option 3) ── */}
      {resetModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && closeResetModal()}>
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={closeResetModal}>✕</button>
            <div className={styles.modalTitle}>🔑 Reset Password</div>
            <div className={styles.modalSub}>for <strong style={{ color: pickColor(resetModal.username) }}>@{resetModal.username}</strong></div>

            {!resetResult ? (
              <>
                <div className={styles.modalInfo}>
                  Set a temporary password. The user will be prompted to change it on next login.
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className={styles.modalLabel}>Temporary Password</label>
                  <input
                    type="text"
                    placeholder="e.g. TempPass123"
                    value={tempPw}
                    onChange={e => setTempPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdminReset()}
                    className={styles.modalInput}
                    autoFocus
                  />
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>Minimum 6 characters</p>
                </div>
                <button className={styles.modalBtn} onClick={handleAdminReset} disabled={tempPw.length < 6}>
                  Set Temporary Password →
                </button>
              </>
            ) : (
              <div>
                <div className={styles.successBox}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>✅ Temporary password set!</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                    Share this with <strong>@{resetResult.username}</strong> privately:
                  </div>
                  <div className={styles.tempPwDisplay}>{resetResult.tempPassword}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
                    This password works only once. The user must change it after login.
                  </div>
                </div>
                <button className={styles.modalBtn} onClick={closeResetModal}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
