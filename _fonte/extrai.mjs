import fs from 'node:fs';
import path from 'node:path';

const aqui = import.meta.dirname;

const limpa = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const slug = (s) => limpa(s).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

const produtos = [];
const vistos = new Set();

for (const pagina of [1, 2]) {
  const html = fs.readFileSync(path.join(aqui, `p${pagina}.html`), 'utf8');
  for (const bloco of html.split('<div class="listagem-item').slice(1)) {
    const id = bloco.match(/data-id="(\d+)"/)?.[1];
    if (!id || vistos.has(id)) continue;
    vistos.add(id);

    const cabecalho = bloco.slice(0, bloco.indexOf('>'));
    const nome = limpa(bloco.match(/class="nome-produto[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
    const url = bloco.match(/href="(https:\/\/www\.littletree\.com\.br\/[^"]+)"/)?.[1] || '';
    const sku = limpa(bloco.match(/class="produto-sku hide">([^<]*)</)?.[1] || '');

    const imagens = [];
    const principal = bloco.match(/<img[^>]*class="imagem-principal"[^>]*>/)?.[0] || '';
    const src = principal.match(/src="([^"]+)"/)?.[1];
    const hover = principal.match(/data-imagem-caminho="([^"]+)"/)?.[1];
    if (src) imagens.push(src);
    if (hover && hover !== src) imagens.push(hover);

    const promo = limpa(bloco.match(/class="preco-promocional[^"]*"[^>]*>([\s\S]*?)<\/strong>/)?.[1] || '');
    const riscado = limpa(bloco.match(/<s class="preco-venda titulo">([\s\S]*?)<\/s>/)?.[1] || '');
    const cheio = limpa(bloco.match(/<strong class="preco-venda[^"]*">([\s\S]*?)<\/strong>/)?.[1] || '');
    const pix = limpa(bloco.match(/class="desconto-a-vista">[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/)?.[1] || '');

    produtos.push({
      id, nome, slug: slug(nome), sku, url, pagina,
      disponivel: !/\bindisponivel\b/.test(cabecalho),
      selos: [...bloco.matchAll(/class="[^"]*bandeira-[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => limpa(m[1])),
      preco: {
        de: promo ? riscado : '',
        por: promo || cheio,
        pix,
        a_partir_de: /preco-a-partir/.test(bloco),
        valor: bloco.match(/data-sell-price="([\d.]+)"/)?.[1] || '',
      },
      imagens,
    });
  }
}

fs.writeFileSync(path.join(aqui, 'produtos.json'), JSON.stringify(produtos, null, 2));
const semPreco = produtos.filter((p) => !p.preco.por);
console.log('produtos:', produtos.length, '| imagens:', produtos.reduce((a, p) => a + p.imagens.length, 0));
console.log('indisponiveis:', produtos.filter((p) => !p.disponivel).length);
console.log('sem preco:', semPreco.length, '| destes, indisponiveis:', semPreco.filter((p) => !p.disponivel).length);
console.log('sem imagem:', produtos.filter((p) => !p.imagens.length).length);
