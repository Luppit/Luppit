import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "./keyValueStorage";

export class AsyncStorageStorage implements KeyValueStorage {
  constructor(private readonly namespace?: string) {}

  private k(key: string) {
    return this.namespace ? `${this.namespace}_${key}` : key;
  }

  async getItem(key: string) {
    return (await AsyncStorage.getItem(this.k(key))) ?? null;
  }

  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(this.k(key), value);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(this.k(key));
  }
}
