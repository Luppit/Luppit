import * as SecureStore from "expo-secure-store";
import type { KeyValueStorage } from "./keyValueStorage";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class SecureStoreStorage implements KeyValueStorage {
  constructor(private readonly namespace?: string) {}

  private k(key: string) {
    return this.namespace ? `${this.namespace}_${key}` : key;
  }

  async getItem(key: string) {
    return (
      (await SecureStore.getItemAsync(this.k(key), SECURE_STORE_OPTIONS)) ?? null
    );
  }

  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(this.k(key), value, SECURE_STORE_OPTIONS);
  }

  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(this.k(key), SECURE_STORE_OPTIONS);
  }
}
