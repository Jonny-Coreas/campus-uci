import { supabase } from "../supabaseClient";

export function getCurrentSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signInWithPassword({ email, password }) {
  return supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password,
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
