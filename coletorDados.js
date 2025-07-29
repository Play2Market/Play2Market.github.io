// ==UserScript==
// @name         Módulo Coletor de Dados Tribal Wars - Acessibilidade
// @namespace    http://tampermonkey.net/
// @version      3.0 (Modular)
// @description  Módulo reutilizável que coleta dados de recursos, população, filas e tropas para projetos de acessibilidade.
// @author       Tiago (Modularizado por Gemini)
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

/**
 * Módulo para Coleta de Dados do Jogo Tribal Wars.
 * Este módulo lê o objeto 'game_data' e o HTML da página para extrair informações.
 * Ele não possui dependências externas e foi projetado para ser facilmente reutilizado.
 */
const TW_DataCollector = (function() {
    'use strict';

    // "Métodos Privados" (dentro do escopo do módulo)

    /**
     * Coleta informações básicas da aldeia e do jogador.
     * @param {object} gameData - O objeto global 'game_data' do jogo.
     * @returns {object} Objeto com nome da aldeia e pontos.
     */
    const _coletarDadosGerais = (gameData) => ({
        aldeia: gameData.village.display_name,
        pontos: gameData.player.points_formatted,
    });

    /**
     * Coleta os três recursos principais.
     * @param {object} gameData - O objeto global 'game_data' do jogo.
     * @returns {object} Objeto com madeira, argila e ferro.
     */
    const _coletarRecursos = (gameData) => ({
        madeira: Math.floor(gameData.village.wood),
        argila: Math.floor(gameData.village.stone),
        ferro: Math.floor(gameData.village.iron),
    });

    /**
     * Coleta a capacidade máxima do armazém.
     * @param {object} gameData - O objeto global 'game_data' do jogo.
     * @returns {object} Objeto com a capacidade do armazém.
     */
    const _coletarArmazem = (gameData) => ({
        capacidade: gameData.village.storage_max,
    });

    /**
     * Coleta a população atual e máxima.
     * @param {object} gameData - O objeto global 'game_data' do jogo.
     * @returns {object} Objeto com população atual e máxima.
     */
    const _coletarPopulacao = (gameData) => ({
        atual: gameData.village.pop,
        maxima: gameData.village.pop_max,
    });

    /**
     * Extrai as tropas presentes na aldeia (funciona apenas na tela de visualização geral).
     * @returns {Array<string>} Lista de strings descrevendo as tropas ou uma mensagem de status.
     */
    const _coletarTropasNaAldeia = () => {
        const tropas = [];
        const tabela = document.getElementById('unit_overview_table');
        if (!tabela) return ["Não está na tela de Visualização Geral."];

        const linhas = tabela.querySelectorAll('tr.home_unit');
        linhas.forEach(linha => {
            const nomeUnidade = linha.textContent.trim().replace(/\s+/g, ' ');
            if (nomeUnidade) tropas.push(nomeUnidade);
        });

        return tropas.length > 0 ? tropas : ["Nenhuma tropa na aldeia."];
    };

    /**
     * Extrai a fila de construção de edifícios (funciona apenas na tela do Edifício Principal).
     * @returns {Array<string>} Lista de strings descrevendo a fila ou uma mensagem de status.
     */
    const _coletarFilaConstrucao = () => {
        const fila = [];
        const tabela = document.getElementById('build_queue');
        if (!tabela) return ["Não está na tela do Edifício Principal."];

        const linhas = tabela.querySelectorAll('tr[class*="buildorder_"]');
        linhas.forEach(linha => {
            const celulas = linha.getElementsByTagName('td');
            if (celulas.length >= 4) {
                const nome = celulas[0].textContent.trim().replace(/\s\s+/g, ' ');
                const conclusao = celulas[3].textContent.trim();
                fila.push(`${nome}, conclui ${conclusao}`);
            }
        });

        return fila.length > 0 ? fila : ["Fila de construção vazia."];
    };

    /**
     * Extrai todas as filas de recrutamento (quartel, estábulo, etc.).
     * @returns {Array<string>} Lista de strings descrevendo as filas ou uma mensagem de status.
     */
    const _coletarFilaRecrutamento = () => {
        const filas = [];
        const divsFila = document.querySelectorAll('div[id^="trainqueue_wrap_"]');
        if (divsFila.length === 0) return ["Nenhuma fila de recrutamento encontrada."];

        divsFila.forEach(div => {
            const linhas = div.querySelectorAll('tr.lit');
             linhas.forEach(linha => {
                const celulas = linha.getElementsByTagName('td');
                if(celulas.length >= 3) {
                    const descricao = celulas[0].textContent.trim().replace(/\s+/g, ' ');
                    const conclusao = celulas[2].textContent.trim();
                    filas.push(`${descricao}, conclui ${conclusao}`);
                }
            });
        });

        return filas.length > 0 ? filas : ["Filas de recrutamento vazias."];
    };


    // "Método Público" (exposto para ser chamado de fora)
    return {
        /**
         * Ponto de entrada principal. Coleta todos os dados disponíveis na página atual.
         * @returns {object|null} Um objeto contendo todos os dados coletados, ou null se os dados do jogo não estiverem disponíveis.
         */
        getData: function() {
            if (typeof game_data === 'undefined') {
                console.error("[Coletor TW] Objeto 'game_data' não encontrado.");
                return null;
            }

            const telaAtual = game_data.screen;
            const dados = {
                // Dados básicos sempre coletados
                geral: _coletarDadosGerais(game_data),
                recursos: _coletarRecursos(game_data),
                populacao: _coletarPopulacao(game_data),
                armazem: _coletarArmazem(game_data),
                // Dados contextuais, dependem da tela
                tropas: null,
                filaConstrucao: null,
                filaRecrutamento: null
            };

            // Coleta dados específicos da tela
            if (telaAtual === 'overview') {
                dados.tropas = _coletarTropasNaAldeia();
            } else if (telaAtual === 'main') {
                dados.filaConstrucao = _coletarFilaConstrucao();
            } else if (['train', 'barracks', 'stable', 'garage'].includes(telaAtual)) {
                dados.filaRecrutamento = _coletarFilaRecrutamento();
            }

            return dados;
        }
    };
})();


/**
 * Módulo de Exibição (Opcional).
 * Responsável por criar e gerenciar a caixa de informações na tela.
 * Pode ser removido se a exibição for controlada por outro script.
 */
const TW_Display = (function() {
    'use strict';
    const BOX_ID = 'dosvox-info-box-modular';

    return {
        /**
         * Renderiza os dados coletados em uma caixa de visualização na tela.
         * @param {object} dados - O objeto de dados retornado por TW_DataCollector.getData().
         */
        display: function(dados) {
            if (!dados) return;

            let container = document.getElementById(BOX_ID);
            if (container) container.remove();

            container = document.createElement('div');
            container.id = BOX_ID;
            container.style.cssText = `
                position: fixed; top: 150px; right: 10px; width: 250px; background-color: #f5e1c3;
                border: 2px solid #7d510f; padding: 15px; z-index: 10000; font-size: 14px;
                color: #3e280c; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                font-family: 'Arial', sans-serif; line-height: 1.6;
            `;

            let conteudo = `<h3 style="margin-top: 0; padding-bottom: 5px; border-bottom: 1px solid #c8b59a;">Dados Coletados</h3>`;
            conteudo += `<b>Aldeia:</b> ${dados.geral.aldeia}<br/>`;
            conteudo += `<b>Pontos:</b> ${dados.geral.pontos}<hr style="border-color: #c8b59a; border-style: dashed;"/>`;

            conteudo += `<b>Recursos:</b><br/>`;
            conteudo += `🌲 M: ${dados.recursos.madeira.toLocaleString('pt-BR')}<br/>`;
            conteudo += `🧱 A: ${dados.recursos.argila.toLocaleString('pt-BR')}<br/>`;
            conteudo += `⛏️ F: ${dados.recursos.ferro.toLocaleString('pt-BR')}<hr style="border-color: #c8b59a; border-style: dashed;"/>`;

            conteudo += `<b>Armazém:</b> ${dados.armazem.capacidade.toLocaleString('pt-BR')}<br/>`;
            conteudo += `<b>População:</b> ${dados.populacao.atual.toLocaleString('pt-BR')} / ${dados.populacao.maxima.toLocaleString('pt-BR')}<hr style="border-color: #c8b59a; border-style: dashed;"/>`;

            if (dados.tropas) {
                conteudo += `<b>Tropas na Aldeia:</b><br/>${dados.tropas.join('<br/>')}`;
            }
            if (dados.filaConstrucao) {
                conteudo += `<b>Construindo:</b><br/>${dados.filaConstrucao.join('<br/>')}`;
            }
            if (dados.filaRecrutamento) {
                conteudo += `<b>Recrutando:</b><br/>${dados.filaRecrutamento.join('<br/>')}`;
            }

            container.innerHTML = conteudo;
            document.body.appendChild(container);
        }
    };
})();


// --- PONTO DE ENTRADA PRINCIPAL DO SCRIPT ---
// Esta é a parte que executa o código.
(function() {
    'use strict';

    window.addEventListener('load', () => {
        setTimeout(() => {
            // 1. Coleta os dados usando o módulo coletor.
            const dadosDoJogo = TW_DataCollector.getData();

            // 2. Exibe os dados na tela usando o módulo de exibição.
            //    (Se você for usar os dados em outro sistema, pode comentar ou remover esta linha).
            TW_Display.display(dadosDoJogo);

            // 3. Você pode usar o objeto 'dadosDoJogo' para qualquer outra finalidade aqui.
            //    Por exemplo, enviá-lo para a interface do DOSVOX.
            console.log("Objeto de dados completo:", dadosDoJogo);

        }, 1000);
    });
})();