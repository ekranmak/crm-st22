import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook token from headers
    const webhookToken = req.headers.get("x-webhook-token");
    if (!webhookToken) {
      return new Response(JSON.stringify({ error: "Missing webhook token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
    const payload = await req.json();

    // Validate webhook token and get site info
    const { data: siteData, error: siteError } = await supabase
      .from("sites")
      .select("id, owner_id")
      .eq("webhook_token", webhookToken)
      .single();

    if (siteError || !siteData) {
      return new Response(JSON.stringify({ error: "Invalid webhook token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook is enabled
    const { data: siteStatus } = await supabase
      .from("sites")
      .select("webhook_enabled")
      .eq("id", siteData.id)
      .single();

    if (!siteStatus?.webhook_enabled) {
      return new Response(JSON.stringify({ error: "Webhook is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    const requiredFields = ["client_name"];
    for (const field of requiredFields) {
      if (!payload[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract client IP
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Create web lead
    const { data: leadData, error: leadError } = await supabase
      .from("web_leads")
      .insert({
        site_id: siteData.id,
        owner_id: siteData.owner_id,
        client_name: payload.client_name,
        client_email: payload.client_email || "",
        client_phone: payload.client_phone || "",
        client_company: payload.client_company || "",
        message: payload.message || "",
        form_data: payload.form_data || {},
        page_url: payload.page_url || "",
        referrer: payload.referrer || "",
        user_agent: payload.user_agent || "",
        ip_address: clientIp,
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating web lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to save lead", details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optionally auto-create order from lead
    if (payload.auto_create_order) {
      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          owner_id: siteData.owner_id,
          order_number: `WEB-${leadData.id.substring(0, 8).toUpperCase()}`,
          client_name: payload.client_name,
          client_email: payload.client_email || "",
          client_phone: payload.client_phone || "",
          items: payload.message || "",
          status: "Новый",
          notes: `Заявка с сайта: ${siteData.id}`,
        });

      if (orderError) {
        console.error("Error creating order from lead:", orderError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead received successfully",
        lead_id: leadData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
