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
  const folders = await db.execute(`SELECT ${F_SELECT} FROM folders f ORDER BY f.f_position ASC, f.f_id ASC`);
  return Response.json({ folders: folders.rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, icon, visible, password } = await req.json();
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

  return Response.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = getDb();

  if (body.positions) {
    for (const { id, position } of body.positions) {
      await db.execute({ sql: `UPDATE folders SET f_position = ? WHERE f_id = ?`, args: [position, id] });
    }
    return Response.json({ ok: true });
  }

  const { id, name, description, icon, visible, password, clear_password } = body;

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

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const db = getDb();
  // Hapus semua link yang ada di folder ini sekaligus
  await db.execute({ sql: `DELETE FROM links WHERE l_folder_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM folders WHERE f_id = ?`, args: [id] });
  return Response.json({ ok: true });
}
