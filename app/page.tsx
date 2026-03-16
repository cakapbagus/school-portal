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
import SettingsModal from '@/components/SettingsModal';
import { SortableLinkCard, LinkItem } from '@/components/LinkCard';
import { SortableFolderCard, FolderItem } from '@/components/FolderCard';
import PasswordModal from '@/components/PasswordModal';
import ThemeSelector from '@/components/ThemeSelector';
import ServerClock from '@/components/ServerClock';

interface SiteSettings { site_title: string; site_subtitle: string; site_logo: string; }
interface ToastItem { id: number; msg: string; type: 'success'|'error'|'info'; }

export default function Home() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ site_title:'Portal Sekolah', site_subtitle:'Link & Informasi Sekolah', site_logo:'' });
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [deletingLinkFolderCount, setDeletingLinkFolderCount] = useState(0);
  const [memberships, setMemberships] = useState<Array<{folder_id:number;link_id:number}>>([]);
  const [passwordLink, setPasswordLink] = useState<LinkItem|null>(null);
  const [passwordFolder, setPasswordFolder] = useState<FolderItem|null>(null);
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

  const fetchData = useCallback(async () => {
    try {
      const [lr, ar] = await Promise.all([
        fetch('/api/links?folder_id=root'),
        fetch('/api/auth/check'),
      ]);
      const ld = await lr.json(); const ad = await ar.json();
      setLinks(ld.links||[]); setSettings(ld.settings||{}); setIsAdmin(ad.isAdmin||false);
      setFolders(ld.folders||[]); setMemberships(ld.memberships||[]);
      // memberships stored for edit use

    } catch { showToast('Gagal memuat data','error'); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

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

  async function handleDragEndLinks(e:DragEndEvent) {
    const {active,over}=e; if(!over||active.id===over.id) return;
    const oi=links.findIndex(l=>l.id===active.id); const ni=links.findIndex(l=>l.id===over.id);
    const nl=arrayMove(links,oi,ni); setLinks(nl);
    try {
      await fetch('/api/links',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({positions:nl.map((l,i)=>({id:l.id,position:i}))})});
      showToast('Posisi disimpan','success');
    } catch { showToast('Gagal','error'); fetchData(); }
  }

  async function handleDragEndFolders(e:DragEndEvent) {
    const {active,over}=e; if(!over||active.id===over.id) return;
    const activeId = String(active.id).replace('folder-','');
    const overId = String(over.id).replace('folder-','');
    const oi=folders.findIndex(f=>f.id===parseInt(activeId));
    const ni=folders.findIndex(f=>f.id===parseInt(overId));
    const nf=arrayMove(folders,oi,ni); setFolders(nf);
    try {
      await fetch('/api/folders',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({positions:nf.map((f,i)=>({id:f.id,position:i}))})});
    } catch { fetchData(); }
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    try {
      if (deletingItem.kind === 'link') {
        const res = await fetch('/api/links',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deletingItem.id,context:'root'})});
        const data = await res.json();
        if (data.action === 'hidden_from_root') {
          showToast('Link disembunyikan dari halaman utama (masih ada di folder)','info');
          setDeletingItem(null);
          fetchData();
          return;
        }
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
        effect:link.effect,bg_color:link.bg_color,visible:!!link.visible,show_root:link.show_root!==0,
        scheduler_enabled:!!link.scheduler_enabled,scheduler_start:link.scheduler_start,
        scheduler_end:link.scheduler_end,has_password:!!link.has_password});
    }
  }

  function handleEditFolder(folder:FolderItem) {
    const link_ids = memberships.filter(m => m.folder_id === folder.id).map(m => m.link_id);
    setEditingFolder({id:folder.id,name:folder.name,description:folder.description,icon:folder.icon,visible:!!folder.visible,link_ids,has_password:folder.has_password});
  }

  const rootLinks = isAdmin ? links : links.filter(l => {
    if (!l.visible) return false;
    if (l.type==='separator') return true;
    if (l.scheduler_enabled) {
      const now=new Date();
      if (l.scheduler_start&&now<new Date(l.scheduler_start)) return false;
      if (l.scheduler_end&&now>new Date(l.scheduler_end)) return false;
    }
    return true;
  });
  const displayFolders = isAdmin ? folders : folders.filter(f=>f.visible);

  // Combined items for admin view (folders on top, then links)
  const folderIds = folders.map(f=>`folder-${f.id}`);
  const linkIds = links.map(l=>l.id);

  return (
    <div className="portal-bg" style={{minHeight:'100vh'}}>
      {/* Top bar */}
      <div style={{position:'fixed',top:0,right:0,left:0,display:'flex',justifyContent:'flex-end',padding:'0.75rem 1.5rem',zIndex:40,pointerEvents:'none'}}>
        <div style={{display:'flex',gap:'0.5rem',pointerEvents:'all',alignItems:'center'}}>
          {isAdmin ? (
            <>
              <button className="btn btn-secondary btn-sm" onClick={()=>setShowSettings(true)}>⚙️ Setelan</button>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>Keluar</button>
            </>
          ) : (
            <button onClick={()=>setShowLogin(true)} style={{
              background:'var(--card)',
              backdropFilter:'blur(8px)',
              border:'1px solid var(--border)',
              borderRadius:8,color:'var(--text2)',
              padding:'0.35rem 0.7rem',fontSize:'0.75rem',cursor:'pointer',
              display:'flex',alignItems:'center',gap:'0.3rem',
              fontFamily:'Plus Jakarta Sans,sans-serif',transition:'all 0.2s',
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--accent)';(e.currentTarget as HTMLElement).style.color='var(--text)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.color='var(--text2)';}}>
              ⚙ Admin
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:620,margin:'0 auto',padding:'4.5rem 1.5rem 3rem'}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
          {settings.site_logo
            // eslint-disable-next-line @next/next/no-img-element
            ?<img src={settings.site_logo} alt="Logo" style={{width:80,height:80,borderRadius:16,objectFit:'contain',margin:'0 auto 1rem',display:'block',border:'1px solid var(--border)',background:'var(--card)',padding:8}}/>
            :<div style={{width:72,height:72,borderRadius:16,background:'linear-gradient(135deg,var(--accent) 0%,var(--accent3) 100%)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem',fontSize:'2rem',boxShadow:'0 8px 24px rgba(108,99,255,0.3)'}}>🏫</div>
          }
          <h1 style={{fontFamily:'Fraunces,serif',fontSize:'clamp(1.5rem,5vw,2rem)',fontWeight:700,margin:'0 0 0.4rem',background:'linear-gradient(135deg,var(--text) 0%,var(--accent2) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
            {settings.site_title||'Portal Sekolah'}
          </h1>
          <p style={{margin:0,color:'var(--text2)',fontSize:'0.9rem'}}>{settings.site_subtitle||'Link & Informasi Sekolah'}</p>
          {isAdmin&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.6rem',marginTop:'0.75rem'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:'0.4rem',background:'rgba(108,99,255,0.15)',border:'1px solid rgba(108,99,255,0.3)',borderRadius:999,padding:'0.3rem 0.8rem',fontSize:'0.75rem',color:'var(--accent2)'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'var(--success)',display:'inline-block'}}/>
                Mode Admin — Seret ⠿ untuk atur posisi
              </div>
              {/* Dropdown Tambah Item */}
              <div ref={dropdownRef} style={{position:'relative'}}>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowDropdown(v=>!v)} style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.45rem 1rem',fontSize:'0.82rem'}}>
                  ➕ Tambah Item
                  <span style={{fontSize:'0.55rem',display:'inline-block',transition:'transform 0.2s',transform:showDropdown?'rotate(180deg)':'none'}}>▼</span>
                </button>
                {showDropdown && (
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,minWidth:230,boxShadow:'0 12px 32px rgba(0,0,0,0.5)',overflow:'hidden',animation:'dropdownIn 0.15s ease',zIndex:100}}>
                    {[
                      {icon:'🔗',label:'Link / URL',desc:'Tambah tautan ke halaman/website',onClick:()=>{setShowDropdown(false);setShowAddLink(true);}},
                      {icon:'📁',label:'Folder',desc:'Kelompokkan link dalam folder',onClick:()=>{setShowDropdown(false);setShowAddFolder(true);}},
                      {icon:'➖',label:'Separator',desc:'Garis pemisah antar link',onClick:()=>{setShowDropdown(false);setShowAddSeparator(true);},divider:true},
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

        {loading ? (
          <div style={{textAlign:'center',padding:'3rem',color:'var(--text2)'}}>
            <div style={{fontSize:'1.5rem',marginBottom:'0.5rem',animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</div>
            <p style={{margin:0}}>Memuat...</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {/* Folders section */}
            {(displayFolders.length>0||(isAdmin&&folders.length>0)) && (
              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                {isAdmin && folders.length > 0 && (
                  <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em',color:'var(--text2)',textTransform:'uppercase',padding:'0 0.25rem'}}>📁 Folder</div>
                )}
                {isAdmin ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndFolders}>
                    <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
                      {folders.map(f=>(
                        <SortableFolderCard key={f.id} folder={f} isAdmin={true}
                          onEdit={handleEditFolder} onDelete={(id,name)=>setDeletingItem({id,label:name,kind:'folder'})} onPasswordPrompt={setPasswordFolder}/>
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : displayFolders.map(f=>(
                  <SortableFolderCard key={f.id} folder={f} isAdmin={false}
                    onEdit={handleEditFolder} onDelete={(id,name)=>setDeletingItem({id,label:name,kind:'folder'})} onPasswordPrompt={setPasswordFolder}/>
                ))}
              </div>
            )}

            {/* Separator between folders and links */}
            {displayFolders.length>0&&rootLinks.length>0&&(
              <div style={{height:1,background:'var(--border)',margin:'0.25rem 0'}}/>
            )}

            {/* Links section */}
            {isAdmin ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLinks}>
                <SortableContext items={linkIds} strategy={verticalListSortingStrategy}>
                  {links.map(link=>(
                    <SortableLinkCard key={link.id} link={link} isAdmin={true}
                      onEdit={handleEditItem} onDelete={(id,label)=>setDeletingItem({id,label,kind:'link'})} onPasswordPrompt={setPasswordLink}/>
                  ))}
                </SortableContext>
              </DndContext>
            ) : rootLinks.map(link=>(
              <SortableLinkCard key={link.id} link={link} isAdmin={false}
                onEdit={handleEditItem} onDelete={(id,label)=>setDeletingItem({id,label,kind:'link'})} onPasswordPrompt={setPasswordLink}/>
            ))}

            {!loading&&rootLinks.length===0&&displayFolders.length===0&&!isAdmin&&(
              <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--text2)'}}>
                <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>📭</div>
                <p style={{margin:0}}>Belum ada konten yang tersedia</p>
              </div>
            )}
            {!loading&&links.length===0&&folders.length===0&&isAdmin&&(
              <div style={{textAlign:'center',padding:'3rem 1rem',border:'2px dashed var(--border)',borderRadius:14,color:'var(--text2)'}}>
                <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>🔗</div>
                <p style={{margin:'0 0 1rem'}}>Gunakan dropdown <strong>Tambah Item</strong> untuk mulai!</p>
              </div>
            )}
          </div>
        )}

        <div style={{textAlign:'center',marginTop:'3rem',paddingTop:'1.5rem',borderTop:'1px solid var(--border)'}}>
          <p style={{margin:0,fontSize:'0.75rem',color:'var(--border)'}}>Portal Sekolah • Powered by Next.js</p>
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
        <div className="modal-overlay" onClick={()=>setDeletingItem(null)}>
          <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>{deletingItem.kind==='folder'?'📁':'🗑️'}</div>
              <h3 style={{margin:'0 0 0.5rem',fontFamily:'Fraunces,serif'}}>Hapus {deletingItem.kind==='folder'?'Folder':'Item'}?</h3>
              {deletingItem.kind==='folder'&&<p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--warning)',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:8,padding:'0.5rem'}}>⚠️ Referensi link di semua folder akan dihapus, namun link di dalam folder tidak akan ikut terhapus</p>}
              {deletingItem.kind==='link'&&deletingLinkFolderCount>0&&(
                <p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--danger)',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:8,padding:'0.5rem'}}>
                  ⛔ Link ini ada di <strong>{deletingLinkFolderCount} folder</strong>. Hapus permanen akan menghapusnya dari semua folder tersebut.
                </p>
              )}
              {deletingItem.kind==='link'&&deletingLinkFolderCount===0&&(
                <p style={{margin:'0 0 0.75rem',fontSize:'0.825rem',color:'var(--warning)',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:8,padding:'0.5rem'}}>
                  ⚠️ Link akan dihapus permanen.
                </p>
              )}
              <p style={{margin:'0 0 1.5rem',fontSize:'0.875rem',color:'var(--text2)'}}>Tindakan ini tidak bisa dibatalkan.</p>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={()=>setDeletingItem(null)}>Batal</button>
                <button className="btn btn-danger" style={{flex:1}} onClick={handleDeleteConfirm}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordLink&&<PasswordModal linkId={passwordLink.id} linkLabel={passwordLink.label.replace(/<[^>]+>/g,'')} onClose={()=>setPasswordLink(null)} onSuccess={url=>{setPasswordLink(null);window.open(url,'_blank','noopener,noreferrer');}}/>}
      {toasts.map(t=><Toast key={t.id} message={t.msg} type={t.type} onClose={()=>setToasts(p=>p.filter(x=>x.id!==t.id))}/>)}
      {passwordFolder&&<FolderPasswordModal folderId={passwordFolder.id} folderName={passwordFolder.name} folderIcon={passwordFolder.icon} onClose={()=>setPasswordFolder(null)} onSuccess={()=>{setPasswordFolder(null);window.location.href=`/folder/${passwordFolder.id}`;}}/>}
      <ServerClock/>
      <ThemeSelector/>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes dropdownIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
