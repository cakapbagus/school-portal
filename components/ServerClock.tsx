'use client';
import { useEffect, useState } from 'react';

export default function ServerClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Sync dengan server sekali, lalu jalankan lokal
    fetch('/api/time')
      .then(r => r.json())
      .then(({ ts }) => {
        const offset = ts - Date.now(); // selisih server vs client
        setNow(new Date(Date.now() + offset));
        const timer = setInterval(() => {
          setNow(new Date(Date.now() + offset));
        }, 1000);
        return () => clearInterval(timer);
      })
      .catch(() => {
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
      });
  }, []);

  if (!now) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  const hari = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][now.getDay()];
  const tgl  = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  const jam  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div
      style={{
      position: 'fixed',
      bottom: '0.75rem',
      left: '1.25rem',
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'var(--card)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.3rem 0.7rem',
      pointerEvents: 'none',
      }}
      className="hidden-mobile-clock"
    >
      {/* Dot */}
      <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: 'var(--success)',
      display: 'inline-block',
      boxShadow: '0 0 0 2px rgba(52,211,153,0.25)',
      animation: 'clockPulse 2s ease-in-out infinite',
      flexShrink: 0,
      }} />
      <div style={{ lineHeight: 1.3 }}>
      <div style={{
        fontSize: '0.8rem',
        fontWeight: 700,
        color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.03em',
        fontFamily: 'Plus Jakarta Sans, monospace',
      }}>
        {jam}
      </div>
      <div style={{
        fontSize: '0.65rem',
        color: 'var(--text2)',
        marginTop: 1,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}>
        {hari}, {tgl}
      </div>
      </div>
      <style>{`
      @keyframes clockPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      @media (max-width: 640px) {
        .hidden-mobile-clock {
        display: none !important;
        }
      }
      `}</style>
    </div>
  );
}
