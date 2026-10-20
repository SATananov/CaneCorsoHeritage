import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CatalogLoadMore from './CatalogLoadMore';

describe('CatalogLoadMore', () => {
    it('renders the load-more button and current catalog status', () => {
        render(
            <CatalogLoadMore
                label="Load more"
                statusLabel="Showing"
                visibleCount={12}
                totalCount={30}
                onLoadMore={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
        expect(screen.getByText('Showing 12 / 30')).toBeInTheDocument();
    });

    it('never displays a visible count greater than the total count', () => {
        render(
            <CatalogLoadMore
                label="Load more"
                statusLabel="Showing"
                visibleCount={40}
                totalCount={30}
                onLoadMore={() => {}}
            />,
        );

        expect(screen.getByText('Showing 30 / 30')).toBeInTheDocument();
    });

    it('calls onLoadMore once when the user clicks the button', async () => {
        const user = userEvent.setup();
        const onLoadMore = vi.fn();

        render(
            <CatalogLoadMore
                label="Load more"
                statusLabel="Showing"
                visibleCount={12}
                totalCount={30}
                onLoadMore={onLoadMore}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Load more' }));

        expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('announces status changes politely for assistive technology', () => {
        render(
            <CatalogLoadMore
                label="Load more"
                statusLabel="Showing"
                visibleCount={12}
                totalCount={30}
                onLoadMore={() => {}}
            />,
        );

        expect(screen.getByText('Showing 12 / 30')).toHaveAttribute('aria-live', 'polite');
    });
});
