import React from 'react';

export function FrequencyBar({ value = 0, showPercent = true }) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), 100);

  return (
    <div className="freq-meter" title={`Asked in approx. ${clamped.toFixed(1)}% of company rounds`}>
      <div className="freq-bar">
        <div
          className="freq-fill"
          style={{ width: `${Math.max(clamped, 4)}%` }}
        />
      </div>
      {showPercent && (
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '40px' }}>
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function RecencyPills({ recency = [] }) {
  const labelMap = {
    'thirty-days': { label: '30 Days', color: 'var(--accent-primary)', bg: 'rgba(249, 115, 22, 0.12)' },
    'three-months': { label: '3 Mo', color: 'var(--text-primary)', bg: 'rgba(255, 255, 255, 0.08)' },
    'six-months': { label: '6 Mo', color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' },
    'more-than-six-months': { label: '> 6 Mo', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.03)' },
    'all': { label: 'All Time', color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.03)' },
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
      {recency.map((r) => {
        const item = labelMap[r] || { label: r, color: '#94a3b8', bg: 'var(--bg-highlight)' };
        return (
          <span
            key={r}
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              color: item.color,
              background: item.bg,
              border: `1px solid ${item.color}33`,
            }}
          >
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
