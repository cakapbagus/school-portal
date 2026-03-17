'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import Toast from '@/components/Toast';
import LoginModal from '@/components/LoginModal';
import LinkFormModal, { LinkData } from '@/components/LinkFormModal';
import SeparatorFormModal from '@/components/SeparatorFormModal';
import FolderFormModal, { FolderData } from '@/components/FolderFormModal';
import FolderPasswordModal from '@/components/FolderPasswordModal';
import FolderPickerModal from '@/components/FolderPickerModal';
import SettingsModal from '@/components/SettingsModal';
import { SortableLinkCard, LinkItem } from '@/components/LinkCard';
import { SortableFolderCard, FolderItem } from '@/components/FolderCard';
import PasswordModal from '@/components/PasswordModal';
import ThemeSelector from '@/components/ThemeSelector';
import ServerClock from '@/components/ServerClock';

interface SiteSettings { site_title: string; site_subtitle: string; site_logo: string; site_banner: string; }
interface ToastItem { id: number; msg: string; type: 'success'|'error'|'info'; }

type PageItem =
  | { kind: 'link';   id: string; position: number; data: LinkItem }
  | { kind: 'folder'; id: string; position: number; data: FolderItem };

export default function Home() {
  const [items, setItems] = useState<PageItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ site_title:'Portal Sekolah', site_subtitle:'Link & Informasi Sekolah', site_logo:'', site_banner:'' });
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddSeparator, setShowAddSeparator] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkData|null>(null);
  const [editingSeparator, setEditingSeparator] = useState<{id:number;label:string;visible:boolean}|null>(null);
  const [editingFolder, setEditingFolder] = useState<FolderData|null>(null);
  const [deletingItem, setDeletingItem] = useState<{id:number;label:string;kind:'link'|'folder'}|null>(null);
  const [passwordLink, setPasswordLink] = useState<LinkItem|null>(null);
  const [passwordFolder, setPasswordFolder] = useState<FolderItem|null>(null);
  const [folderPickLink, setFolderPickLink] = useState<LinkItem|null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tc, setTc] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function showToast(msg:string, type:'success'|'error'|'info'='info') {
    const id = tc+1; setTc(id); setToasts(p=>[...p,{id,msg,type}]);
  }

  // Buat unified sorted list dari links + folders
  function buildItems(ls: LinkItem[], fs: FolderItem[]): PageItem[] {
    const combined: PageItem[] = [
      ...fs.map(f => ({ kind: 'folder' as const, id: `folder-${f.id}`, position: f.position, data: f })),
      ...ls.map(l => ({ kind: 'link'   as const, id: `link-${l.id}`,   position: l.position, data: l })),
    ];
    combined.sort((a, b) => a.position - b.position);
    return combined;
  }

  const fetchData = useCallback(async () => {
    try {
      const [lr, ar] = await Promise.all([
        fetch('/api/links?folder_id=root'),
        fetch('/api/auth/check'),
      ]);
      const ld = await lr.json(); const ad = await ar.json();
      const ls: LinkItem[] = ld.links || [];
      const fs: FolderItem[] = ld.folders || [];
      setSettings(ld.settings || {});
      setIsAdmin(ad.isAdmin || false);
      setItems(buildItems(ls, fs));
    } catch { showToast('Gagal memuat data','error'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t % 60 + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function h(e:MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    if (showDropdown) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDropdown]);

  async function handleLogout() {
    await fetch('/api/auth',{method:'DELETE'});
    setIsAdmin(false); showToast('Keluar dari mode admin','info');
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oi = items.findIndex(i => i.id === active.id);
    const ni = items.findIndex(i => i.id === over.id);
    const newItems = arrayMove(items, oi, ni);
    setItems(newItems);

    // Assign posisi baru berdasarkan index di list gabungan
    const linkPositions: {id:number;position:number}[] = [];
    const folderPositions: {id:number;position:number}[] = [];
    newItems.forEach((item, idx) => {
      if (item.kind === 'link')   linkPositions.push({ id: item.data.id, position: idx });
      else                         folderPositions.push({ id: item.data.id, position: idx });
    });

    try {
      await Promise.all([
        linkPositions.length > 0 && fetch('/api/links', {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ positions: linkPositions }),
        }),
        folderPositions.length > 0 && fetch('/api/folders', {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ positions: folderPositions }),
        }),
      ]);
      showToast('Posisi disimpan', 'success');
    } catch { showToast('Gagal simpan posisi','error'); fetchData(); }
  }

  async function handleMoveToFolder(folderId: number | null) {
    if (!folderPickLink) return;
    try {
      await fetch('/api/links', { method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: folderPickLink.id, move_to_folder: folderId }) });
      showToast('Link dipindahkan', 'success');
      setFolderPickLink(null); fetchData();
    } catch { showToast('Gagal memindahkan', 'error'); }
  }

  async function handleCopyToFolder(folderId: number | null) {
    if (!folderPickLink) return;
    try {
      await fetch('/api/links', { method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: folderPickLink.id, copy_to_folder: folderId }) });
      showToast('Link disalin', 'success');
      setFolderPickLink(null); fetchData();
    } catch { showToast('Gagal menyalin', 'error'); }
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    try {
      if (deletingItem.kind === 'link') {
        await fetch('/api/links',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deletingItem.id})});
      } else {
        await fetch('/api/folders',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deletingItem.id})});
      }
      showToast('Dihapus','success'); setDeletingItem(null); fetchData();
    } catch { showToast('Gagal','error'); }
  }

  function handleEditItem(link:LinkItem) {
    if (link.type==='separator') {
      setEditingSeparator({id:link.id,label:link.label,visible:!!link.visible});
    } else {
      setEditingLink({id:link.id,label:link.label,url:link.url,image_url:link.image_url,
        effect:link.effect,bg_color:link.bg_color,visible:!!link.visible,
        scheduler_enabled:!!link.scheduler_enabled,scheduler_start:link.scheduler_start,
        scheduler_end:link.scheduler_end,has_password:!!link.has_password});
    }
  }

  function handleEditFolder(folder:FolderItem) {
    setEditingFolder({id:folder.id,name:folder.name,description:folder.description,icon:folder.icon,visible:!!folder.visible,has_password:folder.has_password});
  }

  // Scheduler check
  function isLinkScheduleOk(l: LinkItem): boolean {
    if (!l.scheduler_enabled) return true;
    const now = new Date();
    if (l.scheduler_start && now < new Date(l.scheduler_start)) return false;
    if (l.scheduler_end   && now > new Date(l.scheduler_end))   return false;
    return true;
  }

  // Search
  const searchLower = search.toLowerCase().trim();
  const isSearching = searchLower.length > 0;

  const searchResults: PageItem[] = isSearching
    ? items.filter(item => {
        if (item.kind === 'folder') {
          return item.data.name.toLowerCase().includes(searchLower);
        }
        if (item.data.type === 'separator') return false;
        const label = item.data.label.replace(/<[^>]+>/g,'').toLowerCase();
        return label.includes(searchLower) || (item.data.url||'').toLowerCase().includes(searchLower);
      })
    : [];

  // Non-admin visible items (no search)
  const visibleItems: PageItem[] = items.filter(item => {
    if (item.kind === 'folder') return !!item.data.visible;
    const l = item.data;
    if (!l.visible) return false;
    if (l.type === 'separator') return true;
    return isLinkScheduleOk(l);
  });

  const displayItems = isSearching ? [] : (isAdmin ? items : visibleItems);
  const itemIds = items.map(i => i.id);

  return (
    <div className="portal-bg" style={{minHeight:'100vh'}}>
      {/* Top bar */}
      <div style={{position:'fixed',top:0,right:0,left:0,display:'flex',justifyContent:'flex-end',padding:'0.75rem 1.5rem',zIndex:40,pointerEvents:'none'}}>
        <div style={{display:'flex',gap:'0.5rem',pointerEvents:'all',alignItems:'center'}}>
          {isAdmin ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowSettings(true)}>⚙️ Setting</button>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <button onClick={()=>setShowLogin(true)} style={{
              background:'var(--card)', backdropFilter:'blur(8px)',
              border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)',
              padding:'0.35rem 0.7rem', fontSize:'0.75rem', cursor:'pointer',
              display:'flex', alignItems:'center', gap:'0.3rem',
              fontFamily:'Plus Jakarta Sans,sans-serif', transition:'all 0.2s',
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)';(e.currentTarget as HTMLElement).style.color='var(--text)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.color='var(--text2)';}}>
              ⚙ Admin
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:480,margin:'0 auto',padding:'4rem 1rem 3rem'}}>
        {/* Banner */}
        {settings.site_banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.site_banner} alt="Banner"
            style={{width:'100%',borderRadius:16,objectFit:'cover',maxHeight:200,display:'block',marginBottom:'1.5rem',border:'1px solid var(--border)'}}
          />
        )}

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'1.75rem'}}>
          {settings.site_logo
            // eslint-disable-next-line @next/next/no-img-element
            ?<img src={settings.site_logo} alt="Logo" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',margin:'0 auto 0.875rem',display:'block',border:'2px solid var(--border)',background:'var(--card)'}}/>
            :<div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent) 0%,var(--accent3) 100%)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 0.875rem',fontSize:'2rem',boxShadow:'0 4px 16px rgba(108,99,255,0.3)'}}>🏫</div>
          }
          <h1 style={{fontFamily:'Fraunces,serif',fontSize:'1.25rem',fontWeight:700,margin:'0 0 0.3rem',color:'var(--text)'}}>
            {settings.site_title||'Portal Sekolah'}
          </h1>
          <p style={{margin:0,color:'var(--text2)',fontSize:'0.825rem'}}>{settings.site_subtitle||'Link & Informasi Sekolah'}</p>
          {isAdmin&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.6rem',marginTop:'0.75rem'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',background:'rgba(108,99,255,0.15)',border:'1px solid rgba(108,99,255,0.3)',borderRadius:999,padding:'0.3rem 0.8rem',fontSize:'0.75rem',color:'var(--accent2)'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'var(--success)',display:'inline-block'}}/>
                Admin Mode — Drag and drop ⠿ for reordering
              </div>
              {/* Dropdown Tambah Item */}
              <div ref={dropdownRef} style={{position:'relative'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowDropdown(v=>!v)} style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.45rem 1rem',fontSize:'0.82rem'}}>
                  ✚ Add Item
                  <span style={{fontSize:'0.55rem',display:'inline-block',transition:'transform 0.2s',transform:showDropdown?'rotate(180deg)':'none'}}>▼</span>
                </button>
                {showDropdown && (
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,minWidth:230,boxShadow:'0 12px 32px rgba(0,0,0,0.5)',overflow:'hidden',animation:'dropdownIn 0.15s ease',zIndex:100}}>
                    {[
                      {icon:'🔗',label:'Link / URL',desc:'Add link',onClick:()=>{setShowDropdown(false);setShowAddLink(true);}},
                      {icon:'📁',label:'Folder',desc:'Group links in a folder',onClick:()=>{setShowDropdown(false);setShowAddFolder(true);}},
                      {icon:'➖',label:'Separator',desc:'Breakline',onClick:()=>{setShowDropdown(false);setShowAddSeparator(true);},divider:true},
                    ].map((item,i)=>(
                      <div key={i}>
                        {item.divider&&<div style={{height:1,background:'var(--border)'}}/>}
                        <button onClick={item.onClick} style={{width:'100%',background:'none',border:'none',padding:'0.75rem 1rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'0.75rem',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'background 0.15s',textAlign:'left'}}
                          onMouseEnter={e=>(e.currentTarget.style.background='var(--bg3)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                          <span style={{width:34,height:34,borderRadius:8,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>{item.icon}</span>
                          <div>
                            <div style={{fontSize:'0.875rem',fontWeight:600,color:'var(--text)'}}>{item.label}</div>
                            <div style={{fontSize:'0.72rem',color:'var(--text2)',marginTop:1}}>{item.desc}</div>
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
        <div style={{position:'relative',marginBottom:'1rem'}}>
          <span style={{position:'absolute',left:'0.875rem',top:'50%',transform:'translateY(-50%)',color:'var(--text2)',fontSize:'0.9rem',pointerEvents:'none'}}>🔍</span>
          <input className="field" type="text" placeholder="Search links or folders..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{paddingLeft:'2.25rem',borderRadius:999,fontSize:'0.875rem'}}
          />
          {search&&(
            <button onClick={()=>setSearch('')} style={{position:'absolute',right:'0.75rem',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:'0.9rem',padding:0,lineHeight:1}}>✕</button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--text2)'}}>
            <div style={{fontSize:'1.5rem',marginBottom:'0.5rem',animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</div>
            <p style={{margin:0}}>Loading...</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>

            {/* Search results */}
            {isSearching && (
              searchResults.length > 0 ? (
                <>
                  <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em',color:'var(--text2)',textTransform:'uppercase',padding:'0 0.25rem'}}>
                    🔍 {searchResults.length} hasil
                  </div>
                  {searchResults.map(item =>
                    item.kind === 'folder' ? (
                      <SortableFolderCard key={item.id} folder={item.data} isAdmin={isAdmin}
                        onEdit={handleEditFolder} onDelete={(id,name)=>setDeletingItem({id,label:name,kind:'folder'})} onPasswordPrompt={setPasswordFolder}/>
                    ) : (
                      <SortableLinkCard key={item.id} link={item.data} isAdmin={isAdmin} tick={tick}
                        onEdit={handleEditItem} onDelete={(id,label)=>setDeletingItem({id,label,kind:'link'})} onPasswordPrompt={setPasswordLink}/>
                    )
                  )}
                </>
              ) : (
                <div style={{textAlign:'center',padding:'2rem 1rem',color:'var(--text2)'}}>
                  <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🔍</div>
                  <p style={{margin:0,fontSize:'0.875rem'}}>Tidak ada hasil untuk &ldquo;{search}&rdquo;</p>
                </div>
              )
            )}

            {/* Normal mode */}
            {!isSearching && (
              <>
                {isAdmin ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      {items.map(item =>
                        item.kind === 'folder' ? (
                          <SortableFolderCard key={item.id} folder={item.data} isAdmin={true}
                            onEdit={handleEditFolder} onDelete={(id,name)=>setDeletingItem({id,label:name,kind:'folder'})} onPasswordPrompt={setPasswordFolder}/>
                        ) : (
                          <SortableLinkCard key={item.id} link={item.data} isAdmin={true} tick={tick}
                            onEdit={handleEditItem} onDelete={(id,label)=>setDeletingItem({id,label,kind:'link'})} onPasswordPrompt={setPasswordLink} onFolderPick={setFolderPickLink}/>
                        )
                      )}
                    </SortableContext>
                  </DndContext>
                ) : (
                  displayItems.map(item =>
                    item.kind === 'folder' ? (
                      <SortableFolderCard key={item.id} folder={item.data} isAdmin={false}
                        onEdit={handleEditFolder} onDelete={(id,name)=>setDeletingItem({id,label:name,kind:'folder'})} onPasswordPrompt={setPasswordFolder}/>
                    ) : (
                      <SortableLinkCard key={item.id} link={item.data} isAdmin={false} tick={tick}
                        onEdit={handleEditItem} onDelete={(id,label)=>setDeletingItem({id,label,kind:'link'})} onPasswordPrompt={setPasswordLink}/>
                    )
                  )
                )}

                {!loading && displayItems.length === 0 && !isAdmin && (
                  <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--text2)'}}>
                    <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>📭</div>
                    <p style={{margin:0}}>No content available yet</p>
                  </div>
                )}
                {!loading && items.length === 0 && isAdmin && (
                  <div style={{textAlign:'center',padding:'3rem 1rem',border:'2px dashed var(--border)',borderRadius:14,color:'var(--text2)'}}>
                    <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>🔗</div>
                    <p style={{margin:'0 0 1rem'}}>Use the <strong>✚ Add Item</strong> dropdown to get started!</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{textAlign:'center',marginTop:'3rem',paddingTop:'1.5rem',borderTop:'1px solid var(--border)'}}>
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
      {showLogin&&<LoginModal onClose={()=>setShowLogin(false)} onSuccess={()=>{setShowLogin(false);setIsAdmin(true);fetchData();showToast('Selamat datang, Admin!','success');}}/>}
      {showSettings&&<SettingsModal settings={settings} onClose={()=>setShowSettings(false)} onSave={s=>setSettings(s)} onToast={showToast}/>}
      {showAddLink&&<LinkFormModal onClose={()=>setShowAddLink(false)} onSave={()=>{setShowAddLink(false);fetchData();}} onToast={showToast}/>}
      {showAddSeparator&&<SeparatorFormModal onClose={()=>setShowAddSeparator(false)} onSave={()=>{setShowAddSeparator(false);fetchData();}} onToast={showToast}/>}
      {showAddFolder&&<FolderFormModal onClose={()=>setShowAddFolder(false)} onSave={()=>{setShowAddFolder(false);fetchData();}} onToast={showToast}/>}
      {editingLink&&<LinkFormModal link={editingLink} onClose={()=>setEditingLink(null)} onSave={()=>{setEditingLink(null);fetchData();}} onToast={showToast}/>}
      {editingSeparator&&<SeparatorFormModal separator={editingSeparator} onClose={()=>setEditingSeparator(null)} onSave={()=>{setEditingSeparator(null);fetchData();}} onToast={showToast}/>}
      {editingFolder&&<FolderFormModal folder={editingFolder} onClose={()=>setEditingFolder(null)} onSave={()=>{setEditingFolder(null);fetchData();}} onToast={showToast}/>}

      {deletingItem&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>{deletingItem.kind==='folder'?'📁':'🗑️'}</div>
              <h3 style={{margin:'0 0 0.5rem',fontFamily:'Fraunces,serif'}}>Hapus {deletingItem.kind==='folder'?'Folder':'Item'}?</h3>
              {deletingItem.kind==='folder'&&<p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--warning)',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:8,padding:'0.5rem'}}>⚠️ Semua link di dalam folder ini juga akan dihapus permanen.</p>}
              {deletingItem.kind==='link'&&<p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--text2)'}}>Tindakan ini tidak bisa dibatalkan.</p>}
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeletingItem(null)}>Cancel</button>
                <button className="btn btn-danger" style={{flex:1}} onClick={handleDeleteConfirm}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordLink&&<PasswordModal linkId={passwordLink.id} linkLabel={passwordLink.label.replace(/<[^>]+>/g,'')} onClose={()=>setPasswordLink(null)} onSuccess={url=>{setPasswordLink(null);window.open(url,'_blank','noopener,noreferrer');}}/>}
      {passwordFolder&&<FolderPasswordModal folderId={passwordFolder.id} folderName={passwordFolder.name} folderIcon={passwordFolder.icon} onClose={()=>setPasswordFolder(null)} onSuccess={()=>{setPasswordFolder(null);window.location.href=`/folder/${passwordFolder.id}`;}}/>}
      {toasts.map(t=><Toast key={t.id} message={t.msg} type={t.type} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>)}
      {folderPickLink && (
        <FolderPickerModal
          linkLabel={folderPickLink.label}
          currentFolderId={folderPickLink.folder_id ?? null}
          onClose={() => setFolderPickLink(null)}
          onMove={handleMoveToFolder}
          onCopy={handleCopyToFolder}
        />
      )}
      <ServerClock/>
      <ThemeSelector/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes dropdownIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
