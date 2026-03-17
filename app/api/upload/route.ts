import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return Response.json({ url: `/uploads/${filename}` });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await req.json();
  if (!url || !url.startsWith('/uploads/')) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Pastikan tidak ada path traversal
  const filename = path.basename(url);
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

  try {
    if (existsSync(filepath)) {
      await unlink(filepath);
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
