'use client';
import { useState, useEffect, useCallback, use } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { SortableLinkCard, LinkItem } from '@/components/LinkCard';
import LinkFormModal, { LinkData } from '@/components/LinkFormModal';
import SeparatorFormModal from '@/components/SeparatorFormModal';
import PasswordModal from '@/components/PasswordModal';
import Toast from '@/components/Toast';
import FolderPasswordModal from '@/components/FolderPasswordModal';
import ThemeSelector from '@/components/ThemeSelector';
import ServerClock from '@/components/ServerClock';

interface FolderInfo { id: number; name: string; description?: string; icon: string; visible: number; has_password?: number; }
interface ToastItem { id: number; msg: string; type: 'success'|'error'|'info'; }

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [folder, setFolder] = useState<FolderInfo|null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddSeparator, setShowAddSeparator] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkData|null>(null);
  const [editingSeparator, setEditingSeparator] = useState<{id:number;label:string;visible:boolean}|null>(null);
  const [deletingLink, setDeletingLink] = useState<{id:number;label:string}|null>(null);
  const [passwordLink, setPasswordLink] = useState<LinkItem|null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tc, setTc] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function showToast(msg: string, type: 'success'|'error'|'info' = 'info') {
    const tid = tc+1; setTc(tid);
    setToasts(p => [...p, { id: tid, msg, type }]);
  }

  const fetchData = useCallback(async () => {
    try {
      const [lr, ar, fr] = await Promise.all([
        fetch(`/api/links?folder_id=${id}`),
        fetch('/api/auth/check'),
        fetch('/api/folders'),
      ]);
      const ld = await lr.json();
      const ad = await ar.json();
      const fd = await fr.json();
      setLinks(ld.links || []);
      setIsAdmin(ad.isAdmin || false);
      const found = (fd.folders || []).find((f: FolderInfo) => f.id === parseInt(id));
      setFolder(found || null);
      // Check if folder is password-protected and not yet unlocked
      if (found?.has_password && !ad.isAdmin) {
        const unlocked = sessionStorage.getItem(`folder_unlocked_${id}`);
        if (!unlocked) setLocked(true);
      }

    } catch { showToast('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  }, [id]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      const el = document.getElementById('folder-dropdown');
      if (el && !el.contains(e.target as Node)) setShowDropdown(false);
    }
    if (showDropdown) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDropdown]);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = links.findIndex(l => l.id === active.id);
    const ni = links.findIndex(l => l.id === over.id);
    const nl = arrayMove(links, oi, ni); setLinks(nl);
    try {
      await fetch('/api/links', { method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ positions: nl.map((l,i) => ({ id: l.id, position: i })) }) });
      showToast('Posisi disimpan', 'success');
    } catch { showToast('Gagal simpan posisi', 'error'); fetchData(); }
  }

  async function handleDeleteConfirm() {
    if (!deletingLink) return;
    try {
      await fetch('/api/links', { method: 'DELETE', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: deletingLink.id, context: `folder:${id}` }) });
      showToast('Link dilepas dari folder', 'success'); setDeletingLink(null); fetchData();
    } catch { showToast('Gagal menghapus', 'error'); }
  }

  function handleEditItem(link: LinkItem) {
    if (link.type === 'separator') {
      setEditingSeparator({ id: link.id, label: link.label, visible: !!link.visible });
    } else {
      setEditingLink({ id: link.id, label: link.label, url: link.url, image_url: link.image_url,
        effect: link.effect, bg_color: link.bg_color, visible: !!link.visible, show_root: link.show_root !== 0,
        scheduler_enabled: !!link.scheduler_enabled, scheduler_start: link.scheduler_start,
        scheduler_end: link.scheduler_end, has_password: !!link.has_password,
      });
    }
  }

  const displayLinks = isAdmin ? links : links.filter(l => {
    if (!l.visible) return false;
    if (l.type === 'separator') return true;
    if (l.scheduler_enabled) {
      const now = new Date();
      if (l.scheduler_start && now < new Date(l.scheduler_start)) return false;
      if (l.scheduler_end && now > new Date(l.scheduler_end)) return false;
    }
    return true;
  });

  // Locked gate — show password modal fullscreen
  if (locked && folder) {
    return (
      <div className="portal-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderPasswordModal
          folderId={folder.id}
          folderName={folder.name}
          folderIcon={folder.icon}
          onClose={() => window.location.href = '/'}
          onSuccess={() => setLocked(false)}
        />
      </div>
    );
  }

  return (
    <div className="portal-bg" style={{ minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', zIndex: 40, pointerEvents: 'none' }}>
        {/* Back button */}
        <a href="/" style={{
          pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(26,29,46,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--border)', borderRadius: 8,
          color: 'var(--text)', padding: '0.35rem 0.75rem', fontSize: '0.8rem',
          textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
          transition: 'all 0.2s',
        }}>← Kembali</a>

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'all' }}>
            <div id="folder-dropdown" style={{ position: 'relative' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowDropdown(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                ➕ Tambah Item
                <span style={{ fontSize: '0.6rem', display: 'inline-block', transition: 'transform 0.2s', transform: showDropdown ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>
              {showDropdown && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
                  minWidth: 220, boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  overflow: 'hidden', animation: 'dropdownIn 0.15s ease', zIndex: 100,
                }}>
                  {[
                    { icon:'🔗', label:'Link / URL', desc:'Tambah tautan', onClick:()=>{setShowDropdown(false);setShowAddLink(true);} },
                    { icon:'➖', label:'Separator', desc:'Garis pemisah', onClick:()=>{setShowDropdown(false);setShowAddSeparator(true);}, divider:true },
                  ].map((item,i) => (
                    <div key={i}>
                      {item.divider && <div style={{ height:1, background:'var(--border)' }} />}
                      <button onClick={item.onClick} style={{ width:'100%', background:'none', border:'none', padding:'0.75rem 1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', fontFamily:'Plus Jakarta Sans,sans-serif', transition:'background 0.15s', textAlign:'left' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--bg3)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <span style={{ width:34, height:34, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text)' }}>{item.label}</div>
                          <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginTop:1 }}>{item.desc}</div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '4.5rem 1.5rem 3rem' }}>
        {/* Folder header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16, fontSize: '2.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            background: 'var(--card)', border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            {folder?.icon || '📁'}
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(1.4rem,4vw,1.8rem)', fontWeight: 700, margin: '0 0 0.35rem', background: 'linear-gradient(135deg,var(--text) 0%,var(--accent2) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {folder?.name || 'Folder'}
          </h1>
          {folder?.description && <p style={{ margin: 0, color: 'var(--text2)', fontSize: '0.875rem' }}>{folder.description}</p>}
          {isAdmin && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 999, padding: '0.3rem 0.8rem', fontSize: '0.75rem', color: 'var(--accent2)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', display:'inline-block' }}/>
              Mode Admin — Seret ⠿ untuk atur posisi
            </div>
          )}
        </div>

        {/* Links */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text2)' }}>
            <div style={{ fontSize:'1.5rem', marginBottom:'0.5rem', animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</div>
            <p style={{ margin:0 }}>Memuat...</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {isAdmin ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={links.map(l=>l.id)} strategy={verticalListSortingStrategy}>
                  {links.map(link => (
                    <SortableLinkCard key={link.id} link={link} isAdmin={true}
                      onEdit={handleEditItem} onDelete={(id,label)=>setDeletingLink({id,label})} onPasswordPrompt={setPasswordLink}/>
                  ))}
                </SortableContext>
              </DndContext>
            ) : displayLinks.map(link => (
              <SortableLinkCard key={link.id} link={link} isAdmin={false}
                onEdit={handleEditItem} onDelete={(id,label)=>setDeletingLink({id,label})} onPasswordPrompt={setPasswordLink}/>
            ))}

            {displayLinks.length === 0 && !isAdmin && (
              <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--text2)' }}>
                <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>📭</div>
                <p style={{ margin:0 }}>Belum ada link di folder ini</p>
              </div>
            )}
            {links.length === 0 && isAdmin && (
              <div style={{ textAlign:'center', padding:'3rem 1rem', border:'2px dashed var(--border)', borderRadius:14, color:'var(--text2)' }}>
                <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🔗</div>
                <p style={{ margin:'0 0 1rem' }}>Folder kosong. Tambahkan link pertama!</p>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:'3rem', paddingTop:'1.5rem', borderTop:'1px solid var(--border)' }}>
          <p style={{ margin:0, fontSize:'0.75rem', color:'var(--border)' }}>Portal Sekolah • Powered by Next.js</p>
        </div>
      </div>

      {/* Modals */}
      {showAddLink && <LinkFormModal defaultShowRoot={false} onClose={()=>setShowAddLink(false)} onSave={()=>{setShowAddLink(false);fetchData();}} onToast={showToast}/>}
      {showAddSeparator && <SeparatorFormModal onClose={()=>setShowAddSeparator(false)} onSave={()=>{setShowAddSeparator(false);fetchData();}} onToast={showToast}/>}
      {editingLink && <LinkFormModal link={editingLink} onClose={()=>setEditingLink(null)} onSave={()=>{setEditingLink(null);fetchData();}} onToast={showToast}/>}
      {editingSeparator && <SeparatorFormModal separator={editingSeparator} onClose={()=>setEditingSeparator(null)} onSave={()=>{setEditingSeparator(null);fetchData();}} onToast={showToast}/>}

      {deletingLink && (
        <div className="modal-overlay" onClick={()=>setDeletingLink(null)}>
          <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>📤</div>
              <h3 style={{margin:'0 0 0.5rem',fontFamily:'Fraunces,serif'}}>Lepas dari Folder?</h3>
              <p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--accent2)',background:'rgba(108,99,255,0.1)',border:'1px solid rgba(108,99,255,0.25)',borderRadius:8,padding:'0.5rem'}}>
                ℹ️ Link hanya dilepas dari folder ini. Link tetap ada di halaman utama dan folder lain yang menyertakannya.
              </p>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeletingLink(null)}>Batal</button>
                <button className="btn btn-primary" style={{flex:1}} onClick={handleDeleteConfirm}>Ya, Lepas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordLink && <PasswordModal linkId={passwordLink.id} linkLabel={passwordLink.label.replace(/<[^>]+>/g,'')} onClose={()=>setPasswordLink(null)} onSuccess={url=>{setPasswordLink(null);window.open(url,'_blank','noopener,noreferrer');}}/>}
      {toasts.map(t=><Toast key={t.id} message={t.msg} type={t.type} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>)}
      <ServerClock/>
      <ThemeSelector/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes dropdownIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
