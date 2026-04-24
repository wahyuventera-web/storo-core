import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import SuperadminSidebar from "@/components/dashboard/superadmin/SuperadminSidebar";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[superadmin-layout] user:", user?.email, user?.id);

  if (!user) {
    console.log("[superadmin-layout] no user → redirect /sign-in");
    redirect("/sign-in");
  }

  // Use service role to bypass RLS for the auth gate check.
  const serviceClient = await createSupabaseServiceClient();
  const { data: adminUser, error: adminErr } = await serviceClient
    .from("superadmin_users")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  console.log("[superadmin-layout] adminUser:", adminUser, "err:", adminErr);

  if (!adminUser) {
    console.log("[superadmin-layout] not superadmin → redirect /");
    redirect("/");
  }

  console.log("[superadmin-layout] SUCCESS, rendering panel");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperadminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 bg-background border-b border-border flex items-center px-6 flex-shrink-0">
          <span className="text-sm font-medium text-foreground/50">Admin Panel</span>
        </div>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
