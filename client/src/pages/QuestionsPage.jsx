import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { FrequencyBar } from '../components/FrequencyBar.jsx';
import { 
  Code2, 
  Search, 
  Bookmark, 
  ExternalLink, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

export function QuestionsPage() {
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [company, setCompany] = useState('');
  const [recency, setRecency] = useState('');
  const [sort, setSort] = useState('frequency');
  const [order, setOrder] = useState('desc');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // List of popular companies for quick filter
  const popularCompanies = [
    { slug: '', name: 'All Companies' },
    { slug: 'google', name: 'Google' },
    { slug: 'amazon', name: 'Amazon' },
    { slug: 'microsoft', name: 'Microsoft' },
    { slug: 'meta', name: 'Meta' },
    { slug: 'apple', name: 'Apple' },
    { slug: 'uber', name: 'Uber' },
    { slug: 'bloomberg', name: 'Bloomberg' },
  ];

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams({
      search,
      difficulty,
      company,
      recency,
      sort,
      order,
      page: String(page),
      limit: '25',
    });

    if (bookmarkedOnly) params.set('bookmarked', 'true');
    if (statusFilter) params.set('status', statusFilter);

    const timer = setTimeout(() => {
      api.get(`/questions?${params.toString()}`)
        .then((res) => {
          if (!ignore && res.success) {
            setQuestions(res.data);
            setPagination(res.pagination);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 200);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, difficulty, company, recency, sort, order, bookmarkedOnly, statusFilter, page]);

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

  return (
    <div className="main-content">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Code2 size={32} color="var(--accent-primary)" />
          <span>Interview Question Catalog</span>
        </h1>
        <p style={{ marginTop: '0.4rem' }}>
          Explore {pagination.total || 'thousands of'} genuine technical questions ranked by company frequency.
        </p>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <label className="label">Search Problem</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Title or ID (e.g. Two Sum)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>
          </div>

          {/* Company Filter */}
          <div>
            <label className="label">Company Filter</label>
            <select
              className="select"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setPage(1); }}
            >
              {popularCompanies.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="label">Difficulty</label>
            <select
              className="select"
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="label">Sort Order</label>
            <select
              className="select"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="frequency">Highest Frequency</option>
              <option value="acceptance">Acceptance Rate</option>
              <option value="id">Problem ID</option>
            </select>
          </div>
        </div>

        {/* Quick Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recency:</span>
            {[
              { id: '', label: 'Any Window' },
              { id: 'thirty-days', label: 'Last 30 Days' },
              { id: 'three-months', label: 'Last 3 Months' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setRecency(r.id); setPage(1); }}
                className={`btn btn-sm ${recency === r.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setBookmarkedOnly(!bookmarkedOnly); setPage(1); }}
                className={`btn btn-sm ${bookmarkedOnly ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ borderColor: bookmarkedOnly ? 'var(--accent-primary)' : 'transparent', color: bookmarkedOnly ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <Bookmark size={14} fill={bookmarkedOnly ? 'currentColor' : 'none'} />
                <span>Bookmarked</span>
              </button>

              <select
                className="select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', width: 'auto' }}
              >
                <option value="">All Statuses</option>
                <option value="solved">Solved</option>
                <option value="attempted">Attempted</option>
                <option value="unattempted">Unattempted</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Questions Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading question catalog...
        </div>
      ) : questions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No questions matched your search criteria</h3>
          <p style={{ marginTop: '0.4rem' }}>Try clearing filters or searching another keyword.</p>
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
                <th style={{ width: '180px' }}>Max Frequency</th>
                <th style={{ width: '220px' }}>Asked By Companies</th>
                {user && <th style={{ width: '140px' }}>Status</th>}
                <th style={{ width: '80px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
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
                    <FrequencyBar value={q.maxFrequency || 0} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {q.companies?.slice(0, 3).map((c) => (
                        <Link
                          key={c.slug}
                          to={`/companies/${c.slug}`}
                          style={{
                            fontSize: '0.725rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {c.name}
                        </Link>
                      ))}
                      {(q.companies?.length || 0) > 3 && (
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                          +{q.companies.length - 3}
                        </span>
                      )}
                    </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Page {page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
            disabled={page === pagination.pages}
            className="btn btn-secondary btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
