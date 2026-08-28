import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: '#0A0A0A',
      }}
    >
      <div
        className="fade-in card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          border: '1px solid #2A2926',
          borderRadius: 6,
          background: '#11110F',
        }}
      >
        {/* Logo / Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              background: '#0A0A0A',
              border: '1px solid #2A2926',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <img
              src="/aegis-logo.jpg"
              alt="AegisAI Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAF5EA', marginBottom: 6, fontFamily: 'Gilleto, sans-serif' }}>
            Sign in to AegisAI
          </h1>
          <p style={{ fontSize: 13, color: '#8C8981', lineHeight: 1.5 }}>
            Access your secure threat intelligence and multi-agent investigation workspace.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              background: 'rgba(217,121,121,0.08)',
              border: '1px solid rgba(217,121,121,0.2)',
              borderRadius: 4,
              fontSize: 13,
              color: '#D97979',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#C2BDB0',
                marginBottom: 6,
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#6B6860"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@enterprise.com"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#0A0A0A',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  color: '#F5F2EA',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#C2BDB0',
                marginBottom: 6,
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="#6B6860"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: '#0A0A0A',
                  border: '1px solid #2A2926',
                  borderRadius: 4,
                  color: '#F5F2EA',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '11px',
              fontSize: 14,
              fontWeight: 600,
              justifyContent: 'center',
              marginTop: 6,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #1F1E1B', paddingTop: 18 }}>
          <p style={{ fontSize: 13, color: '#8C8981', margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ color: '#F5F2EA', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
