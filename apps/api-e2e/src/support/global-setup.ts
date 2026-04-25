import * as net from 'net';

/* eslint-disable */

function waitForPortOpen(
  port: number,
  options: { host?: string; retries?: number; retryDelay?: number } = {},
): Promise<void> {
  const host = options.host ?? '127.0.0.1';
  const retryDelay = options.retryDelay ?? 1000;
  return new Promise((resolve, reject) => {
    const check = (retries = options.retries ?? 30) => {
      const client = new net.Socket();
      client.once('connect', () => {
        client.end();
        resolve();
      });
      client.once('error', () => {
        client.destroy();
        if (retries <= 0) {
          reject(new Error(`Port ${port} not open after retries`));
        } else {
          setTimeout(() => check(retries - 1), retryDelay);
        }
      });
      client.connect(port, host);
    };
    check();
  });
}

module.exports = async function () {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await waitForPortOpen(port, { host, retries: 30, retryDelay: 1000 });

  // Hint: Use `globalThis` to pass variables to global teardown.
  (globalThis as Record<string, unknown>)['__TEARDOWN_MESSAGE__'] =
    '\nTearing down...\n';
};
