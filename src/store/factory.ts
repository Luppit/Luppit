import { Platform } from "react-native";
import type { KeyValueStorage } from "./keyValueStorage";
import { SecureStoreStorage } from "./secureStoreStorage";
import { WebStorage } from "./webStorage";

export function createKVStorage(): KeyValueStorage {
  if (Platform.OS === "web") {
    return new WebStorage();
  }

  return new SecureStoreStorage();
}
