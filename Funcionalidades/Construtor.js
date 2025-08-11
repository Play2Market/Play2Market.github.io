// ==UserScript==
// @name         Construtor TribalWars | Automação Inteligente com iframe
// @namespace    http://tampermonkey.net/
// @version      0.5.0
// @description  Automatiza construções no edifício principal via iframe, prioriza fazenda/armazém, alterna aldeias e faz check-up periódico.
// @match        *://*.tribalwars.com.br/game.php?*screen=main*
// @require      https://code.jquery.com/jquery-1.12.4.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const DEBUG = true;

  // URLs das listas externas
  const URL_LISTA_PADRAO = 'https://raw.githubusercontent.com/Play2Market/Play2Market.github.io/refs/heads/main/Listas/Lista_Edificios/Lista_PADRAO.js';
  const URL_LISTA_RECURSOS = 'https://raw.githubusercontent.com/Play2Market/Play2Market.github.io/refs/heads/main/Listas/Lista_Edificios/Lista_RECURSOS.js';

  // Configurações personalizáveis
  const LIMITE_POPULACAO = 0.75;
  const LIMITE_ARMAZEM = 0.75;

  const INTERVAL_CHECKUP = 10 * 60 * 1000;
  const INTERVAL_LOOP = 2000; // loop a cada 2 segundos
  const INTERVAL_TROCA_MIN = 5 * 60 * 1000;
  const INTERVAL_TROCA_MAX = 15 * 60 * 1000;

  let buildHandle = null;
  let alternando = false;

  let listaPadrao = [];
  let listaRecursos = [];
  // Pode alterar para 'padrao' ou 'recursos'
  let listaAtiva = 'padrao';

  const log = (msg) => DEBUG && console.log(`[Construtor] ${msg}`);

  // Carregar listas externas via GM_xmlhttpRequest
  function carregarLista(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: response => {
          if (response.status >= 200 && response.status < 300) {
            try {
              const func = new Function(response.responseText + '; return Sequência_Construção;');
              const Sequencia = func();
              if (Array.isArray(Sequencia)) {
                resolve(Sequencia);
              } else {
                reject(new Error('Lista não é um array válido'));
              }
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`Erro HTTP ${response.status}`));
          }
        },
        onerror: err => reject(err)
      });
    });
  }

  // -------------------
  // INÍCIO DO CONTROLE DO IFRAME
  // -------------------

  let iframe = null;
  let iframeWindow = null;
  let iframeDoc = null;

  function criarIframeEdificioPrincipal() {
    const baseURL = window.location.origin;
    const vilaAtual = new URLSearchParams(window.location.search).get('village') || '';
    const urlIframeEdificio = `${baseURL}/game.php?village=${vilaAtual}&screen=main_building`;

    if (iframe) {
      iframe.remove();
      iframe = null;
      iframeWindow = null;
      iframeDoc = null;
    }

    iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '10px';
    iframe.style.right = '10px';
    iframe.style.width = '400px';
    iframe.style.height = '600px';
    iframe.style.zIndex = '9999';
    iframe.style.border = '2px solid #000';
    iframe.src = urlIframeEdificio;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframeWindow = iframe.contentWindow;
        iframeDoc = iframe.contentDocument || iframeWindow.document;
        log("✅ Iframe do prédio principal carregado");
      } catch (e) {
        console.error("Erro ao acessar iframe:", e);
      }
    };
  }

  // -------------------
  // FUNÇÕES DE COLETA E CONSTRUÇÃO NO IFRAME
  // -------------------

  // Exemplo: chama funções externas, se existirem, para atualizar dados (ajuste conforme seu ambiente)
  function coletaDados() {
    unsafeWindow.forcarColetaAldeias?.();
    unsafeWindow.forcarColetaPopulacao?.();
    unsafeWindow.forcarColetaArmazem?.();
  }

  async function checkup() {
    try {
      const now = Date.now();
      const last = await GM_getValue('lastCheck', 0);
      if (now - last >= INTERVAL_CHECKUP) {
        log("🔄 Executando check-up...");
        coletaDados();
        await GM_setValue('lastCheck', now);
      } else {
        const restante = ((INTERVAL_CHECKUP - (now - last)) / 60000).toFixed(1);
        log(`⏱ Próximo check-up em ${restante}min`);
      }
    } catch (e) {
      console.error("Erro no check-up:", e);
    }
  }
  setInterval(checkup, 60 * 1000);

  // -------------------
  // LÓGICA DE CONSTRUÇÃO DENTRO DO IFRAME
  // -------------------

  function tentarConstrucao() {
    try {
      if (!iframeDoc) {
        log("⏳ Iframe não carregado ainda");
        return;
      }

      if (devePriorizarFazenda() && clicarFazenda()) return;
      if (devePriorizarArmazem() && clicarArmazem()) return;

      const btn = buscarBotaoConstrucaoPorLista() || buscarBotaoConstrucaoPadrao();
      if (btn) {
        btn.click();
        log("🛠 Construindo: " + btn.id);
      } else {
        alternarAldeia();
      }
    } catch (e) {
      console.error("Erro no loop:", e);
    }
  }

  function devePriorizarFazenda() {
    const mapa = unsafeWindow.getPopulacaoAldeias?.();
    const idAtual = unsafeWindow.game_data?.village?.id;
    const info = mapa?.[idAtual];
    if (!info) return false;

    const [usada, capacidade] = info.split('/').map(Number);
    return usada / capacidade >= LIMITE_POPULACAO;
  }

  function clicarFazenda() {
    const btns = [...iframeDoc.querySelectorAll('.btn-build')];
    const fazenda = btns.find(el =>
      el.id.startsWith("main_buildlink_farm_") &&
      el.offsetParent !== null
    );
    if (fazenda) {
      fazenda.click();
      log("🌾 Fazenda priorizada: " + fazenda.id);
      return true;
    }
    return false;
  }

  function devePriorizarArmazem() {
    const mapa = unsafeWindow.getArmazemAldeias?.();
    const idAtual = unsafeWindow.game_data?.village?.id;
    const info = mapa?.[idAtual];
    if (!info || !info.porcentagens) return false;

    const { madeira, argila, ferro } = info.porcentagens;
    return [madeira, argila, ferro].some(p => parseFloat(p) >= LIMITE_ARMAZEM * 100);
  }

  function clicarArmazem() {
    const btns = [...iframeDoc.querySelectorAll('.btn-build')];
    const armazem = btns.find(el =>
      el.id.startsWith("main_buildlink_storage_") &&
      el.offsetParent !== null
    );
    if (armazem) {
      armazem.click();
      log("📦 Armazém priorizado: " + armazem.id);
      return true;
    }
    return false;
  }

  function buscarBotaoConstrucaoPorLista() {
    const lista = listaAtiva === 'padrao' ? listaPadrao : listaRecursos;
    for (const id of lista) {
      const el = iframeDoc.getElementById(id);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  function buscarBotaoConstrucaoPadrao() {
    for (const tipo of ['wood', 'stone', 'iron', 'farm', 'storage']) {
      for (let i = 1; i <= 30; i++) {
        const id = `main_buildlink_${tipo}_${i}`;
        const el = iframeDoc.getElementById(id);
        if (el && el.offsetParent !== null) {
          return el;
        }
      }
    }
    return null;
  }

  // -------------------
  // ALTERNAR ALDEIA
  // -------------------

  function alternarAldeia() {
    const lista = unsafeWindow.getAldeiasDisponiveis?.() || [];
    if (lista.length < 2 || alternando) return;

    alternando = true;
    clearInterval(buildHandle);
    log("🔄 Alternando aldeia...");

    const atual = new URLSearchParams(location.search).get('village');
    const idx = lista.indexOf(atual);
    const proxima = lista[(idx + 1) % lista.length];
    const delay = INTERVAL_TROCA_MIN + Math.random() * (INTERVAL_TROCA_MAX - INTERVAL_TROCA_MIN);

    log(`↔️ Alternância programada em ${(delay/60000).toFixed(1)}min: ${atual} → ${proxima}`);

    setTimeout(() => {
      location.href = `${location.origin}${location.pathname}?village=${proxima}`;
    }, delay);
  }

  // -------------------
  // INICIAR CONSTRUTOR
  // -------------------

  function iniciarConstrutor() {
    if (location.href.includes('screen=main') &&
        location.search.includes('village=')) {
      log("▶️ Iniciando construtor com iframe");
      criarIframeEdificioPrincipal();
      reiniciarLoop();
    }
  }

  function reiniciarLoop() {
    if (buildHandle) {
      clearInterval(buildHandle);
      log("🔁 Loop anterior parado");
    }
    tentarConstrucao();
    buildHandle = setInterval(tentarConstrucao, INTERVAL_LOOP);
  }

  // -------------------
  // INICIALIZAÇÃO
  // -------------------

  async function inicializar() {
    try {
      log('Carregando lista padrão...');
      listaPadrao = await carregarLista(URL_LISTA_PADRAO);
      log(`Lista padrão carregada com ${listaPadrao.length} itens`);

      log('Carregando lista recursos...');
      listaRecursos = await carregarLista(URL_LISTA_RECURSOS);
      log(`Lista recursos carregada com ${listaRecursos.length} itens`);

      // Defina aqui a lista ativa: 'padrao' ou 'recursos'
      listaAtiva = 'padrao';

      iniciarConstrutor();
    } catch (e) {
      console.error('Erro ao carregar listas:', e);
      iniciarConstrutor();
    }
  }

  log("-- Script TribalWars Inicializado --");
  inicializar();

})();
