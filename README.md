# Little Trees — catálogo de aromas

Site de catálogo em que o visitante escolhe os aromas um a um, monta o kit na
quantidade que quiser e fecha o pedido pelo WhatsApp. HTML/CSS/JS puro, sem
build: é só abrir o `index.html` ou publicar a pasta.

```
index.html              a página inteira
assets/css/style.css
assets/js/dados.js      GERADO — 43 aromas com seus formatos, preços e fotos
assets/js/loja.js       filtros, montador de kit, painel e mensagem do WhatsApp
img/catalogo/           142 fotos normalizadas em 800x800 (as que o site usa)
img/produtos/           as mesmas fotos como vieram da loja de origem
_fonte/                 a raspagem e os scripts que geram tudo acima
```

## Como funciona

- **Cartela avulsa** — o visitante escolhe aroma por aroma e a unidade fica mais
  barata conforme o kit cresce (faixas em `CONFIG.faixas`). São 40 aromas.
- **Formatos fechados** — kit de 3 e 6, Vent Wrap, lata, spray, display box de
  24. Cada um é um produto com preço próprio, listado na seção "Além da cartela".
- O kit fica salvo no `localStorage`, então não se perde ao recarregar.
- "Fechar pedido" monta a mensagem e abre o WhatsApp. **Sem número configurado,
  o botão copia a mensagem** em vez de abrir a conversa.

## Antes de publicar — 4 pendências com o cliente

Tudo isso está no topo de `assets/js/loja.js`, em `CONFIG`:

1. **`whatsapp`** — está vazio. Precisa do número no formato `55DDDNUMERO`.
2. **`faixas`** — os preços por faixa são **provisórios**. A loja de origem só
   exibia preço em 15 dos 72 produtos (o resto está fora de estoque lá), então
   as faixas foram montadas a partir do que sobrou: cartela avulsa a
   R$ 13,90–14,90 e kit de 6 por R$ 74,90 (= R$ 12,48/un). Precisa da tabela real.
3. **`respeitarEstoque`** — está `false`. A raspagem trouxe 57 dos 72 SKUs como
   indisponíveis, o que provavelmente é estoque velho da loja antiga. Enquanto
   for `false`, o catálogo mostra tudo e não exibe selo de "sob encomenda".
   Vire pra `true` quando o estoque real entrar no `dados.js`.
4. **Famílias olfativas** — Fresco / Frutal / Doce / Floral / Amadeirado /
   Clássico foram atribuídas por nós, pelo nome do aroma (mapa `FAMILIAS` em
   `_fonte/normaliza.mjs`). O cliente precisa revisar.

Além disso: o logo é um wordmark provisório com uma arvorezinha em SVG — trocar
pela identidade real da loja. E as fotos são da loja de origem; confirmar com o
cliente que pode reusá-las.

## Pipeline dos dados

```
npm install
npm run raspa       # _fonte/p1.html + p2.html  ->  _fonte/produtos.json
npm run baixa       # baixa as 142 fotos        ->  img/produtos/
npm run imagens     # 800x800 fundo branco      ->  img/catalogo/
npm run normaliza   # agrupa por aroma          ->  assets/js/dados.js
npm run teste       # smoke test no navegador (precisa de playwright)
```

`assets/js/dados.js` é gerado — editar `_fonte/normaliza.mjs` e rodar de novo,
nunca o arquivo direto. Os detalhes da raspagem estão em `_fonte/LEIA-ME.md`.
