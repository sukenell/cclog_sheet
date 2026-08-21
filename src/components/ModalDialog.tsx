import { useEffect, useRef, type DialogHTMLAttributes, type ReactNode, type RefObject } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalDialogProps
  extends Omit<
    DialogHTMLAttributes<HTMLDialogElement>,
    'aria-describedby' | 'aria-labelledby' | 'children' | 'onCancel' | 'onClose' | 'open'
  > {
  open: boolean;
  labelledBy: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}

export function ModalDialog({
  open,
  labelledBy,
  describedBy,
  initialFocusRef,
  onClose,
  children,
  ...dialogProps
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);
  const suppressedCloseEventsRef = useRef(0);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || !open) {
      return;
    }

    invokerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialog.open) {
      dialog.showModal();
    }

    const requestedTarget = initialFocusRef?.current;
    const initialTarget =
      requestedTarget && dialog.contains(requestedTarget)
        ? requestedTarget
        : dialog.querySelector<HTMLElement>(focusableSelector);
    initialTarget?.focus();

    return () => {
      if (dialog.open) {
        suppressedCloseEventsRef.current += 1;
        dialog.close();
      }

      const invoker = invokerRef.current;
      invokerRef.current = null;
      if (invoker?.isConnected) {
        invoker.focus();
      }
    };
  }, [initialFocusRef, open]);

  return (
    <dialog
      {...dialogProps}
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={() => {
        if (suppressedCloseEventsRef.current > 0) {
          suppressedCloseEventsRef.current -= 1;
          return;
        }

        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
