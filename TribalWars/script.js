document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-sidebar');
  const menu = document.getElementById('menu');
  const buttons = menu.querySelectorAll('button[data-func]');
  const funcPanel = document.getElementById('func-panel');
  const funcTitle = document.getElementById('func-title');
  const funcDesc = document.getElementById('func-desc');
  const saveSwitch = document.getElementById('save-config-switch');
  const enableSwitch = document.getElementById('enable-module-switch');
  const consolePanel = document.getElementById('console-panel');

  const btnPadrao = document.getElementById('btn-padrao');
  const btnRecursos = document.getElementById('btn-recursos');

  const toggleConsoleBtn = document.getElementById('toggle-console');

  const LS_SAVE_PREFIX = 'saveConfig_';
  const LS_ENABLE_PREFIX = 'enableModule_';

  const descriptions = {
    construtor: "Automatiza a construção e melhoria de edifícios.",
    saqueador: "Gerencia ataques automáticos para coletar recursos.",
    recrutador: "Controla o recrutamento automático de tropas.",
    equalizador: "Balanceia os recursos para otimizar seu uso."
  };

  let currentFunc = null;

  const buttonsNamed = {};
  buttons.forEach(btn => buttonsNamed[btn.dataset.func] = btn);

  function timestamp() {
    const d = new Date();
    return `[${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}]`;
  }

  function log(msg) {
    const line = document.createElement('div');
    line.textContent = `${timestamp()} ${msg}`;
    consolePanel.appendChild(line);
    consolePanel.scrollTop = consolePanel.scrollHeight;
  }

  function setActiveButton(selectedBtn) {
    [btnPadrao, btnRecursos].forEach(btn => {
      btn.classList.toggle('active', btn === selectedBtn);
    });
    log(`Modo selecionado: ${selectedBtn.textContent}`);
  }

  btnPadrao.addEventListener('click', () => setActiveButton(btnPadrao));
  btnRecursos.addEventListener('click', () => setActiveButton(btnRecursos));

  function updatePanel(func) {
    currentFunc = func;
    const btn = buttonsNamed[func];
    funcTitle.textContent = btn?.querySelector('img')?.alt || func.charAt(0).toUpperCase() + func.slice(1);
    funcDesc.textContent = descriptions[func] || '';

    saveSwitch.checked = localStorage.getItem(LS_SAVE_PREFIX + func) === 'true';
    enableSwitch.checked = localStorage.getItem(LS_ENABLE_PREFIX + func) === 'true';

    funcPanel.style.display = 'flex';

    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.func === func);
      btn.setAttribute('aria-pressed', btn.dataset.func === func ? 'true' : 'false');
    });

    setActiveButton(btnPadrao);

    log(`Painel aberto: ${funcTitle.textContent}`);
    log(`Salvar Configuração: ${saveSwitch.checked}`);
    log(`Habilitar Módulo: ${enableSwitch.checked}`);

    funcPanel.focus();
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentFunc === btn.dataset.func && funcPanel.style.display === 'flex') {
        funcPanel.style.display = 'none';
        log(`Painel fechado`);
        currentFunc = null;
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        return;
      }
      updatePanel(btn.dataset.func);
    });
  });

  saveSwitch.addEventListener('change', () => {
    if (!currentFunc) return;
    localStorage.setItem(LS_SAVE_PREFIX + currentFunc, saveSwitch.checked);
    log(`Salvar Configuração alterado para ${saveSwitch.checked} em ${currentFunc}`);
  });

  enableSwitch.addEventListener('change', () => {
    if (!currentFunc) return;
    localStorage.setItem(LS_ENABLE_PREFIX + currentFunc, enableSwitch.checked);
    log(`Habilitar Módulo alterado para ${enableSwitch.checked} em ${currentFunc}`);
  });

  document.body.addEventListener('click', e => {
    if (
      funcPanel.style.display === 'flex' &&
      !funcPanel.contains(e.target) &&
      !e.target.closest('#menu') &&
      e.target !== toggleBtn &&
      e.target !== toggleConsoleBtn
    ) {
      funcPanel.style.display = 'none';
      log(`Painel fechado`);
      currentFunc = null;
      buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
    }
  });

  // Menu lateral desaparece/aparece
  toggleBtn.addEventListener('click', () => {
    if (menu.classList.contains('collapsed')) {
      menu.classList.remove('collapsed');
      toggleBtn.style.display = 'flex';
      const showBtn = document.getElementById('show-menu-btn');
      if (showBtn) showBtn.remove();
    } else {
      menu.classList.add('collapsed');
      toggleBtn.style.display = 'none';
      createShowMenuButton();
    }
  });

  function createShowMenuButton() {
    if (document.getElementById('show-menu-btn')) return;

    const showBtn = document.createElement('button');
    showBtn.id = 'show-menu-btn';
    showBtn.textContent = '☰';
    Object.assign(showBtn.style, {
      position: 'fixed',
      top: '10px',
      left: '10px',
      width: '36px',
      height: '36px',
      background: 'rgba(0,0,0,0.7)',
      border: 'none',
      borderRadius: '6px',
      color: '#eee',
      fontSize: '24px',
      cursor: 'pointer',
      zIndex: '20',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      userSelect: 'none',
      transition: 'background-color 0.3s',
    });
    showBtn.title = 'Mostrar menu';

    showBtn.addEventListener('click', () => {
      menu.classList.remove('collapsed');
      toggleBtn.style.display = 'flex';
      showBtn.remove();
    });

    document.body.appendChild(showBtn);
  }

  // Controle do console lateral
  toggleConsoleBtn.addEventListener('click', () => {
    if (consolePanel.style.display === 'none' || consolePanel.style.display === '') {
      consolePanel.style.display = 'block';
    } else {
      consolePanel.style.display = 'none';
    }
  });

});
