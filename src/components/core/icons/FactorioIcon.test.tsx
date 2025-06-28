import {render, screen} from '@testing-library/react';
import {describe, test, expect} from 'vitest';
import {FactorioIcon} from './FactorioIcon';

describe('FactorioIcon', () => {
    test('renders icon without quality', () => {
        const icon = {
            name: 'iron-plate',
            type: 'item' as const
        };

        render(<FactorioIcon icon={icon} size="large" />);

        const iconImg = screen.getByTestId('icon');
        expect(iconImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/item/iron-plate.webp');
        expect(iconImg).toHaveAttribute('alt', 'iron-plate');

        expect(screen.queryByTestId('quality')).not.toBeInTheDocument();
    });

    test('renders icon with quality', () => {
        const icon = {
            name: 'iron-plate',
            type: 'item' as const,
            quality: 'epic' as const
        };

        render(<FactorioIcon icon={icon} size="large" />);

        const iconImg = screen.getByTestId('icon');
        expect(iconImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/item/iron-plate.webp');

        const qualityImg = screen.getByTestId('quality');
        expect(qualityImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/quality/epic.webp');
        expect(qualityImg).toHaveAttribute('alt', 'epic');
        expect(qualityImg).toHaveAttribute('title', 'Quality: epic');
    });

    test('renders virtual signal icon', () => {
        const icon = {
            name: 'signal-red',
            type: 'virtual' as const
        };

        render(<FactorioIcon icon={icon} size="small" />);

        const iconImg = screen.getByTestId('icon');
        expect(iconImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/virtual-signal/signal-red.webp');
    });

    test('renders planet icon', () => {
        const icon = {
            name: 'nauvis',
            type: 'planet' as const
        };

        render(<FactorioIcon icon={icon} size="large" />);

        const iconImg = screen.getByTestId('icon');
        expect(iconImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/space-location/nauvis.webp');
    });

    test('returns null when no icon provided', () => {
        const {container} = render(<FactorioIcon size="large" />);
        expect(container.firstChild).toBeNull();
    });

    test('defaults to item type when no type specified', () => {
        const icon = {
            name: 'copper-cable'
        };

        render(<FactorioIcon icon={icon} size="large" />);

        const iconImg = screen.getByTestId('icon');
        expect(iconImg).toHaveAttribute('src', 'https://factorio-icon-cdn.pages.dev/item/copper-cable.webp');
    });
});
