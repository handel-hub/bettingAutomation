import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.{test,spec}.{js,mjs}'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'tests/']
        }
    }
});
