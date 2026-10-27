import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'explore', path: '/explore' },
];

async function capture() {
  console.log('📸 Taking responsive screenshots...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

    for (const route of ROUTES) {
      const url = `http://localhost:5000${route.path}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        const filename = `${route.name}-${vp.width}.png`;
        const filepath = path.join(OUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`  ✅ Saved ${filename} (${vp.width}x${vp.height})`);
      } catch (err) {
        console.error(`  ❌ Failed ${route.name} at ${vp.width}px: ${err.message}`);
      }
    }
  }

  await browser.close();
  console.log(`\n🎉 Screenshots completed in ${OUT_DIR}`);
}

capture().catch((err) => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
