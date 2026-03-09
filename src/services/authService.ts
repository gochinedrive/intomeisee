import { supabase } from "@/integrations/supabase/client";

export type AuthMode = "authenticated" | "guest";

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
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
