import { createAuthClient } from "better-auth/react";
import { AUTH_PROVIDERS } from "./providers";

/**
 * Better Auth client for this React SPA (browser-side).
 */
export const authClient = createAuthClient({});

/**
 * True when sign-in UI should be shown
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** The upstream providers to render sign-in buttons for. */
export { AUTH_PROVIDERS };

export async function signIn(
  providerId: string,
  opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  const callbackURL = opts.callbackURL ?? "/";
  const errorCallbackURL = opts.errorCallbackURL ?? "/";

  const { data, error } = await authClient.signIn.social({
    provider: providerId as "google" | "twitter",
    callbackURL,
    errorCallbackURL,
  });

  if (error) throw new Error(error.message ?? "Sign-in failed");
  if (data?.url) window.location.href = data.url;
}

/**
 * Sign out of THIS app's local session.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  
  // Clear the local cart so another user doesn't see it
  const { useCart } = await import("../cart-store");
  useCart.getState().clear();
  sessionStorage.removeItem("prynth-cart-synced");
  
  window.location.href = redirectTo;
}
