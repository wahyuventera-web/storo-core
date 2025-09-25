import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadData {
  email: string;
  whatsapp?: string;
  domain: string;
  project: string;
  source: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, whatsapp, domain, project, source }: LeadData = await req.json();

    // Validate required fields
    if (!email || !domain || !project || !source) {
      console.error("Missing required fields:", { email: !!email, domain: !!domain, project: !!project, source: !!source });
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, domain, project, source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract additional metadata from request
    const userAgent = req.headers.get("user-agent");
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const referrer = req.headers.get("referer");

    // Insert lead into database
    const { data, error } = await supabase
      .from("leads")
      .insert({
        email,
        whatsapp: whatsapp || null,
        domain,
        project,
        source,
        user_agent: userAgent,
        ip_address: ipAddress,
        referrer: referrer
      })
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead saved successfully:", data[0]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead captured successfully",
        leadId: data[0].id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in leads-collector function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);