/**
 * Foreground preview server for CI and Playwright.
 *
 * `astro preview` daemonises itself and returns, which makes Playwright's
 * `webServer` think the process died. Calling the API directly keeps the
 * server attached to this process, with identical routing to `astro preview`.
 */
import { preview } from 'astro';

const port = Number(process.env.PORT ?? process.argv[2] ?? 4322);
const host = process.env.HOST ?? '127.0.0.1';

const server = await preview({
  logLevel: 'error',
  server: { port, host },
});

console.log(`preview ready on http://${host}:${port}`);

const shutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await server.closed();
