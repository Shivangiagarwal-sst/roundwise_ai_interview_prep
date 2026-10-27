import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { 
  Repeat,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Trash2,
  Info
} from 'lucide-react';

export function RevisionQueuePage() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('due'); // 'due' or 'upcoming'
  const [demoDismissed, setDemoDismissed] = useState(() => {
    try { return localStorage.getItem('roundwise:revision-demo-dismissed') === 'true'; } catch { return false; }
  });
  const [reviewError, setReviewError] = useState('');

  const fetchRevisions = () => {
    setLoading(true);
    api.get('/progress/revisions/due')
      .then((res) => {
        if (res.success) setRevisions(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchRevisions();
    }
  }, [user]);

  const handleReview = async (questionId, result) => {
    try {
      await api.post(`/progress/questions/${questionId}/review`, { result });
      // Remove from due list or refetch
      setRevisions((prev) => prev.filter((r) => r.question?._id !== questionId));
    } catch (err) {
      setReviewError(err.message || 'Could not save your review. Please try again.');
    }
  };

  const dismissDemo = () => {
    setDemoDismissed(true);
    try { localStorage.setItem('roundwise:revision-demo-dismissed', 'true'); } catch { /* dismissal still applies for this session */ }
  };

  if (!user) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Sign In Required</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
          Your spaced-repetition revision queue tracks problems you have previously solved.
        </p>
      </div>
    );
  }

  const now = new Date();
  const dueItems = revisions.filter((r) => new Date(r.nextReviewAt) <= now);
  const upcomingItems = revisions.filter((r) => new Date(r.nextReviewAt) > now);

  const displayList = activeTab === 'due' ? dueItems : upcomingItems;
  // This is a clearly labelled UI preview only. It is never sent to the API or saved as user progress.
  // Hide it as soon as real revisions are due, or when the user dismisses it.
  const showDemoDueExample = activeTab === 'due' && !loading && dueItems.length === 0 && !demoDismissed;

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <Repeat size={32} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '2rem', margin: 0 }}>SM-2 Spaced Repetition Queue</h1>
        </div>
        <p style={{ margin: 0 }}>
          Review previously solved problems at optimal memory decay intervals (1, 3, 7, 14, 30 days) so you don't blank out during actual interviews.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('due')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'due' ? 'var(--accent-primary)' : 'transparent'}`,
            color: activeTab === 'due' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Due for Review</span>
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: dueItems.length > 0 ? 'rgba(249, 115, 22, 0.2)' : 'var(--bg-elevated)', color: dueItems.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {dueItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'upcoming' ? 'var(--accent-primary)' : 'transparent'}`,
            color: activeTab === 'upcoming' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Upcoming Revisions</span>
          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            {upcomingItems.length}
          </span>
        </button>
      </div>

      {/* Main Content */}
      {reviewError && <div role="alert" className="card" style={{ marginBottom: '1rem', color: 'var(--hard-color)' }}>{reviewError}</div>}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading your revision queue...
        </div>
      ) : displayList.length === 0 && !showDemoDueExample ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <CheckCircle2 size={48} color="var(--easy-color)" style={{ margin: '0 auto 1rem' }} />
          <h3>All caught up!</h3>
          <p style={{ marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
            {activeTab === 'due'
              ? 'No revisions due today. Solve new questions or continue your study plan to feed the queue.'
              : 'No upcoming revisions scheduled yet.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/plans" className="btn btn-primary btn-sm">
              View Study Plans <ArrowRight size={14} />
            </Link>
            <Link to="/questions" className="btn btn-secondary btn-sm">
              Practice Questions
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {showDemoDueExample && (
            <div className="card" style={{ border: '1px dashed var(--accent-primary)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Info size={16} color="var(--accent-primary)" />
                    <strong>Demo example — preview only</strong>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>NOT SAVED</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>#1 · Two Sum <span style={{ color: 'var(--easy-color)', fontSize: '0.75rem' }}>EASY</span></div>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>This sample shows how a real revision will appear when its scheduled date arrives. It does not represent your progress and is not stored in MongoDB.</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stage: 0 / 5 · Last reviewed: Never · Due: Today (example)</div>
                </div>
                <button type="button" onClick={dismissDemo} className="btn btn-secondary btn-sm" aria-label="Remove demo revision example"><Trash2 size={14} /> Remove example</button>
              </div>
            </div>
          )}
          {displayList.map((item) => {
            const q = item.question;
            if (!q) return null;

            return (
              <div
                key={q._id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      #{q.leetcodeId}
                    </span>
                    <Link to={`/questions/${q._id}`} style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {q.title}
                    </Link>
                    <DifficultyBadge difficulty={q.difficulty} size="small" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Stage: <strong style={{ color: 'var(--accent-primary)' }}>{item.stage}</strong> / 5</span>
                    <span>Last reviewed: {item.lastReviewedAt ? new Date(item.lastReviewedAt).toLocaleDateString() : 'Never'}</span>
                    <span>Due: <strong style={{ color: new Date(item.nextReviewAt) <= now ? 'var(--hard-color)' : 'var(--text-secondary)' }}>{new Date(item.nextReviewAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Rating actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ marginRight: '0.5rem' }}
                  >
                    <span>LeetCode</span>
                    <ExternalLink size={14} />
                  </a>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Rate recall:</span>
                  <button
                    onClick={() => handleReview(q._id, 'forgot')}
                    className="btn btn-sm btn-danger"
                    title="Could not remember solution (Reset to 1d)"
                  >
                    Forgot
                  </button>
                  <button
                    onClick={() => handleReview(q._id, 'hard')}
                    className="btn btn-sm btn-secondary"
                    title="Remembered with difficulty (1d)"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleReview(q._id, 'good')}
                    className="btn btn-sm btn-secondary"
                    style={{ color: 'var(--medium-color)' }}
                    title="Remembered well (Advance stage)"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => handleReview(q._id, 'easy')}
                    className="btn btn-sm btn-secondary"
                    style={{ color: 'var(--easy-color)' }}
                    title="Instant recall (Double interval)"
                  >
                    Easy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
