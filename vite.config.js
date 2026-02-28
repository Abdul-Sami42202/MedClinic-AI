import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                signin: resolve(__dirname, 'signin.html'),
                signup: resolve(__dirname, 'signup.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
            },
        },
    },
});
