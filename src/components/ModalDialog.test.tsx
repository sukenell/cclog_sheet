// @vitest-environment jsdom

import '../test/setup';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalDialog } from './ModalDialog';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockDelayedNativeClose() {
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
    returnValue = '',
  ) {
    this.returnValue = returnValue;
    this.removeAttribute('open');
    setTimeout(() => {
      this.dispatchEvent(new Event('close'));
    }, 0);
  });
}

async function flushDelayedCloseEvent() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe('ModalDialog', () => {
  it('opens with showModal and focuses the explicit initial target', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const user = userEvent.setup();

    function Example() {
      const [open, setOpen] = useState(false);
      const preferredActionRef = useRef<HTMLButtonElement>(null);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open settings
          </button>
          <ModalDialog
            open={open}
            labelledBy="settings-title"
            describedBy="settings-description"
            initialFocusRef={preferredActionRef}
            onClose={() => setOpen(false)}
          >
            <h2 id="settings-title">Settings</h2>
            <p id="settings-description">Choose an action.</p>
            <button type="button">First action</button>
            <button ref={preferredActionRef} type="button">
              Preferred action
            </button>
          </ModalDialog>
        </>
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Open settings' }));

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'settings-description');
    expect(showModal).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Preferred action' })).toHaveFocus();
  });

  it('focuses the first focusable control when no initial target is supplied', async () => {
    const user = userEvent.setup();

    function Example() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open actions
          </button>
          <ModalDialog
            open={open}
            labelledBy="actions-title"
            onClose={() => setOpen(false)}
          >
            <h2 id="actions-title">Actions</h2>
            <button type="button">First action</button>
            <button type="button">Second action</button>
          </ModalDialog>
        </>
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Open actions' }));

    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();
  });

  it('requests exactly one controlled close for the native cancel event', () => {
    const onClose = vi.fn();

    function Example() {
      const [open, setOpen] = useState(true);
      const close = () => {
        onClose();
        setOpen(false);
      };

      return (
        <ModalDialog open={open} labelledBy="confirm-title" onClose={close}>
          <h2 id="confirm-title">Confirm</h2>
          <button type="button">Continue</button>
        </ModalDialog>
      );
    }

    render(<Example />);

    const dialog = screen.getByRole('dialog', { name: 'Confirm' });
    const cancelEvent = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog).not.toHaveAttribute('open');
  });

  it('requests a controlled close once when the dialog closes natively', () => {
    const onClose = vi.fn();

    render(
      <ModalDialog open labelledBy="native-close-title" onClose={onClose}>
        <h2 id="native-close-title">Native close</h2>
        <button type="button">Continue</button>
      </ModalDialog>,
    );

    const dialog = screen.getByRole<HTMLDialogElement>('dialog', { name: 'Native close' });
    dialog.close();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('requests exactly one controlled close from a child button', async () => {
    mockDelayedNativeClose();
    const onClose = vi.fn();
    const user = userEvent.setup();

    function Example() {
      const [open, setOpen] = useState(false);
      const close = () => {
        onClose();
        setOpen(false);
      };

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open controlled dialog
          </button>
          <ModalDialog open={open} labelledBy="controlled-title" onClose={close}>
            <h2 id="controlled-title">Controlled dialog</h2>
            <button type="button" onClick={close}>
              Close controlled dialog
            </button>
          </ModalDialog>
        </>
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Open controlled dialog' }));
    await user.click(screen.getByRole('button', { name: 'Close controlled dialog' }));
    await flushDelayedCloseEvent();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stays open and focused without requesting close across StrictMode effect replay', async () => {
    mockDelayedNativeClose();
    const onClose = vi.fn();
    const user = userEvent.setup();

    function Example() {
      const [mounted, setMounted] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setMounted(true)}>
            Open strict dialog
          </button>
          {mounted ? (
            <ModalDialog open labelledBy="strict-title" onClose={onClose}>
              <h2 id="strict-title">Strict dialog</h2>
              <button type="button">Initial action</button>
            </ModalDialog>
          ) : null}
        </>
      );
    }

    render(
      <StrictMode>
        <Example />
      </StrictMode>,
    );
    await user.click(screen.getByRole('button', { name: 'Open strict dialog' }));
    await flushDelayedCloseEvent();

    const dialog = screen.getByRole('dialog', { name: 'Strict dialog' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Initial action' })).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the exact invoker after a controlled close', async () => {
    const user = userEvent.setup();

    function Example() {
      const [open, setOpen] = useState(false);
      const close = () => setOpen(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open details
          </button>
          <ModalDialog open={open} labelledBy="details-title" onClose={close}>
            <h2 id="details-title">Details</h2>
            <button type="button" onClick={close}>
              Close details
            </button>
          </ModalDialog>
        </>
      );
    }

    render(<Example />);
    const invoker = screen.getByRole('button', { name: 'Open details' });
    await user.click(invoker);

    const dialog = screen.getByRole('dialog', { name: 'Details' });
    await user.click(screen.getByRole('button', { name: 'Close details' }));

    expect(dialog).not.toHaveAttribute('open');
    expect(invoker).toHaveFocus();
  });

  it('restores focus to the exact invoker when it unmounts while open', async () => {
    const user = userEvent.setup();

    function Example() {
      const [mounted, setMounted] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setMounted(true)}>
            Open temporary dialog
          </button>
          {mounted ? (
            <ModalDialog
              open
              labelledBy="temporary-title"
              onClose={() => setMounted(false)}
            >
              <h2 id="temporary-title">Temporary dialog</h2>
              <button type="button" onClick={() => setMounted(false)}>
                Remove dialog
              </button>
            </ModalDialog>
          ) : null}
        </>
      );
    }

    render(<Example />);
    const invoker = screen.getByRole('button', { name: 'Open temporary dialog' });
    await user.click(invoker);
    await user.click(screen.getByRole('button', { name: 'Remove dialog' }));

    expect(screen.queryByRole('dialog', { name: 'Temporary dialog' })).not.toBeInTheDocument();
    expect(invoker).toHaveFocus();
  });
});
