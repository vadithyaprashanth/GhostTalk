// client/src/components/PostCard.jsx
import { useState, useRef, useEffect } from 'react';
import Avatar         from './Avatar';
import Comments       from './Comments';
import { useAuth }    from '../context/AuthContext';
import { pickColor, relTime } from '../utils/helpers';
import api            from '../utils/api';
import toast          from 'react-hot-toast';
import styles         from './PostCard.module.css';

// Highlights #hashtags as clickable spans
const Body = ({ text, onTag }) =>
  text.split(/(#\w+)/g).map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className={styles.htag} onClick={() => onTag(part.toLowerCase())}>{part}</span>
      : part
  );

const PostCard = ({ post, onDelete, onUpdate, onTag }) => {
  const { user }    = useAuth();
  const [dd, setDd] = useState(false);
  const ddRef       = useRef();
  const color       = pickColor(post.username);

  const liked    = post.likes?.includes(user?._id);
  const reported = post.reports?.includes(user?._id);
  const isOwn    = post.author === user?._id;
  const isHot    = (post.likes?.length ?? 0) >= 2;

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDd(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/api/posts/${post._id}/like`);
      onUpdate(post._id, (p) => ({ ...p, likes: data.liked
        ? [...(p.likes || []), user._id]
        : (p.likes || []).filter((id) => id !== user._id),
      }));
    } catch { toast.error('Could not like post'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/api/posts/${post._id}`);
      onDelete(post._id);
      toast.success('Post deleted.');
    } catch { toast.error('Could not delete post'); }
    setDd(false);
  };

  const handleReport = async () => {
    try {
      await api.post(`/api/posts/${post._id}/report`);
      onUpdate(post._id, (p) => ({ ...p, reports: [...(p.reports || []), user._id] }));
      toast.success('Reported. Thank you.');
    } catch { toast.error('Could not report post'); }
    setDd(false);
  };

  return (
    <article className={`${styles.card} ${isHot ? styles.hot : ''}`}>
      {/* Header */}
      <div className={styles.head}>
        <Avatar username={post.username} size={36} />
        <div className={styles.meta}>
          <span className={styles.name} style={{ color }}>{post.username}</span>
          <span className={styles.handle}>@{post.username.toLowerCase()}</span>
          {isOwn      && <span className={`${styles.badge} ${styles.you}`}>you</span>}
          {isHot      && <span className={`${styles.badge} ${styles.hot}`}>🔥 hot</span>}
          {post.moderated && <span className={`${styles.badge} ${styles.mod}`}>filtered</span>}
        </div>
        <span className={styles.time}>{relTime(post.createdAt)}</span>
      </div>

      {/* Body */}
      <p className={styles.body}>
        <Body text={post.body} onTag={onTag} />
      </p>

      {/* Actions */}
      <div className={styles.foot}>
        {/* Like */}
        <button className={`${styles.act} ${liked ? styles.liked : ''}`} onClick={handleLike}>
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {post.likes?.length ?? 0}
        </button>

        {/* Comments */}
        <Comments post={post} onUpdate={onUpdate} />

        <span style={{ flex: 1 }} />

        {/* More menu */}
        <div className={styles.dd} ref={ddRef}>
          <button className={styles.act} onClick={() => setDd((p) => !p)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {dd && (
            <div className={styles.menu}>
              {isOwn && (
                <button className={`${styles.item} ${styles.danger}`} onClick={handleDelete}>
                  🗑 Delete my post
                </button>
              )}
              {!isOwn && !reported && (
                <button className={styles.item} onClick={handleReport}>
                  🚩 Report post
                </button>
              )}
              {!isOwn && reported && (
                <span className={styles.item} style={{ color: 'var(--text3)', cursor: 'default' }}>
                  Reported ✓
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
