// ==UserScript==
// @name         Recrutador Automático Avançado
// @version      1.7.3
// @description  Recrutamento respeitando total, filas (máx 2), delay clique configurável e intervalo reload configurável com logs detalhados
// @author       Triky, GPT e Victor Garé
// @match        https://*.tribalwars.com.br/*&screen=train*
// @match        https://*.tribalwars.com.br/*&screen=stable*
// @match        https://*.tribalwars.com.br/*&screen=barracks*
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // --- Configurações personalizáveis ---
  const delayCliqueMin = 1000;        // 1 segundo
  const delayCliqueMax = 3000;        // 3 segundos
  const intervaloReloadMin = 5 * 60 * 1000;  // 5 minutos
  const intervaloReloadMax = 15 * 60 * 1000; // 15 minutos

  const tropasDesejadas = {
    spear: { total: 3000, porVez: 1 },
    sword: { total: 3000, porVez: 1 },
    axe: { total: 0, porVez: 0 },
    spy: { total: 200, porVez: 1 },
    light: { total: 500, porVez: 1 },
    heavy: { total: 300, porVez: 0 },
    ram: { total: 30, porVez: 0 },
    catapult: { total: 30, porVez: 0 },
  };

  const maxFilasTotais = 2;

  function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function contarUnidadesNaFila(unidade) {
    const mapaNomes = {
      spear: 'lanceiro',
      sword: 'espadachim',
      axe: 'bárbaro',
      spy: 'explorador',
      light: 'cavalaria leve',
      heavy: 'cavalaria pesada',
      ram: 'aríete',
      catapult: 'catapulta'
    };

    const nomeUnidade = mapaNomes[unidade];
    if (!nomeUnidade) return 0;

    let seletorTabela = '';
    if (['spear', 'sword', 'axe', 'spy'].includes(unidade)) {
      seletorTabela = '#trainqueue_wrap_barracks table.vis tbody tr.sortable_row';
    } else if (['light', 'heavy'].includes(unidade)) {
      seletorTabela = '#trainqueue_wrap_stable table.vis tbody tr.sortable_row';
    } else if (['ram', 'catapult'].includes(unidade)) {
      seletorTabela = '#trainqueue_wrap_garage table.vis tbody tr.sortable_row';
    } else {
      console.warn(`Unidade "${unidade}" não tem seletor definido para fila.`);
      return 0;
    }

    const linhas = document.querySelectorAll(seletorTabela);
    let totalUnidades = 0;

    linhas.forEach(tr => {
      const texto = tr.querySelector('td')?.textContent?.toLowerCase() || '';
      if (texto.includes(nomeUnidade)) {
        const matchQtd = texto.match(/^\s*(\d+)/);
        if (matchQtd && matchQtd[1]) {
          totalUnidades += parseInt(matchQtd[1], 10);
        }
      }
    });

    console.log(`Fila: ${unidade} => ${totalUnidades} unidades enfileiradas`);
    return totalUnidades;
  }

  function recrutar() {
    let algumaTropaRecrutada = false;

    // Contar quantas tropas já têm fila ativa (>=1 unidade)
    let totalFilasAtuais = 0;
    for (const unidade in tropasDesejadas) {
      if (contarUnidadesNaFila(unidade) > 0) {
        totalFilasAtuais++;
      }
    }

    $('tr.row_a, tr.row_b').each(function () {
      if (totalFilasAtuais >= maxFilasTotais) {
        console.log('Limite de filas totais atingido. Recrutamento pausado.');
        return false; // Encerra o .each
      }

      const unidade = $(this).find('a.unit_link').data('unit');
      if (!unidade) return;

      const config = tropasDesejadas[unidade];
      if (!config || config.total <= 0 || config.porVez <= 0) {
        return;
      }

      const unidadesNaFila = contarUnidadesNaFila(unidade);
      if (unidadesNaFila > 0) {
        console.log(`Unidade ${unidade} já possui fila. Ignorando.`);
        return;
      }

      const statusTexto = $(this).find('td').eq(2).text().trim();
      const totalAtual = parseInt(statusTexto.split('/')[1], 10) || 0;
      const faltam = config.total - totalAtual;

      console.log(`Unidade ${unidade}: total desejado ${config.total}, na aldeia ${totalAtual}, faltam ${faltam}`);

      if (faltam <= 0) {
        console.log(`Unidade ${unidade} já atingiu ou ultrapassou o total desejado.`);
        return;
      }

      const maxFilaTexto = $(this).find('span#' + unidade + '_0_interaction a').text();
      const maxFila = parseInt(maxFilaTexto.replace(/[^\d]/g, ''), 10) || 0;

      const qtdRecrutar = Math.min(faltam, config.porVez, maxFila);

      if (qtdRecrutar > 0) {
        const input = $(this).find('input.recruit_unit');
        if (input.length > 0 && !input.parent().is(':hidden')) {
          input.val(qtdRecrutar);
          algumaTropaRecrutada = true;
          totalFilasAtuais++;
          console.log(`Preenchendo recrutamento de ${qtdRecrutar} para unidade ${unidade}`);
        }
      } else {
        console.log(`Quantidade a recrutar para unidade ${unidade} é zero ou negativa.`);
      }
    });

    if (algumaTropaRecrutada) {
      const delayClique = aleatorio(delayCliqueMin, delayCliqueMax);
      console.log(`Aguardando ${delayClique} ms antes de clicar no botão de recrutamento.`);
      setTimeout(() => {
        $('.btn-recruit').click();
        console.log('Botão de recrutamento clicado.');
      }, delayClique);
    } else {
      console.log('Nenhuma tropa para recrutar no momento.');
    }
  }

  $(document).ready(function () {
    recrutar();

    const intervalo = aleatorio(intervaloReloadMin, intervaloReloadMax);
    console.log(`Recarregando página em aproximadamente ${Math.round(intervalo / 60000)} minutos.`);
    setTimeout(() => {
      location.reload(true);
    }, intervalo);
  });
})();
