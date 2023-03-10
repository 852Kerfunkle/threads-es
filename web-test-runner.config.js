import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { defaultReporter, summaryReporter } from '@web/test-runner';
//import { TestRunnerConfig } from '@web/test-runner';
import { chromeLauncher } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';

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
      //target: "auto",
      tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url))
    })
  ],
  reporters: [defaultReporter(), summaryReporter()],
  files: ['test/**/*.test.ts'],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000'
    },
  },
  port: 9876,
  nodeResolve: true,
  coverage: true,
  coverageConfig: {
    report: true,
    include: [
      'src/**/*'
    ],
    threshold: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
  browsers:
    process.env.USE_PLAYWRIGHT ? [
      playwrightLauncher({ product: 'chromium' }),
      // Would need to transform with with rollup to test on firefox.
      // Or wait for ff 111, which will supports module workers, apparently.
      //playwrightLauncher({ product: 'firefox' }),
      playwrightLauncher({ product: 'webkit' })
    ] : [
      chromeLauncher()
    ]
};

export default config;