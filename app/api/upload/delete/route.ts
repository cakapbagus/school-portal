import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await req.json();
  // Hanya hapus file lokal yang di-upload ke /uploads/
  if (!url || !url.startsWith('/uploads/')) {
    return Response.json({ ok: true });
  }

  try {
    const filename = path.basename(url);
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
    await unlink(filepath);
  } catch {
    // File sudah tidak ada, tidak masalah
  }

  return Response.json({ ok: true });
}
