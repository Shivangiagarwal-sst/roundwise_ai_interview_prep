import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { FrequencyBar, RecencyPills } from '../components/FrequencyBar.jsx';
import { 
  ArrowLeft, 
  ExternalLink, 
  Bookmark, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Cpu, 
  Save, 
  RotateCcw,
  Building2,
  AlertCircle
} from 'lucide-react';

export function QuestionDetailPage() {
  const { id } = useParams();
  const { user, config } = useAuth();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  // User state
  const [status, setStatus] = useState('unattempted');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  // AI state
  const [aiReview, setAiReview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiQuota, setAiQuota] = useState(null);

  // Revision state
  const [revision, setRevision] = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    api.get(`/questions/${id}`)
      .then((res) => {
        if (!ignore && res.success) {
          setQuestion(res.data);
          if (res.data.userProgress) {
            const p = res.data.userProgress;
            setStatus(p.status || 'unattempted');
            setIsBookmarked(!!p.isBookmarked);
            setNotes(p.notes || '');
            if (p.solution?.code) {
              setCode(p.solution.code);
              setLanguage(p.solution.language || 'javascript');
            }
            if (p.aiReview) {
              setAiReview(p.aiReview);
            }
            if (p.revision) {
              setRevision(p.revision);
            }
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    // Check AI status if logged in
    if (user) {
      api.get('/ai/status')
        .then((res) => {
          if (!ignore && res.success) setAiQuota(res.data);
        })
        .catch(() => {});
    }

    return () => { ignore = true; };
  }, [id, user]);

  const handleStatusChange = async (newStatus) => {
    if (!user) return;
    setStatus(newStatus);
    try {
      await api.put(`/progress/questions/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) return;
    setIsBookmarked(!isBookmarked);
    try {
      await api.put(`/progress/questions/${id}/bookmark`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    try {
      await api.put(`/progress/questions/${id}/notes`, { notes });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveCode = async () => {
    if (!user) return;
    setSavingCode(true);
    try {
      await api.put(`/progress/questions/${id}/solution`, { language, code });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCode(false);
    }
  };

  const handleAiReview = async () => {
    if (!user || !code.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.post('/ai/review', {
        questionId: id,
        language,
        code,
        explanation: notes,
      });
      if (res.success) {
        setAiReview(res.data);
        if (aiQuota) {
          setAiQuota({ ...aiQuota, remaining: res.quotaRemaining, usedToday: aiQuota.dailyQuota - res.quotaRemaining });
        }
      }
    } catch (err) {
      setAiError(err.message || 'AI review failed. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSpacedReview = async (result) => {
    if (!user) return;
    try {
      const res = await api.post(`/progress/questions/${id}/review`, { result });
      if (res.success) {
        setRevision(res.data.revision);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>Loading problem details...</div>;
  }

  if (!question) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Question not found</h2>
        <Link to="/questions" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Questions
        </Link>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Back button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/questions" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Question Catalog</span>
        </Link>
      </div>

      {/* Question Header Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--text-muted)' }}>
                #{question.leetcodeId}
              </span>
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>{question.title}</h1>
              <DifficultyBadge difficulty={question.difficulty} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>Acceptance Rate: <strong style={{ color: 'var(--text-primary)' }}>{question.acceptanceRate ? `${question.acceptanceRate.toFixed(1)}%` : 'N/A'}</strong></span>
              <span>Asked by <strong style={{ color: 'var(--text-primary)' }}>{question.companies?.length || 0} Companies</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {user && (
              <button
                type="button"
                onClick={handleBookmarkToggle}
                className="btn btn-secondary"
                style={{ color: isBookmarked ? 'var(--accent-primary)' : 'var(--text-primary)', borderColor: isBookmarked ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
              >
                <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            )}

            <a
              href={question.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <span>Solve on LeetCode</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* User Status Bar */}
        {user && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['unattempted', 'attempted', 'solved'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`btn btn-sm ${status === st ? (st === 'solved' ? 'btn-primary' : 'btn-secondary') : 'btn-ghost'}`}
                    style={{
                      textTransform: 'capitalize',
                      borderColor: status === st ? 'var(--border-strong)' : 'transparent',
                    }}
                  >
                    {st === 'solved' && <CheckCircle2 size={13} style={{ marginRight: '4px' }} />}
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Revision status if solved */}
            {status === 'solved' && revision && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-elevated)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                <Clock size={14} color="var(--accent-primary)" />
                <span>
                  SM-2 Stage: <strong>Stage {revision.stage}</strong> · Next review: <strong>{new Date(revision.nextReviewAt).toLocaleDateString()}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Companies who ask it & Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '1.5rem' }}>
        {/* Left Column: Company Frequencies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Building2 size={18} color="var(--accent-primary)" />
              <span>Company Frequencies</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {question.companies?.map((c) => (
                <div key={c.slug} style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <Link to={`/companies/${c.slug}`} style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {c.name}
                    </Link>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      {c.frequency ? `${c.frequency.toFixed(1)}%` : 'Active'}
                    </span>
                  </div>
                  <FrequencyBar value={c.frequency || 0} showPercent={false} />
                  <div style={{ marginTop: '0.5rem' }}>
                    <RecencyPills recency={c.recency || []} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SM-2 Review Rating Box */}
          {user && status === 'solved' && (
            <div className="card" style={{ border: '1px solid var(--accent-primary-glow)' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>Retention Review</h4>
              <p style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                How well did you recall this solution? Updates your spaced repetition queue.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleSpacedReview('forgot')}
                  className="btn btn-sm btn-danger"
                >
                  Forgot (1d)
                </button>
                <button
                  type="button"
                  onClick={() => handleSpacedReview('hard')}
                  className="btn btn-sm btn-secondary"
                >
                  Hard (1-3d)
                </button>
                <button
                  type="button"
                  onClick={() => handleSpacedReview('good')}
                  className="btn btn-sm btn-secondary"
                  style={{ color: 'var(--medium-color)' }}
                >
                  Good (+Interval)
                </button>
                <button
                  type="button"
                  onClick={() => handleSpacedReview('easy')}
                  className="btn btn-sm btn-secondary"
                  style={{ color: 'var(--easy-color)' }}
                >
                  Easy (++Interval)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code Scratchpad & Notes & AI Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Notes Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label className="label" style={{ margin: 0 }}>Problem Notes & Invariants</label>
              {user && (
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="btn btn-secondary btn-sm"
                >
                  <Save size={14} />
                  <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                </button>
              )}
            </div>
            <textarea
              className="textarea"
              rows={4}
              placeholder={user ? "Key observations: sliding window invariant, monotonic stack, edge cases (empty array, duplicates)..." : "Sign in to save your personal notes and solution codes."}
              value={notes}
              disabled={!user}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Solution Code Scratchpad */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="label" style={{ margin: 0 }}>Solution Scratchpad</label>
                <select
                  className="select"
                  value={language}
                  disabled={!user}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="typescript">TypeScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>

              {user && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleSaveCode}
                    disabled={savingCode}
                    className="btn btn-secondary btn-sm"
                  >
                    <Save size={14} />
                    <span>{savingCode ? 'Saving...' : 'Save Code'}</span>
                  </button>

                  {config.aiEnabled && (
                    <button
                      onClick={handleAiReview}
                      disabled={aiLoading || !code.trim()}
                      className="btn btn-primary btn-sm"
                      title={aiQuota ? `${aiQuota.remaining} of ${aiQuota.dailyQuota} requests remaining today` : ''}
                    >
                      <Sparkles size={14} />
                      <span>{aiLoading ? 'Analyzing...' : 'AI Code Review'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <textarea
              className="textarea"
              rows={12}
              placeholder={user ? `// Paste your ${language} solution here to analyze logic, time/space complexity...` : "Sign in to paste code and request AI reasoning review."}
              value={code}
              disabled={!user}
              onChange={(e) => setCode(e.target.value)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                background: '#070a10',
                border: '1px solid var(--border-subtle)',
              }}
            />

            {/* AI Quota Notice */}
            {user && config.aiEnabled && aiQuota && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Gemini Reasoning Review: {aiQuota.remaining} / {aiQuota.dailyQuota} daily requests left</span>
                <span>Checks algorithmic logic & complexity (never runs code)</span>
              </div>
            )}
          </div>

          {/* AI Review Results Display */}
          {aiError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--hard-border)', borderRadius: 'var(--radius-md)', color: 'var(--hard-color)', fontSize: '0.875rem' }}>
              <AlertCircle size={18} />
              <span>{aiError}</span>
            </div>
          )}

          {aiReview && (
            <div className="card" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} color="var(--accent-secondary)" />
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>AI Reasoning & Complexity Review</h3>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Powered by Google Gemini</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Approach Summary</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{aiReview.approach || aiReview.assessment}</p>
                </div>

                {aiReview.implementationStatus && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                    <strong>Implementation check: </strong>
                    <span>{({ solution: 'A solution is present', partial: 'Partially implemented', boilerplate: 'Boilerplate only — algorithm missing', empty: 'No meaningful code provided' })[aiReview.implementationStatus] || aiReview.implementationStatus}</span>
                    {typeof aiReview.correctnessConfidence === 'number' && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>AI confidence estimate: {aiReview.correctnessConfidence}% (not a test result)</span>}
                  </div>
                )}
                {aiReview.codeFindings?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--hard-color)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Code-specific findings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {aiReview.codeFindings.map((finding, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                            <strong>{finding.issue}</strong><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{finding.severity?.toUpperCase()} · {finding.location}</span>
                          </div>
                          <p style={{ margin: '0.4rem 0' }}>{finding.explanation}</p>
                          {finding.suggestedFix && <p style={{ margin: 0 }}><strong>Suggested fix:</strong> {finding.suggestedFix}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiReview.tags?.length > 0 && <div><strong>Concept tags: </strong>{aiReview.tags.join(' · ')}</div>}
                {aiReview.strengths?.length > 0 && (
                  <div><h4 style={{ fontSize: '0.85rem', color: 'var(--easy-color)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>What looks good</h4><ul style={{ paddingLeft: '1.25rem' }}>{aiReview.strengths.map((item, idx) => <li key={idx}>{item}</li>)}</ul></div>
                )}
                {aiReview.gaps?.length > 0 && (
                  <div><h4 style={{ fontSize: '0.85rem', color: 'var(--medium-color)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Missing or incorrect logic</h4><ul style={{ paddingLeft: '1.25rem' }}>{aiReview.gaps.map((item, idx) => <li key={idx}>{item}</li>)}</ul></div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Time Complexity</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--easy-color)' }}>
                      {aiReview.timeComplexity}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Space Complexity</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                      {aiReview.spaceComplexity}
                    </div>
                  </div>
                </div>

                {aiReview.edgeCases?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--medium-color)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Critical Edge Cases</h4>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {aiReview.edgeCases.map((ec, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem' }}>{ec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(aiReview.improvements || aiReview.suggestions || []).length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Refactoring Suggestions</h4>
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {(aiReview.improvements || aiReview.suggestions || []).map((sug, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem' }}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
