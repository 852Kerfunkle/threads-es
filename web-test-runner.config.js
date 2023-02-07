import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
//import { playwrightLauncher } from '@web/test-runner-playwright';

const config = {
  plugins: [
    /*{
      name: 'add-coop-coep-headers',
      transform(context) {
        //console.log(context.path)
        //if (context.path === '/') {
          //console.log(context)
          context.set('Cross-Origin-Embedder-Policy', 'require-corp');
          context.set('Cross-Origin-Opener-Policy', 'same-origin');
        //}
      },
    },*/
    esbuildPlugin({
      ts: true,
      tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url))
    })
  ],
  files: ['test/**/*.test.ts'],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000',
    },
  },
  port: 9876,
  watch: true,
  nodeResolve: true,
  coverage: true,
  /*browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' })
  ],*/
};

export default config;