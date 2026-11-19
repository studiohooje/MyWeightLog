import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const app = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(app, 'icon.svg');
const svg = await fs.readFile(source);
const png = (size, input = svg) => sharp(input, { density: 192 }).resize(size, size).png().toBuffer();

await fs.writeFile(path.join(app, 'icon-192.png'), await png(192));
await fs.writeFile(path.join(app, 'icon-512.png'), await png(512));
await fs.writeFile(path.join(app, 'apple-touch-icon.png'), await png(180));

// Adaptive icons use a transparent foreground inside Android's central safe area.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(76.8 76.8) scale(0.7)"><circle cx="256" cy="256" r="178" fill="#202d4c" stroke="#8293ae" stroke-width="5"/><g transform="translate(35.84 35.84) scale(0.86)"><path d="M198 151Q256 119 314 151" fill="none" stroke="#b8aaf2" stroke-width="15" stroke-linecap="round"/><path d="M154 340v-111q0-37 39-37h125q39 0 39 37v111" fill="none" stroke="#9cb7f3" stroke-width="25" stroke-linecap="round"/><path d="M256 192v160" stroke="#edf4f8" stroke-width="25" stroke-linecap="round"/><circle cx="154" cy="352" r="24" fill="#9cb7f3"/><circle cx="256" cy="352" r="24" fill="#edf4f8"/><circle cx="358" cy="352" r="24" fill="#9cb7f3"/></g></g></svg>`;
const res = path.join(app, 'android', 'app', 'src', 'main', 'res');
const hasAndroid = !!(await fs.stat(res).catch(() => null));
if (hasAndroid) {
for (const [density, size, foregroundSize] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
  const dir = path.join(res, `mipmap-${density}`);
  await fs.writeFile(path.join(dir, 'ic_launcher.png'), await png(size));
  await fs.writeFile(path.join(dir, 'ic_launcher_round.png'), await png(size));
  await fs.writeFile(path.join(dir, 'ic_launcher_foreground.png'), await png(foregroundSize, Buffer.from(foreground)));
}
for (const folder of ['drawable','drawable-land-mdpi','drawable-land-hdpi','drawable-land-xhdpi','drawable-land-xxhdpi','drawable-land-xxxhdpi','drawable-port-mdpi','drawable-port-hdpi','drawable-port-xhdpi','drawable-port-xxhdpi','drawable-port-xxxhdpi']) {
  const file = path.join(res, folder, 'splash.png');
  const { width, height } = await sharp(file).metadata();
  const size = Math.round(Math.min(width, height) * 0.34);
  const mark = await png(size);
  const background = await sharp({ create: { width, height, channels: 4, background: '#101625' } })
    .composite([{ input: mark, left: Math.round((width - size) / 2), top: Math.round((height - size) / 2) }])
    .png().toBuffer();
  await fs.writeFile(file, background);
}
}
console.log(`Web and iPhone icons generated${hasAndroid ? ', including Android launcher and splash assets' : ''}`);
