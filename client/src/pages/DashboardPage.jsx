import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  CalendarRange, 
  Repeat, 
  Building2, 
  Clock, 
  Flame, 
  Target, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  Bookmark
} from 'lucide-react';

export function DashboardPage() {
  const { user, updateProfile } = useAuth();

  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [dueRevisions, setDueRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit target companies
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetSearchResults, setTargetSearchResults] = useState([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      api.get('/progress/stats'),
      api.get('/plans'),
      api.get('/progress/revisions/due'),
    ])
      .then(([statsRes, plansRes, revRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        if (plansRes.success) setPlans(plansRes.data);
        if (revRes.success) setDueRevisions(revRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Target company search
  useEffect(() => {
    if (!targetSearch.trim()) {
      setTargetSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/companies?search=${encodeURIComponent(targetSearch)}&limit=5`)
        .then((res) => {
          if (res.success) setTargetSearchResults(res.data);
        })
        .catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [targetSearch]);

  const handleToggleTarget = async (slug) => {
    const current = user?.targetCompanies || [];
    const updated = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug].slice(0, 5);
    await updateProfile({ targetCompanies: updated });
  };

  if (!user) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Sign In Required</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
          Please sign in to access your personal dashboard.
        </p>
      </div>
    );
  }

  const latestPlan = plans[0] || null;
  const daysUntilInterview = user.interviewDate
    ? Math.max(0, Math.ceil((new Date(user.interviewDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="main-content">
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '2rem', margin: 0 }}>
                Welcome back, {user.name}
              </h1>
              {user.isDemo && (
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(249, 115, 22, 0.2)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  DEMO ACCOUNT
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Preparing for <strong>{user.targetRole || 'Software Engineering'}</strong> roles
              {daysUntilInterview !== null && (
                <span> · <strong style={{ color: 'var(--accent-primary)' }}>{daysUntilInterview} days</strong> until scheduled interview</span>
              )}
            </p>

            {/* Target Companies Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Targeting:</span>
              {user.targetCompanies?.map((slug) => (
                <Link
                  key={slug}
                  to={`/companies/${slug}`}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    textTransform: 'capitalize',
                    fontWeight: 600,
                  }}
                >
                  {slug}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setEditingTargets(!editingTargets)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', color: 'var(--accent-primary)' }}
              >
                {editingTargets ? 'Done' : '+ Edit Targets'}
              </button>
            </div>

            {/* Target Search Drawer */}
            {editingTargets && (
              <div style={{ marginTop: '0.75rem', maxWidth: '340px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Type company name to add/remove..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                />
                {targetSearchResults.length > 0 && (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', marginTop: '4px', overflow: 'hidden' }}>
                    {targetSearchResults.map((c) => {
                      const isSelected = user.targetCompanies?.includes(c.slug);
                      return (
                        <div
                          key={c.slug}
                          onClick={() => handleToggleTarget(c.slug)}
                          style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <span>{c.name}</span>
                          <span style={{ color: isSelected ? 'var(--hard-color)' : 'var(--easy-color)', fontWeight: 600 }}>
                            {isSelected ? 'Remove' : '+ Add'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link to="/plans" className="btn btn-primary">
            <CalendarRange size={16} />
            <span>New Study Plan</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Problems Solved</span>
            <CheckCircle2 size={18} color="var(--easy-color)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--easy-color)' }}>
            {stats?.solvedCount ?? 0}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--easy-color)' }}>{stats?.byDifficulty?.easy || 0} Easy</span> ·
            <span style={{ color: 'var(--medium-color)' }}>{stats?.byDifficulty?.medium || 0} Med</span> ·
            <span style={{ color: 'var(--hard-color)' }}>{stats?.byDifficulty?.hard || 0} Hard</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Revisions Due</span>
            <Repeat size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: dueRevisions.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {dueRevisions.length}
          </div>
          <Link to="/revision" style={{ fontSize: '0.8rem', marginTop: '0.4rem', display: 'inline-block' }}>
            Review Queue →
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Plans</span>
            <CalendarRange size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {plans.length}
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--text-muted)' }}>
            {latestPlan ? `${latestPlan.companyNames?.slice(0, 2).join(', ')}...` : 'None active'}
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bookmarks</span>
            <Bookmark size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
            {stats?.bookmarkCount ?? 0}
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--text-muted)' }}>Saved problems</p>
        </div>
      </div>

      {/* Two Column Layout: Latest Plan & Due Revisions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 360px', gap: '2rem' }}>
        {/* Left: Latest Active Plan */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Active Study Plan</h3>
            <Link to="/plans" className="btn btn-ghost btn-sm">
              All Plans ({plans.length})
            </Link>
          </div>

          {latestPlan ? (
            <div className="card" style={{ background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', margin: 0 }}>
                    {latestPlan.companyNames?.join(' · ')}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {latestPlan.totalDays} Days · {latestPlan.questionsPerDay} problems / day
                  </span>
                </div>
                <Link to={`/plans/${latestPlan._id}`} className="btn btn-primary btn-sm">
                  Resume Plan <ArrowRight size={14} />
                </Link>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span>Completed: {latestPlan.solvedCount || 0} / {latestPlan.summary?.totalQuestions || 0}</span>
                  <span style={{ fontWeight: 700 }}>
                    {latestPlan.summary?.totalQuestions ? Math.round(((latestPlan.solvedCount || 0) / latestPlan.summary.totalQuestions) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${latestPlan.summary?.totalQuestions ? Math.round(((latestPlan.solvedCount || 0) / latestPlan.summary.totalQuestions) * 100) : 0}%`,
                      background: 'var(--accent-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Next day preview */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Day 1 Problems
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {latestPlan.days?.[0]?.questions?.slice(0, 3).map((q) => (
                    <div key={q._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <Link to={`/questions/${q._id}`} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {q.title}
                      </Link>
                      <DifficultyBadge difficulty={q.difficulty} size="small" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CalendarRange size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <h4>No active study plan</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                Generate a custom multi-company schedule tailored to your interview timeline.
              </p>
              <Link to="/plans" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                Create Study Plan
              </Link>
            </div>
          )}
        </div>

        {/* Right: Revision Queue Quick Glance */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Due Revisions</h3>
            <Link to="/revision" className="btn btn-ghost btn-sm">
              View Queue
            </Link>
          </div>

          <div className="card" style={{ background: 'var(--bg-surface)' }}>
            {dueRevisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={32} color="var(--easy-color)" style={{ margin: '0 auto 0.5rem' }} />
                <p>No revisions due today!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dueRevisions.slice(0, 4).map((r) => {
                  const q = r.question;
                  if (!q) return null;
                  return (
                    <div
                      key={q._id}
                      style={{
                        padding: '0.65rem',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <Link to={`/questions/${q._id}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {q.title}
                        </Link>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Stage {r.stage}
                        </div>
                      </div>
                      <DifficultyBadge difficulty={q.difficulty} size="small" />
                    </div>
                  );
                })}

                {dueRevisions.length > 4 && (
                  <div style={{ textAlign: 'center', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
                    <Link to="/revision">+{dueRevisions.length - 4} more due in queue</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
