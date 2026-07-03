import * as SecureStore from "expo-secure-store";
import type { KeyValueStorage } from "./keyValueStorage";

export class SecureStoreStorage implements KeyValueStorage {
  constructor(private readonly namespace?: string) {}

  private k(key: string) {
    return this.namespace ? `${this.namespace}_${key}` : key;
  }

  async getItem(key: string) {
    return (await SecureStore.getItemAsync(this.k(key))) ?? null;
  }

  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(this.k(key), value);
  }

  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(this.k(key));
  }
}
