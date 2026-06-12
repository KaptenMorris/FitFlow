import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

async function getSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// Map our human-readable price IDs to subscription tier stored on profiles.
function tierForPriceId(priceId: string | undefined): "bas" | "standard" | "pro" | null {
  switch (priceId) {
    case "fitflow_bas_monthly":
      return "bas";
    case "fitflow_standard_monthly":
      return "standard";
    case "fitflow_pro_monthly":
      return "pro";
    default:
      return null;
  }
}

async function setProfileTier(userId: string, tier: "free" | "bas" | "standard" | "pro") {
  const supabase = await getSupabase();
  await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", userId);
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error("No userId in customData");
    return;
  }

  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId", {
      rawPriceId: item.price.id,
      rawProductId: item.product.id,
    });
    return;
  }

  const supabase = await getSupabase();
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status: status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );

  const tier = tierForPriceId(priceId);
  if (tier && (status === "active" || status === "trialing")) {
    await setProfileTier(userId, tier);
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, items, currentBillingPeriod, scheduledChange, customData } = data;

  const supabase = await getSupabase();
  await supabase
    .from("subscriptions")
    .update({
      status: status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      price_id: items?.[0]?.price?.importMeta?.externalId ?? undefined,
      product_id: items?.[0]?.product?.importMeta?.externalId ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  const userId = customData?.userId;
  const priceId = items?.[0]?.price?.importMeta?.externalId;
  const tier = tierForPriceId(priceId);
  if (userId && tier && (status === "active" || status === "trialing" || status === "past_due")) {
    await setProfileTier(userId, tier);
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const { id, customData } = data;
  const supabase = await getSupabase();
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  // Subscription.canceled fires when access truly ends (period over).
  // Downgrade the user's profile tier to free.
  const userId = customData?.userId;
  if (userId) await setProfileTier(userId, "free");
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});