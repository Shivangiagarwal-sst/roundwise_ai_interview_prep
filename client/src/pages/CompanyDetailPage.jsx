import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { FrequencyBar, RecencyPills } from '../components/FrequencyBar.jsx';
import { 
  Building2, 
  CalendarRange, 
  Flame, 
  Bookmark, 
  ExternalLink, 
  Filter, 
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft
} from 'lucide-react';

export function CompanyDetailPage() {
  const { slug } = useParams();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [recency, setRecency] = useState('all');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    api.get(`/companies/${slug}`)
      .then((res) => {
        if (!ignore && res.success) {
          setCompany(res.data);
        }
      })
      .catch(console.error);

    api.get(`/questions?company=${slug}&recency=${recency}&difficulty=${difficulty}&search=${encodeURIComponent(search)}&limit=100&sort=frequency&order=desc`)
      .then((res) => {
        if (!ignore && res.success) {
          setQuestions(res.data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [slug, recency, difficulty, search]);

  const isTarget = user?.targetCompanies?.includes(slug);

  const toggleTarget = async () => {
    if (!user) return;
    const current = user.targetCompanies || [];
    const updated = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug].slice(0, 5);
    await updateProfile({ targetCompanies: updated });
  };

  const handleToggleBookmark = async (questionId, currentVal) => {
    if (!user) return;
    try {
      await api.put(`/progress/questions/${questionId}/bookmark`);
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? { ...q, isBookmarked: !currentVal } : q))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (questionId, newStatus) => {
    if (!user) return;
    try {
      await api.put(`/progress/questions/${questionId}/status`, { status: newStatus });
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? { ...q, userStatus: newStatus } : q))
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (!company && !loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Company Not Found</h2>
        <Link to="/companies" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Back link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/companies" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} />
          <span>Back to All Companies</span>
        </Link>
      </div>

      {/* Header Banner */}
      {company && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '2.25rem', margin: 0 }}>{company.name}</h1>
                {company.freshCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Flame size={14} />
                    {company.freshCount} Fresh in 30d
                  </span>
                )}
              </div>
              <p style={{ fontSize: '1rem', margin: 0 }}>
                {company.questionCount} Total Interview Problems Indexed
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {user && (
                <button
                  type="button"
                  onClick={toggleTarget}
                  className={`btn ${isTarget ? 'btn-secondary' : 'btn-secondary'}`}
                  style={{ borderColor: isTarget ? 'var(--accent-primary)' : 'var(--border-medium)', color: isTarget ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                >
                  <CheckCircle2 size={16} color={isTarget ? 'var(--accent-primary)' : 'currentColor'} />
                  <span>{isTarget ? 'Target Company' : '+ Add to Targets'}</span>
                </button>
              )}
              <Link
                to={`/plans?company=${slug}`}
                className="btn btn-primary"
              >
                <CalendarRange size={16} />
                <span>Generate {company.name} Plan</span>
              </Link>
            </div>
          </div>

          {/* Difficulty Breakdown Bar */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--easy-color)', fontWeight: 600 }}>Easy: {company.difficultyBreakdown?.easy || 0}</span>
              <span style={{ color: 'var(--medium-color)', fontWeight: 600 }}>Medium: {company.difficultyBreakdown?.medium || 0}</span>
              <span style={{ color: 'var(--hard-color)', fontWeight: 600 }}>Hard: {company.difficultyBreakdown?.hard || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Recency Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem' }}>
            Recency Window:
          </span>
          {[
            { id: 'all', label: 'All Windows' },
            { id: 'thirty-days', label: 'Last 30 Days' },
            { id: 'three-months', label: 'Last 3 Months' },
            { id: 'six-months', label: 'Last 6 Months' },
            { id: 'more-than-six-months', label: '> 6 Months' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRecency(tab.id)}
              className={`btn btn-sm ${recency === tab.id ? 'btn-primary' : 'btn-ghost'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary filters: search and difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search problems in this company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', paddingY: '0.45rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`btn btn-sm ${difficulty === diff ? 'btn-secondary' : 'btn-ghost'}`}
                style={{
                  borderColor: difficulty === diff ? 'var(--border-strong)' : 'transparent',
                  fontWeight: difficulty === diff ? 700 : 500,
                }}
              >
                {diff || 'All Difficulties'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading questions for {company?.name}...
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No questions match the selected filters</h3>
          <p style={{ marginTop: '0.4rem' }}>Try choosing "All Windows" or clearing difficulty filter.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Title</th>
                <th style={{ width: '100px' }}>Difficulty</th>
                <th style={{ width: '120px' }}>Acceptance</th>
                <th style={{ width: '200px' }}>Frequency at {company?.name}</th>
                <th style={{ width: '180px' }}>Recency Windows</th>
                {user && <th style={{ width: '140px' }}>My Status</th>}
                <th style={{ width: '90px' }}>Links</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const companyEntry = q.companies?.find((c) => c.slug === slug);
                const freq = companyEntry?.frequency ?? q.maxFrequency ?? 0;
                const recencyArr = companyEntry?.recency || [];

                return (
                  <tr key={q._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {q.leetcodeId}
                    </td>
                    <td>
                      <Link to={`/questions/${q._id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {q.title}
                      </Link>
                    </td>
                    <td>
                      <DifficultyBadge difficulty={q.difficulty} size="small" />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {q.acceptanceRate ? `${q.acceptanceRate.toFixed(1)}%` : '—'}
                    </td>
                    <td>
                      <FrequencyBar value={freq} />
                    </td>
                    <td>
                      <RecencyPills recency={recencyArr} />
                    </td>
                    {user && (
                      <td>
                        <select
                          className="select"
                          value={q.userStatus || 'unattempted'}
                          onChange={(e) => handleStatusChange(q._id, e.target.value)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            width: 'auto',
                            color: q.userStatus === 'solved' ? 'var(--status-solved)' : q.userStatus === 'attempted' ? 'var(--status-attempted)' : 'var(--text-muted)',
                            background: 'var(--bg-elevated)',
                          }}
                        >
                          <option value="unattempted">Unattempted</option>
                          <option value="attempted">Attempted</option>
                          <option value="solved">Solved</option>
                        </select>
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {user && (
                          <button
                            type="button"
                            onClick={() => handleToggleBookmark(q._id, q.isBookmarked)}
                            className="btn btn-ghost"
                            style={{ padding: '0.3rem', color: q.isBookmarked ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                            title={q.isBookmarked ? 'Bookmarked' : 'Add bookmark'}
                          >
                            <Bookmark size={15} fill={q.isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem', color: 'var(--text-muted)' }}
                          title="Open on LeetCode"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
