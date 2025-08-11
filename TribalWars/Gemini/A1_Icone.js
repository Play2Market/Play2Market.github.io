// ==UserScript==
// @name         GEMINI | FASE BETA | Em Desenvolvimento
// @namespace    https://tribalwars.com.br/
// @version      1.4
// @description  Ícone de chama alinhado e posicionado dinamicamente abaixo do #new_quest.
// @author       Triky, GPT & Cia
// @include      http*://*.tribalwars.*/game.php?*&screen=storage*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const gifURL = "https://cdn.pixabay.com/animation/2023/01/19/18/24/18-24-20-426_512.gif";

  const questDiv = document.querySelector("#new_quest");
  if (!questDiv) return;

  const btn = document.createElement('img');
  btn.id = 'custom_chama_btn';
  btn.src = gifURL;
  btn.title = "Abrir painel";

  Object.assign(btn.style, {
    width: "75px",
    height: "75px",
    position: "absolute",
    cursor: "pointer",
    zIndex: "999999",
    display: 'block',
  });

  document.body.appendChild(btn);

  function updatePosition() {
    const rect = questDiv.getBoundingClientRect();
    const x = rect.left + window.scrollX + (rect.width / 2) - (btn.offsetWidth / 2);
    const y = rect.bottom + 5 + window.scrollY;
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
  }

  updatePosition();
  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);

  // Aqui você pode adicionar o evento de clique se precisar:
  // btn.addEventListener('click', () => toggleModal());
})();
