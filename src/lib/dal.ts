import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Data Access Layer — all server-only data fetching helpers.
 *
 * Uses React.cache() so multiple Server Components in the same request
 * share a single Supabase call instead of each making their own.
 */

/** Returns the authenticated user, or null if unauthenticated. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Requires authentication — redirects to /sign-in if no user.
 * Use in any Server Component / Server Action that needs auth.
 */
export const requireAuth = cache(async () => {
  const user = await getSession();
  if (!user) redirect("/sign-in");
  return user;
});

/**
 * Requires auth + an existing client profile.
 * Redirects to /onboarding if profile is missing.
 * Returns { user, client, supabase } so the caller can run
 * additional queries without creating another Supabase instance.
 */
export const requireClientProfile = cache(async () => {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!client) redirect("/onboarding");

  return { user, client, supabase };
});
