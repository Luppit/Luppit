import type { KeyValueStorage } from "@/src/store";

const INITIALIZATION_MARKER_KEY = "auth_secure_storage_initialized_v1";
const INITIALIZATION_MARKER_VALUE = "1";
const SESSION_KEY_SUFFIXES = ["", "-code-verifier", "-user"] as const;

export class SupabaseStorage implements KeyValueStorage {
  private initialization: Promise<void> | null = null;

  constructor(
    private readonly base: KeyValueStorage,
    private readonly scope = "sb",
    private readonly legacyStorage?: KeyValueStorage
  ) {}

  private k(key: string) {
    return `${this.scope}_${key}`;
  }

  private sessionKey(key: string) {
    const suffix = SESSION_KEY_SUFFIXES.find(
      (candidate) => candidate && key.endsWith(candidate)
    );
    return suffix ? key.slice(0, -suffix.length) : key;
  }

  private async initialize(key: string) {
    const legacyStorage = this.legacyStorage;
    if (!legacyStorage) return;

    const sessionKey = this.sessionKey(key);
    const sessionKeys = SESSION_KEY_SUFFIXES.map((suffix) =>
      this.k(`${sessionKey}${suffix}`)
    );
    const markerKey = this.k(INITIALIZATION_MARKER_KEY);
    const marker = await legacyStorage.getItem(markerKey);

    if (marker !== INITIALIZATION_MARKER_VALUE) {
      await Promise.all(sessionKeys.map((item) => this.base.removeItem(item)));
    }

    await Promise.all(sessionKeys.map((item) => legacyStorage.removeItem(item)));

    if (marker !== INITIALIZATION_MARKER_VALUE) {
      await legacyStorage.setItem(markerKey, INITIALIZATION_MARKER_VALUE);
    }
  }

  private ensureInitialized(key: string) {
    if (!this.initialization) {
      this.initialization = this.initialize(key);
    }
    return this.initialization;
  }

  async getItem(key: string) {
    await this.ensureInitialized(key);
    return this.base.getItem(this.k(key));
  }

  async setItem(key: string, value: string) {
    await this.ensureInitialized(key);
    return this.base.setItem(this.k(key), value);
  }

  async removeItem(key: string) {
    await this.ensureInitialized(key);
    return this.base.removeItem(this.k(key));
  }
}
