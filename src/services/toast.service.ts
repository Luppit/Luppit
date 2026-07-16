export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastAction = {
  label: string;
  onPress: () => void | Promise<void>;
};

export type ToastOptions = {
  variant: ToastVariant;
  title?: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
  dedupeKey?: string;
};

export type ToastMessage = ToastOptions & {
  id: string;
  createdAt: number;
};

export type ToastState = {
  current: ToastMessage | null;
  queuedCount: number;
  bottomInset: number;
};

type ToastListener = (state: ToastState) => void;

const DEDUPE_WINDOW_MS = 2_000;
const MAX_QUEUED_TOASTS = 2;

let currentToast: ToastMessage | null = null;
let queuedToasts: ToastMessage[] = [];
let nextToastId = 0;
const bottomInsets = new Map<string, number>();

const listeners = new Set<ToastListener>();
const recentToasts = new Map<string, { id: string; shownAt: number }>();

function getState(): ToastState {
  return {
    current: currentToast,
    queuedCount: queuedToasts.length,
    bottomInset: Math.max(0, ...bottomInsets.values()),
  };
}

function notifyListeners() {
  const state = getState();
  listeners.forEach((listener) => listener(state));
}

function getDedupeKey(options: ToastOptions) {
  if (options.dedupeKey) {
    return `key:${options.dedupeKey}`;
  }

  return `exact:${JSON.stringify([
    options.variant,
    options.title ?? null,
    options.description ?? null,
  ])}`;
}

function findRecentToast(key: string, now: number) {
  for (const [recentKey, toast] of recentToasts) {
    if (now - toast.shownAt >= DEDUPE_WINDOW_MS) {
      recentToasts.delete(recentKey);
    }
  }

  return recentToasts.get(key);
}

function enqueueToast(message: ToastMessage) {
  const candidates = [...queuedToasts, message];

  if (candidates.length <= MAX_QUEUED_TOASTS) {
    queuedToasts = candidates;
    return true;
  }

  const lowPriorityIndex = candidates.findIndex(
    (candidate) => candidate.variant === "success" || candidate.variant === "info",
  );
  const evictionIndex = lowPriorityIndex >= 0 ? lowPriorityIndex : 0;
  const wasQueued = candidates[evictionIndex].id !== message.id;

  candidates.splice(evictionIndex, 1);
  queuedToasts = candidates;

  return wasQueued;
}

export function showToast(options: ToastOptions): string {
  const now = Date.now();
  const dedupeKey = getDedupeKey(options);
  const recentToast = findRecentToast(dedupeKey, now);

  if (recentToast) {
    return recentToast.id;
  }

  const message: ToastMessage = {
    ...options,
    id: `toast-${now}-${nextToastId++}`,
    createdAt: now,
  };

  recentToasts.set(dedupeKey, { id: message.id, shownAt: now });

  if (!currentToast) {
    currentToast = message;
    notifyListeners();
    return message.id;
  }

  if (message.variant === "error" && currentToast.variant !== "error") {
    currentToast = message;
    notifyListeners();
    return message.id;
  }

  if (enqueueToast(message)) {
    notifyListeners();
  }

  return message.id;
}

export function hideToast(id?: string) {
  if (!id || currentToast?.id === id) {
    if (!currentToast) {
      return;
    }

    currentToast = queuedToasts.shift() ?? null;
    notifyListeners();
    return;
  }

  const nextQueue = queuedToasts.filter((toast) => toast.id !== id);

  if (nextQueue.length !== queuedToasts.length) {
    queuedToasts = nextQueue;
    notifyListeners();
  }
}

export function setToastBottomInset(source: string, inset: number) {
  const nextInset = Math.max(0, Math.ceil(inset));
  if (bottomInsets.get(source) === nextInset) return;

  bottomInsets.set(source, nextInset);
  notifyListeners();
}

export function clearToastBottomInset(source: string) {
  if (!bottomInsets.delete(source)) return;
  notifyListeners();
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  listener(getState());

  return () => {
    listeners.delete(listener);
  };
}
