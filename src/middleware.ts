import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isClerkConfigured =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

const middleware = isClerkConfigured
  ? clerkMiddleware()
  : () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|api/audio|api/midi|api/plugins|api/presets|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api/(?:projects|billing/create-checkout|user))(.*)",
    "/(trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
