import React from 'react';

export function DifficultyBadge({ difficulty = 'Medium', size = 'normal' }) {
  const diff = String(difficulty).toLowerCase();
  const badgeClass = diff === 'easy' ? 'badge-easy' : diff === 'hard' ? 'badge-hard' : 'badge-medium';
  const sizeStyle = size === 'small' ? { fontSize: '0.675rem', padding: '0.15rem 0.45rem' } : {};

  return (
    <span className={`badge ${badgeClass}`} style={sizeStyle}>
      {difficulty}
    </span>
  );
}
