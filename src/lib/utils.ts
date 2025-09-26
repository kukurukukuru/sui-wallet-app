const isLocalStorageAvailable = (): boolean => {
  try {
    return typeof window !== "undefined" && "localStorage" in window;
  } catch {
    return false;
  }
};

export const setToLocalStorage = (key: string, value: unknown) => {
  if (!isLocalStorageAvailable()) {
    if (typeof window !== "undefined") {
      alert("localStorage is not available");
    }
    return;
  }

  try {
    const stringValue = JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.warn(`Failed to set localStorage key "${key}":`, error);
  }
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    if (typeof window !== "undefined") {
      alert("localStorage is not available");
    }
    return null;
  }

  try {
    const stringValue = localStorage.getItem(key);

    if (stringValue === null) {
      return null;
    }

    return JSON.parse(stringValue) as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    return null;
  }
};
