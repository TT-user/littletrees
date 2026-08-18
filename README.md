# Little Trees — catálogo de aromas

Site de catálogo em que o visitante escolhe os aromas um a um, monta o kit na
quantidade que quiser e fecha o pedido pelo WhatsApp com o resumo já pronto.
HTML/CSS/JS puro, sem build: é só abrir o `index.html` ou publicar a pasta.

```
index.html              a página inteira
assets/css/style.css    paleta tirada da cartela: amarelo, vermelho da marca, preto
assets/js/dados.js      GERADO: os aromas com fotos, descrição e família
assets/js/loja.js       tabela de preços, filtros, montador de kit e WhatsApp
assets/favicon.svg      arvorezinha no amarelo (favicon-32 e -180 saem dele)
img/catalogo/           fotos normalizadas em 800x800 (as que o site usa)
img/produtos/           as mesmas fotos como vieram da loja de origem
_fonte/                 a raspagem e os scripts que geram tudo acima
```

## Detalhes de comportamento

- **A quantidade dá pra digitar**, não só clicar no mais e no menos. Aceita até
  3 dígitos, descarta o que não for número, e as setas do teclado sobem e descem
  de um em um. Como cada tecla pode mudar a faixa de preço e redesenhar a página,
  o campo carrega um `data-onde` (grade, vitrine, painel ou modal) que serve pra
  devolver o foco no lugar certo depois do redesenho. Apagar o campo só tira o
  aroma do kit quando o visitante sai dele, senão o item sumiria no meio da
  digitação.
- **Sem seleção e sem cópia de texto**, a pedido. É `user-select: none` no body
  mais bloqueio dos eventos `copy`, `cut`, `selectstart` e `dragstart` no
  `loja.js`. A busca continua selecionável, senão não dá pra corrigir o que se
  digitou. Vale o aviso: isso é freio de mão, não cofre. Quem abrir o
  código-fonte da página continua enxergando o texto e as fotos.
- **A faixa dos campeões roda sempre.** A pista se remonta no `resize` repetindo
  os desenhos até a metade dela cobrir a tela, então nunca aparece um vão andando
  junto num monitor largo. Ela é a única animação que sobrevive ao
  `prefers-reduced-motion` (fica mais lenta, mas não para), porque o cliente
  pediu o efeito sempre ligado.
- **Sem travessões** no texto do site, por preferência de escrita.

## Tabela de preços

Fica em `FAIXAS`, no topo de `assets/js/loja.js` — é o único lugar do código que
define preço. O valor da unidade acompanha o **total de peças do pedido**, e o
cliente pode misturar os aromas que quiser dentro do kit.

| Kit | Quantidade | Por unidade | Origem do número |
|---|---|---|---|
| Unidade avulsa | 1 a 2 | R$ 19,90 | a loja vende a R$ 20,00; baixamos pra 19,90 |
| Kit 3 | 3 a 9 | R$ 15,00 | definido pelo cliente |
| Kit 10 | 10 a 23 | R$ 12,90 | definido pelo cliente |
| Pacote 24 | 24 a 49 | R$ 11,90 | **sugestão nossa** |
| Kit revenda | 50 ou mais | R$ 9,90 | **sugestão nossa** |

As duas últimas faixas continuam a escada que o cliente começou — precisam de
confirmação antes de publicar.

## Decisões que valem revisar

- **Os kits são por quantidade total, misturando aromas.** Quem leva 24 unidades
  paga R$ 11,90 em cada, mesmo que sejam 24 aromas diferentes. Se o pacote de 24
  tiver que ser de um aroma só, é mudar a regra em `totais()`.
- **Só cartela.** Lata (Fiber Can), spray, Vent Wrap e os kits fechados de 3 e 6
  da loja antiga ficaram de fora, a pedido. A constante `CARTELA` em `loja.js`
  controla isso; os dados dos outros formatos continuam no `dados.js`, então
  voltar atrás é trocar uma linha.
- Isso derrubou 3 aromas que só existiam nesses formatos: **Cherry Blast** (só
  lata), **Enchanted** e **Sour Pour** (só kit de 3). Sobraram 40 dos 43. Se a
  loja tiver esses três em cartela, é só mandar a foto.
- **Mais vendidos** (selo e filtro): Black Ice, Vanilla Pride, True North, Rose
  Thorn, Pure Steel, Pina Colada, No Smoking, New Car. Lista em
  `CONFIG.maisVendidos`.
- **Famílias olfativas** — Fresco / Frutal / Doce / Floral / Amadeirado /
  Clássico foram atribuídas por nós, pelo nome do aroma (mapa `FAMILIAS` em
  `_fonte/normaliza.mjs`). Vale o cliente revisar.
- **Estoque** — `CONFIG.respeitarEstoque` está `false`. A raspagem trouxe 57 dos
  72 SKUs como indisponíveis, o que é estoque velho da loja antiga. Enquanto for
  `false`, o catálogo mostra tudo e não exibe selo de "sob encomenda".
- **Logo** — é um wordmark provisório com uma arvorezinha em SVG. Trocar pela
  identidade real da loja.
- As fotos são da loja de origem; confirmar com o cliente que pode reusá-las.

O WhatsApp que recebe os pedidos é o `5532998151131` (`CONFIG.whatsapp`).

## Pipeline dos dados

```
npm install
npm run raspa       # _fonte/p1.html + p2.html  ->  _fonte/produtos.json
npm run baixa       # baixa as 142 fotos        ->  img/produtos/
npm run imagens     # 800x800 fundo branco      ->  img/catalogo/
npm run normaliza   # agrupa por aroma          ->  assets/js/dados.js
npm run favicon     # favicon.svg               ->  favicon-32.png e -180.png
npm run teste       # smoke test no navegador (confere a escada de preços)
```

`assets/js/dados.js` é gerado — editar `_fonte/normaliza.mjs` e rodar de novo,
nunca o arquivo direto. Os detalhes da raspagem estão em `_fonte/LEIA-ME.md`.
