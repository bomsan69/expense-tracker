/** Minimal stand-in for the Next.js cookie store, for mocking `next/headers`. */
export interface MockCookieSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export function createMockCookieJar() {
  const store = new Map<string, string>();
  const sets: MockCookieSet[] = [];
  const deletes: string[] = [];

  const jar = {
    get(name: string) {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      store.set(name, value);
      sets.push({ name, value, options });
    },
    delete(name: string) {
      store.delete(name);
      deletes.push(name);
    },
  };

  return { jar, store, sets, deletes };
}

/** Mirrors real next/navigation: redirect() always throws, it never returns. */
export function createMockRedirect() {
  return (url: string) => {
    throw new Error(url);
  };
}
