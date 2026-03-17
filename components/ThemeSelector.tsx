'use client';
import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('portal-theme') as Theme) || 'dark';
    const resolved: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal-theme', next);
    applyTheme(next);
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Change to Light Mode' : 'Change to Dark Mode'}
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 50,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        fontSize: '1.1rem',
      }}
      onMouseEnter={e => {
        (e.currentTarget).style.borderColor = 'var(--accent)';
        (e.currentTarget).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget).style.borderColor = 'var(--border)';
        (e.currentTarget).style.transform = 'scale(1)';
      }}
    >
      {isDark ? '☀︎' : '⏾'}
    </button>
  );
}