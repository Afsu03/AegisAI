import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('Senior Analyst');
  const [email, setEmail] = useState('analyst@aegis');
  const [password, setPassword] = useState('••••••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••••••');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice('Account structure initialized. Redirecting to Workspace...');
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="fade-in" style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#181815', border: '1px solid #2A2926', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Shield size={18} color="#F5F2EA" />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#F5F2EA', letterSpacing: '-0.01em', marginBottom: 4 }}>
            Create AegisAI Account
          </h1>
          <p style={{ fontSize: 12, color: '#8C8981', margin: 0 }}>
            Start analyzing security logs with AI intelligence.
          </p>
        </div>

        {/* Notice */}
        {notice && (
          <div style={{ background: '#181815', border: '1px solid #2A2926', padding: '10px 12px', borderRadius: 4, fontSize: 11, color: '#F5F2EA', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
            {notice}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B6860', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              Full Name
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B6860', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B6860', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6B6860', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              Confirm Password
            </label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 6, fontSize: 12 }}>
            Create Account <ArrowRight size={13} />
          </button>
        </form>

        {/* Footer Link */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #1F1E1B', paddingTop: 14, fontSize: 11, color: '#8C8981' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#F5F2EA', fontWeight: 600, textDecoration: 'underline' }}>
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
};
