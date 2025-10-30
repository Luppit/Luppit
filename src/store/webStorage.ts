import type { KeyValueStorage } from "./keyValueStorage";

export class WebStorage implements KeyValueStorage {
  constructor(private readonly namespace = "sb_web") {}

  private k(key: string) {
    return `${this.namespace}_${key}`;
  }

  async getItem(key: string) {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.k(key));
  }

  async setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.k(key), value);
  }

  async removeItem(key: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.k(key));
  }
}