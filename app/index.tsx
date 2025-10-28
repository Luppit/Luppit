import { Redirect } from "expo-router";

// TODO: Auth
const isAuthenticated = true;

export default function Index() {
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/login"} />;
}
