import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ShieldCheck, Database, GitBranch, Heart } from 'lucide-react';

export function Footer() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/public/stats')
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '3rem 1.5rem 2.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>Roundwise</span>
              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-primary)', fontWeight: 700 }}>v1.0</span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Know what they ask before you walk in. Free, high-conviction technical interview prep workspace built on real company-wise frequency data.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Dataset Provenance
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={14} color="var(--accent-primary)" />
                <span>
                  {stats ? `${stats.companyCount.toLocaleString()} Companies · ${stats.questionCount.toLocaleString()} Questions` : '659 Companies · 1,642 CSVs'}
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitBranch size={14} color="var(--accent-secondary)" />
                <span>
                  Snapshot: {stats?.snapshotDate || '2026-08-16'} ({stats?.commit?.slice(0, 7) || 'e095c25'})
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} color="var(--easy-color)" />
                <span>MIT Licensed Core & Deterministic Plan Generator</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Transparency & Disclaimer
            </h4>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Roundwise is an independent educational tool. We are not affiliated with, endorsed by, or partnered with LeetCode or any named companies. Problem titles and links direct to public LeetCode questions.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>
            © {new Date().getFullYear()} Roundwise. Built with rigorous engineering for university placement preparation.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Clean Architecture</span>
            <span>Zero Hallucinated Data</span>
            <span>Spaced Repetition SM-2</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
