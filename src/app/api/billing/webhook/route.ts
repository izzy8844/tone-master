import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) break;

        // Update Supabase
        await supabase
          .from("user_profiles")
          .upsert({ clerk_user_id: userId, tier: "pro" }, { onConflict: "clerk_user_id" });

        // Update Clerk metadata
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: { tier: "pro" },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        // Downgrade Supabase
        await supabase
          .from("user_profiles")
          .upsert({ clerk_user_id: userId, tier: "free" }, { onConflict: "clerk_user_id" });

        // Downgrade Clerk metadata
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: { tier: "free" },
        });
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
