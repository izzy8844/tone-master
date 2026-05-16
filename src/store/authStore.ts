import { create } from "zustand";
import type { User, Tier, GateModalPayload } from "@/lib/types";

interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: User | null;
  tier: Tier;
  isPro: boolean;
  gateModal: GateModalPayload | null;
  setAuth: (user: User | null, tier?: Tier) => void;
  setTier: (tier: Tier) => void;
  openGate: (payload: GateModalPayload) => void;
  closeGate: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoaded: false,
  isSignedIn: false,
  user: null,
  tier: "guest",
  isPro: false,
  gateModal: null,

  setAuth(user, tier) {
    if (!user) {
      set({ isLoaded: true, isSignedIn: false, user: null, tier: "guest", isPro: false });
      return;
    }
    const resolvedTier: Tier = tier ?? "free";
    set({
      isLoaded: true,
      isSignedIn: true,
      user,
      tier: resolvedTier,
      isPro: resolvedTier === "pro",
    });
  },

  setTier(tier) {
    set({ tier, isPro: tier === "pro" });
  },

  openGate(payload) {
    set({ gateModal: payload });
  },

  closeGate() {
    set({ gateModal: null });
  },

  signOut() {
    set({
      isLoaded: true,
      isSignedIn: false,
      user: null,
      tier: "guest",
      isPro: false,
      gateModal: null,
    });
  },
}));
