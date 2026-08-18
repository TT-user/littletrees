# Little Trees — a raspagem da loja de origem

Como o material do catálogo foi obtido. O site em si está descrito no README
da raiz.

## O que já está aqui

- `produtos.json` — 72 produtos raspados de `littletree.com.br/little-trees`
  (páginas 1 e 2 — a categoria inteira, não há página 3). Cada item traz
  `id`, `nome`, `slug`, `sku`, `url` de origem, `disponivel`, `selos`,
  `preco` (`de`, `por`, `pix`, `a_partir_de`, `valor`) e `arquivos`
  (caminhos das imagens locais).
- `img/produtos/` — 142 imagens (a principal e a de hover de cada produto),
  nomeadas `<slug>-1` / `<slug>-2`, exatamente como vieram do CDN.
- `normalizado.json` — os mesmos 72 SKUs já com aroma, formato e preço separados.

## Ressalvas do material de origem

- **57 dos 72 produtos estão indisponíveis** na loja de origem, e 55 deles não
  exibem preço nenhum na listagem. De outros dois a loja devolveu a variável do
  template crua (`R$ --PRODUTO_PRECO_POR--`), que o normalizador descarta. Sobram
  **15 produtos com preço de verdade**. Pedir ao cliente a tabela e o estoque real.
- As imagens foram pedidas ao CDN em 800x800, mas ele não faz upscale: o que veio
  vai de 425x425 a 800x800, e algumas não são quadradas (ex.: 436x492, 800x665).
  Por isso existe o `npm run imagens`, que gera `img/catalogo/` em 800x800 com
  fundo branco. Cinco imagens de hover são pequenas demais (a menor é 90x216) e
  saem borradas — valeria pedir as originais ao cliente.
- Os nomes vêm poluídos com cauda de SEO ("..., Ideal Para Seu Carro e
  Ambientes"). Para o catálogo, extrair só o nome do aroma.
- As imagens são da loja do cliente; confirmar com ele que pode reusá-las.

## Como refazer

Da raiz do projeto, na ordem: `npm run raspa`, `npm run baixa`,
`npm run imagens`, `npm run normaliza`. O README da raiz explica o que cada
passo produz.

Os HTMLs de origem estão salvos aqui como `p1.html` e `p2.html` (snapshot de
18/08/2026). Para pegar de novo:

```
curl -A "Mozilla/5.0" "https://www.littletree.com.br/little-trees" -o _fonte/p1.html
curl -A "Mozilla/5.0" "https://www.littletree.com.br/little-trees?pagina=2" -o _fonte/p2.html
```
