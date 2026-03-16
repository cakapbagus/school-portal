'use client';
import { useState, useEffect, useCallback, use, useRef } from 'react';
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
  const [search, setSearch] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddSeparator, setShowAddSeparator] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkData|null>(null);
  const [editingSeparator, setEditingSeparator] = useState<{id:number;label:string;visible:boolean}|null>(null);
  const [deletingLink, setDeletingLink] = useState<{id:number;label:string}|null>(null);
  const [passwordLink, setPasswordLink] = useState<LinkItem|null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tc, setTc] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      if (found?.has_password && !ad.isAdmin) {
        const unlocked = sessionStorage.getItem(`folder_unlocked_${id}`);
        if (!unlocked) setLocked(true);
      }
    } catch { showToast('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  }, [id]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
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
        body: JSON.stringify({ id: deletingLink.id }) });
      showToast('Link dihapus', 'success'); setDeletingLink(null); fetchData();
    } catch { showToast('Gagal menghapus', 'error'); }
  }

  function handleEditItem(link: LinkItem) {
    if (link.type === 'separator') {
      setEditingSeparator({ id: link.id, label: link.label, visible: !!link.visible });
    } else {
      setEditingLink({ id: link.id, label: link.label, url: link.url, image_url: link.image_url,
        effect: link.effect, bg_color: link.bg_color, visible: !!link.visible,
        scheduler_enabled: !!link.scheduler_enabled, scheduler_start: link.scheduler_start,
        scheduler_end: link.scheduler_end, has_password: !!link.has_password,
      });
    }
  }

  // Search filter
  const searchLower = search.toLowerCase().trim();
  const isSearching = searchLower.length > 0;

  const displayLinks = isAdmin ? links : links.filter(l => {
    if (!l.visible) return false;
    if (l.type === 'separator') return !isSearching;
    if (l.scheduler_enabled) {
      const now = new Date();
      if (l.scheduler_start && now < new Date(l.scheduler_start)) return false;
      if (l.scheduler_end && now > new Date(l.scheduler_end)) return false;
    }
    return true;
  });

  const filteredLinks = isSearching
    ? (isAdmin ? links : displayLinks).filter(l => {
        if (l.type === 'separator') return false;
        const label = l.label.replace(/<[^>]+>/g,'').toLowerCase();
        return label.includes(searchLower) || (l.url||'').toLowerCase().includes(searchLower);
      })
    : null;

  // Locked gate
  if (locked && folder) {
    return (
      <div className="portal-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderPasswordModal folderId={folder.id} folderName={folder.name} folderIcon={folder.icon}
          onClose={() => window.location.href = '/'} onSuccess={() => setLocked(false)}/>
      </div>
    );
  }

  const dropdownItems = [
    { icon:'🔗', label:'Link / URL', desc:'Tambah tautan', onClick:()=>{setShowDropdown(false);setShowAddLink(true);} },
    { icon:'➖', label:'Separator', desc:'Garis pemisah', onClick:()=>{setShowDropdown(false);setShowAddSeparator(true);}, divider:true },
  ];

  return (
    <div className="portal-bg" style={{ minHeight: '100vh' }}>
      {/* Content */}
      <div style={{ maxWidth:480, margin:'0 auto', padding:'4rem 1rem 3rem' }}>       
        {/* Top bar — back*/}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 1.25rem', pointerEvents:'none', marginBottom:'1rem' }}>
          <a href="/" style={{
            pointerEvents:'all', display:'flex', alignItems:'center', gap:'0.4rem',
            background:'var(--card)', backdropFilter:'blur(8px)',
            border:'1px solid var(--border)', borderRadius:8,
            color:'var(--text2)', padding:'0.35rem 0.75rem', fontSize:'0.8rem',
            textDecoration:'none', fontFamily:'Plus Jakarta Sans, sans-serif', transition:'all 0.2s',
          }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='var(--text)';(e.currentTarget as HTMLElement).style.borderColor='var(--accent)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='var(--text2)';(e.currentTarget as HTMLElement).style.borderColor='var(--border)';}}>
            ← Kembali
          </a>
        </div>

        {/* Folder header */}
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{
            width:72, height:72, borderRadius:'50%', fontSize:'2rem',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 0.875rem',
            background:'var(--card)', border:'2px solid var(--border)',
            boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
          }}>
            {folder?.icon || '📁'}
          </div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'1.25rem', fontWeight:700, margin:'0 0 0.3rem', color:'var(--text)' }}>
            {folder?.name || 'Folder'}
          </h1>
          {folder?.description && <p style={{ margin:0, color:'var(--text2)', fontSize:'0.825rem' }}>{folder.description}</p>}

          {isAdmin && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.6rem', marginTop:'0.75rem' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', background:'rgba(108,99,255,0.15)', border:'1px solid rgba(108,99,255,0.3)', borderRadius:999, padding:'0.3rem 0.8rem', fontSize:'0.75rem', color:'var(--accent2)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', display:'inline-block' }}/>
                Mode Admin — Seret ⠿ untuk atur posisi
              </div>
              {/* Dropdown tambah item — di tengah seperti halaman root */}
              <div ref={dropdownRef} style={{ position:'relative' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDropdown(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.45rem 1rem', fontSize:'0.82rem' }}>
                  ➕ Tambah Item
                  <span style={{ fontSize:'0.55rem', display:'inline-block', transition:'transform 0.2s', transform:showDropdown?'rotate(180deg)':'none' }}>▼</span>
                </button>
                {showDropdown && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                    background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
                    minWidth:230, boxShadow:'0 12px 32px rgba(0,0,0,0.5)',
                    overflow:'hidden', animation:'dropdownIn 0.15s ease', zIndex:100,
                  }}>
                    {dropdownItems.map((item, i) => (
                      <div key={i}>
                        {item.divider && <div style={{ height:1, background:'var(--border)' }}/>}
                        <button onClick={item.onClick} style={{ width:'100%', background:'none', border:'none', padding:'0.75rem 1rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.75rem', fontFamily:'Plus Jakarta Sans,sans-serif', transition:'background 0.15s', textAlign:'left' }}
                          onMouseEnter={e=>(e.currentTarget.style.background='var(--bg3)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                          <span style={{ width:34, height:34, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{item.icon}</span>
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

        {/* Search bar */}
        <div style={{ position:'relative', marginBottom:'1rem' }}>
          <span style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', color:'var(--text2)', fontSize:'0.9rem', pointerEvents:'none' }}>🔍</span>
          <input
            className="field"
            type="text"
            placeholder="Cari link di folder ini..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:'2.25rem', borderRadius:999, fontSize:'0.875rem' }}
          />
          {search && (
            <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:'0.9rem', padding:0, lineHeight:1 }}>✕</button>
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
            {/* Search results */}
            {isSearching ? (
              filteredLinks && filteredLinks.length > 0 ? (
                <>
                  <div style={{ fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', color:'var(--text2)', textTransform:'uppercase', padding:'0 0.25rem' }}>
                    🔍 {filteredLinks.length} hasil
                  </div>
                  {filteredLinks.map(link => (
                    <SortableLinkCard key={link.id} link={link} isAdmin={isAdmin}
                      onEdit={handleEditItem} onDelete={(id,label)=>setDeletingLink({id,label})} onPasswordPrompt={setPasswordLink}/>
                  ))}
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'2rem 1rem', color:'var(--text2)' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🔍</div>
                  <p style={{ margin:0, fontSize:'0.875rem' }}>Tidak ada hasil untuk &ldquo;{search}&rdquo;</p>
                </div>
              )
            ) : (
              <>
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
                    <p style={{ margin:'0 0 1rem' }}>Gunakan <strong>✚ Tambah Item</strong> di atas!</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:'3rem', paddingTop:'1.5rem', borderTop:'1px solid var(--border)' }}>
          <a
            href="https://github.com/cakapbagus/school-portal"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: 'var(--text2)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
          >
            School Portal • 2026 &copy; cakapbagus
          </a>
        </div>
      </div>

      {/* Modals */}
      {showAddLink && <LinkFormModal folderId={parseInt(id)} onClose={()=>setShowAddLink(false)} onSave={()=>{setShowAddLink(false);fetchData();}} onToast={showToast}/>}
      {showAddSeparator && <SeparatorFormModal folderId={parseInt(id)} onClose={()=>setShowAddSeparator(false)} onSave={()=>{setShowAddSeparator(false);fetchData();}} onToast={showToast}/>}
      {editingLink && <LinkFormModal link={editingLink} onClose={()=>setEditingLink(null)} onSave={()=>{setEditingLink(null);fetchData();}} onToast={showToast}/>}
      {editingSeparator && <SeparatorFormModal separator={editingSeparator} onClose={()=>setEditingSeparator(null)} onSave={()=>{setEditingSeparator(null);fetchData();}} onToast={showToast}/>}

      {deletingLink && (
        <div className="modal-overlay" onClick={()=>setDeletingLink(null)}>
          <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>🗑️</div>
              <h3 style={{margin:'0 0 0.5rem',fontFamily:'Fraunces,serif'}}>Hapus Link?</h3>
              <p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--text2)'}}>
                Tindakan ini tidak bisa dibatalkan.
              </p>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeletingLink(null)}>Batal</button>
                <button className="btn btn-danger" style={{flex:1}} onClick={handleDeleteConfirm}>Ya, Hapus</button>
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
