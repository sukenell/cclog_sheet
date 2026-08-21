import { Fragment, type HTMLAttributes, type ReactNode } from 'react';

export interface LiveMessageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-atomic' | 'children' | 'role'> {
  kind?: 'info' | 'error';
  message: ReactNode;
  announcementKey?: string | number;
}

export function LiveMessage({
  kind = 'info',
  message,
  announcementKey,
  ...props
}: LiveMessageProps) {
  const hasMessage = message !== null && message !== undefined && message !== '';

  return (
    <div {...props} role={kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      {hasMessage ? <Fragment key={announcementKey}>{message}</Fragment> : null}
    </div>
  );
}
