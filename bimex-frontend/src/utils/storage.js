const MEMORY_STORE = new Map();

function safeStorage(type) {
  if (typeof window === "undefined") return null;
  try {
    const storage = window[type];
    const testKey = "__bimex_storage_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

export function getStorage(preferred = "session") {
  const primary = preferred === "local" ? safeStorage("localStorage") : safeStorage("sessionStorage");
  if (primary) return primary;

  const fallback = preferred === "local" ? safeStorage("sessionStorage") : safeStorage("localStorage");
  if (fallback) return fallback;

  return {
    getItem: (key) => (MEMORY_STORE.has(key) ? MEMORY_STORE.get(key) : null),
    setItem: (key, value) => {
      MEMORY_STORE.set(key, String(value));
    },
    removeItem: (key) => {
      MEMORY_STORE.delete(key);
    },
  };
}
