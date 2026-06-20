import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const indexFile = resolve(distDir, 'index.html');

await mkdir(resolve(distDir, 'help'), { recursive: true });
await writeFile(resolve(distDir, '.nojekyll'), '');
await copyFile(indexFile, resolve(distDir, 'help', 'index.html'));
await copyFile(indexFile, resolve(distDir, '404.html'));
