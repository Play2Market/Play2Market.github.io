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

  // Delay mínimo em milissegundos antes de clicar no botão de recrutamento (simula comportamento humano)
  const delayCliqueMin = 1000;        // 1 segundo

  // Delay máximo em milissegundos antes de clicar no botão de recrutamento
  const delayCliqueMax = 3000;        // 3 segundos

  // Intervalo mínimo em milissegundos para recarregar a página e executar o script novamente
  const intervaloReloadMin = 5 * 60 * 1000;  // 5 minutos

  // Intervalo máximo em milissegundos para recarregar a página e executar o script novamente
  const intervaloReloadMax = 15 * 60 * 1000; // 15 minutos

  // Configuração de quantas tropas e quantas unidades recrutar por vez para cada tipo
  const tropasDesejadas = {
    spear: { total: 3000, porVez: 1 },    // Lanceiros
    sword: { total: 3000, porVez: 1 },    // Espadachins
    axe: { total: 0, porVez: 0 },         // Bárbaros (não recrutar)
    spy: { total: 200, porVez: 1 },       // Exploradores
    light: { total: 500, porVez: 1 },     // Cavalaria leve
    heavy: { total: 300, porVez: 0 },     // Cavalaria pesada (não recrutar)
    ram: { total: 30, porVez: 0 },        // Aríetes (não recrutar)
    catapult: { total: 30, porVez: 0 },   // Catapultas (não recrutar)
  };

  // Limite total de filas ativas simultâneas para todas as tropas (somadas)
  const maxFilasTotais = 2;

  /**
   * Retorna um número inteiro aleatório entre min e max (inclusive).
   * @param {number} min Valor mínimo
   * @param {number} max Valor máximo
   * @returns {number} Número aleatório inteiro
   */
  function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Conta quantas unidades da tropa especificada estão atualmente na fila de recrutamento.
   * @param {string} unidade Nome da unidade (ex: 'spear', 'sword', etc)
   * @returns {number} Quantidade total enfileirada da unidade
   */
  function contarUnidadesNaFila(unidade) {
    // Mapeamento do nome interno da tropa para o nome exibido na interface do jogo (em português)
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

    // Obtem o nome amigável da unidade para busca na tabela de fila
    const nomeUnidade = mapaNomes[unidade];
    if (!nomeUnidade) return 0;

    // Define seletor CSS para capturar as linhas da fila dependendo do tipo da tropa
    let seletorTabela = '';
    if (['spear', 'sword', 'axe', 'spy'].includes(unidade)) {
      // Tropas do quartel (barracks)
      seletorTabela = '#trainqueue_wrap_barracks table.vis tbody tr.sortable_row';
    } else if (['light', 'heavy'].includes(unidade)) {
      // Tropas do estábulo (stable)
      seletorTabela = '#trainqueue_wrap_stable table.vis tbody tr.sortable_row';
    } else if (['ram', 'catapult'].includes(unidade)) {
      // Tropas da garagem (garage)
      seletorTabela = '#trainqueue_wrap_garage table.vis tbody tr.sortable_row';
    } else {
      // Caso o tipo de unidade não seja reconhecido
      console.warn(`Unidade "${unidade}" não tem seletor definido para fila.`);
      return 0;
    }

    // Seleciona todas as linhas da fila para a tropa atual
    const linhas = document.querySelectorAll(seletorTabela);
    let totalUnidades = 0;

    // Para cada linha, verifica se corresponde à unidade procurada e soma as quantidades
    linhas.forEach(tr => {
      const texto = tr.querySelector('td')?.textContent?.toLowerCase() || '';
      if (texto.includes(nomeUnidade)) {
        // Extrai a quantidade da string do tipo "123 alguma coisa"
        const matchQtd = texto.match(/^\s*(\d+)/);
        if (matchQtd && matchQtd[1]) {
          totalUnidades += parseInt(matchQtd[1], 10);
        }
      }
    });

    console.log(`Fila: ${unidade} => ${totalUnidades} unidades enfileiradas`);
    return totalUnidades;
  }

  /**
   * Função principal que verifica a necessidade de recrutar tropas e executa o recrutamento.
   * Respeita limite máximo de filas totais e delay humano no clique.
   */
  function recrutar() {
    let algumaTropaRecrutada = false;

    // Conta quantas tropas já estão com fila ativa (com pelo menos uma unidade)
    let totalFilasAtuais = 0;
    for (const unidade in tropasDesejadas) {
      if (contarUnidadesNaFila(unidade) > 0) {
        totalFilasAtuais++;
      }
    }

    // Itera sobre as linhas da tabela de tropas para configurar recrutamento
    $('tr.row_a, tr.row_b').each(function () {
      // Se atingiu o limite de filas simultâneas, para a iteração
      if (totalFilasAtuais >= maxFilasTotais) {
        console.log('Limite de filas totais atingido. Recrutamento pausado.');
        return false; // interrompe o .each
      }

      // Identifica a unidade da linha atual pelo atributo 'data-unit' no link
      const unidade = $(this).find('a.unit_link').data('unit');
      if (!unidade) return;

      const config = tropasDesejadas[unidade];
      if (!config || config.total <= 0 || config.porVez <= 0) {
        // Se não há configuração para essa unidade ou valores zerados, ignora
        return;
      }

      // Verifica se já existe fila para essa unidade
      const unidadesNaFila = contarUnidadesNaFila(unidade);
      if (unidadesNaFila > 0) {
        console.log(`Unidade ${unidade} já possui fila. Ignorando.`);
        return;
      }

      // Extrai quantas unidades da tropa já existem na aldeia (status do jogo, ex: "94/215")
      const statusTexto = $(this).find('td').eq(2).text().trim();
      const totalAtual = parseInt(statusTexto.split('/')[1], 10) || 0;

      // Calcula quantas unidades faltam para atingir o total desejado
      const faltam = config.total - totalAtual;

      console.log(`Unidade ${unidade}: total desejado ${config.total}, na aldeia ${totalAtual}, faltam ${faltam}`);

      // Se já atingiu ou ultrapassou o total, não recruta
      if (faltam <= 0) {
        console.log(`Unidade ${unidade} já atingiu ou ultrapassou o total desejado.`);
        return;
      }

      // Obtém o máximo permitido para enfileirar nessa tropa naquele momento
      const maxFilaTexto = $(this).find('span#' + unidade + '_0_interaction a').text();
      const maxFila = parseInt(maxFilaTexto.replace(/[^\d]/g, ''), 10) || 0;

      // Calcula a quantidade a recrutar: o mínimo entre faltam, quantidade por vez e limite da fila
      const qtdRecrutar = Math.min(faltam, config.porVez, maxFila);

      // Se a quantidade a recrutar for positiva, preenche o input para recrutamento
      if (qtdRecrutar > 0) {
        const input = $(this).find('input.recruit_unit');
        if (input.length > 0 && !input.parent().is(':hidden')) {
          input.val(qtdRecrutar);
          algumaTropaRecrutada = true;
          totalFilasAtuais++; // Incrementa o total de filas ativas após decidir recrutar essa tropa
          console.log(`Preenchendo recrutamento de ${qtdRecrutar} para unidade ${unidade}`);
        }
      } else {
        console.log(`Quantidade a recrutar para unidade ${unidade} é zero ou negativa.`);
      }
    });

    // Se algum recrutamento foi configurado, aguarda um delay humano antes de clicar no botão
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

  // Quando o documento estiver pronto, executa o recrutamento e programa o reload da página
  $(document).ready(function () {
    recrutar();

    // Calcula um intervalo aleatório entre o mínimo e máximo configurados para recarregar a página
    const intervalo = aleatorio(intervaloReloadMin, intervaloReloadMax);
    console.log(`Recarregando página em aproximadamente ${Math.round(intervalo / 60000)} minutos.`);

    // Agendar recarregamento da página após o intervalo calculado
    setTimeout(() => {
      location.reload(true);
    }, intervalo);
  });

})();
