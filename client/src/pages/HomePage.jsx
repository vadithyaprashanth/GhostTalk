// client/src/pages/HomePage.jsx
import { useState, useEffect, useCallback } from 'react';
import PostCard    from '../components/PostCard';
import Avatar      from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { pickColor, getTags } from '../utils/helpers';
import api         from '../utils/api';
import toast       from 'react-hot-toast';
import styles      from './HomePage.module.css';

const MAX = 280;

const HomePage = () => {
  const { user }                        = useAuth();
  const [posts,      setPosts]          = useState([]);
  const [tags,       setTags]           = useState([]);
  const [tab,        setTab]            = useState('latest');
  const [search,     setSearch]         = useState('');
  const [filterTag,  setFilterTag]      = useState('');
  const [body,       setBody]           = useState('');
  const [posting,    setPosting]        = useState(false);
  const [loading,    setLoading]        = useState(true);
  const [page,       setPage]           = useState(1);
  const [hasMore,    setHasMore]        = useState(true);

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const p      = reset ? 1 : page;
      const params = { tab, tag: filterTag, search, page: p };
      if (tab === 'mine') params.userId = user?._id;

      const { data } = await api.get('/api/posts', { params });
      setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
      setHasMore(data.posts.length === 20);
      if (!reset) setPage(p + 1);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [tab, filterTag, search, page, user]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPosts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterTag, search]);

  useEffect(() => {
    api.get('/api/posts/trending-tags')
      .then(({ data }) => setTags(data))
      .catch(() => {});
  }, [posts]);

  const handlePost = async () => {
    if (!body.trim() || body.length > MAX || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post('/api/posts', { body: body.trim() });
      setPosts(p => [data, ...p]);
      setBody('');
      toast.success('Posted!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not post');
    } finally {
      setPosting(false);
    }
  };

  const handleUpdate = (id, updater) =>
    setPosts(prev => prev.map(p => p._id === id ? updater(p) : p));

  const handleDelete = (id) =>
    setPosts(prev => prev.filter(p => p._id !== id));

  const left  = MAX - body.length;
  const color = pickColor(user?.username || '');

  // Admin and users with canPost can compose
  const canCompose = user?.isAdmin || user?.canPost;

  return (
    <div className={styles.layout}>

      {/* ── Feed column ── */}
      <div className={styles.feed}>

        {/* Composer */}
        {canCompose ? (
          <div className={styles.composer}>
            <div className={styles.compHead}>
              <Avatar username={user?.username} size={40} />
              <div>
                <div className={styles.compName} style={{ color }}>{user?.username}</div>
                <div className={styles.compSub}>
                  @{user?.username?.toLowerCase()} · your name appears on this post
                  {user?.isAdmin && <span className={styles.adminComposeBadge}> · Admin</span>}
                </div>
              </div>
            </div>
            <textarea
              rows={3}
              placeholder={`What's on your mind, ${user?.username}? Use #hashtags…`}
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handlePost()}
            />
            {getTags(body).length > 0 && (
              <div className={styles.tagRow}>
                {getTags(body).map(t => <span key={t} className={styles.tagPill}>{t}</span>)}
              </div>
            )}
            <div className={styles.compFoot}>
              <span className={`${styles.char} ${left < 30 ? left < 0 ? styles.over : styles.warn : ''}`}>
                {left} left
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.kbd}>Ctrl+Enter</span>
                <button
                  className={styles.postBtn}
                  onClick={handlePost}
                  disabled={!body.trim() || left < 0 || posting}
                >
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.blockedBanner}>
            🚫 Your posting privilege has been restricted by an admin.
          </div>
        )}

        {/* Search */}
        <div className={styles.searchBox}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search posts or usernames…"
            value={search}
            onChange={e => { setSearch(e.target.value); setFilterTag(''); }}
          />
        </div>

        {/* Active tag filter */}
        {filterTag && (
          <div className={styles.filterRow}>
            Filtering: <span className={styles.ftag}>{filterTag}</span>
            <button className={styles.clearF} onClick={() => setFilterTag('')}>✕ clear</button>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {[['latest', 'Latest'], ['hot', '🔥 Hot'], ['mine', 'My Posts']].map(([k, l]) => (
            <button
              key={k}
              className={`${styles.tab} ${tab === k ? styles.on : ''}`}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {posts.length === 0 && !loading && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              {search || filterTag ? '🔍' : tab === 'mine' ? '✏️' : '💬'}
            </div>
            <div className={styles.emptyT}>
              {tab === 'mine' ? 'No posts yet' : search || filterTag ? 'No results' : 'Be the first to post'}
            </div>
            <div className={styles.emptyS}>
              {tab === 'mine' ? 'Write something above.' : 'Try a different search.'}
            </div>
          </div>
        )}

        {/* Posts */}
        {posts.map(p => (
          <PostCard
            key={p._id}
            post={p}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onTag={t => { setFilterTag(t); setSearch(''); setTab('latest'); }}
          />
        ))}

        {loading && <div className={styles.loading}>Loading…</div>}

        {hasMore && !loading && (
          <button className={styles.loadMore} onClick={() => fetchPosts()}>
            Load more
          </button>
        )}
      </div>

      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>

        {/* Profile card */}
        <div className={styles.scard} style={{ borderColor: color + '44' }}>
          <div className={styles.stitle}>Your Profile</div>
          <div className={styles.profileRow}>
            <Avatar username={user?.username} size={48} />
            <div>
              <div className={styles.profileName} style={{ color }}>{user?.username}</div>
              <div className={styles.profileHandle}>@{user?.username?.toLowerCase()}</div>
              {user?.isAdmin && (
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 3, fontWeight: 700 }}>
                  🛡 Administrator
                </div>
              )}
              {!user?.canPost && !user?.isAdmin && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>
                  ⛔ Posting restricted
                </div>
              )}
            </div>
          </div>
          <div className={styles.stat}>
            <span>My posts</span>
            <span>{posts.filter(p => p.author === user?._id).length}</span>
          </div>
        </div>

        {/* Trending tags */}
        {tags.length > 0 && (
          <div className={styles.scard}>
            <div className={styles.stitle}>Trending Topics</div>
            {tags.map(t => (
              <div
                key={t._id}
                className={styles.trendRow}
                onClick={() => { setFilterTag(t._id); setSearch(''); setTab('latest'); }}
              >
                <span className={styles.trendTag}>{t._id}</span>
                <span className={styles.trendCt}>{t.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tips */}
        <div className={styles.scard}>
          <div className={styles.stitle}>Tips</div>
          {[
            'Your username is your identity',
            'Use #hashtags to connect',
            'Toggle comments on your own posts',
            'Report harmful content',
            'Delete your posts anytime',
          ].map((r, i) => (
            <div key={i} className={styles.rule}>
              <span>→</span>{r}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default HomePage;