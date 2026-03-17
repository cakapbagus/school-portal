import { NextRequest } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  await initDb();
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { current_password, new_password } = await req.json();

  if (!current_password || !new_password)
    return Response.json({ error: 'All fields are required' }, { status: 400 });
  if (new_password.length < 6)
    return Response.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });

  const db = getDb();
  const row = await db.execute(`SELECT s_value FROM settings WHERE s_key = 'admin_password'`);
  if (row.rows.length === 0) return Response.json({ error: 'Server error' }, { status: 500 });

  const valid = await bcrypt.compare(current_password, row.rows[0].s_value as string);
  if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 401 });

  const newHash = await bcrypt.hash(new_password, 10);
  await db.execute({
    sql: `UPDATE settings SET s_value = ? WHERE s_key = 'admin_password'`,
    args: [newHash],
  });

  return Response.json({ ok: true });
}
