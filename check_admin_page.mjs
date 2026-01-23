import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const consoleMessages = [];
const errors = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleMessages.push(`CONSOLE ERROR: ${msg.text()}`);
  }
});

page.on('pageerror', err => {
  errors.push(`PAGE ERROR: ${err.message}`);
});

try {
  console.log('=== PAGE LOAD CHECK ===');
  const response = await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Status: ${response.status()} ${response.status() === 200 ? 'OK' : 'ERROR'}`);

  console.log('\n=== PAGE TITLE ===');
  const title = await page.title();
  console.log(`Title: ${title}`);

  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleMessages.length === 0 && errors.length === 0) {
    console.log('No console errors detected');
  } else {
    consoleMessages.forEach(m => console.log(m));
    errors.forEach(e => console.log(e));
  }

  console.log('\n=== PAGE SNAPSHOT ===');
  await page.screenshot({ path: '/tmp/admin_page_snapshot.png', fullPage: true });
  console.log('Screenshot saved to /tmp/admin_page_snapshot.png');

  console.log('\n=== MAIN UI ELEMENTS ===');
  const bodyContent = await page.textContent('body');
  const bodyPreview = bodyContent ? bodyContent.substring(0, 500) : 'No content';
  console.log(`Body preview: ${bodyPreview.replace(/\s+/g, ' ')}...`);

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await browser.close();
}
