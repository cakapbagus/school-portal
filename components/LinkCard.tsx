'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface LinkItem {
  id: number;
  type: string;
  label: string;
  url: string;
  image_url?: string;
  effect: string;
  visible: number;
  position: number;
  has_password: number;
  scheduler_enabled: number;
  scheduler_start?: string;
  scheduler_end?: string;
  bg_color?: string;
}

interface LinkCardProps {
  link: LinkItem;
  isAdmin: boolean;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: number, label: string) => void;
  onPasswordPrompt: (link: LinkItem) => void;
}

function isSchedulerActive(link: LinkItem): boolean {
  if (!link.scheduler_enabled) return true;
  const now = new Date();
  const start = link.scheduler_start ? new Date(link.scheduler_start) : null;
  const end = link.scheduler_end ? new Date(link.scheduler_end) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function SeparatorCard({ link, isAdmin, onEdit, onDelete }: {
  link: LinkItem; isAdmin: boolean;
  onEdit: (l: LinkItem) => void; onDelete: (id: number, label: string) => void;
}) {
  return (
    <div style={{ position: 'relative', padding: '0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: link.visible ? 1 : 0.45 }}>
      {link.label ? (
        <>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {link.label}
          </span><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></>
          ) : <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      }
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => onEdit(link)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>✏️</button>
          <button onClick={() => onDelete(link.id, link.label || 'Separator')} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>🗑️</button>
        </div>
      )}
    </div>
  );
}

export function LinkCardDisplay({ link, isAdmin, onEdit, onDelete, onPasswordPrompt }: LinkCardProps) {
  if (link.type === 'separator') {
    return <SeparatorCard link={link} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />;
  }

  const schedulerOk = isSchedulerActive(link);
  const isVisible = link.visible && schedulerOk;
  if (!isAdmin && !isVisible) return null;

  const hasPassword = link.has_password === 1;

  function handleClick(e: React.MouseEvent) {
    if (isAdmin) return;
    e.preventDefault();
    if (hasPassword) onPasswordPrompt(link);
    else window.open(link.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className={`link-card effect-${link.effect || 'none'}`}
      onClick={!isAdmin ? handleClick : undefined}
      style={{
        opacity: isAdmin && !isVisible ? 0.45 : 1,
        cursor: isAdmin ? 'default' : 'pointer',
        background: link.bg_color,
      }}
    >
      {link.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={link.image_url} alt=""
          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}
          dangerouslySetInnerHTML={{ __html: link.label }} />
        {isAdmin && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--accent3)', opacity: 0.7 }}>{link.url.length > 40 ? link.url.slice(0, 40) + '…' : link.url}</span>
            {hasPassword && <span style={{ color: 'var(--warning)' }}>🔒</span>}
            {!link.visible && <span style={{ color: 'var(--danger)' }}>Tersembunyi</span>}
            {!!link.scheduler_enabled && !schedulerOk && <span style={{ color: 'var(--warning)' }}>Jadwal: nonaktif</span>}
            {!!link.scheduler_enabled && schedulerOk && <span style={{ color: 'var(--success)' }}>Jadwal: aktif</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {/* Non-admin badges */}
        {!isAdmin && hasPassword && (
          <span style={{ fontSize: '0.75rem', background: 'rgba(251,191,36,0.15)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: 999, border: '1px solid rgba(251,191,36,0.3)' }}>🔒</span>
        )}
        {!isAdmin && (
          <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>↗</span>
        )}
        {/* Admin controls */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button onClick={e => { e.stopPropagation(); onEdit(link); }} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>✏️</button>
            <button onClick={e => { e.stopPropagation(); onDelete(link.id, link.label); }} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem' }}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SortableLinkCard(props: LinkCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `link-${props.link.id}` });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 100 : 'auto', position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {props.isAdmin && (
          <div {...attributes} {...listeners}
            style={{ cursor: 'grab', color: 'var(--text2)', padding: '0.5rem 0.25rem', fontSize: '1rem', touchAction: 'none', userSelect: 'none' }}
            title="Seret untuk ubah posisi">⠿</div>
        )}
        <div style={{ flex: 1 }}>
          <LinkCardDisplay {...props} />
        </div>
      </div>
    </div>
  );
}
