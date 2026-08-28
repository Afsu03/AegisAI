import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, Search, ChevronDown, User, Settings, LogOut, Cpu, Sun, Moon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLanding = location.pathname === '/';
  const [currentTime, setCurrentTime] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '0 28px',
          height: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        {/* Left Brand — Main Attraction */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            <img
              src="/aegis-logo.jpg"
              alt="AEGIS Emblem"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontFamily: 'Gilleto, sans-serif',
                  fontWeight: 800,
                  fontSize: 30,
                  letterSpacing: '0.04em',
                  color: 'var(--heading-color)',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                AEGIS
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'var(--surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  letterSpacing: '0.08em',
                  lineHeight: 1.1,
                }}
              >
                AI
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'JetBrains Mono, monospace',
                marginTop: 4,
                letterSpacing: '0.02em',
              }}
            >
              Autonomous Cyber Threat Intelligence
            </p>
          </div>
        </Link>

        {/* Center Context-Aware Search — hidden on landing */}
        {!isLanding && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flex: 1,
              maxWidth: 440,
              margin: '0 auto',
            }}
            className="hidden md:flex"
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
              }}
            >
              <Search
                size={14}
                color="var(--text-muted)"
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                type="text"
                placeholder="Search threats, analyses, recommendations..."
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  padding: '6px 12px 6px 32px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
        )}

        {/* Right System Info & Account Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Accurate Clock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            className="hidden lg:flex"
          >
            <Clock size={12} color="var(--text-muted)" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* User Account Dropdown */}
          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 4px 4px 12px',
                  background: '#11110F',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  color: '#F5F2EA',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3f3e3a')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2926')}
              >
                <span style={{ color: '#8C8981', fontSize: 11 }}>USER: {user.name.split(' ')[0].toLowerCase()}</span>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 3,
                    background: '#F5F2EA',
                    color: '#0A0A0A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown size={12} color="#8C8981" />
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    width: 200,
                    background: '#11110F',
                    border: '1px solid #2A2926',
                    borderRadius: 4,
                    padding: '6px 0',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid #1F1E1B' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F2EA', display: 'block' }}>{user.name}</span>
                    <span style={{ fontSize: 11, color: '#6B6860', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                  </div>

                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      background: 'none',
                      border: 'none',
                      color: '#F5F2EA',
                      fontSize: 13,
                      fontFamily: 'Inter, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#181815')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <User size={14} />
                    <span>Profile & Provider</span>
                  </button>

                  <div style={{ borderTop: '1px solid #1F1E1B', margin: '6px 0' }} />

                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate('/login');
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      background: 'none',
                      border: 'none',
                      color: '#D97979',
                      fontSize: 13,
                      fontFamily: 'Inter, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#181815')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
