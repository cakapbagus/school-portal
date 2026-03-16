import { getAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await getAdminSession();
  return Response.json({ isAdmin: !!session });
}
