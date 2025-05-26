#!/usr/bin/env node

import { build } from 'esbuild';
import { readFileSync, writeFileSync, chmodSync, unlinkSync } from 'fs';
import { join } from 'path';

const sharedConfig = {
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  external: [],
  minify: false,
  sourcemap: false,
};

async function buildExecutables() {
  console.log('Building self-contained executables...');

  // Build main CLI executable (supports both stdio and http via --transport flag)
  await build({
    ...sharedConfig,
    entryPoints: ['src/cli.ts'],
    outfile: 'build/kev-mcp-bundle.cjs',
  });

  // Build HTTP-specific executable
  await build({
    ...sharedConfig,
    entryPoints: ['src/cli-http.ts'],
    outfile: 'build/kev-mcp-http-bundle.cjs',
  });

  // Build server module (for programmatic use)
  await build({
    ...sharedConfig,
    entryPoints: ['src/index.ts'],
    outfile: 'build/index-bundle.js',
    format: 'esm', // Keep ESM for library
  });

  // Add shebangs to CLI executables
  const files = ['build/kev-mcp-bundle.cjs', 'build/kev-mcp-http-bundle.cjs'];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      writeFileSync(file, '#!/usr/bin/env node\n' + content);
    }
    chmodSync(file, '755');
  }

  // Clean up old .js bundle files
  const oldFiles = ['build/kev-mcp-bundle.js', 'build/kev-mcp-http-bundle.js'];
  for (const file of oldFiles) {
    try {
      unlinkSync(file);
      console.log(`🧹 Cleaned up old bundle: ${file}`);
    } catch (err) {
      // File doesn't exist, ignore
    }
  }

  console.log('✅ Built self-contained executables:');
  console.log('  - build/kev-mcp-bundle.cjs (CLI executable - stdio/http)');
  console.log('  - build/kev-mcp-http-bundle.cjs (HTTP-only executable)');
  console.log('  - build/index-bundle.js (library)');
  console.log('');
  console.log('Usage examples:');
  console.log('  npx @hrbrmstr/kev-mcp                    # stdio transport (default)');
  console.log('  npx @hrbrmstr/kev-mcp --transport http   # http transport');
  console.log('  npx @hrbrmstr/kev-mcp-http              # http transport (direct)');
}

buildExecutables().catch(console.error);