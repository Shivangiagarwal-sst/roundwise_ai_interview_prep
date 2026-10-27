import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { DifficultyBadge } from '../components/DifficultyBadge.jsx';
import { 
  CalendarRange, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  Download, 
  ExternalLink, 
  Clock, 
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  const fetchPlan = () => {
    setLoading(true);
    api.get(`/plans/${id}`)
      .then((res) => {
        if (res.success) setPlan(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlan();
  }, [id]);

  const handleStatusChange = async (questionId, newStatus) => {
    try {
      await api.put(`/progress/questions/${questionId}/status`, { status: newStatus });
      // Update local state in plan.days
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedDays = prev.days.map((day) => ({
          ...day,
          questions: day.questions.map((q) =>
            q._id === questionId ? { ...q, userStatus: newStatus } : q
          ),
        }));

        const newSolvedCount = updatedDays.reduce((acc, d) => {
          return acc + d.questions.filter((q) => q.userStatus === 'solved').length;
        }, 0);

        return {
          ...prev,
          days: updatedDays,
          solvedCount: newSolvedCount,
        };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate this plan with updated questions?')) return;
    setRegenerating(true);
    try {
      const res = await api.post(`/plans/${id}/regenerate`);
      if (res.success) {
        setPlan(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to regenerate plan');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this study plan?')) return;
    try {
      await api.delete(`/plans/${id}`);
      navigate('/plans');
    } catch (err) {
      alert(err.message || 'Failed to delete plan');
    }
  };

  const handleExportMarkdown = () => {
    if (!plan) return;
    let md = `# Roundwise Study Plan: ${plan.companyNames.join(', ')}\n\n`;
    md += `Total Days: ${plan.totalDays} | Questions / Day: ${plan.questionsPerDay}\n`;
    md += `Generated: ${new Date(plan.createdAt).toLocaleDateString()}\n\n`;

    plan.days.forEach((d) => {
      md += `## Day ${d.dayNumber}\n\n`;
      d.questions.forEach((q) => {
        const check = q.userStatus === 'solved' ? '[x]' : '[ ]';
        md += `- ${check} **#${q.leetcodeId} ${q.title}** (${q.difficulty}) — ${q.url}\n`;
      });
      md += '\n';
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roundwise-plan-${plan.companySlugs.join('-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>Loading study plan...</div>;
  }

  if (!plan) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Plan not found</h2>
        <Link to="/plans" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Plans
        </Link>
      </div>
    );
  }

  const totalQuestions = plan.summary?.totalQuestions || plan.days.reduce((a, d) => a + d.questions.length, 0);
  const solvedQuestions = plan.solvedCount || 0;
  const progressPercent = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

  return (
    <div className="main-content">
      {/* Back button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Plan Generator</span>
        </Link>
      </div>

      {/* Plan Header Card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>
                {plan.companyNames?.join(' · ')}
              </h1>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                {plan.totalDays}-Day Plan
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {plan.questionsPerDay} problems / day · {totalQuestions} total curated problems · {plan.summary?.overlapQuestions || 0} cross-company overlaps
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportMarkdown}
              className="btn btn-secondary btn-sm"
              title="Export as Markdown checklist"
            >
              <Download size={15} />
              <span>Export</span>
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn btn-secondary btn-sm"
              title="Regenerate plan schedule"
            >
              <RotateCcw size={15} />
              <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-danger btn-sm"
              title="Delete plan"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Overall Progress: {solvedQuestions} / {totalQuestions} Solved ({progressPercent}%)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-easy">{plan.summary?.byDifficulty?.easy || 0} Easy</span>
              <span className="badge badge-medium">{plan.summary?.byDifficulty?.medium || 0} Medium</span>
              <span className="badge badge-hard">{plan.summary?.byDifficulty?.hard || 0} Hard</span>
            </div>
          </div>

          <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 250ms ease-out',
              }}
            />
          </div>
        </div>

        {/* Warnings if pool deficit */}
        {plan.summary?.warnings?.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--medium-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--medium-color)', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            <span>{plan.summary.warnings[0]}</span>
          </div>
        )}
      </div>

      {/* Day by Day Plan Schedule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {plan.days.map((day) => {
          const daySolved = day.questions.filter((q) => q.userStatus === 'solved').length;
          const isDayComplete = day.questions.length > 0 && daySolved === day.questions.length;

          return (
            <div
              key={day.dayNumber}
              className="card"
              style={{
                borderColor: isDayComplete ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                background: isDayComplete ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-surface)',
              }}
            >
              {/* Day Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      background: isDayComplete ? 'var(--easy-color)' : 'var(--bg-elevated)',
                      color: isDayComplete ? '#fff' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {isDayComplete ? <CheckCircle2 size={16} /> : day.dayNumber}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                      Day {day.dayNumber}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {daySolved} of {day.questions.length} problems completed
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: '0.8rem', color: isDayComplete ? 'var(--easy-color)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {isDayComplete ? 'Day Complete 🎉' : `${day.questions.length - daySolved} remaining`}
                </span>
              </div>

              {/* Day Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {day.questions.map((q) => {
                  const isSolved = q.userStatus === 'solved';

                  return (
                    <div
                      key={q._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                        <input
                          type="checkbox"
                          checked={isSolved}
                          onChange={(e) => handleStatusChange(q._id, e.target.checked ? 'solved' : 'unattempted')}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--easy-color)', cursor: 'pointer' }}
                        />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          #{q.leetcodeId}
                        </span>
                        <Link
                          to={`/questions/${q._id}`}
                          style={{
                            fontWeight: 600,
                            color: isSolved ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isSolved ? 'line-through' : 'none',
                          }}
                        >
                          {q.title}
                        </Link>
                        <DifficultyBadge difficulty={q.difficulty} size="small" />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <select
                          className="select"
                          value={q.userStatus || 'unattempted'}
                          onChange={(e) => handleStatusChange(q._id, e.target.value)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            width: 'auto',
                            color: q.userStatus === 'solved' ? 'var(--status-solved)' : q.userStatus === 'attempted' ? 'var(--status-attempted)' : 'var(--text-muted)',
                          }}
                        >
                          <option value="unattempted">Unattempted</option>
                          <option value="attempted">Attempted</option>
                          <option value="solved">Solved</option>
                        </select>

                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem', color: 'var(--text-muted)' }}
                          title="Open LeetCode problem"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
