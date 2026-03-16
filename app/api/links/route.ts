import { NextRequest } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const L_SELECT = `
  l.l_id                AS id,
  l.l_folder_id         AS folder_id,
  l.l_type              AS type,
  l.l_label             AS label,
  l.l_url               AS url,
  l.l_image_url         AS image_url,
  l.l_effect            AS effect,
  l.l_bg_color          AS bg_color,
  l.l_visible           AS visible,
  l.l_position          AS position,
  l.l_scheduler_enabled AS scheduler_enabled,
  l.l_scheduler_start   AS scheduler_start,
  l.l_scheduler_end     AS scheduler_end,
  CASE WHEN l.l_password_hash IS NOT NULL AND l.l_password_hash != '' THEN 1 ELSE 0 END AS has_password
`;

export async function GET(req: NextRequest) {
  await initDb();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folder_id');

  let links;
  if (folderId === 'root') {
    // Link di root = l_folder_id NULL
    links = await db.execute(`
      SELECT ${L_SELECT} FROM links l
      WHERE l.l_folder_id IS NULL
      ORDER BY l.l_position ASC, l.l_id ASC
    `);
  } else if (folderId) {
    // Link di dalam folder tertentu
    links = await db.execute({
      sql: `SELECT ${L_SELECT} FROM links l
            WHERE l.l_folder_id = ?
            ORDER BY l.l_position ASC, l.l_id ASC`,
      args: [parseInt(folderId)],
    });
  } else {
    // Semua link (admin picker dll)
    links = await db.execute(`
      SELECT ${L_SELECT} FROM links l
      ORDER BY l.l_folder_id ASC, l.l_position ASC, l.l_id ASC
    `);
  }

  const settingsRows = await db.execute(`
    SELECT s_key, s_value FROM settings
    WHERE s_key IN ('site_title', 'site_subtitle', 'site_logo', 'site_banner')
  `);
  const settings: Record<string, string> = {};
  for (const row of settingsRows.rows) settings[row.s_key as string] = row.s_value as string;

  const foldersRows = await db.execute(`
    SELECT
      f.f_id          AS id,
      f.f_name        AS name,
      f.f_description AS description,
      f.f_icon        AS icon,
      f.f_visible     AS visible,
      f.f_position    AS position,
      CASE WHEN f.f_password_hash IS NOT NULL AND f.f_password_hash != '' THEN 1 ELSE 0 END AS has_password
    FROM folders f
    ORDER BY f.f_position ASC, f.f_id ASC
  `);

  return Response.json({
    links: links.rows,
    settings,
    folders: foldersRows.rows,
  });
}

export async function POST(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    type = 'link', folder_id = null, label, url, image_url, effect, bg_color,
    visible, scheduler_enabled, scheduler_start, scheduler_end, password,
  } = body;

  let l_password_hash = null;
  if (password?.trim()) l_password_hash = await bcrypt.hash(password.trim(), 10);

  const db = getDb();
  const fid = folder_id ? parseInt(folder_id) : null;

  // Posisi dalam scope yang sama (root atau folder tertentu)
  const maxPos = fid
    ? await db.execute({ sql: `SELECT COALESCE(MAX(l_position), -1) AS m FROM links WHERE l_folder_id = ?`, args: [fid] })
    : await db.execute(`SELECT COALESCE(MAX(l_position), -1) AS m FROM links WHERE l_folder_id IS NULL`);
  const l_position = (maxPos.rows[0].m as number) + 1;

  const result = await db.execute({
    sql: `INSERT INTO links
            (l_folder_id, l_type, l_label, l_url, l_image_url, l_effect, l_bg_color,
             l_visible, l_position, l_scheduler_enabled, l_scheduler_start,
             l_scheduler_end, l_password_hash)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      fid,
      type,
      type === 'separator' ? (label || '') : (label || ''),
      type === 'separator' ? '' : (url || ''),
      image_url || null,
      effect || 'none',
      bg_color || null,
      visible !== false ? 1 : 0,
      l_position,
      scheduler_enabled ? 1 : 0,
      scheduler_start || null,
      scheduler_end || null,
      l_password_hash,
    ],
  });

  return Response.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = getDb();

  // Batch reorder
  if (body.positions) {
    for (const { id, position } of body.positions) {
      await db.execute({ sql: `UPDATE links SET l_position = ? WHERE l_id = ?`, args: [position, id] });
    }
    return Response.json({ ok: true });
  }

  // Update site settings
  if (body.settings) {
    for (const [key, value] of Object.entries(body.settings)) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (s_key, s_value) VALUES (?, ?)`,
        args: [key, value as string],
      });
    }
    return Response.json({ ok: true });
  }

  // Update single link
  const {
    id, type = 'link', label, url, image_url, effect, bg_color,
    visible, scheduler_enabled, scheduler_start, scheduler_end,
    password, clear_password,
  } = body;

  const base = [
    type, label, url || '', image_url || null, effect || 'none', bg_color || null,
    visible ? 1 : 0, scheduler_enabled ? 1 : 0,
    scheduler_start || null, scheduler_end || null,
  ];

  if (clear_password) {
    await db.execute({
      sql: `UPDATE links SET
              l_type=?, l_label=?, l_url=?, l_image_url=?, l_effect=?, l_bg_color=?,
              l_visible=?, l_scheduler_enabled=?, l_scheduler_start=?, l_scheduler_end=?,
              l_password_hash=NULL
            WHERE l_id=?`,
      args: [...base, id],
    });
  } else if (password?.trim()) {
    const hash = await bcrypt.hash(password.trim(), 10);
    await db.execute({
      sql: `UPDATE links SET
              l_type=?, l_label=?, l_url=?, l_image_url=?, l_effect=?, l_bg_color=?,
              l_visible=?, l_scheduler_enabled=?, l_scheduler_start=?, l_scheduler_end=?,
              l_password_hash=?
            WHERE l_id=?`,
      args: [...base, hash, id],
    });
  } else {
    await db.execute({
      sql: `UPDATE links SET
              l_type=?, l_label=?, l_url=?, l_image_url=?, l_effect=?, l_bg_color=?,
              l_visible=?, l_scheduler_enabled=?, l_scheduler_start=?, l_scheduler_end=?
            WHERE l_id=?`,
      args: [...base, id],
    });
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Link independen — delete langsung hapus record
  const { id } = await req.json();
  const db = getDb();
  await db.execute({ sql: `DELETE FROM links WHERE l_id = ?`, args: [id] });
  return Response.json({ ok: true });
}
