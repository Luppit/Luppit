import { supabase } from "./client";

export type UserSignUpData = {
  fullName: string;
  idDocument: string;
  isSeller?: boolean;
};

export enum AuthMethod {
  SignIn,
  SignUp,
}

async function sendPhoneOtp(phone: string, method: AuthMethod) {
  const shouldCreateUser = method === AuthMethod.SignUp;
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser,
    },
  });
  if (error) throw error;
  return data;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  userData?: UserSignUpData
) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;

  if (!userData) return data;
  await updateUserProfile(userData).catch((err) => {
    throw err;
  });
  return data;
}

async function updateUserProfile(userData: UserSignUpData) {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: userData.fullName,
      id_document: userData.idDocument,
      is_seller: userData.isSeller 
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPhoneOtp(phone: string) {
  return await sendPhoneOtp(phone, AuthMethod.SignIn);
}

export async function signUpWithPhoneOtp(phone: string) {
  return await sendPhoneOtp(phone, AuthMethod.SignUp);
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
  userData?: UserSignUpData
) {
  return await VerifyPhoneOtpInternal(phone, token, userData);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
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
