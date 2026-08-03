/* Runtime compatibility for the Safari version shipped with iOS 12. */
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    writable: true,
    value(index: number) {
      const length = this.length >>> 0;
      const integer = Math.trunc(Number(index) || 0);
      const position = integer < 0 ? length + integer : integer;
      return position < 0 || position >= length ? undefined : this[position];
    },
  });
}

if (!Object.fromEntries) {
  Object.defineProperty(Object, "fromEntries", {
    configurable: true,
    writable: true,
    value(entries: Iterable<readonly [PropertyKey, unknown]>) {
      const result: Record<PropertyKey, unknown> = {};
      for (const [key, value] of entries) result[key] = value;
      return result;
    },
  });
}

const legacyWindow = window as Window & {
  queueMicrotask?: (callback: VoidFunction) => void;
};

if (typeof legacyWindow.queueMicrotask !== "function") {
  legacyWindow.queueMicrotask = (callback: VoidFunction) => {
    Promise.resolve()
      .then(callback)
      .catch((error) => window.setTimeout(() => { throw error; }, 0));
  };
}
