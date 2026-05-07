import { NextResponse } from "next/server";
import { authorizeStoreApi } from "@/lib/store/context";

export async function GET(
  _request: Request,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;
  const auth = await authorizeStoreApi(storeId);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await auth.service
    .from("store_notifications")
    .select("id, type, title, body, is_read, created_at, metadata")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data ?? [] });
}
