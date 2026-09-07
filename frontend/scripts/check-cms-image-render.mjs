// Called by the CMS's isolated MinIO integration test, never with production URLs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const mobile = new URL(process.env.CMS_TEST_MOBILE_IMAGE_URL);
const desktop = new URL(process.env.CMS_TEST_DESKTOP_IMAGE_URL);
for (const url of [mobile, desktop]) {
  assert.equal(url.hostname, '127.0.0.1');
  assert.ok(url.pathname.startsWith('/svezapecanje-cms/media/'));
}
const socket = createServer();
socket.listen(0, '127.0.0.1');
await once(socket, 'listening');
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: { ...process.env, NODE_ENV: 'development', CMS_S3_PUBLIC_URL: `${mobile.origin}/svezapecanje-cms`, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', data => { log += data; });
child.stderr.on('data', data => { log += data; });
let browser;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (log.includes('Ready in')) break;
    if (child.exitCode !== null) throw new Error(log);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const optimize = (url, width) => `${base}/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
  const mobileURL = optimize(mobile.href, 640);
  const desktopURL = optimize(desktop.href, 1200); // A standard Next.js deviceSize.
  for (const url of [mobileURL, desktopURL]) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`frontend image optimizer: ${response.status} ${await response.text()}`);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<style>body{margin:0}img{display:block;width:100%;height:auto}</style><picture><source media="(min-width:800px)" srcset="${desktopURL.replaceAll('&', '&amp;')}"><img src="${mobileURL.replaceAll('&', '&amp;')}" alt="Probni prikaz štapa i mašinice"></picture>`);
    await page.locator('img').evaluate(image => image.decode());
    const dimensions = await page.locator('img').evaluate(image => ({ natural: image.naturalWidth, rendered: image.getBoundingClientRect().width }));
    assert.ok(dimensions.natural > 0);
    assert.equal(dimensions.rendered, width);
  }
  console.log('PASS: actual MinIO images render through the frontend Next.js optimizer at 320px and 1280px');
} catch (error) {
  console.error(log);
  throw error;
} finally {
  await browser?.close();
  if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
}
