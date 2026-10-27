import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Building2, 
  Search, 
  Sparkles, 
  ArrowRight, 
  SlidersHorizontal,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function CompaniesPage() {
  const { user, updateProfile } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('questions'); // questions, name, fresh
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const timer = setTimeout(() => {
      api.get(`/companies?search=${encodeURIComponent(search)}&sort=${sort}&order=${order}&page=${page}&limit=24`)
        .then((res) => {
          if (!ignore && res.success) {
            setCompanies(res.data);
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
  }, [search, sort, order, page]);

  const handleTargetToggle = async (e, slug) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    const targets = user.targetCompanies || [];
    const newTargets = targets.includes(slug)
      ? targets.filter((s) => s !== slug)
      : [...targets, slug].slice(0, 5);

    try {
      await updateProfile({ targetCompanies: newTargets });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="main-content">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={32} color="var(--accent-primary)" />
          <span>Indexed Companies</span>
        </h1>
        <p style={{ marginTop: '0.4rem' }}>
          Browse genuine question catalogs across {pagination.total || 659} companies. Select up to 5 to tailor your study plan.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search companies (e.g. Google, Amazon, Meta, Uber)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Sort selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setOrder(e.target.value === 'name' ? 'asc' : 'desc');
                setPage(1);
              }}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="questions">Most Questions</option>
              <option value="fresh">Most Recent (30 Days)</option>
              <option value="name">Company Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading company catalog...
        </div>
      ) : companies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Building2 size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h3>No companies matched "{search}"</h3>
          <p style={{ marginTop: '0.4rem' }}>Try searching by lowercase or partial name.</p>
        </div>
      ) : (
        <div className="grid-cols-auto">
          {companies.map((c) => {
            const isTarget = user?.targetCompanies?.includes(c.slug);
            const totalDiff = (c.difficultyBreakdown?.easy || 0) + (c.difficultyBreakdown?.medium || 0) + (c.difficultyBreakdown?.hard || 0) || 1;
            const easyPct = ((c.difficultyBreakdown?.easy || 0) / totalDiff) * 100;
            const medPct = ((c.difficultyBreakdown?.medium || 0) / totalDiff) * 100;
            const hardPct = ((c.difficultyBreakdown?.hard || 0) / totalDiff) * 100;

            return (
              <Link
                key={c.slug}
                to={`/companies/${c.slug}`}
                className="card card-interactive"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                      {c.name}
                    </h3>
                    {user && (
                      <button
                        type="button"
                        onClick={(e) => handleTargetToggle(e, c.slug)}
                        title={isTarget ? 'Remove from targets' : 'Add to target companies'}
                        style={{
                          background: isTarget ? 'rgba(249, 115, 22, 0.2)' : 'var(--bg-elevated)',
                          border: `1px solid ${isTarget ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          color: isTarget ? 'var(--accent-primary)' : 'var(--text-muted)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isTarget ? 'TARGET' : '+ TARGET'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{c.questionCount}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>problems</span>
                    </div>

                    {c.freshCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Flame size={14} />
                        <span>{c.freshCount} in last 30d</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Difficulty Distribution Bar */}
                <div>
                  <div style={{ display: 'flex', height: '6px', borderRadius: 'var(--radius-full)', overflow: 'hidden', background: 'var(--bg-subtle)', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${easyPct}%`, background: 'var(--easy-color)' }} title={`Easy: ${c.difficultyBreakdown?.easy || 0}`} />
                    <div style={{ width: `${medPct}%`, background: 'var(--medium-color)' }} title={`Medium: ${c.difficultyBreakdown?.medium || 0}`} />
                    <div style={{ width: `${hardPct}%`, background: 'var(--hard-color)' }} title={`Hard: ${c.difficultyBreakdown?.hard || 0}`} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>E: {c.difficultyBreakdown?.easy || 0}</span>
                    <span>M: {c.difficultyBreakdown?.medium || 0}</span>
                    <span>H: {c.difficultyBreakdown?.hard || 0}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
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
            Page {page} of {pagination.pages}
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
