type PendingProfileSwitch = {
  phone: string;
};

let pendingProfileSwitch: PendingProfileSwitch | null = null;

export function setPendingProfileSwitch(phone: string) {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) return;

  pendingProfileSwitch = {
    phone: normalizedPhone,
  };
}

export function clearPendingProfileSwitch() {
  pendingProfileSwitch = null;
}

export function getPendingProfileSwitch() {
  return pendingProfileSwitch;
}

export function consumePendingProfileSwitch() {
  const current = pendingProfileSwitch;
  pendingProfileSwitch = null;
  return current;
}
