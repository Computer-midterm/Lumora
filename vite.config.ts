import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local-only: dev and preview servers bind to 127.0.0.1 (see package.json scripts).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
