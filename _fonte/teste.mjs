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
            '| especiais:', await pagina.locator('.especial').count(),
            '| chips:', await pagina.locator('.chip').count());
console.log('resultado:', await pagina.locator('#resultado').textContent());

await pagina.screenshot({ path: 'tela-1-topo.png' });
await pagina.screenshot({ path: 'tela-2-inteira.png', fullPage: true });

for (let i = 0; i < 3; i++) await pagina.locator('.cartao .mais').first().click();
console.log('contador apos 3 cliques:', await pagina.locator('#contador-kit').textContent());

const mais = pagina.locator('.cartao[data-escolhido="sim"] [data-mais]').first();
for (let i = 0; i < 4; i++) await mais.click();
console.log('contador apos +4:', await pagina.locator('#contador-kit').textContent());
console.log('preco no card:', await pagina.locator('.cartao-preco').first().textContent());

await pagina.locator('.chip').first().click();
console.log('filtro familia:', await pagina.locator('#resultado').textContent());
await pagina.locator('.chip').first().click();

await pagina.locator('#busca').fill('baunilha');
await pagina.waitForTimeout(250);
console.log('busca baunilha:', await pagina.locator('#resultado').textContent());
await pagina.locator('#busca').fill('');
await pagina.waitForTimeout(250);

await pagina.locator('.cartao-foto').first().click();
await pagina.waitForSelector('#modal-caixa .formato');
console.log('modal:', await pagina.locator('#modal-titulo').textContent(),
            '| formatos:', await pagina.locator('#modal-caixa .formato').count());
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: 'tela-3-modal.png' });
await pagina.keyboard.press('Escape');

await pagina.locator('.especial .mais').first().click();

await pagina.locator('#abrir-kit').click();
await pagina.waitForSelector('#painel:not([hidden])');
await pagina.waitForTimeout(400);
console.log('itens no painel:', await pagina.locator('.item-kit').count());
console.log('total:', await pagina.locator('.linha-total.grande b').textContent());
console.log('aviso:', await pagina.locator('.aviso-faixa').allTextContents());
await pagina.screenshot({ path: 'tela-4-kit.png' });

pagina.on('dialog', async (d) => { console.log('--- mensagem ---\n' + d.message()); await d.dismiss(); });
await pagina.locator('#fechar-pedido').click();
await pagina.waitForTimeout(400);
await pagina.keyboard.press('Escape');

await pagina.reload({ waitUntil: 'networkidle' });
console.log('contador apos reload:', await pagina.locator('#contador-kit').textContent());

// ---------- mobile ----------
const mob = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await mob.locator('.cartao .mais').first().click();
console.log('barra mobile visivel:', await mob.locator('#barra-kit').isVisible());

const medidas = await mob.evaluate(() => {
  const topo = document.querySelector('.topo');
  const chips = document.querySelector('.chips');
  const filtros = document.querySelector('.filtros');
  return {
    topo: topo.offsetHeight,
    varTopo: getComputedStyle(document.documentElement).getPropertyValue('--topo-altura').trim(),
    filtrosTop: Math.round(filtros.getBoundingClientRect().top),
    chipsUmaLinha: chips.scrollHeight <= 44,
    seloSobEncomenda: document.querySelectorAll('.selo.fora').length,
    scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth,
  };
});
console.log('mobile:', JSON.stringify(medidas));
await mob.screenshot({ path: 'tela-5-mobile.png' });

// o card mais alto e o mais baixo, pra ver se o rodape do card corta
const cards = await mob.evaluate(() => {
  const alturas = [...document.querySelectorAll('.cartao')].map((c) => c.offsetHeight);
  return { min: Math.min(...alturas), max: Math.max(...alturas) };
});
console.log('altura dos cards no mobile:', JSON.stringify(cards));

console.log('\nERROS:', erros.length);
erros.forEach((e) => console.log('  ', e));

await navegador.close();
servidor.close();
