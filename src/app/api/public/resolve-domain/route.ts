import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get("host");

  if (!host) {
    return NextResponse.json({ error: "host parameter required" }, { status: 400 });
  }

  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, domain, template_variant, theme_config, logo_url")
    .eq("domain", host)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  return NextResponse.json({ data }, { headers: CACHE_HEADERS });
}
