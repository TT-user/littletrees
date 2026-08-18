/* Gera os PNGs do favicon a partir de assets/favicon.svg.
   O SVG serve pro navegador moderno; os PNGs cobrem o resto e o atalho do
   iPhone, que não aceita SVG. Roda com `npm run favicon`. */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const aqui = import.meta.dirname;
const svg = path.join(aqui, '..', 'assets', 'favicon.svg');
const destino = path.join(aqui, '..', 'assets');

const tamanhos = [
  ['favicon-32.png', 32],
  ['favicon-180.png', 180],
];

for (const [nome, lado] of tamanhos) {
  await sharp(svg, { density: 384 })
    .resize(lado, lado)
    .png({ compressionLevel: 9 })
    .toFile(path.join(destino, nome));
  console.log(nome, lado + 'x' + lado, fs.statSync(path.join(destino, nome)).size + ' bytes');
}
