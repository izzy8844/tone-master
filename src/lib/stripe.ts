import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "[ToneMaster] STRIPE_SECRET_KEY is not configured. " +
        "Billing features are unavailable. Set it in .env.local to enable Pro subscriptions."
      );
    }
    _stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

// Backward-compatible export — lazy initialization via Proxy
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    const instance = getStripe();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
