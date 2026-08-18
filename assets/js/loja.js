/* Little Trees — catálogo e montador de kit.
   Depende de assets/js/dados.js (window.LT_AROMAS). */

(() => {
  'use strict';

  // ==========================================================================
  // TABELA DE PREÇOS (passada pelo cliente em 18/08/2026)
  // --------------------------------------------------------------------------
  // A unidade avulsa é R$ 20,00 na loja; aqui vai a R$ 19,90 por ser mais
  // chamativo. Daí pra baixo os kits são por quantidade TOTAL do pedido — o
  // cliente pode misturar os aromas que quiser dentro do kit.
  //
  //   1 a 2 un ....... R$ 19,90 cada
  //   3 a 9 un ....... R$ 15,00 cada   (definido pelo cliente)
  //   10 a 23 un ..... R$ 12,90 cada   (definido pelo cliente)
  //   24 a 49 un ..... R$ 11,90 cada   (sugestão nossa, continuando a escada)
  //   50 un ou mais .. R$  9,90 cada   (sugestão nossa, faixa de revenda)
  //
  // Só as duas últimas faixas são sugestão — confirmar com o cliente.
  // ==========================================================================
  const FAIXAS = [
    { min: 1,  max: 2,        preco: 19.90, nome: 'Unidade avulsa', nota: 'pra levar um aroma só' },
    { min: 3,  max: 9,        preco: 15.00, nome: 'Kit 3',          nota: 'pra conhecer os aromas' },
    { min: 10, max: 23,       preco: 12.90, nome: 'Kit 10',         nota: 'o carro e a casa o ano todo' },
    { min: 24, max: 49,       preco: 11.90, nome: 'Pacote 24',      nota: 'a caixa fechada' },
    { min: 50, max: Infinity, preco: 9.90,  nome: 'Kit revenda',    nota: 'a partir de 50 unidades' },
  ];

  const CONFIG = {
    // Número que recebe os pedidos, formato 55DDDNUMERO.
    whatsapp: '5532998151131',

    // Aromas que a loja mais vende — ganham selo e filtro próprio.
    maisVendidos: [
      'black-ice', 'vanilla-pride', 'true-north', 'rose-thorn',
      'pure-steel', 'pina-colada', 'no-smoking', 'new-car',
    ],

    // Os três que aparecem na faixa do hero, antes de rolar a página.
    vitrine: ['black-ice', 'new-car', 'vanilla-pride'],

    // A raspagem trouxe 57 dos 72 SKUs marcados como indisponíveis na loja de
    // origem. Enquanto o cliente não mandar o estoque real, o catálogo mostra
    // tudo. Vire pra true quando os dados estiverem corretos.
    respeitarEstoque: false,
  };

  const FAMILIAS = [
    { id: 'fresco',     nome: 'Fresco',      cor: 'var(--fam-fresco)' },
    { id: 'frutal',     nome: 'Frutal',      cor: 'var(--fam-frutal)' },
    { id: 'doce',       nome: 'Doce',        cor: 'var(--fam-doce)' },
    { id: 'floral',     nome: 'Floral',      cor: 'var(--fam-floral)' },
    { id: 'amadeirado', nome: 'Amadeirado',  cor: 'var(--fam-amadeirado)' },
    { id: 'classico',   nome: 'Clássico',    cor: 'var(--fam-classico)' },
  ];

  // Só a cartela entra no catálogo. Lata (Fiber Can), spray, Vent Wrap e os
  // kits fechados de 3 e 6 da loja antiga ficaram de fora a pedido do cliente.
  const CARTELA = new Set(['unitario', 'sem-cartela', 'display-24', 'xtra']);

  // ==========================================================================
  // Estado
  // ==========================================================================
  const TODOS = window.LT_AROMAS || [];
  const AROMAS = TODOS
    .filter((a) => a.formatos.some((f) => CARTELA.has(f.formato)))
    .map((a) => ({ ...a, destaque: CONFIG.maisVendidos.includes(a.slug) }));
  const porSlug = new Map(AROMAS.map((a) => [a.slug, a]));

  const estado = {
    busca: '',
    familias: new Set(),
    soMaisVendidos: false,
    soDisponiveis: false,
    kit: carregar(),   // { slug: quantidade }
  };

  function carregar() {
    try {
      const bruto = JSON.parse(localStorage.getItem('lt-kit') || '{}');
      const limpo = {};
      for (const [slug, v] of Object.entries(bruto)) {
        if (porSlug.has(slug) && Number.isInteger(v) && v > 0 && v <= 999) limpo[slug] = v;
      }
      return limpo;
    } catch { return {}; }
  }

  function salvar() {
    try { localStorage.setItem('lt-kit', JSON.stringify(estado.kit)); } catch { /* modo privado */ }
  }

  // ==========================================================================
  // Preço
  // ==========================================================================
  const reais = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const faixaDe = (qtd) => FAIXAS.find((f) => qtd >= f.min && qtd <= f.max) || FAIXAS[0];

  function totais() {
    const itens = Object.entries(estado.kit)
      .map(([slug, qtd]) => ({ aroma: porSlug.get(slug), qtd }))
      .filter((i) => i.aroma)
      .sort((x, y) => x.aroma.nome.localeCompare(y.aroma.nome, 'pt-BR'));

    const unidades = itens.reduce((s, i) => s + i.qtd, 0);
    const faixa = faixaDe(Math.max(unidades, 1));
    const proxima = FAIXAS.find((f) => f.min > unidades);
    const cheio = unidades * FAIXAS[0].preco;
    const total = unidades * faixa.preco;

    return {
      itens, unidades, faixa, proxima,
      unitario: faixa.preco,
      total,
      economia: cheio - total,
      vazio: !itens.length,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================
  const $ = (sel) => document.querySelector(sel);
  const escapa = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const corFamilia = (id) => (FAMILIAS.find((f) => f.id === id) || {}).cor || 'var(--tinta)';
  const nomeFamilia = (id) => (FAMILIAS.find((f) => f.id === id) || {}).nome || 'Especial';

  // Sem estoque confiável não dá pra marcar nada como esgotado.
  const emEstoque = (aroma) =>
    !CONFIG.respeitarEstoque || aroma.formatos.some((f) => CARTELA.has(f.formato) && f.disponivel);

  function controle(slug, qtd, nome) {
    if (!qtd) {
      return `<button class="mais" data-add="${slug}" aria-label="Adicionar ${escapa(nome)}">+</button>`;
    }
    return `<div class="passo-qtd">
      <button data-sub="${slug}" aria-label="Menos um ${escapa(nome)}">&minus;</button>
      <b>${qtd}</b>
      <button data-add="${slug}" aria-label="Mais um ${escapa(nome)}">+</button>
    </div>`;
  }

  // ==========================================================================
  // Escada de kits (hero)
  // ==========================================================================
  function pintaKits() {
    const { unidades } = totais();
    const atual = unidades > 0 ? faixaDe(unidades) : null;

    $('#hero-kits').innerHTML = `
      <h3>Quanto maior o kit, mais barata a unidade</h3>
      ${FAIXAS.map((f) => {
        const quanto = f.max === Infinity ? `${f.min}+ un` : (f.min === f.max ? `${f.min} un` : `${f.min}–${f.max} un`);
        return `<div class="faixa${atual === f ? ' ativa' : ''}">
          <div>
            <p class="faixa-nome">${escapa(f.nome)} <span>${quanto}</span></p>
            <p class="faixa-nota">${escapa(f.nota)}</p>
          </div>
          <b>${reais(f.preco)}<small>/un</small></b>
        </div>`;
      }).join('')}
      <p class="faixa-rodape">Você mistura os aromas que quiser — o preço segue o total de unidades do pedido.</p>`;
  }

  // ==========================================================================
  // Faixa dos campeões (hero)
  // --------------------------------------------------------------------------
  // Os aromas ficam parados; quem anda é a pista do fundo. A pista tem o mesmo
  // trecho duplicado e desliza até -50%, então o loop não dá salto.
  // ==========================================================================
  function montaPista() {
    const desenhos = ['carro-hatch', 'arvore', 'carro-suv', 'arvore', 'carro-pickup', 'arvore'];
    const trecho = Array.from({ length: 12 }, (_, i) => {
      const id = desenhos[i % desenhos.length];
      const arvore = id === 'arvore';
      return `<svg class="passante ${arvore ? 'passante-arvore' : 'passante-carro'}" viewBox="${arvore ? '0 0 24 32' : '0 0 134 46'}">
        <use href="#${id}" /></svg>`;
    }).join('');
    $('#pista').innerHTML = trecho + trecho;
  }

  function pintaVitrine() {
    const escolhidos = CONFIG.vitrine.map((s) => porSlug.get(s)).filter(Boolean);
    const { unidades, unitario } = totais();
    const preco = unidades ? unitario : FAIXAS[0].preco;

    $('#vitrine-itens').innerHTML = escolhidos.map((a) => {
      const qtd = estado.kit[a.slug] || 0;
      return `<article class="vitrine-item${qtd ? ' escolhido' : ''}">
        <img src="${escapa(a.foto)}" alt="Little Trees ${escapa(a.nome)}" />
        <div class="vitrine-texto">
          <p class="vitrine-nome">${escapa(a.nome)}</p>
          <p class="vitrine-preco">${reais(preco)}<small> /un</small></p>
        </div>
        ${controle(a.slug, qtd, a.nome)}
      </article>`;
    }).join('');
  }

  // ==========================================================================
  // Seção dos kits
  // ==========================================================================
  function pintaGradeKits() {
    const { unidades } = totais();
    const atual = unidades > 0 ? faixaDe(unidades) : null;

    $('#grade-kits').innerHTML = FAIXAS.map((f) => {
      const fechado = f.max !== Infinity;
      const quanto = fechado
        ? (f.min === f.max ? `${f.min} unidade` : `${f.min} a ${f.max} unidades`)
        : `${f.min} unidades ou mais`;
      // no kit revenda o "total" seria aberto, então mostra o piso
      const total = f.preco * f.min;

      return `<article class="kit${atual === f ? ' ativo' : ''}">
        ${atual === f ? '<span class="kit-selo">seu kit agora</span>' : ''}
        <p class="kit-nome">${escapa(f.nome)}</p>
        <p class="kit-quanto">${quanto}</p>
        <p class="kit-preco">${reais(f.preco)}<small>por unidade</small></p>
        <p class="kit-total">${f.max === Infinity ? 'a partir de ' : ''}${reais(total)} ${fechado && f.min !== f.max ? `com ${f.min}` : ''}</p>
        <p class="kit-nota">${escapa(f.nota)}</p>
      </article>`;
    }).join('');
  }

  // ==========================================================================
  // Filtros
  // ==========================================================================
  function montaChips() {
    const usadas = FAMILIAS.filter((f) => AROMAS.some((a) => a.familia === f.id));
    const vendidos = AROMAS.filter((a) => a.destaque).length;

    $('#chips-familia').innerHTML =
      (vendidos ? `<button class="chip destaque" data-vendidos="1" aria-pressed="false">
         <i class="estrela">★</i>Mais vendidos <small>${vendidos}</small></button>` : '') +
      usadas.map((f) => {
        const n = AROMAS.filter((a) => a.familia === f.id).length;
        return `<button class="chip" data-familia="${f.id}" aria-pressed="false" style="--cor:${f.cor}">
          <i class="ponto"></i>${escapa(f.nome)} <small>${n}</small></button>`;
      }).join('');
  }

  function filtrados() {
    const termo = estado.busca.trim().toLowerCase();
    return AROMAS.filter((a) => {
      if (estado.soMaisVendidos && !a.destaque) return false;
      if (estado.familias.size && !estado.familias.has(a.familia)) return false;
      if (estado.soDisponiveis && !emEstoque(a)) return false;
      if (!termo) return true;
      return (a.nome + ' ' + a.descricao).toLowerCase().includes(termo);
    });
  }

  // ==========================================================================
  // Grade de aromas
  // ==========================================================================
  function pintaGrade() {
    const lista = filtrados();
    const { unidades, unitario } = totais();
    const preco = unidades ? unitario : FAIXAS[0].preco;

    $('#grade').innerHTML = lista.map((a) => {
      const qtd = estado.kit[a.slug] || 0;
      const fora = !emEstoque(a);

      return `<article class="cartao" data-escolhido="${qtd ? 'sim' : 'nao'}" data-estoque="${fora ? 'fora' : 'ok'}">
        <div class="cartao-foto" data-abre="${a.slug}" role="button" tabindex="0" aria-label="Ver ${escapa(a.nome)}">
          <span class="selo familia" style="--cor:${corFamilia(a.familia)}">${escapa(nomeFamilia(a.familia))}</span>
          ${a.destaque ? '<span class="selo vendido">★ Mais vendido</span>' : ''}
          ${fora ? '<span class="selo fora">sob encomenda</span>' : ''}
          <img src="${escapa(a.foto)}" alt="Little Trees ${escapa(a.nome)}" loading="lazy" />
        </div>
        <div class="cartao-corpo">
          <h3 class="cartao-nome">${escapa(a.nome)}</h3>
          <p class="cartao-desc">${escapa(a.descricao || '')}</p>
          <div class="cartao-pe">
            <span class="cartao-preco"><b>${reais(preco)}</b> /un</span>
            ${controle(a.slug, qtd, a.nome)}
          </div>
        </div>
      </article>`;
    }).join('');

    $('#vazio').hidden = lista.length > 0;
    $('#resultado').textContent = lista.length === AROMAS.length
      ? `${AROMAS.length} aromas no catálogo`
      : `${lista.length} de ${AROMAS.length} aromas`;
  }

  // ==========================================================================
  // Painel do kit
  // ==========================================================================
  function pintaKit() {
    const t = totais();
    const corpo = $('#painel-corpo');
    const pe = $('#painel-pe');

    if (t.vazio) {
      corpo.innerHTML = `<p class="painel-vazio">Seu kit está vazio.<br />
        Toque no <b>+</b> dos aromas que você quer levar.</p>`;
      pe.innerHTML = `<button class="botao primario" disabled>Fechar pedido</button>`;
    } else {
      corpo.innerHTML = t.itens.map(({ aroma, qtd }) => `
        <div class="item-kit">
          <img src="${escapa(aroma.foto)}" alt="" />
          <div>
            <p class="item-kit-nome">${escapa(aroma.nome)}</p>
            <p class="item-kit-meta">${reais(t.unitario)} cada · ${reais(qtd * t.unitario)}</p>
            <button class="remover" data-remove="${aroma.slug}">remover</button>
          </div>
          ${controle(aroma.slug, qtd, aroma.nome)}
        </div>`).join('');

      const faltam = t.proxima ? t.proxima.min - t.unidades : 0;
      const aviso = t.proxima
        ? `<p class="aviso-faixa">Faltam ${faltam} ${faltam === 1 ? 'unidade' : 'unidades'} pro <b>${escapa(t.proxima.nome)}</b>: cada uma sai por ${reais(t.proxima.preco)}.</p>`
        : `<p class="aviso-faixa">Você está no <b>${escapa(t.faixa.nome)}</b>, o melhor preço da tabela.</p>`;

      pe.innerHTML = `
        <div class="linha-total"><span>${t.unidades} ${t.unidades === 1 ? 'unidade' : 'unidades'} × ${reais(t.unitario)}</span><span>${reais(t.total)}</span></div>
        <div class="linha-total"><span>Faixa aplicada</span><span>${escapa(t.faixa.nome)}</span></div>
        ${t.economia > 0 ? `<div class="linha-total economia"><span>Você economiza</span><span>${reais(t.economia)}</span></div>` : ''}
        ${aviso}
        <div class="linha-total grande"><span>Total</span><b>${reais(t.total)}</b></div>
        <button class="botao primario" id="fechar-pedido">Fechar pedido no WhatsApp</button>
        <p class="nota-pe">O resumo vai pronto na conversa. Você confere tudo antes de confirmar.</p>`;
    }

    $('#contador-kit').textContent = t.unidades;
    $('#abrir-kit').dataset.vazio = t.vazio ? 'sim' : 'nao';

    const barra = $('#barra-kit');
    barra.hidden = t.vazio;
    barra.dataset.visivel = t.vazio ? 'nao' : 'sim';
    document.body.dataset.kit = t.vazio ? 'vazio' : 'cheio';
    $('#barra-qtd').textContent = `${t.unidades} ${t.unidades === 1 ? 'unidade' : 'unidades'} · ${t.faixa.nome}`;
    $('#barra-total').textContent = reais(t.total);
  }

  // ==========================================================================
  // Resumo do pedido pro WhatsApp
  // ==========================================================================
  function resumo() {
    const t = totais();
    const L = ['*PEDIDO — Little Trees*', ''];

    L.push(`*Aromas escolhidos* (${t.itens.length})`);
    for (const { aroma, qtd } of t.itens) {
      L.push(`• ${qtd}x ${aroma.nome} — ${reais(qtd * t.unitario)}`);
    }

    L.push('', '------------------------------');
    L.push(`Unidades: ${t.unidades}`);
    L.push(`Faixa: ${t.faixa.nome} (${reais(t.unitario)} cada)`);
    if (t.economia > 0) L.push(`Economia: ${reais(t.economia)}`);
    L.push(`*TOTAL: ${reais(t.total)}*`);
    return L.join('\n');
  }

  function fecharPedido() {
    const texto = resumo();
    if (CONFIG.whatsapp) {
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      return;
    }
    navigator.clipboard?.writeText(texto).then(
      () => alert('Número do WhatsApp ainda não configurado.\nO resumo foi copiado:\n\n' + texto),
      () => alert('Número do WhatsApp ainda não configurado.\n\n' + texto),
    );
  }

  // ==========================================================================
  // Detalhe do aroma
  // ==========================================================================
  let aromaAberto = null;

  function abreModal(slug) {
    const a = porSlug.get(slug);
    if (!a) return;
    aromaAberto = slug;

    // a foto grande é a mesma do card; as miniaturas mostram embalagem e verso
    const fotos = [...new Set([a.foto, ...a.formatos.filter((f) => CARTELA.has(f.formato)).flatMap((f) => f.fotos)])]
      .filter(Boolean).slice(0, 4);
    const qtd = estado.kit[a.slug] || 0;
    const t = totais();

    $('#modal-caixa').innerHTML = `
      <div class="modal-topo">
        <div>
          <span class="selo familia estatico" style="--cor:${corFamilia(a.familia)}">${escapa(nomeFamilia(a.familia))}</span>
          ${a.destaque ? '<span class="selo vendido estatico">★ Mais vendido</span>' : ''}
          <h2 id="modal-titulo">${escapa(a.nome)}</h2>
          ${a.descricao ? `<p class="modal-desc">${escapa(a.descricao)}</p>` : ''}
        </div>
        <button class="fechar" data-fecha-modal aria-label="Fechar">&times;</button>
      </div>
      <div class="modal-grade">
        <div class="modal-fotos">
          <img src="${escapa(fotos[0] || a.foto)}" alt="Little Trees ${escapa(a.nome)}" />
          ${fotos.length > 1 ? `<div class="modal-mini">${fotos.slice(1).map((f) => `<img src="${escapa(f)}" alt="" />`).join('')}</div>` : ''}
        </div>
        <div>
          <h3 class="modal-rotulo">Quanto custa</h3>
          <p class="modal-preco-grande">${reais(t.unidades ? t.unitario : FAIXAS[0].preco)}<small> por unidade${t.unidades ? ` no seu kit atual (${escapa(t.faixa.nome)})` : ''}</small></p>
          <div class="modal-acao">
            ${controle(a.slug, qtd, a.nome)}
            <span class="modal-acao-nota">${qtd ? `${qtd} no kit` : 'adicionar ao kit'}</span>
          </div>
          <div class="mini-escada">
            ${FAIXAS.map((f) => {
              const quanto = f.max === Infinity ? `${f.min}+` : `${f.min}–${f.max}`;
              return `<div class="mini-faixa${t.unidades && faixaDe(t.unidades) === f ? ' ativa' : ''}">
                <span>${escapa(f.nome)} <small>${quanto} un</small></span><b>${reais(f.preco)}</b></div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function fechaModal() {
    $('#modal').hidden = true;
    aromaAberto = null;
    if ($('#painel').hidden) document.body.style.overflow = '';
  }

  // ==========================================================================
  // Painel abre/fecha
  // ==========================================================================
  function abrePainel() {
    $('#painel').hidden = false;
    $('#cortina').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#fechar-kit').focus();
  }

  function fechaPainel() {
    $('#painel').hidden = true;
    $('#cortina').hidden = true;
    if ($('#modal').hidden) document.body.style.overflow = '';
  }

  // ==========================================================================
  // Mutação do kit
  // ==========================================================================
  function muda(slug, delta) {
    const atual = estado.kit[slug] || 0;
    const novo = Math.max(0, Math.min(999, atual + delta));
    if (novo) estado.kit[slug] = novo; else delete estado.kit[slug];
    salvar();
    repinta();
  }

  function remove(slug) {
    delete estado.kit[slug];
    salvar();
    repinta();
  }

  function repinta() {
    pintaGrade();
    pintaVitrine();
    pintaKit();
    pintaKits();
    pintaGradeKits();
    if (aromaAberto) abreModal(aromaAberto);
  }

  // ==========================================================================
  // Eventos
  // ==========================================================================
  document.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-add],[data-sub],[data-remove],[data-abre],[data-familia],[data-vendidos],[data-fecha-modal]');
    if (!alvo) return;
    const d = alvo.dataset;

    if (d.add) return muda(d.add, +1);
    if (d.sub) return muda(d.sub, -1);
    if (d.remove) return remove(d.remove);
    if (d.abre) return abreModal(d.abre);
    if (d.fechaModal !== undefined) return fechaModal();

    if (d.vendidos) {
      const ligado = alvo.getAttribute('aria-pressed') === 'true';
      alvo.setAttribute('aria-pressed', String(!ligado));
      estado.soMaisVendidos = !ligado;
      return pintaGrade();
    }

    if (d.familia) {
      const ligado = alvo.getAttribute('aria-pressed') === 'true';
      alvo.setAttribute('aria-pressed', String(!ligado));
      if (ligado) estado.familias.delete(d.familia); else estado.familias.add(d.familia);
      pintaGrade();
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { fechaModal(); fechaPainel(); }
    if (ev.key === 'Enter' || ev.key === ' ') {
      const foco = document.activeElement;
      if (foco && foco.dataset && foco.dataset.abre) { ev.preventDefault(); abreModal(foco.dataset.abre); }
    }
  });

  $('#modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal') fechaModal(); });
  $('#cortina').addEventListener('click', fechaPainel);
  $('#abrir-kit').addEventListener('click', abrePainel);
  $('#barra-abrir').addEventListener('click', abrePainel);
  $('#fechar-kit').addEventListener('click', fechaPainel);
  $('#painel-pe').addEventListener('click', (ev) => {
    if (ev.target.id === 'fechar-pedido') fecharPedido();
  });

  let debounce;
  $('#busca').addEventListener('input', (ev) => {
    clearTimeout(debounce);
    const v = ev.target.value;
    debounce = setTimeout(() => { estado.busca = v; pintaGrade(); }, 120);
  });

  $('#so-disponiveis').addEventListener('change', (ev) => {
    estado.soDisponiveis = ev.target.checked;
    pintaGrade();
  });

  // A barra de filtros gruda logo abaixo do topo, e a altura do topo muda
  // conforme a busca quebra de linha. Medir evita chute no breakpoint.
  function ajustaTopo() {
    document.documentElement.style.setProperty('--topo-altura', $('.topo').offsetHeight + 'px');
  }

  // ==========================================================================
  // Início
  // ==========================================================================
  if (!CONFIG.respeitarEstoque) {
    $('#so-disponiveis').closest('.alternador').hidden = true;
  }
  $('#hero-total').textContent = AROMAS.length;
  $('#hero-preco').textContent = reais(FAIXAS[0].preco);
  montaPista();
  montaChips();
  repinta();
  ajustaTopo();
  window.addEventListener('resize', ajustaTopo);
  document.fonts?.ready.then(ajustaTopo);
})();
