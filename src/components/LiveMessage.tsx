import type { HTMLAttributes, ReactNode } from 'react';

export interface LiveMessageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-atomic' | 'children' | 'role'> {
  kind?: 'info' | 'error';
  message: ReactNode;
}

export function LiveMessage({ kind = 'info', message, ...props }: LiveMessageProps) {
  return (
    <div {...props} role={kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      {message}
    </div>
  );
}
