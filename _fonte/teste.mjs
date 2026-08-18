/* Smoke test no navegador: sobe a pasta num servidor local, abre o catálogo e
   confere as contas da tabela de preços, os filtros, o painel e o link do
   WhatsApp. Roda com `npm run teste`. */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };

const servidor = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const alvo = path.join(raiz, rel === '/' ? 'index.html' : rel);
  if (!alvo.startsWith(raiz) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
    res.writeHead(404); return res.end('nao encontrado');
  }
  res.writeHead(200, { 'content-type': tipos[path.extname(alvo)] || 'application/octet-stream' });
  fs.createReadStream(alvo).pipe(res);
});
await new Promise((ok) => servidor.listen(4321, ok));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });

const erros = [];
pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
pagina.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
pagina.on('requestfailed', (r) => erros.push('request: ' + r.url().replace('http://localhost:4321', '') + ' ' + r.failure()?.errorText));

await pagina.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

console.log('cartoes:', await pagina.locator('.cartao').count(),
            '| kits:', await pagina.locator('.kit').count(),
            '| chips:', await pagina.locator('.chip').count(),
            '| selos "mais vendido":', await pagina.locator('.selo.vendido').count());
console.log('resultado:', await pagina.locator('#resultado').textContent());

await pagina.screenshot({ path: 'tela-1-topo.png' });
await pagina.screenshot({ path: 'tela-2-inteira.png', fullPage: true });

// ---------- a escada de preço ----------
const preco = () => pagina.locator('.cartao-preco b').first().textContent();
const alvo = pagina.locator('.cartao [data-add]').first();

// o toLocaleString do pt-BR separa "R$" do número com espaço não-quebrável
const normal = (s) => s.replace(/ /g, ' ').trim();

const esperado = [[1, 'R$ 19,90'], [3, 'R$ 15,00'], [10, 'R$ 12,90'], [24, 'R$ 11,90'], [50, 'R$ 9,90']];
let cliques = 0;
let falhas = 0;
for (const [qtd, valor] of esperado) {
  while (cliques < qtd) { await alvo.click(); cliques++; }
  const lido = normal(await preco());
  if (lido !== valor) falhas++;
  console.log(`${String(qtd).padStart(2)} un -> ${lido} ${lido === valor ? 'ok' : 'ERRADO, esperava ' + valor}`);
}

await pagina.locator('#abrir-kit').click();
await pagina.waitForSelector('#painel:not([hidden])');
await pagina.waitForTimeout(400);
console.log('faixa no painel:', (await pagina.locator('.linha-total').nth(1).textContent()).replace(/\s+/g, ' ').trim());
console.log('total 50 un:', await pagina.locator('.linha-total.grande b').textContent());
console.log('aviso:', await pagina.locator('.aviso-faixa').textContent());
await pagina.screenshot({ path: 'tela-4-kit.png' });

// ---------- o link do WhatsApp ----------
const [aba] = await Promise.all([
  pagina.waitForEvent('popup'),
  pagina.locator('#fechar-pedido').click(),
]);
const url = aba.url();
await aba.close();
console.log('whatsapp:', url.split('?')[0]);
console.log('--- resumo enviado ---');
console.log(decodeURIComponent(url.split('text=')[1] || ''));

await pagina.keyboard.press('Escape');

// ---------- filtros ----------
await pagina.locator('.chip.destaque').click();
console.log('so mais vendidos:', await pagina.locator('#resultado').textContent());
await pagina.locator('.chip.destaque').click();

await pagina.locator('#busca').fill('baunilha');
await pagina.waitForTimeout(250);
console.log('busca baunilha:', await pagina.locator('#resultado').textContent());
await pagina.locator('#busca').fill('');
await pagina.waitForTimeout(250);

// ---------- modal ----------
await pagina.locator('.cartao-foto').first().click();
await pagina.waitForSelector('.mini-escada');
console.log('modal:', await pagina.locator('#modal-titulo').textContent(),
            '| preco:', (await pagina.locator('.modal-preco-grande').textContent()).replace(/\s+/g, ' ').trim());
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: 'tela-3-modal.png' });
await pagina.keyboard.press('Escape');

await pagina.reload({ waitUntil: 'networkidle' });
console.log('contador apos reload:', await pagina.locator('#contador-kit').textContent());

// ---------- mobile ----------
const mob = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await mob.locator('.cartao .mais').first().click();
console.log('barra mobile visivel:', await mob.locator('#barra-kit').isVisible());

const medidas = await mob.evaluate(() => ({
  topo: document.querySelector('.topo').offsetHeight,
  varTopo: getComputedStyle(document.documentElement).getPropertyValue('--topo-altura').trim(),
  chipsUmaLinha: document.querySelector('.chips').scrollHeight <= 44,
  scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth,
}));
console.log('mobile:', JSON.stringify(medidas));
await mob.screenshot({ path: 'tela-5-mobile.png' });

console.log('\nERROS:', erros.length, '| precos errados:', falhas);
erros.forEach((e) => console.log('  ', e));

await navegador.close();
servidor.close();
