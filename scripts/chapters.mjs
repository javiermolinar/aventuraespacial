import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Reuse Vite's TypeScript/module loader; no extra runtime dependency or listening server.
const root = fileURLToPath(new URL('..', import.meta.url));
let server;
try {
  server = await createServer({
    root, configFile: false, logLevel: 'error', appType: 'custom',
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  const { run } = await server.ssrLoadModule('/scripts/chapter-tools.ts');
  process.exitCode = await run(process.argv[2], process.argv.slice(3), root);
} catch (error) {
  console.error(`Chapter tool failed: ${error.message}`);
  process.exitCode = 1;
} finally { await server?.close(); }
