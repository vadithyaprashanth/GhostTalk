// client/src/components/Comments.jsx
import { useState }   from 'react';
import Avatar         from './Avatar';
import { useAuth }    from '../context/AuthContext';
import { pickColor, relTime } from '../utils/helpers';
import api            from '../utils/api';
import toast          from 'react-hot-toast';
import styles         from './Comments.module.css';

const Comments = ({ post, onUpdate }) => {
  const { user }      = useAuth();
  const [open, setOpen] = useState(false);
  const [txt,  setTxt]  = useState('');
  const [busy, setBusy] = useState(false);
  const comments        = post.comments || [];

  const submit = async () => {
    if (!txt.trim() || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/api/posts/${post._id}/comment`, { text: txt.trim() });
      onUpdate(post._id, (p) => ({ ...p, comments: [...(p.comments || []), data] }));
      setTxt('');
    } catch { toast.error('Could not post reply'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button className={styles.trigger} onClick={() => setOpen((p) => !p)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {comments.length}
      </button>

      {open && (
        <div className={styles.section}>
          {comments.length === 0 && (
            <p className={styles.empty}>No replies yet — be first.</p>
          )}
          {comments.map((c) => {
            const cc = pickColor(c.username);
            return (
              <div key={c._id} className={styles.cmt}>
                <Avatar username={c.username} size={26} />
                <div className={styles.body}>
                  <div className={styles.top}>
                    <span className={styles.name} style={{ color: cc }}>{c.username}</span>
                    <span className={styles.time}>{relTime(c.createdAt)}</span>
                  </div>
                  <p className={styles.text}>{c.text}</p>
                </div>
              </div>
            );
          })}

          <div className={styles.inputRow}>
            <input
              placeholder={`Reply as ${user?.username}…`}
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button className={styles.replyBtn} onClick={submit} disabled={!txt.trim() || busy}>
              {busy ? '…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Comments;
