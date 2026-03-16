import { NextRequest } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  await initDb();
  const { id, password } = await req.json();

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT l_password_hash, l_url FROM links WHERE l_id = ?`,
    args: [id],
  });

  if (result.rows.length === 0)
    return Response.json({ error: 'Link not found' }, { status: 404 });

  const row = result.rows[0];
  const hash = row.l_password_hash as string;

  if (!hash) return Response.json({ url: row.l_url as string });

  const valid = await bcrypt.compare(password, hash);
  if (!valid) return Response.json({ error: 'Password salah' }, { status: 401 });

  return Response.json({ url: row.l_url as string });
}
