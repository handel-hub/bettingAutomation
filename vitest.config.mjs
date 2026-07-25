import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.{test,spec}.{js,mjs}', 'src/**/__tests__/**/*.{test,spec}.{js,mjs}', 'src/**/*.test.mjs'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'tests/']
        }
    }
});
