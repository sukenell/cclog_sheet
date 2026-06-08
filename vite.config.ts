import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cclog_sheet/',
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
});
