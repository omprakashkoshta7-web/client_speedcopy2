import type { VendorSession } from "../types/vendor";

const SESSION_KEY = "vendor_session";
const SESSION_EVENT = "vendor:session-changed";

function notifyVendorSessionChange() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getVendorSession(): VendorSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as VendorSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setVendorSession(session: VendorSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyVendorSessionChange();
}

export function clearVendorSession() {
  localStorage.removeItem(SESSION_KEY);
  notifyVendorSessionChange();
}

export function subscribeVendorSession(listener: () => void) {
  const handleChange = () => listener();

  window.addEventListener(SESSION_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(SESSION_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
