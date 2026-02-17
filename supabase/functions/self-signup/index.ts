import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SELF-SIGNUP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dealership_name, first_name, last_name, email, password, plan_id } = await req.json();

    if (!dealership_name || !first_name || !last_name || !email || !password) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Starting signup", { email, dealership_name });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Rate limiting: check recent signups by email (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentEmailSignups } = await supabaseAdmin
      .from("dealer_onboarding_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "SELF_SIGNUP")
      .gte("created_at", oneHourAgo)
      .contains("payload_json", { email });

    if (recentEmailSignups && recentEmailSignups >= 3) {
      logStep("Rate limited (email)", { email });
      return new Response(JSON.stringify({ error: "Too many signup attempts. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: check recent signups by IP (last 1 hour)
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (clientIP !== "unknown") {
      const { count: recentIPSignups } = await supabaseAdmin
        .from("dealer_onboarding_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "SELF_SIGNUP")
        .gte("created_at", oneHourAgo)
        .contains("payload_json", { ip: clientIP });

      if (recentIPSignups && recentIPSignups >= 5) {
        logStep("Rate limited (IP)", { clientIP });
        return new Response(JSON.stringify({ error: "Too many signup attempts from this location. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if email already exists (efficient lookup via filter)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ filter: `email.eq.${email}` });
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    if (emailExists) {
      return new Response(JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create dealer with trial status
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: dealer, error: dealerErr } = await supabaseAdmin.from("dealers").insert({
      name: dealership_name,
      legal_name: dealership_name,
      email,
      status: "trial",
      is_active: true,
      trial_ends_at: trialEndsAt,
    }).select().single();

    if (dealerErr) throw new Error(`Failed to create dealer: ${dealerErr.message}`);
    logStep("Dealer created", { dealerId: dealer.id });

    // 2. Create auth user
    const { data: authUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userErr) {
      // Rollback dealer
      await supabaseAdmin.from("dealers").delete().eq("id", dealer.id);
      throw new Error(`Failed to create user: ${userErr.message}`);
    }
    logStep("Auth user created", { userId: authUser.user.id });

    // 3. Set up profile
    await supabaseAdmin.from("profiles").upsert({
      id: authUser.user.id,
      first_name,
      last_name,
      dealer_id: dealer.id,
    });

    // 4. Assign dealer_admin role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authUser.user.id,
      role: "dealer_admin",
      dealer_id: dealer.id,
    });

    // 5. Create dealer preferences defaults
    await supabaseAdmin.from("dealer_preferences").insert({ dealer_id: dealer.id });

    // 6. Create trial subscription — use Professional plan by default for trial
    // Look up the Professional plan, or use provided plan_id
    let trialPlanId = plan_id;
    if (!trialPlanId) {
      const { data: proPlan } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("name", "Professional")
        .single();
      trialPlanId = proPlan?.id;
    }

    if (trialPlanId) {
      await supabaseAdmin.from("dealer_subscriptions").insert({
        dealer_id: dealer.id,
        plan_id: trialPlanId,
        status: "trial",
        start_date: new Date().toISOString().split("T")[0],
        next_review_date: trialEndsAt.split("T")[0],
        notes: "14-day free trial",
      });

      // Also set the plan on the dealer
      await supabaseAdmin.from("dealers").update({ plan_id: trialPlanId }).eq("id", dealer.id);
    }

    // 7. Log onboarding event (include IP for rate limiting)
    await supabaseAdmin.from("dealer_onboarding_events").insert({
      dealer_id: dealer.id,
      event_type: "SELF_SIGNUP",
      payload_json: { email, plan: "trial", trial_ends_at: trialEndsAt, ip: clientIP },
    });

    // 8. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      dealer_id: dealer.id,
      actor_user_id: authUser.user.id,
      action_type: "SELF_SIGNUP",
      entity_type: "dealer",
      entity_id: dealer.id,
      summary: `Self-service signup: ${dealership_name} (${email})`,
      actor_role: "dealer_admin",
    });

    logStep("Signup complete", { dealerId: dealer.id, userId: authUser.user.id });

    return new Response(JSON.stringify({
      message: "Account created successfully",
      dealer_id: dealer.id,
      user_id: authUser.user.id,
      trial_ends_at: trialEndsAt,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    logStep("ERROR", { message: err.message });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
