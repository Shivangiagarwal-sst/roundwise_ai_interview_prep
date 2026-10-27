import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { FrequencyBar, RecencyPills } from '../components/FrequencyBar.jsx';
import { 
  Building2, 
  CalendarRange, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Repeat, 
  ShieldAlert, 
  Search,
  ExternalLink
} from 'lucide-react';

export function LandingPage() {
  const { user, config, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ companyCount: 659, questionCount: 2800, snapshotDate: '2026-08-16' });
  const [topCompanies, setTopCompanies] = useState([]);
  const [sampleQuestions, setSampleQuestions] = useState([]);
  
  // Interactive preview state
  const [selectedCompanies, setSelectedCompanies] = useState(['google', 'amazon']);
  const [previewDays, setPreviewDays] = useState(7);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    // Load public stats
    api.get('/public/stats')
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(() => {});

    // Load top companies
    api.get('/companies?limit=8&sort=questions&order=desc')
      .then((res) => { if (res.success) setTopCompanies(res.data); })
      .catch(() => {});

    // Load preview questions
    api.get('/questions?limit=5&sort=frequency&order=desc')
      .then((res) => { if (res.success) setSampleQuestions(res.data); })
      .catch(() => {});
  }, []);

  const handleGeneratePreview = async () => {
    if (selectedCompanies.length === 0) return;
    setPreviewLoading(true);
    try {
      const slugs = selectedCompanies.join(',');
      const res = await api.get(`/public/plan-preview?companySlugs=${slugs}&totalDays=${previewDays}&questionsPerDay=3`);
      if (res.success) {
        setPreviewPlan(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const togglePreviewCompany = (slug) => {
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

  return (
    <div className="full-bleed-content">
      {/* Hero Section */}
      <section style={{ padding: '4.5rem 1.5rem 3.5rem', maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.9rem', borderRadius: 'var(--radius-full)', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.25)', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.75rem' }}>
          <Sparkles size={15} />
          <span>Real Company-Wise Interview Questions · Zero Subscription Paywalls</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.15, maxWidth: '960px', margin: '0 auto 1.5rem', letterSpacing: '-0.03em' }}>
          Know What They Ask <br />
          <span style={{ color: 'var(--accent-primary)' }}>
            Before You Walk In.
          </span>
        </h1>

        <p style={{ fontSize: '1.2rem', maxWidth: '780px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Students preparing for campus placements pay for LeetCode Premium primarily to see which company asks what. 
          Roundwise turns authentic frequency data into multi-company study schedules and spaced-repetition retention.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/plans" className="btn btn-primary btn-lg">
            <span>Build Your Study Plan</span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/companies" className="btn btn-secondary btn-lg">
            <Building2 size={18} />
            <span>Browse {stats.companyCount} Companies</span>
          </Link>
          {config.demoEnabled && !user && (
            <button
              onClick={async () => {
                await demoLogin();
                navigate('/dashboard');
              }}
              className="btn btn-ghost btn-lg"
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--border-subtle)' }}
            >
              <Sparkles size={18} />
              <span>Explore Instant Demo</span>
            </button>
          )}
        </div>

        {/* Real Metrics Banner */}
        <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
              {stats.companyCount}+
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Indexed Companies
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>From FAANG/MAMAA to high-growth unicorns</p>
          </div>

          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--easy-color)', fontFamily: 'var(--font-mono)' }}>
              {stats.questionCount}+
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Unique Problems
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Cross-referenced across real interview reports</p>
          </div>

          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
              5 Windows
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Recency Granularity
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>30-day fresh rounds to all-time classics</p>
          </div>

          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--medium-color)', fontFamily: 'var(--font-mono)' }}>
              100% Free
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Open Source Data
            </div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Snapshot: {stats.snapshotDate}</p>
          </div>
        </div>
      </section>

      {/* Interactive Plan Generator Preview Section */}
      <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-primary)' }}>
              Interactive Algorithm Demo
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '0.4rem' }}>
              Test the Multi-Company Scoring Engine Right Now
            </h2>
            <p style={{ maxWidth: '640px', margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
              Select target companies to see how our pure deterministic engine finds optimal overlap questions and balances difficulty.
            </p>
          </div>

          <div className="card" style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--bg-page)', border: '1px solid var(--border-medium)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Select Companies */}
              <div>
                <label className="label">1. Select Target Companies (up to 5)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {['google', 'amazon', 'microsoft', 'meta', 'apple', 'uber', 'salesforce', 'bloomberg'].map((slug) => {
                    const isSelected = selectedCompanies.includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => togglePreviewCompany(slug)}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {slug}
                        {isSelected && <CheckCircle2 size={13} style={{ marginLeft: '4px' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Days Slider */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label className="label">2. Preparation Duration: {previewDays} Days</label>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={previewDays}
                    onChange={(e) => setPreviewDays(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '0.4rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>3 days (Sprint)</span>
                    <span>14 days</span>
                    <span>30 days (Comprehensive)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={previewLoading || selectedCompanies.length === 0}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '42px' }}
                  >
                    {previewLoading ? 'Scoring & Ranking...' : 'Simulate Plan Generation'}
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>

              {/* Plan Preview Result */}
              {previewPlan && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Simulated Plan Summary</h4>
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>
                        {previewPlan.summary.totalQuestions} Questions across {previewPlan.days.length} Days · {previewPlan.summary.overlapQuestions} Multi-Company Overlaps
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="badge badge-easy">{previewPlan.summary.byDifficulty.easy} Easy</span>
                      <span className="badge badge-medium">{previewPlan.summary.byDifficulty.medium} Medium</span>
                      <span className="badge badge-hard">{previewPlan.summary.byDifficulty.hard} Hard</span>
                    </div>
                  </div>

                  {/* Day 1 Preview */}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Day 1 Kickoff (Foundational Warm-Up)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {previewPlan.days[0]?.questions.map((q) => (
                        <div key={q._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{q.leetcodeId}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <DifficultyBadge difficulty={q.difficulty} size="small" />
                            <a href={q.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                              <ExternalLink size={15} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <Link to="/plans" className="btn btn-secondary btn-sm">
                      Create Full Custom Plan & Track Progress <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product Pillars / Real Engineering */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '4.5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem' }}>Built for Rigorous Placement Engineering</h2>
          <p style={{ maxWidth: '600px', margin: '0.5rem auto 0' }}>
            No gimmicks, no fake data, no black-box AI magic. Transparent algorithms designed to maximize prep yield.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(249, 115, 22, 0.12)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <TrendingUp size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Multi-Company Overlap Boost</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Targeting Google, Amazon, and Microsoft? Our scoring function gives multiplier boosts to problems asked by multiple of your target companies, maximizing prep efficiency per hour.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Repeat size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>SM-2 Spaced Repetition</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Solving a problem once doesn't guarantee you can recall the invariant under interview pressure. Automated review queues reschedule solved problems at 1, 3, 7, 14, and 30-day intervals.
            </p>
          </div>

          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--easy-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Honest AI Code Review</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Powered by Google Gemini to analyze edge cases, asymptotic complexity, and algorithmic reasoning. Clearly discloses what it checks and never pretends to be a runtime execution sandbox.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Question Preview Table */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem 4.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem' }}>High-Frequency Interview Problems</h3>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>Frequently tested problems across industry rounds</p>
          </div>
          <Link to="/questions" className="btn btn-secondary btn-sm">
            View All Questions <ArrowRight size={14} />
          </Link>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>#</th>
                <th>Title</th>
                <th style={{ width: '110px' }}>Difficulty</th>
                <th style={{ width: '130px' }}>Acceptance</th>
                <th style={{ width: '180px' }}>Frequency</th>
                <th style={{ width: '180px' }}>Top Companies</th>
              </tr>
            </thead>
            <tbody>
              {sampleQuestions.map((q) => (
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
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {q.companies?.slice(0, 2).map((c) => (
                        <span key={c.slug} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {c.name}
                        </span>
                      ))}
                      {(q.companies?.length || 0) > 2 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          +{q.companies.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
