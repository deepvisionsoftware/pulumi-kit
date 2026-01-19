import { defineConfig } from 'rolldown';

export default defineConfig([
  // Main entry point
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      cleanDir: true,
      format: 'esm',
    },
    platform: 'node',
    tsconfig: true,
    external: [/^@pulumi\//, /^yaml$/],
  },
  // Cloudflare module
  {
    input: 'src/cloudflare/index.ts',
    output: {
      dir: 'dist/cloudflare',
      cleanDir: true,
      format: 'esm',
    },
    platform: 'node',
    tsconfig: true,
    external: [/^@pulumi\//, /^yaml$/],
  },
  // GCP module
  {
    input: 'src/gcp/index.ts',
    output: {
      dir: 'dist/gcp',
      cleanDir: true,
      format: 'esm',
    },
    platform: 'node',
    tsconfig: true,
    external: [/^@pulumi\//, /^yaml$/],
  },
  // GitHub module
  {
    input: 'src/github/index.ts',
    output: {
      dir: 'dist/github',
      cleanDir: true,
      format: 'esm',
    },
    platform: 'node',
    tsconfig: true,
    external: [/^@pulumi\//, /^yaml$/],
  },
]);
