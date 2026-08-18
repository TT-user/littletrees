import fs from 'node:fs';
import path from 'node:path';

const aqui = import.meta.dirname;
const destino = path.join(aqui, '..', 'img', 'produtos');
fs.mkdirSync(destino, { recursive: true });

const produtos = JSON.parse(fs.readFileSync(path.join(aqui, 'produtos.json'), 'utf8'));
const usados = new Map();
const falhas = [];

for (const p of produtos) {
  // slug pode repetir entre produtos diferentes; sufixa com o id quando repetir
  let base = p.slug;
  if (usados.has(base)) base = `${p.slug}-${p.id}`;
  usados.set(base, p.id);
  p.arquivos = [];

  for (const [i, url] of p.imagens.entries()) {
    const grande = url.replace('/300x300/', '/800x800/');
    const ext = path.extname(new URL(grande).pathname) || '.jpg';
    const nome = `${base}-${i + 1}${ext}`;
    const alvo = path.join(destino, nome);
    try {
      const r = await fetch(grande, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.littletree.com.br/' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) throw new Error(`corpo de ${buf.length} bytes`);
      fs.writeFileSync(alvo, buf);
      p.arquivos.push(`img/produtos/${nome}`);
    } catch (e) {
      falhas.push({ id: p.id, url: grande, erro: String(e.message) });
    }
  }
}

fs.writeFileSync(path.join(aqui, 'produtos.json'), JSON.stringify(produtos, null, 2));
console.log('baixadas:', produtos.reduce((a, p) => a + p.arquivos.length, 0), '| falhas:', falhas.length);
if (falhas.length) console.log(JSON.stringify(falhas, null, 1));
