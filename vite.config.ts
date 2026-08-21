import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command }) => {
  const enableInsane = command === 'serve' || process.env.VITE_ENABLE_INSANE === 'true';

  return {
    base: '/cclog_sheet/',
    plugins: [react()],
    resolve: {
      alias: enableInsane
        ? []
        : [
            {
              find: /^\.\/lib\/insane$/,
              replacement: fileURLToPath(new URL('./src/lib/insane.production.ts', import.meta.url)),
            },
            {
              find: /^\.\/lib\/insaneAbilities$/,
              replacement: fileURLToPath(
                new URL('./src/lib/insaneAbilities.production.ts', import.meta.url),
              ),
            },
          ],
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
