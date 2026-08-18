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
await pagina.locator('.vitrine').screenshot({ path: 'tela-6-vitrine.png' });
await pagina.screenshot({ path: 'tela-2-inteira.png', fullPage: true });

// ---------- faixa dos campeoes ----------
const vitrine = await pagina.evaluate(() => {
  const faixa = document.querySelector(".vitrine");
  const pista = document.querySelector(".pista");
  const r = faixa.getBoundingClientRect();
  return {
    itens: document.querySelectorAll(".vitrine-item").length,
    nomes: [...document.querySelectorAll(".vitrine-nome")].map((n) => n.textContent),
    desenhosNaPista: pista.children.length,
    pistaAnimada: getComputedStyle(pista).animationName,
    dobroExato: pista.children.length % 2 === 0,
    visivelNaPrimeiraTela: r.top < window.innerHeight && r.bottom > 0,
    fimDaFaixa: Math.round(r.bottom),
  };
});
console.log("vitrine:", JSON.stringify(vitrine));


// ---------- travessao, selecao e copia ----------
const trava = await pagina.evaluate(() => {
  const visivel = document.body.innerText;
  const copia = new Event('copy', { bubbles: true, cancelable: true });
  document.querySelector('h1').dispatchEvent(copia);
  const busca = document.querySelector('#busca');
  return {
    travessoesNaTela: (visivel.match(/[–—]/g) || []).length,
    selecaoNoBody: getComputedStyle(document.body).userSelect,
    selecaoNaBusca: getComputedStyle(busca).userSelect,
    copiaBloqueada: copia.defaultPrevented,
  };
});
console.log('trava:', JSON.stringify(trava));

// ---------- a pista cobre a tela inteira? ----------
const pista = await pagina.evaluate(() => {
  const p = document.querySelector('.pista');
  return {
    desenhos: p.children.length,
    metadeDaPista: Math.round(p.scrollWidth / 2),
    larguraDaTela: window.innerWidth,
    cobreATela: p.scrollWidth / 2 >= window.innerWidth,
    animacao: getComputedStyle(p).animationName,
    repeticao: getComputedStyle(p).animationIterationCount,
  };
});
console.log('pista:', JSON.stringify(pista));

// ---------- favicon ----------
for (const arq of ['assets/favicon.svg', 'assets/favicon-32.png', 'assets/favicon-180.png']) {
  const r = await pagina.request.get('http://localhost:4321/' + arq);
  console.log('favicon', arq, r.status());
}

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
await mob.screenshot({ path: 'tela-7-mobile-topo.png' });
await mob.locator('.cartao .mais').first().click();
console.log('barra mobile visivel:', await mob.locator('#barra-kit').isVisible());

await mob.evaluate(() => window.scrollTo(0, 0));
await mob.waitForTimeout(200);
const medidas = await mob.evaluate(() => ({
  topo: document.querySelector('.topo').offsetHeight,
  varTopo: getComputedStyle(document.documentElement).getPropertyValue('--topo-altura').trim(),
  faixaNaPrimeiraTela: document.querySelector(".vitrine").getBoundingClientRect().bottom <= window.innerHeight,
  fimDaFaixa: Math.round(document.querySelector(".vitrine").getBoundingClientRect().bottom),
  alturaTela: window.innerHeight,
  chipsUmaLinha: document.querySelector('.chips').scrollHeight <= 44,
  scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth,
}));
console.log('mobile:', JSON.stringify(medidas));
await mob.screenshot({ path: 'tela-5-mobile.png' });

// ---------- varredura do mobile ----------
await mob.locator('#kits').scrollIntoViewIfNeeded();
await mob.waitForTimeout(200);
await mob.screenshot({ path: 'tela-8-mobile-kits.png' });

const secaoKits = await mob.evaluate(() => ({
  colunas: getComputedStyle(document.querySelector('.grade-kits')).gridTemplateColumns.split(' ').length,
  alturaSecao: document.querySelector('#kits').offsetHeight,
}));
console.log('secao kits mobile:', JSON.stringify(secaoKits));

await mob.evaluate(() => window.scrollTo(0, 900));
await mob.locator('.cartao-foto').first().click();
await mob.waitForSelector('.mini-escada');
await mob.waitForTimeout(300);
await mob.screenshot({ path: 'tela-9-mobile-modal.png' });
const modal = await mob.evaluate(() => {
  const c = document.querySelector('.modal-caixa');
  return { caixaCabe: c.scrollHeight <= c.clientHeight, alturaCaixa: c.clientHeight, conteudo: c.scrollHeight };
});
console.log('modal mobile:', JSON.stringify(modal));
await mob.keyboard.press('Escape');

await mob.locator('#barra-abrir').click();
await mob.waitForSelector('#painel:not([hidden])');
await mob.waitForTimeout(400);
await mob.screenshot({ path: 'tela-10-mobile-painel.png' });
const painel = await mob.evaluate(() => ({
  larguraPainel: document.querySelector('.painel').offsetWidth,
  larguraTela: window.innerWidth,
  botaoAlcancavel: document.querySelector('#fechar-pedido').getBoundingClientRect().bottom <= window.innerHeight,
}));
console.log('painel mobile:', JSON.stringify(painel));
await mob.keyboard.press('Escape');

console.log('\nERROS:', erros.length, '| precos errados:', falhas);
erros.forEach((e) => console.log('  ', e));

await navegador.close();
servidor.close();
