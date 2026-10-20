import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders the default loading label', () => {
        render(<LoadingSpinner />);

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders a custom loading label', () => {
        render(<LoadingSpinner label="Loading stories..." />);

        expect(screen.getByText('Loading stories...')).toBeInTheDocument();
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('announces status updates politely', () => {
        render(<LoadingSpinner label="Loading documents..." />);

        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('keeps the decorative spinner hidden from assistive technology', () => {
        const { container } = render(<LoadingSpinner />);
        const spinner = container.querySelector('span[aria-hidden="true"]');

        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
});
