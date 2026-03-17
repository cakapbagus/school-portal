import { NextRequest } from 'next/server';
import { initDb, getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  await initDb();
  const { password } = await req.json();

  const db = getDb();
  const row = await db.execute(`SELECT s_value FROM settings WHERE s_key = 'admin_password'`);

  if (row.rows.length === 0) return Response.json({ error: 'Server error' }, { status: 500 });

  const hash = row.rows[0].s_value as string;
  const valid = await bcrypt.compare(password, hash);
  if (!valid) return Response.json({ error: 'Wrong password' }, { status: 401 });

  const token = await signToken({ role: 'admin' });
  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  return Response.json({ ok: true });
}
