import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { chromeLauncher } from '@web/test-runner-chrome';

export default {
  plugins: [
    esbuildPlugin({
      ts: true,
      tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url))
    })
  ],
  files: ['src/**/*.test.ts'],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000',
    },
  },
  port: 9876,
  watch: true,
  nodeResolve: true
};
