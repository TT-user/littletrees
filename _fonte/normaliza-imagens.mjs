import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// As fotos da loja de origem vem em tamanhos e proporcoes variadas (de 90px a
// 800px de lado). Aqui viram todas 800x800 com fundo branco, sem cortar nada,
// pra grade do catalogo nao ficar irregular.
const aqui = import.meta.dirname;
const origem = path.join(aqui, '..', 'img', 'produtos');
const destino = path.join(aqui, '..', 'img', 'catalogo');
fs.mkdirSync(destino, { recursive: true });

const LADO = 800;
const baixaRes = [];

for (const nome of fs.readdirSync(origem)) {
  const entrada = path.join(origem, nome);
  const meta = await sharp(entrada).metadata();
  if (Math.max(meta.width, meta.height) < 400) baixaRes.push(`${nome} (${meta.width}x${meta.height})`);
  const saida = path.join(destino, nome.replace(/\.(webp|png|jpe?g)$/i, '.jpg'));
  await sharp(entrada)
    .resize(LADO, LADO, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(saida);
}

console.log('normalizadas:', fs.readdirSync(destino).length, '->', destino);
console.log('baixa resolucao (vao aparecer borradas, pedir originais ao cliente):', baixaRes.length);
baixaRes.forEach((n) => console.log('  ', n));
