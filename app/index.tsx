import { getSession, onAuthChange } from "@/src/lib/supabase";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const [supaBaseReady, setReady] = useState(false);
  const [isAuth, setAuth] = useState(false);

  useEffect(() => {
    let unsuscribe = () => {};

    (async () => {
        const session = await getSession();
        setAuth(!!session);
        setReady(true);

        unsuscribe = onAuthChange((event, hasSession) => {
          setAuth(hasSession);
        });
    })();

    return () => unsuscribe(); // clean after unmount
  }, []);  

  if (!supaBaseReady) return null; // splash screen while loading supabase

  return <Redirect href={isAuth ? "/(tabs)" : "/(auth)/auth"} />;
}
