'use client';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} onClick={onClose}>
      {type === 'success' && '✓ '}
      {type === 'error' && '✕ '}
      {message}
    </div>
  );
}
