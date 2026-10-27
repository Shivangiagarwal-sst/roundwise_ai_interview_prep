import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthModal } from './AuthModal.jsx';
import { 
  Building2, 
  Code2, 
  CalendarRange, 
  Repeat, 
  LayoutDashboard, 
  LogOut, 
  Sparkles, 
  Layers
} from 'lucide-react';

export function Navbar() {
  const { user, logout, config } = useAuth();
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="nav-header">
        <div className="nav-inner">
          {/* Logo & Brand */}
          <Link to="/" className="nav-brand">
            <div className="nav-brand-badge">
              <Layers size={20} />
            </div>
            <span>Roundwise</span>
          </Link>

          {/* Navigation Links */}
          <nav className="nav-links">
            <Link to="/companies" className={`nav-link ${isActive('/companies') ? 'active' : ''}`}>
              <Building2 size={16} />
              <span>Companies</span>
            </Link>
            <Link to="/questions" className={`nav-link ${isActive('/questions') ? 'active' : ''}`}>
              <Code2 size={16} />
              <span>Questions</span>
            </Link>
            <Link to="/plans" className={`nav-link ${isActive('/plans') ? 'active' : ''}`}>
              <CalendarRange size={16} />
              <span>Plan Generator</span>
            </Link>
            {user && (
              <Link to="/revision" className={`nav-link ${isActive('/revision') ? 'active' : ''}`}>
                <Repeat size={16} />
                <span>Revision Queue</span>
              </Link>
            )}
          </nav>

          {/* User actions */}
          <div className="nav-actions">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Link to="/dashboard" className={`btn btn-secondary btn-sm ${isActive('/dashboard') ? 'active' : ''}`}>
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-highlight)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                  {user.isDemo && (
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      DEMO
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="btn btn-ghost btn-sm"
                  title="Sign out"
                  style={{ padding: '0.4rem' }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {config.demoEnabled && (
                  <button
                    onClick={() => openAuth('login')}
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                  >
                    <Sparkles size={14} />
                    <span>Demo Mode</span>
                  </button>
                )}
                <button
                  onClick={() => openAuth('login')}
                  className="btn btn-ghost btn-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="btn btn-primary btn-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
