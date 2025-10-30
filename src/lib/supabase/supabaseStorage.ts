import { KeyValueStorage } from "@/src/store";

export class SupabaseStorage implements KeyValueStorage {
  constructor(
    private readonly base: KeyValueStorage,
    private readonly scope = "sb"
  ) {}
  private k(key: string) {
    return `${this.scope}_${key}`;
  }

  getItem(key: string) {
    return this.base.getItem(this.k(key));
  }
  setItem(key: string, value: string) {
    return this.base.setItem(this.k(key), value);
  }
  removeItem(key: string) {
    return this.base.removeItem(this.k(key));
  }
}