import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { 
  CalendarRange, 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  Sliders,
  Trash2,
  Clock
} from 'lucide-react';

export function PlanGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Generator form
  const preselected = searchParams.get('company');
  const [selectedCompanies, setSelectedCompanies] = useState(
    preselected ? [preselected] : (user?.targetCompanies?.length ? user.targetCompanies : ['google', 'amazon'])
  );
  const [totalDays, setTotalDays] = useState(7);
  const [questionsPerDay, setQuestionsPerDay] = useState(3);
  const [difficultyMix, setDifficultyMix] = useState({ easy: 20, medium: 60, hard: 20 });
  const [focusRecency, setFocusRecency] = useState('all');
  const [includeSolved, setIncludeSolved] = useState(false);

  // Search for more companies
  const [companySearch, setCompanySearch] = useState('');
  const [searchedCompanies, setSearchedCompanies] = useState([]);

  // Plans list
  const [myPlans, setMyPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Auth modal if not logged in
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingPlans(true);
      api.get('/plans')
        .then((res) => {
          if (res.success) setMyPlans(res.data);
        })
        .catch(console.error)
        .finally(() => setLoadingPlans(false));
    }
  }, [user]);

  // Debounced search for companies to add
  useEffect(() => {
    if (!companySearch.trim()) {
      setSearchedCompanies([]);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/companies?search=${encodeURIComponent(companySearch)}&limit=6`)
        .then((res) => {
          if (res.success) setSearchedCompanies(res.data);
        })
        .catch(console.error);
    }, 200);

    return () => clearTimeout(timer);
  }, [companySearch]);

  const toggleCompany = (slug) => {
    if (selectedCompanies.includes(slug)) {
      if (selectedCompanies.length > 1) {
        setSelectedCompanies(selectedCompanies.filter((s) => s !== slug));
      }
    } else {
      if (selectedCompanies.length < 5) {
        setSelectedCompanies([...selectedCompanies, slug]);
      }
    }
  };

  const handleDifficultyChange = (key, val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    setDifficultyMix((prev) => ({ ...prev, [key]: num }));
  };

  const normalizeDifficulty = () => {
    const sum = difficultyMix.easy + difficultyMix.medium + difficultyMix.hard || 100;
    setDifficultyMix({
      easy: Math.round((difficultyMix.easy / sum) * 100),
      medium: Math.round((difficultyMix.medium / sum) * 100),
      hard: 100 - Math.round((difficultyMix.easy / sum) * 100) - Math.round((difficultyMix.medium / sum) * 100),
    });
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setError('');
    setGenerating(true);

    try {
      const res = await api.post('/plans', {
        companySlugs: selectedCompanies,
        totalDays,
        questionsPerDay,
        difficultyMix,
        focusRecency: focusRecency === 'all' ? null : focusRecency,
        includeSolved,
      });

      if (res.success) {
        navigate(`/plans/${res.data._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await api.delete(`/plans/${planId}`);
      setMyPlans((prev) => prev.filter((p) => p._id !== planId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarRange size={32} color="var(--accent-primary)" />
          <span>Multi-Company Study Plan Generator</span>
        </h1>
        <p style={{ marginTop: '0.4rem' }}>
          Target 1 to 5 companies. Our deterministic scoring algorithm prioritizes cross-company questions, balances difficulty, and creates a ramped daily schedule.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 340px', gap: '2rem' }}>
        {/* Form Column */}
        <div>
          <form onSubmit={handleGeneratePlan} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {error && (
              <div style={{ padding: '0.85rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--hard-border)', borderRadius: 'var(--radius-md)', color: 'var(--hard-color)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {/* Target Companies */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="label" style={{ margin: 0 }}>1. Target Companies ({selectedCompanies.length} / 5)</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cross-company overlap will be boosted</span>
              </div>

              {/* Quick Popular Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {['google', 'amazon', 'microsoft', 'meta', 'apple', 'uber', 'salesforce', 'bloomberg'].map((slug) => {
                  const isSelected = selectedCompanies.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleCompany(slug)}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {slug}
                      {isSelected && <CheckCircle2 size={13} style={{ marginLeft: '4px' }} />}
                    </button>
                  );
                })}
              </div>

              {/* Search any company */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search and add other companies (e.g. Adobe, Stripe, Netflix)..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                {searchedCompanies.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', marginTop: '4px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                    {searchedCompanies.map((c) => (
                      <div
                        key={c.slug}
                        onClick={() => {
                          toggleCompany(c.slug);
                          setCompanySearch('');
                        }}
                        style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}
                        className="search-item-hover"
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.questionCount} questions</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Duration & Daily Volume */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
              <div>
                <label className="label">2. Preparation Duration: {totalDays} Days</label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '0.3rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>3d (Sprint)</span>
                  <span>14d</span>
                  <span>30d</span>
                </div>
              </div>

              <div>
                <label className="label">3. Questions Per Day: {questionsPerDay}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={questionsPerDay}
                  onChange={(e) => setQuestionsPerDay(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '0.3rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>1 / day (Steady)</span>
                  <span>5 / day</span>
                  <span>10 / day (Intensive)</span>
                </div>
              </div>
            </div>

            {/* Difficulty Mix Sliders */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="label" style={{ margin: 0 }}>4. Target Difficulty Mix (% of total)</label>
                <button
                  type="button"
                  onClick={normalizeDifficulty}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', color: 'var(--accent-primary)' }}
                >
                  Normalize to 100%
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--easy-color)', fontWeight: 600 }}>Easy: {difficultyMix.easy}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyMix.easy}
                    onChange={(e) => handleDifficultyChange('easy', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--easy-color)' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--medium-color)', fontWeight: 600 }}>Medium: {difficultyMix.medium}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyMix.medium}
                    onChange={(e) => handleDifficultyChange('medium', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--medium-color)' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--hard-color)', fontWeight: 600 }}>Hard: {difficultyMix.hard}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={difficultyMix.hard}
                    onChange={(e) => handleDifficultyChange('hard', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--hard-color)' }}
                  />
                </div>
              </div>
            </div>

            {/* Recency Focus & Include Solved */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <div>
                <label className="label">Recency Focus</label>
                <select
                  className="select"
                  value={focusRecency}
                  onChange={(e) => setFocusRecency(e.target.value)}
                >
                  <option value="all">All Available Recency Windows</option>
                  <option value="thirty-days">Prioritize Last 30 Days (Ultra-Fresh)</option>
                  <option value="three-months">Prioritize Last 3 Months</option>
                  <option value="six-months">Prioritize Last 6 Months</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  id="includeSolved"
                  checked={includeSolved}
                  onChange={(e) => setIncludeSolved(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="includeSolved" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Include already solved problems for re-practice
                </label>
              </div>
            </div>

            {/* Total count preview & submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem' }}>
                Total Plan Questions: <strong style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{totalDays * questionsPerDay}</strong>
              </div>

              <button
                type="submit"
                disabled={generating || selectedCompanies.length === 0}
                className="btn btn-primary btn-lg"
              >
                {generating ? 'Generating Schedule...' : 'Generate Deterministic Plan'}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Saved Plans Sidebar */}
        <div>
          <div className="card" style={{ background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={18} color="var(--accent-secondary)" />
              <span>Your Active Plans</span>
            </h3>

            {!user ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <p>Sign in to save and track your custom study plans.</p>
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.75rem' }}
                >
                  Sign In
                </button>
              </div>
            ) : loadingPlans ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading saved plans...
              </div>
            ) : myPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active plans yet. Create your first one above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {myPlans.map((plan) => (
                  <div
                    key={plan._id}
                    style={{
                      padding: '0.85rem',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Link to={`/plans/${plan._id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                        {plan.companyNames?.join(', ') || 'Custom Plan'}
                      </Link>
                      <button
                        onClick={() => handleDeletePlan(plan._id)}
                        className="btn btn-ghost"
                        style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                        title="Delete plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                      <span>{plan.totalDays} Days · {plan.questionsPerDay}/day</span>
                      <span>{plan.summary?.totalQuestions} Questions</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.725rem', color: 'var(--easy-color)', fontWeight: 600 }}>
                        {plan.solvedCount || 0} / {plan.summary?.totalQuestions || 0} solved
                      </span>
                      <Link to={`/plans/${plan._id}`} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                        Open Plan →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
