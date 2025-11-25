import { Platform } from "react-native";
import { AsyncStorageStorage } from "./asyncStorage";
import type { KeyValueStorage } from "./keyValueStorage";
import { WebStorage } from "./webStorage";

export function createKVStorage(): KeyValueStorage {
  console.log(`Creating KV Storage for platform: ${Platform.OS}`);
  if (Platform.OS === "web") {
    return new WebStorage();
  }

  return new AsyncStorageStorage();
}
