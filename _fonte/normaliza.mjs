import fs from 'node:fs';
import path from 'node:path';

const aqui = import.meta.dirname;
const brutos = JSON.parse(fs.readFileSync(path.join(aqui, 'produtos.json'), 'utf8'));

// A loja de origem as vezes vaza a variavel do template no lugar do preco.
const precoValido = (s) => s && !s.includes('--PRODUTO_');

// 'R$ 74,90' -> 74.9. O data-sell-price so vem nos produtos em promocao.
const emReais = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.')) || null;

const FORMATOS = [
  [/vent\s*wrap/i,                                  { formato: 'vent-wrap',   rotulo: 'Vent Wrap',          unidades: 1 }],
  [/fiber\s*can|aromatizador em lata/i,             { formato: 'lata',        rotulo: 'Lata (Fiber Can)',   unidades: 1 }],
  [/spray/i,                                        { formato: 'spray',       rotulo: 'Spray 103 ml',       unidades: 1 }],
  [/x-?tra strength|extra grande/i,                 { formato: 'xtra',        rotulo: 'X-tra Strength',     unidades: 1 }],
  [/display box|24\s*unidades|pacote com 24|^24x/i, { formato: 'display-24',  rotulo: 'Display box 24un',   unidades: 24 }],
  [/(com|kit com)?\s*6\s*unidades/i,                { formato: 'kit-6',       rotulo: 'Kit 6 unidades',     unidades: 6 }],
  [/(com|kit com)?\s*3\s*unidades/i,                { formato: 'kit-3',       rotulo: 'Kit 3 unidades',     unidades: 3 }],
  [/sem cartela/i,                                  { formato: 'sem-cartela', rotulo: 'Avulso sem cartela', unidades: 1 }],
];

// Formatos que entram no montador de kit (cartela avulsa, vendida por unidade).
const AVULSOS = new Set(['unitario', 'sem-cartela']);

// Aromas que aparecem escritos de mais de um jeito na loja.
const APELIDOS = {
  'morango': 'Strawberry',
  'blackberry clove': 'BlackBerry Clove',
  'coral reel': 'Coral Reef',
  'lavander': 'Lavender',
  'jasmin': 'Jasmine',
  'melancia': 'Watermelon',
};

// Familia olfativa: classificacao nossa, feita pelo nome do aroma.
// O cliente precisa revisar antes de publicar.
const FAMILIAS = {
  'Bayside Breeze': 'fresco',   'Black Ice': 'fresco',        'Coral Reef': 'fresco',
  'Fresh Shave': 'fresco',      'Morning Fresh': 'fresco',    'Rainshine': 'fresco',
  'Summer Linen': 'fresco',     'Sunset Beach': 'fresco',     'True North': 'fresco',
  'BlackBerry Clove': 'frutal', 'Caribbean Colada': 'frutal', 'Cherry Blast': 'frutal',
  'Cinnamon Apple': 'frutal',   'Coconut': 'frutal',          'Dragon Fruit': 'frutal',
  'Green Apple': 'frutal',      'Lemon Grove': 'frutal',      'Pina Colada': 'frutal',
  'Sliced': 'frutal',           'Sour Pour': 'frutal',        'Strawberry': 'frutal',
  'Watermelon': 'frutal',       'Wild Cherry': 'frutal',
  'Bubble Gum': 'doce',         'Cotton Candy': 'doce',       'Enchanted': 'doce',
  'Vanilla Pride': 'doce',      'Vanillaroma': 'doce',
  'Cherry Blossom Honey': 'floral', 'Daisy Fields': 'floral', 'Jasmine': 'floral',
  'Lavender': 'floral',         'Rose Thorn': 'floral',
  'Gold': 'amadeirado',         'Heat': 'amadeirado',         'Leather': 'amadeirado',
  'No Smoking': 'amadeirado',   'Pure Steel': 'amadeirado',   'Royal Pine': 'amadeirado',
  'Spice Market': 'amadeirado', 'Supernova': 'amadeirado',    'Wild Hemp': 'amadeirado',
  'New Car': 'classico',
};

const limpaAroma = (nome) => {
  const s = nome
    .replace(/^\s*(pacote com\s*\d+|24x)\s*/i, '')
    .replace(/little\s*trees?/ig, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/,?\s*ideal para.*$/i, '')
    .replace(/-?\s*aromatizador em lata.*$/i, '')
    .replace(/\bvent\s*wrap\b/ig, ' ')
    .replace(/\bfiber\s*can\b/ig, ' ')
    .replace(/\bdisplay box\b/ig, ' ')
    .replace(/\bx-?tra strength\b/ig, ' ')
    .replace(/\bem spray\b.*$/i, '')
    .replace(/,?\s*aromatizador,?\s*\d+\s*ml/ig, ' ')
    .replace(/-?\s*(kit\s*)?(com\s*)?\d+\s*unidades?\b/ig, ' ')
    .replace(/\bsem cartela\b/ig, ' ')
    .replace(/\baromatizantes?\b/ig, ' ')
    .replace(/^\s*aroma\s+/i, ' ')
    .replace(/[-–—,]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return APELIDOS[s.toLowerCase()] || s;
};

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const foto = (caminho) => caminho
  ? caminho.replace('img/produtos/', 'img/catalogo/').replace(/\.(webp|png|jpeg)$/i, '.jpg')
  : '';

const itens = brutos.map((p) => {
  const achado = FORMATOS.find(([re]) => re.test(p.nome));
  const fmt = achado ? achado[1] : { formato: 'unitario', rotulo: 'Cartela avulsa', unidades: 1 };
  let aroma = limpaAroma(p.nome);
  let descricao = (p.nome.match(/\(([^)]+)\)/)?.[1] || '').trim();
  // nos display box o aroma vem dentro dos parenteses: 'Little Trees (No Smoking) 24 Unidades'
  if (!aroma && descricao) { aroma = descricao; descricao = ''; }
  return {
    id: p.id,
    sku: p.sku,
    aroma,
    ...fmt,
    descricao,
    disponivel: p.disponivel,
    preco: precoValido(p.preco.por) ? emReais(p.preco.por) : null,
    imagens: p.arquivos.map(foto),
    origem: p.url,
    nomeOriginal: p.nome,
  };
});

// Agrupa os SKUs pelo aroma: e o aroma que o visitante escolhe, nao o SKU.
const aromas = [];
for (const item of itens) {
  let a = aromas.find((x) => x.nome === item.aroma);
  if (!a) {
    a = {
      nome: item.aroma,
      slug: slug(item.aroma),
      familia: FAMILIAS[item.aroma] || 'especial',
      descricao: '',
      foto: '',
      formatos: [],
    };
    aromas.push(a);
  }
  if (!a.descricao && item.descricao) a.descricao = item.descricao;
  a.formatos.push({
    id: item.id,
    sku: item.sku,
    formato: item.formato,
    rotulo: item.rotulo,
    unidades: item.unidades,
    preco: item.preco,
    disponivel: item.disponivel,
    fotos: item.imagens,
    origem: item.origem,
    nomeOriginal: item.nomeOriginal,
  });
}

for (const a of aromas) {
  // a foto do card e a da cartela avulsa; se nao houver, a do primeiro formato
  const avulso = a.formatos.find((f) => AVULSOS.has(f.formato) && f.fotos.length);
  a.foto = (avulso || a.formatos.find((f) => f.fotos.length) || { fotos: [] }).fotos[0] || '';
  a.avulso = a.formatos.some((f) => AVULSOS.has(f.formato));
}
aromas.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));

const saida = [
  '// GERADO POR _fonte/normaliza.mjs - nao editar na mao.',
  '// Fonte: littletree.com.br/little-trees (paginas 1 e 2), snapshot de 18/08/2026.',
  'window.LT_AROMAS = ' + JSON.stringify(aromas, null, 2) + ';',
  '',
].join('\n');

fs.mkdirSync(path.join(aqui, '..', 'assets', 'js'), { recursive: true });
fs.writeFileSync(path.join(aqui, '..', 'assets', 'js', 'dados.js'), saida);
fs.writeFileSync(path.join(aqui, 'normalizado.json'), JSON.stringify(itens, null, 2));

const semFamilia = aromas.filter((a) => a.familia === 'especial').map((a) => a.nome);
console.log('aromas:', aromas.length, '| SKUs:', itens.length);
console.log('com cartela avulsa:', aromas.filter((a) => a.avulso).length);
console.log('com algum formato disponivel:', aromas.filter((a) => a.formatos.some((f) => f.disponivel)).length);
console.log('com preco em algum formato:', aromas.filter((a) => a.formatos.some((f) => f.preco)).length);
console.log('sem familia atribuida:', semFamilia.length, semFamilia.join(', '));
