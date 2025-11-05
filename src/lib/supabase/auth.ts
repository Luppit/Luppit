import { supabase } from "./client";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signUpWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    phone: phone,
    password: password,
    options: {
      channel: "sms",
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPhoneOtp(phone: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phone,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(cb: (event: string, hasSession: boolean) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange(async (evt) => {
    const s = await getSession();
    cb(evt, !!s);
  });
  return () => sub.subscription.unsubscribe();
}
