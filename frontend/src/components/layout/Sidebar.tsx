import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Bot,
  Activity,
  Network,
  Info,
  FolderKanban,
} from 'lucide-react';

const workspaceItems = [
  { label: 'OVERVIEW', path: '/dashboard', icon: LayoutDashboard },
];

const investigationItems = [
  { label: 'THREATS',   path: '/threats',           icon: ShieldAlert },
  { label: 'INCIDENTS', path: '/incident-response', icon: Activity },
];

const intelligenceItems = [
  { label: 'AGENT LAB', path: '/agents',            icon: Bot },
];

const systemItems = [
  { label: 'ARCHITECTURE', path: '/architecture',   icon: Network },
  { label: 'ABOUT',        path: '/about',          icon: Info },
];

function NavGroup({ title, items }: { title: string; items: typeof workspaceItems }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p className="section-label" style={{ padding: '0 12px', marginBottom: 6 }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              style={{ letterSpacing: '0.04em', fontWeight: 600, fontSize: 13 }}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export const Sidebar: React.FC = () => (
  <aside
    style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--bg)',
      borderRight: '1px solid var(--border)',
      minHeight: 'calc(100vh - 84px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 0',
      position: 'sticky',
      top: 84,
      overflowY: 'auto',
    }}
    className="hidden md:flex"
  >
    <nav style={{ padding: '0 10px' }}>
      <NavGroup title="WORKSPACE" items={workspaceItems} />
      <NavGroup title="INVESTIGATION" items={investigationItems} />
      <NavGroup title="INTELLIGENCE" items={intelligenceItems} />
      <NavGroup title="SYSTEM" items={systemItems} />
    </nav>

    {/* Footer status */}
    <div style={{ padding: '0 16px', borderTop: '1px solid var(--border-sub)', paddingTop: 16 }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--text-primary)',
              flexShrink: 0,
            }}
          />
          <span className="section-label" style={{ fontSize: 10, color: 'var(--text-primary)' }}>
            4-AGENT PIPELINE
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5 }}>
          Analysis → Summary → Risk → Advisory
        </p>
      </div>

      <p style={{ fontSize: 11, color: '#6B6860', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 12 }}>
        AegisAI Platform v2.0
      </p>
    </div>
  </aside>
);
