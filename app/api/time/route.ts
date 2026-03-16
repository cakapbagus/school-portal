export async function GET() {
  return Response.json({ ts: Date.now() });
}
