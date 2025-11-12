import { supabase } from "./client";

export type UserSignUpData = {
  fullName: string;
  idDocument: string;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function verifyOtpCode(phone: string, otpCode : string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    type: "sms",
    token: otpCode,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPhoneOtp(phone: string, otpCode : string, userData: UserSignUpData) {

  await verifyOtpCode(phone, otpCode).catch((error) => {
    throw error;
  });

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: userData.fullName,
      id_document: userData.idDocument,
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