/* Little Trees — catálogo e montador de kit.
   Depende de assets/js/dados.js (window.LT_AROMAS). */

(() => {
  'use strict';

  // ==========================================================================
  // CONFIGURAÇÃO — o que precisa ser confirmado com o cliente antes de publicar
  // ==========================================================================
  const CONFIG = {
    // Número do WhatsApp que recebe os pedidos, formato 55DDDNUMERO.
    // Vazio = o botão copia a mensagem em vez de abrir o WhatsApp.
    whatsapp: '',

    // Preço da cartela avulsa por faixa de quantidade. PROVISÓRIO: montado a
    // partir dos poucos preços que a loja de origem ainda exibia
    // (avulsa R$ 13,90–14,90 e kit de 6 por R$ 74,90 = R$ 12,48/un).
    faixas: [
      { min: 1,  max: 5,        preco: 14.90 },
      { min: 6,  max: 11,       preco: 12.90 },
      { min: 12, max: 23,       preco: 11.90 },
      { min: 24, max: Infinity, preco: 9.90 },
    ],

    // Mínimo de unidades pra fechar o pedido só com cartelas avulsas.
    minimoKit: 3,

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

  const AVULSOS = new Set(['unitario', 'sem-cartela']);

  // ==========================================================================
  // Estado
  // ==========================================================================
  const AROMAS = window.LT_AROMAS || [];
  const porSlug = new Map(AROMAS.map((a) => [a.slug, a]));

  // aromas que dá pra escolher unidade a unidade
  const doKit = AROMAS.filter((a) => a.avulso);
  // produtos de formato fechado (kit, lata, spray, vent wrap, display box)
  const especiais = [];
  for (const a of AROMAS) {
    for (const f of a.formatos) {
      if (!AVULSOS.has(f.formato)) especiais.push({ aroma: a, ...f });
    }
  }
  especiais.sort((x, y) => (y.preco || 0) - (x.preco || 0) || x.aroma.nome.localeCompare(y.aroma.nome, 'pt-BR'));

  const estado = {
    busca: '',
    familias: new Set(),
    soDisponiveis: false,
    kit: carregar(),   // { chave: quantidade }
  };

  function carregar() {
    try {
      const bruto = JSON.parse(localStorage.getItem('lt-kit') || '{}');
      const limpo = {};
      for (const [k, v] of Object.entries(bruto)) {
        if (Number.isInteger(v) && v > 0 && v <= 999) limpo[k] = v;
      }
      return limpo;
    } catch { return {}; }
  }

  function salvar() {
    try { localStorage.setItem('lt-kit', JSON.stringify(estado.kit)); } catch { /* modo privado */ }
  }

  // chaves: 'a:<slug>' para cartela avulsa, 'e:<id>' para formato especial
  const chaveAvulso = (slug) => 'a:' + slug;
  const chaveEspecial = (id) => 'e:' + id;

  // ==========================================================================
  // Preço
  // ==========================================================================
  const reais = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const faixaDe = (qtd) => CONFIG.faixas.find((f) => qtd >= f.min && qtd <= f.max) || CONFIG.faixas[0];
  const precoUnitario = (qtd) => faixaDe(Math.max(qtd, 1)).preco;

  function totais() {
    let unidades = 0;
    const avulsos = [];
    const fechados = [];

    for (const [chave, qtd] of Object.entries(estado.kit)) {
      if (chave.startsWith('a:')) {
        const aroma = porSlug.get(chave.slice(2));
        if (!aroma) continue;
        unidades += qtd;
        avulsos.push({ aroma, qtd });
      } else {
        const item = especiais.find((e) => e.id === chave.slice(2));
        if (!item) continue;
        fechados.push({ item, qtd });
      }
    }

    const unitario = precoUnitario(unidades);
    const subtotalAvulso = unidades * unitario;
    const subtotalFechado = fechados.reduce((s, f) => s + (f.item.preco || 0) * f.qtd, 0);
    const semPreco = fechados.filter((f) => !f.item.preco).length;

    avulsos.sort((x, y) => x.aroma.nome.localeCompare(y.aroma.nome, 'pt-BR'));
    return { unidades, unitario, avulsos, fechados, subtotalAvulso, subtotalFechado, semPreco,
             total: subtotalAvulso + subtotalFechado,
             itens: avulsos.length + fechados.reduce((s, f) => s + f.qtd, 0) };
  }

  // ==========================================================================
  // Helpers de DOM
  // ==========================================================================
  const $ = (sel) => document.querySelector(sel);
  const escapa = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const corFamilia = (id) => (FAMILIAS.find((f) => f.id === id) || {}).cor || 'var(--tinta)';
  const nomeFamilia = (id) => (FAMILIAS.find((f) => f.id === id) || {}).nome || 'Especial';

  // Sem estoque confiável não dá pra marcar nada como esgotado: enquanto
  // respeitarEstoque for false, tudo aparece como disponível.
  const emEstoque = (aroma) =>
    !CONFIG.respeitarEstoque || aroma.formatos.some((f) => AVULSOS.has(f.formato) && f.disponivel);

  // ==========================================================================
  // Faixas no hero
  // ==========================================================================
  function pintaFaixas() {
    const { unidades } = totais();
    const atual = unidades > 0 ? faixaDe(unidades) : null;
    const linhas = CONFIG.faixas.map((f) => {
      const rotulo = f.max === Infinity ? `${f.min} unidades ou mais` : `${f.min} a ${f.max} unidades`;
      const ativa = atual === f ? ' ativa' : '';
      return `<div class="faixa${ativa}"><span>${rotulo}</span><b>${reais(f.preco)}<small> /un</small></b></div>`;
    }).join('');
    $('#hero-faixas').innerHTML =
      `<h3>Quanto mais aromas, mais barata a unidade</h3>${linhas}` +
      `<p class="faixa-nota">Vale para as cartelas avulsas, misturando os aromas que quiser. ` +
      `Kits fechados, latas e sprays têm preço próprio.</p>`;
  }

  // ==========================================================================
  // Filtros
  // ==========================================================================
  function montaChips() {
    const usadas = FAMILIAS.filter((f) => doKit.some((a) => a.familia === f.id));
    $('#chips-familia').innerHTML = usadas.map((f) => {
      const n = doKit.filter((a) => a.familia === f.id).length;
      return `<button class="chip" data-familia="${f.id}" aria-pressed="false" style="--cor:${f.cor}">
        <i class="ponto"></i>${escapa(f.nome)} <small>${n}</small></button>`;
    }).join('');
  }

  function filtrados() {
    const termo = estado.busca.trim().toLowerCase();
    return doKit.filter((a) => {
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
    const { unidades } = totais();
    const unitario = precoUnitario(unidades);

    $('#grade').innerHTML = lista.map((a) => {
      const qtd = estado.kit[chaveAvulso(a.slug)] || 0;
      const fora = !emEstoque(a);
      const controle = qtd > 0
        ? `<div class="passo-qtd">
             <button data-menos="${a.slug}" aria-label="Menos um ${escapa(a.nome)}">&minus;</button>
             <b>${qtd}</b>
             <button data-mais="${a.slug}" aria-label="Mais um ${escapa(a.nome)}">+</button>
           </div>`
        : `<button class="mais" data-mais="${a.slug}" aria-label="Adicionar ${escapa(a.nome)} ao kit">+</button>`;

      return `<article class="cartao" data-escolhido="${qtd > 0 ? 'sim' : 'nao'}" data-estoque="${fora ? 'fora' : 'ok'}">
        <div class="cartao-foto" data-abre="${a.slug}" role="button" tabindex="0" aria-label="Ver ${escapa(a.nome)}">
          <span class="selo familia" style="--cor:${corFamilia(a.familia)}">${escapa(nomeFamilia(a.familia))}</span>
          ${fora ? '<span class="selo fora">sob encomenda</span>' : ''}
          <img src="${escapa(a.foto)}" alt="Little Trees ${escapa(a.nome)}" loading="lazy" />
        </div>
        <div class="cartao-corpo">
          <h3 class="cartao-nome">${escapa(a.nome)}</h3>
          <p class="cartao-desc">${escapa(a.descricao || '')}</p>
          <div class="cartao-pe">
            <span class="cartao-preco"><b>${reais(unitario)}</b> /un</span>
            ${controle}
          </div>
        </div>
      </article>`;
    }).join('');

    $('#vazio').hidden = lista.length > 0;
    $('#resultado').textContent = lista.length === doKit.length
      ? `${doKit.length} aromas disponíveis para montar o kit`
      : `${lista.length} de ${doKit.length} aromas`;
  }

  // ==========================================================================
  // Formatos especiais
  // ==========================================================================
  function pintaEspeciais() {
    $('#grade-especiais').innerHTML = especiais.map((e) => {
      const qtd = estado.kit[chaveEspecial(e.id)] || 0;
      const preco = e.preco
        ? `${reais(e.preco)}${e.unidades > 1 ? ` <small>${reais(e.preco / e.unidades)} por unidade</small>` : ''}`
        : '<small>preço sob consulta</small>';
      const controle = qtd > 0
        ? `<div class="passo-qtd">
             <button data-esp-menos="${e.id}" aria-label="Menos um">&minus;</button><b>${qtd}</b>
             <button data-esp-mais="${e.id}" aria-label="Mais um">+</button>
           </div>`
        : `<button class="mais" data-esp-mais="${e.id}" aria-label="Adicionar ${escapa(e.aroma.nome)} ${escapa(e.rotulo)}">+</button>`;

      return `<article class="especial">
        <img src="${escapa(e.fotos[0] || e.aroma.foto)}" alt="${escapa(e.aroma.nome)} ${escapa(e.rotulo)}" loading="lazy" />
        <div>
          <p class="especial-nome">${escapa(e.aroma.nome)}</p>
          <p class="especial-meta">${escapa(e.rotulo)}${CONFIG.respeitarEstoque && !e.disponivel ? ' · sob encomenda' : ''}</p>
          <p class="especial-preco">${preco}</p>
          <div class="cartao-pe">${controle}</div>
        </div>
      </article>`;
    }).join('');
  }

  // ==========================================================================
  // Painel do kit
  // ==========================================================================
  function pintaKit() {
    const t = totais();
    const corpo = $('#painel-corpo');
    const pe = $('#painel-pe');

    if (!t.avulsos.length && !t.fechados.length) {
      corpo.innerHTML = `<p class="painel-vazio">Seu kit está vazio.<br />Toque no <b>+</b> dos aromas que você quer.</p>`;
      pe.innerHTML = `<button class="botao primario" disabled>Fechar pedido</button>`;
    } else {
      const linhasAvulsas = t.avulsos.map(({ aroma, qtd }) => `
        <div class="item-kit">
          <img src="${escapa(aroma.foto)}" alt="" />
          <div>
            <p class="item-kit-nome">${escapa(aroma.nome)}</p>
            <p class="item-kit-meta">cartela avulsa · ${reais(t.unitario)} cada</p>
            <button class="remover" data-remove="${chaveAvulso(aroma.slug)}">remover</button>
          </div>
          <div class="passo-qtd">
            <button data-menos="${aroma.slug}" aria-label="Menos um">&minus;</button><b>${qtd}</b>
            <button data-mais="${aroma.slug}" aria-label="Mais um">+</button>
          </div>
        </div>`).join('');

      const linhasFechadas = t.fechados.map(({ item, qtd }) => `
        <div class="item-kit">
          <img src="${escapa(item.fotos[0] || item.aroma.foto)}" alt="" />
          <div>
            <p class="item-kit-nome">${escapa(item.aroma.nome)}</p>
            <p class="item-kit-meta">${escapa(item.rotulo)} · ${item.preco ? reais(item.preco) : 'sob consulta'}</p>
            <button class="remover" data-remove="${chaveEspecial(item.id)}">remover</button>
          </div>
          <div class="passo-qtd">
            <button data-esp-menos="${item.id}" aria-label="Menos um">&minus;</button><b>${qtd}</b>
            <button data-esp-mais="${item.id}" aria-label="Mais um">+</button>
          </div>
        </div>`).join('');

      corpo.innerHTML = linhasAvulsas + linhasFechadas;

      const proxima = CONFIG.faixas.find((f) => f.min > t.unidades);
      const faltam = proxima ? proxima.min - t.unidades : 0;
      const aviso = proxima && t.unidades > 0
        ? `<p class="aviso-faixa">Coloque mais ${faltam} ${faltam === 1 ? 'cartela' : 'cartelas'} e cada uma sai por ${reais(proxima.preco)}.</p>`
        : '';

      const faltaMinimo = t.unidades > 0 && t.unidades < CONFIG.minimoKit && !t.fechados.length;
      const alerta = faltaMinimo
        ? `<p class="aviso-faixa">O kit avulso fecha a partir de ${CONFIG.minimoKit} cartelas.</p>`
        : '';

      pe.innerHTML = `
        ${t.unidades ? `<div class="linha-total"><span>${t.unidades} ${t.unidades === 1 ? 'cartela' : 'cartelas'} × ${reais(t.unitario)}</span><span>${reais(t.subtotalAvulso)}</span></div>` : ''}
        ${t.fechados.length ? `<div class="linha-total"><span>Kits e outros formatos</span><span>${t.subtotalFechado ? reais(t.subtotalFechado) : 'sob consulta'}</span></div>` : ''}
        ${aviso}${alerta}
        <div class="linha-total grande"><span>Total</span><b>${reais(t.total)}</b></div>
        ${t.semPreco ? `<p class="nota-pe">${t.semPreco} ${t.semPreco === 1 ? 'item está' : 'itens estão'} sem preço no catálogo — a loja confirma no WhatsApp.</p>` : ''}
        <button class="botao primario" id="fechar-pedido" ${faltaMinimo ? 'disabled' : ''}>Fechar pedido no WhatsApp</button>
        <p class="nota-pe">Você revisa tudo na conversa antes de confirmar. Nada é cobrado agora.</p>`;
    }

    // topo e barra
    const contador = $('#contador-kit');
    contador.textContent = t.unidades + t.fechados.reduce((s, f) => s + f.qtd, 0);
    $('#abrir-kit').dataset.vazio = t.itens ? 'nao' : 'sim';

    const barra = $('#barra-kit');
    barra.hidden = !t.itens;
    barra.dataset.visivel = t.itens ? 'sim' : 'nao';
    document.body.dataset.kit = t.itens ? 'cheio' : 'vazio';
    $('#barra-qtd').textContent = `${t.unidades + t.fechados.reduce((s, f) => s + f.qtd, 0)} ${t.itens === 1 ? 'item' : 'itens'}`;
    $('#barra-total').textContent = reais(t.total);
  }

  // ==========================================================================
  // Mensagem do WhatsApp
  // ==========================================================================
  function mensagem() {
    const t = totais();
    const linhas = ['Olá! Montei meu kit no site da Little Trees:', ''];

    if (t.avulsos.length) {
      linhas.push(`*Cartelas avulsas* (${t.unidades} un · ${reais(t.unitario)} cada)`);
      for (const { aroma, qtd } of t.avulsos) linhas.push(`• ${qtd}x ${aroma.nome}`);
      linhas.push(`Subtotal: ${reais(t.subtotalAvulso)}`, '');
    }

    if (t.fechados.length) {
      linhas.push('*Outros formatos*');
      for (const { item, qtd } of t.fechados) {
        linhas.push(`• ${qtd}x ${item.aroma.nome} — ${item.rotulo}` + (item.preco ? ` (${reais(item.preco)})` : ' (a confirmar)'));
      }
      linhas.push('');
    }

    linhas.push(`*Total: ${reais(t.total)}*`);
    if (t.semPreco) linhas.push('(alguns itens ainda precisam de confirmação de preço)');
    return linhas.join('\n');
  }

  function fecharPedido() {
    const texto = mensagem();
    if (CONFIG.whatsapp) {
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      return;
    }
    // sem número configurado ainda: copia o pedido pra não travar o teste
    navigator.clipboard?.writeText(texto).then(
      () => alert('Número do WhatsApp ainda não configurado.\nO pedido foi copiado:\n\n' + texto),
      () => alert('Número do WhatsApp ainda não configurado.\n\n' + texto),
    );
  }

  // ==========================================================================
  // Modal do aroma
  // ==========================================================================
  function abreModal(slug) {
    const a = porSlug.get(slug);
    if (!a) return;

    // a foto grande é a da cartela (a mesma do card), não a da embalagem do kit
    const fotos = [...new Set([a.foto, ...a.formatos.flatMap((f) => f.fotos)])].filter(Boolean).slice(0, 4);
    const qtd = estado.kit[chaveAvulso(a.slug)] || 0;
    const { unidades } = totais();

    const linhasFormato = a.formatos.map((f) => {
      const avulso = AVULSOS.has(f.formato);
      const preco = avulso
        ? `${reais(precoUnitario(unidades || 1))}<small>por unidade, no kit</small>`
        : (f.preco ? `${reais(f.preco)}${f.unidades > 1 ? `<small>${reais(f.preco / f.unidades)} por unidade</small>` : ''}` : '<small>sob consulta</small>');
      const acao = avulso
        ? (qtd > 0
          ? `<div class="passo-qtd"><button data-menos="${a.slug}">&minus;</button><b>${qtd}</b><button data-mais="${a.slug}">+</button></div>`
          : `<button class="botao primario" style="height:38px;padding:0 16px;font-size:14px" data-mais="${a.slug}">Adicionar</button>`)
        : `<button class="mais" data-esp-mais="${f.id}" aria-label="Adicionar ${escapa(f.rotulo)}">+</button>`;

      return `<div class="formato">
        <div>
          <p class="formato-nome">${escapa(f.rotulo)}</p>
          <p class="formato-meta">${f.unidades > 1 ? f.unidades + ' unidades' : 'uma unidade'}${CONFIG.respeitarEstoque ? (f.disponivel ? ' · em estoque' : ' · sob encomenda') : ''}</p>
        </div>
        <p class="formato-preco">${preco}</p>
        ${acao}
      </div>`;
    }).join('');

    $('#modal-caixa').innerHTML = `
      <div class="modal-topo">
        <div>
          <span class="selo familia" style="--cor:${corFamilia(a.familia)};position:static;display:inline-block;margin-bottom:8px">${escapa(nomeFamilia(a.familia))}</span>
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
          <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--tinta-fraca);margin-bottom:4px">Como levar</h3>
          ${linhasFormato}
        </div>
      </div>`;

    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function fechaModal() {
    $('#modal').hidden = true;
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
  function muda(chave, delta) {
    const atual = estado.kit[chave] || 0;
    const novo = Math.max(0, Math.min(999, atual + delta));
    if (novo) estado.kit[chave] = novo; else delete estado.kit[chave];
    salvar();
    repinta();
  }

  function remove(chave) {
    delete estado.kit[chave];
    salvar();
    repinta();
  }

  function repinta() {
    pintaGrade();
    pintaEspeciais();
    pintaKit();
    pintaFaixas();
    if (!$('#modal').hidden) {
      const titulo = $('#modal-titulo');
      const aroma = titulo && AROMAS.find((a) => a.nome === titulo.textContent);
      if (aroma) abreModal(aroma.slug);
    }
  }

  // ==========================================================================
  // Eventos
  // ==========================================================================
  document.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-mais],[data-menos],[data-esp-mais],[data-esp-menos],[data-remove],[data-abre],[data-familia],[data-fecha-modal]');
    if (!alvo) return;
    const d = alvo.dataset;

    if (d.mais) return muda(chaveAvulso(d.mais), +1);
    if (d.menos) return muda(chaveAvulso(d.menos), -1);
    if (d.espMais) return muda(chaveEspecial(d.espMais), +1);
    if (d.espMenos) return muda(chaveEspecial(d.espMenos), -1);
    if (d.remove) return remove(d.remove);
    if (d.abre) return abreModal(d.abre);
    if (d.fechaModal !== undefined) return fechaModal();

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
    const alto = document.querySelector('.topo').offsetHeight;
    document.documentElement.style.setProperty('--topo-altura', alto + 'px');
  }

  // ==========================================================================
  // Início
  // ==========================================================================
  if (!CONFIG.respeitarEstoque) {
    // sem estoque confiável, o filtro de disponibilidade só confunde
    $('#so-disponiveis').closest('.alternador').hidden = true;
  }
  $('#hero-total').textContent = doKit.length;
  montaChips();
  repinta();
  ajustaTopo();
  window.addEventListener('resize', ajustaTopo);
  document.fonts?.ready.then(ajustaTopo);
})();
