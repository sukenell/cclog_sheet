// Import this harness explicitly from each jsdom component test; Node tests stay DOM-free.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();

  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }

  vi.clearAllMocks();
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  });

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  if (typeof HTMLDialogElement !== 'undefined') {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });

    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement, returnValue = '') {
        this.returnValue = returnValue;
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
  }
}
