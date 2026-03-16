'use client';
import { useState, useRef, useEffect } from 'react';
import RichEditor from './RichEditor';

export interface LinkData {
  id?: number;
  label: string;
  url: string;
  image_url?: string;
  effect: string;
  bg_color?: string;
  visible: boolean;
  scheduler_enabled: boolean;
  scheduler_start?: string;
  scheduler_end?: string;
  has_password?: boolean;
}

interface LinkFormModalProps {
  link?: LinkData;
  folderId?: number;
  onClose: () => void;
  onSave: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const EFFECTS = [
  { value: 'none',   label: '— Tidak ada efek' },
  { value: 'glow',   label: '✨ Bersinar (Glow)' },
  { value: 'shake',  label: '👋 Bergoyang (Shake)' },
  { value: 'bounce', label: '🏀 Memantul (Bounce)' },
  { value: 'float',  label: '🎈 Melayang (Float)' },
  { value: 'neon',   label: '💡 Neon (Neon)' },
];

const PRESET_COLORS = [
  '#1a1d2e', '#2d1b69', '#1e3a5f', '#1a3a2a',
  '#3d1515', '#3d2a10', '#2a1040', '#0f2744',
  '#6c63ff', '#a78bfa', '#38bdf8', '#34d399',
  '#f87171', '#fbbf24', '#f472b6', '#fb923c',
];

type BgMode = 'none' | 'solid';

function parseBgMode(bg_color?: string): BgMode {
  if (!bg_color) return 'none';
  return 'solid';
}

export default function LinkFormModal({ link, folderId, onClose, onSave, onToast }: LinkFormModalProps) {
  const isEdit = !!link?.id;
  const [label, setLabel] = useState(link?.label || '');
  const [url, setUrl] = useState(link?.url || '');
  const [imageUrl, setImageUrl] = useState(link?.image_url || '');
  const [originalImageUrl] = useState(link?.image_url || '');
  const [effect, setEffect] = useState(link?.effect || 'none');

  // Background color state
  const [bgMode, setBgMode] = useState<BgMode>(parseBgMode(link?.bg_color));
  const [solidColor, setSolidColor] = useState(
    link?.bg_color ? link.bg_color : '#1a1d2e'
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(link?.visible !== false);
  const [schedulerEnabled, setSchedulerEnabled] = useState(link?.scheduler_enabled || false);
  const [schedulerStart, setSchedulerStart] = useState(link?.scheduler_start || '');
  const [schedulerEnd, setSchedulerEnd] = useState(link?.scheduler_end || '');
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close color picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    if (showColorPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  // Compute final bg_color value to save
  function getFinalBgColor(): string | null {
    if (bgMode === 'none') return null;
    return solidColor;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      else onToast('Upload gagal', 'error');
    } catch {
      onToast('Upload gagal', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(fileUrl: string) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl }),
      });
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!label.trim() || !url.trim()) {
      onToast('Nama dan URL wajib diisi', 'error');
      return;
    }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    setSaving(true);
    try {
      if (isEdit && originalImageUrl && originalImageUrl !== imageUrl && originalImageUrl.startsWith('/uploads/')) {
        await deleteFile(originalImageUrl);
      }
      const body: Record<string, unknown> = {
        label, url: finalUrl, image_url: imageUrl,
        effect, bg_color: getFinalBgColor(),
        visible, scheduler_enabled: schedulerEnabled,
        scheduler_start: schedulerStart || null,
        scheduler_end: schedulerEnd || null,
      };
      if (isEdit) {
        body.id = link!.id;
        body.clear_password = clearPassword;
        if (!clearPassword && password) body.password = password;
      } else {
        if (password) body.password = password;
      }

      const res = await fetch('/api/links', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onToast(isEdit ? 'Link diperbarui' : 'Link ditambahkan', 'success');
      onSave();
    } catch {
      onToast('Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  const fl: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text2)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const radioStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'rgba(108,99,255,0.1)' : 'var(--bg3)',
    flex: 1, transition: 'all 0.15s',
  });

  // Live preview style
  const previewStyle: React.CSSProperties = {
    background: bgMode === 'none' ? 'var(--card)' : solidColor,
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.3rem' }}>
            {isEdit ? '✏️ Edit Link' : '➕ Tambah Link'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Label */}
          <div>
            <label style={fl}>Nama yang Ditampilkan *</label>
            <RichEditor value={label} onChange={setLabel} placeholder="Contoh: <b>Web</b> <i>Sekolah</i>" />
          </div>

          {/* URL */}
          <div>
            <label style={fl}>URL Link *</label>
            <input className="field" type="text" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          {/* Gambar */}
          <div>
            <label style={fl}>Gambar / Ikon</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className="field" type="text" placeholder="URL gambar atau upload..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '...' : '📁 Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            </div>
            {imageUrl && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <button type="button" onClick={() => { deleteFile(imageUrl); setImageUrl(''); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus gambar</button>
              </div>
            )}
          </div>

          {/* Warna Background */}
          <div>
            <label style={fl}>Warna Background Card</label>

            {/* Radio: None / Solid */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <label style={radioStyle(bgMode === 'none')} onClick={() => setBgMode('none')}>
                <input type="radio" name="bgMode" checked={bgMode === 'none'} onChange={() => setBgMode('none')} style={{ display: 'none' }} />
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${bgMode === 'none' ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {bgMode === 'none' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--text)' }}>Default</span>
              </label>

              <label style={radioStyle(bgMode === 'solid')} onClick={() => setBgMode('solid')}>
                <input type="radio" name="bgMode" checked={bgMode === 'solid'} onChange={() => setBgMode('solid')} style={{ display: 'none' }} />
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${bgMode === 'solid' ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {bgMode === 'solid' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />}
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--text)' }}>Solid</span>
              </label>
            </div>

            {/* Solid color picker */}
            {bgMode === 'solid' && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.875rem' }}>
                {/* Preset swatches */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: '0.75rem' }}>
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSolidColor(color)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 6,
                        background: color,
                        border: solidColor === color ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', padding: 0,
                        boxShadow: solidColor === color ? '0 0 0 2px var(--bg3), 0 0 0 4px var(--accent)' : 'none',
                        transition: 'all 0.15s',
                      }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom color picker + current swatch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div ref={colorPickerRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7,
                        padding: '0.35rem 0.6rem', cursor: 'pointer',
                        color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'Plus Jakarta Sans, sans-serif',
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: solidColor, border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block' }} />
                      Warna kustom
                    </button>
                    {showColorPicker && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 100 }}>
                        <input
                          type="color"
                          value={solidColor}
                          onChange={e => setSolidColor(e.target.value)}
                          style={{ width: 120, height: 36, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--bg3)' }}
                        />
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Warna dipilih:</span>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: solidColor, border: '1px solid var(--border)' }} />
                  <code style={{ fontSize: '0.75rem', color: 'var(--text2)', background: 'var(--bg)', padding: '0.2rem 0.4rem', borderRadius: 4 }}>{solidColor}</code>
                </div>
              </div>
            )}

            {/* Card preview */}
            {bgMode !== 'none' && (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ ...fl, marginBottom: '0.35rem' }}>Preview Card</p>
                <div
                  style={{
                    background: solidColor,
                    border: '1px solid var(--border)', borderRadius: 14,
                    padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: bgMode === 'solid' ? (isLightColor(solidColor) ? '#1a1d2e' : '#e8eaf6') : '#e8eaf6' }}
                      dangerouslySetInnerHTML={{ __html: label || 'Nama Link' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>↗</span>
                </div>
              </div>
            )}
          </div>

          {/* Efek */}
          <div>
            <label style={fl}>Efek Animasi Box</label>
            <select className="field" value={effect} onChange={e => setEffect(e.target.value)}>
              {EFFECTS.map(ef => <option key={ef.value} value={ef.value}>{ef.label}</option>)}
            </select>
          </div>

          {/* Visible + Scheduler */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} disabled={schedulerEnabled}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', opacity: schedulerEnabled ? 0.5 : 1 }}
              />
              <span style={{ fontSize: '0.875rem' }}>
                <strong>Tampilkan</strong> <span style={{ color: 'var(--text2)' }}>(link aktif & terlihat di halaman)</span>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={schedulerEnabled} onChange={e => {
                  setSchedulerEnabled(e.target.checked);
                  if (e.target.checked) setVisible(true);
                }}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '0.875rem' }}>
                <strong>Aktifkan Jadwal Tampil</strong> <span style={{ color: 'var(--text2)' }}>(otomatis show/hide berdasarkan waktu)</span>
              </span>
            </label>
            {schedulerEnabled && (
              <div style={{ paddingLeft: '1.6rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ ...fl, marginBottom: '0.25rem' }}>Mulai Tampil</label>
                  <input type="datetime-local" className="field" value={schedulerStart} onChange={e => setSchedulerStart(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ ...fl, marginBottom: '0.25rem' }}>Berhenti Tampil</label>
                  <input type="datetime-local" className="field" value={schedulerEnd} onChange={e => setSchedulerEnd(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={fl}>Password Link</label>
            {isEdit && link?.has_password && !clearPassword && (
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔒 Password sudah diset</span>
                <button type="button" onClick={() => setClearPassword(true)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus Password</button>
              </div>
            )}
            {isEdit && clearPassword && (
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password akan dihapus</span>
                <button type="button" onClick={() => setClearPassword(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem' }}>Batal</button>
              </div>
            )}
            <input
              type="password" className="field"
              placeholder={isEdit ? 'Isi untuk ganti password (kosongkan = tidak berubah)' : 'Kosongkan jika tanpa password'}
              value={password} onChange={e => setPassword(e.target.value)} disabled={clearPassword}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text2)' }}>
              Jika diisi, pengunjung harus memasukkan password sebelum membuka link
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : (isEdit ? '💾 Simpan Perubahan' : '✅ Tambah Link')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper: deteksi apakah warna terang (untuk kontras teks)
function isLightColor(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  } catch { return false; }
}
