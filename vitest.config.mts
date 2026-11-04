import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  // Browser tests in e2e/ run under Playwright with npm run test:e2e.
  test: { exclude: [...configDefaults.exclude, 'e2e/**', '.next/**', '.next-dev/**'] },
});
