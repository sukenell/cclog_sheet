// @vitest-environment jsdom

import '../test/setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveMessage } from './LiveMessage';

describe('LiveMessage', () => {
  it('announces informational messages as an atomic status', () => {
    render(<LiveMessage kind="info" message="Saved." />);

    const message = screen.getByRole('status');
    expect(message).toHaveAttribute('aria-atomic', 'true');
    expect(message).toHaveTextContent('Saved.');
  });

  it('announces error messages as an atomic alert', () => {
    render(<LiveMessage kind="error" message="Save failed." />);

    const message = screen.getByRole('alert');
    expect(message).toHaveAttribute('aria-atomic', 'true');
    expect(message).toHaveTextContent('Save failed.');
  });

  it('keeps the same live region mounted when its message is cleared', () => {
    const { rerender } = render(<LiveMessage message="Copied." />);
    const liveRegion = screen.getByRole('status');

    rerender(<LiveMessage message="" />);

    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(liveRegion).toBeEmptyDOMElement();
  });
});
