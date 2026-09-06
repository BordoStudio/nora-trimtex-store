import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';

for (const mode of ['normal', 'without-randomUUID', 'blocked-storage', 'without-crypto']) {
  test(`guest bootstrap: ${mode}`, async () => {
    const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const values = new Map();
    const localStorage = {
      getItem(key) { if (mode === 'blocked-storage') throw new Error('SecurityError'); return values.get(key) ?? null; },
      setItem(key, value) { if (mode === 'blocked-storage') throw new Error('SecurityError'); values.set(key, value); },
    };
    try {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: mode === 'without-crypto' ? undefined : mode === 'without-randomUUID' ? { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } : webcrypto });
      const { getGuestId } = await import(`../src/lib/guest.ts?test=${mode}`);
      const id = getGuestId();
      if (mode === 'without-crypto') assert.equal(id, '');
      else { assert.match(id, /^[A-Za-z0-9_-]{16,80}$/); assert.equal(getGuestId(), id); }
    } finally {
      if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto); else delete globalThis.crypto;
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else delete globalThis.window;
    }
  });
}
