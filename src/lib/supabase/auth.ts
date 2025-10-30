import { supabase } from "./client";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error; return data.session ?? null;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error; return data.session ?? null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(cb: (event: string, hasSession: boolean) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange(async (evt) => {
    const s = await getSession(); cb(evt, !!s);
  });
  return () => sub.subscription.unsubscribe();
}