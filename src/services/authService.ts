import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export type AuthMode = "authenticated" | "guest";

const AUTH_CALLBACK_URL = `${window.location.origin}/auth/callback`;

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: AUTH_CALLBACK_URL },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  // Uses Lovable Cloud managed Google OAuth
  // TODO: For custom branding, configure your own Google OAuth credentials
  // in Lovable Cloud → Users → Authentication Settings → Sign In Methods → Google
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw result.error;
  return result;
}

export async function signInWithApple() {
  // Uses Lovable Cloud managed Apple OAuth
  // TODO: For custom branding, configure your own Apple credentials
  // in Lovable Cloud → Users → Authentication Settings → Sign In Methods → Apple
  const result = await lovable.auth.signInWithOAuth("apple", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw result.error;
  return result;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Guest mode: uses anonymous local state, no Supabase auth.
 * Guests can use the mentor but cannot upload journal media.
 */
export function isGuestMode(): boolean {
  return localStorage.getItem("intomeisee_guest") === "true";
}

export function enableGuestMode() {
  localStorage.setItem("intomeisee_guest", "true");
}

export function disableGuestMode() {
  localStorage.removeItem("intomeisee_guest");
}
