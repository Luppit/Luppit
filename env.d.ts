declare namespace NodeJS {
    interface ProcessEnv {
        EXPO_PUBLIC_SUPABASE_URL : string;
        EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
        EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
        EXPO_PUBLIC_TERMS_URL?: string;
    }
}        
