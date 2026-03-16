import { NextRequest } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

const F_SELECT = `
  f.f_id          AS id,
  f.f_name        AS name,
  f.f_description AS description,
  f.f_icon        AS icon,
  f.f_visible     AS visible,
  f.f_position    AS position,
  CASE WHEN f.f_password_hash IS NOT NULL AND f.f_password_hash != '' THEN 1 ELSE 0 END AS has_password
`;

export async function GET() {
  await initDb();
  const db = getDb();

  const folders = await db.execute(`
    SELECT ${F_SELECT} FROM folders f ORDER BY f.f_position ASC, f.f_id ASC
  `);

  const memberships = await db.execute(`
    SELECT fl_folder_id AS folder_id, fl_link_id AS link_id FROM folder_links
  `);

  return Response.json({ folders: folders.rows, memberships: memberships.rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, icon, visible, link_ids, password } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'Nama wajib diisi' }, { status: 400 });

  let f_password_hash: string | null = null;
  if (password?.trim()) {
    const bcrypt = await import('bcryptjs');
    f_password_hash = await bcrypt.hash(password.trim(), 10);
  }

  const db = getDb();
  const maxPos = await db.execute(`SELECT COALESCE(MAX(f_position), -1) AS m FROM folders`);
  const f_position = (maxPos.rows[0].m as number) + 1;

  const result = await db.execute({
    sql: `INSERT INTO folders (f_name, f_description, f_icon, f_visible, f_position, f_password_hash)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [name.trim(), description || '', icon || '📁', visible !== false ? 1 : 0, f_position, f_password_hash],
  });
  const folderId = Number(result.lastInsertRowid);

  if (Array.isArray(link_ids) && link_ids.length > 0) {
    for (let i = 0; i < link_ids.length; i++) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO folder_links (fl_folder_id, fl_link_id, fl_position) VALUES (?, ?, ?)`,
        args: [folderId, link_ids[i], i],
      });
    }
  }

  return Response.json({ id: folderId });
}

export async function PUT(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = getDb();

  // Batch reorder folders
  if (body.positions) {
    for (const { id, position } of body.positions) {
      await db.execute({
        sql: `UPDATE folders SET f_position = ? WHERE f_id = ?`,
        args: [position, id],
      });
    }
    return Response.json({ ok: true });
  }

  // Update single folder
  const { id, name, description, icon, visible, link_ids, password, clear_password } = body;

  if (clear_password) {
    await db.execute({
      sql: `UPDATE folders SET f_name=?, f_description=?, f_icon=?, f_visible=?, f_password_hash=NULL WHERE f_id=?`,
      args: [name, description || '', icon || '📁', visible ? 1 : 0, id],
    });
  } else if (password?.trim()) {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password.trim(), 10);
    await db.execute({
      sql: `UPDATE folders SET f_name=?, f_description=?, f_icon=?, f_visible=?, f_password_hash=? WHERE f_id=?`,
      args: [name, description || '', icon || '📁', visible ? 1 : 0, hash, id],
    });
  } else {
    await db.execute({
      sql: `UPDATE folders SET f_name=?, f_description=?, f_icon=?, f_visible=? WHERE f_id=?`,
      args: [name, description || '', icon || '📁', visible ? 1 : 0, id],
    });
  }

  if (Array.isArray(link_ids)) {
    await db.execute({ sql: `DELETE FROM folder_links WHERE fl_folder_id = ?`, args: [id] });
    for (let i = 0; i < link_ids.length; i++) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO folder_links (fl_folder_id, fl_link_id, fl_position) VALUES (?, ?, ?)`,
        args: [id, link_ids[i], i],
      });
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const db = getDb();
  await db.execute({ sql: `DELETE FROM folder_links WHERE fl_folder_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM folders WHERE f_id = ?`, args: [id] });
  return Response.json({ ok: true });
}
