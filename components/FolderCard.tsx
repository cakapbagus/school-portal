'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface FolderItem {
  id: number;
  name: string;
  description?: string;
  icon: string;
  visible: number;
  position: number;
  has_password?: number;
}

interface FolderCardProps {
  folder: FolderItem;
  isAdmin: boolean;
  onEdit: (folder: FolderItem) => void;
  onDelete: (id: number, name: string) => void;
  onPasswordPrompt: (folder: FolderItem) => void;
}

export function FolderCardDisplay({ folder, isAdmin, onEdit, onDelete, onPasswordPrompt }: FolderCardProps) {
  if (!isAdmin && !folder.visible) return null;

  const hasPassword = folder.has_password === 1;

  function handleClick() {
    if (hasPassword) {
      onPasswordPrompt(folder);
    } else {
      window.location.href = `/folder/${folder.id}`;
    }
  }

  return (
    <div
      className="link-card"
      onClick={!isAdmin ? handleClick : undefined}
      style={{
        opacity: isAdmin && !folder.visible ? 0.45 : 1,
        cursor: isAdmin ? 'default' : 'pointer',
        background: 'var(--card)',
        borderStyle: 'dashed',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem',
      }}>
        {folder.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{folder.name}</div>
        {folder.description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 2 }}>{folder.description}</div>
        )}
        {isAdmin && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 2, display: 'flex', gap: '0.5rem' }}>
            {!folder.visible && <span style={{ color: 'var(--danger)' }}>Hidden</span>}
            {hasPassword && <span style={{ color: 'var(--warning)' }}>🔒 Password</span>}
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {!isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {hasPassword && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(251,191,36,0.15)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: 999, border: '1px solid rgba(251,191,36,0.3)' }}>🔒</span>
            )}
            <span style={{ fontSize: '0.75rem', background: 'rgba(108,99,255,0.12)', color: 'var(--accent2)', padding: '0.2rem 0.5rem', borderRadius: 999, border: '1px solid rgba(108,99,255,0.25)' }}>
              Folder →
            </span>
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button onClick={e => { e.stopPropagation(); window.location.href = `/folder/${folder.id}`; }} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} title="Open folder">📂</button>
            <button onClick={e => { e.stopPropagation(); onEdit(folder); }} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }}>✏️</button>
            <button onClick={e => { e.stopPropagation(); onDelete(folder.id, folder.name); }} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.6rem' }}>🗑️</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SortableFolderCard(props: FolderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `folder-${props.folder.id}` });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, position: 'relative' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {props.isAdmin && (
          <div {...attributes} {...listeners}
            style={{ cursor: 'grab', color: 'var(--text2)', padding: '0.5rem 0.25rem', fontSize: '1rem', touchAction: 'none', userSelect: 'none' }}
            title="Drag to change position">⠿</div>
        )}
        <div style={{ flex: 1 }}>
          <FolderCardDisplay {...props} />
        </div>
      </div>
    </div>
  );
}
