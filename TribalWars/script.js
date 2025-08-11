document.addEventListener("DOMContentLoaded",()=>{
  const toggleBtn=document.getElementById("toggle-sidebar"),
    menu=document.getElementById("menu"),
    buttons=menu.querySelectorAll("button[data-func]"),
    funcPanel=document.getElementById("func-panel"),
    funcTitle=document.getElementById("func-title"),
    funcDesc=document.getElementById("func-desc"),
    saveSwitch=document.getElementById("save-config-switch"),
    enableSwitch=document.getElementById("enable-module-switch"),
    btnPadrao=document.getElementById("btn-padrao"),
    btnRecursos=document.getElementById("btn-recursos"),
    LS_SAVE_PREFIX="saveConfig_",
    LS_ENABLE_PREFIX="enableModule_",
    descriptions={
      construcao:"Automatiza a construção e melhoria de edifícios.",
      farm:"Gerencia ataques automáticos para coletar recursos.",
      recrutamento:"Controla o recrutamento automático de tropas."
    };
  let currentFunc=null,
    buttonsNamed={};
  buttons.forEach(btn=>buttonsNamed[btn.dataset.func]=btn);
  function setActiveButton(selectedBtn){
    [btnPadrao,btnRecursos].forEach(btn=>btn.classList.toggle("active",btn===selectedBtn));
  }
  btnPadrao.addEventListener("click",()=>setActiveButton(btnPadrao));
  btnRecursos.addEventListener("click",()=>setActiveButton(btnRecursos));
  function updatePanel(func){
    currentFunc=func;
    const btn=buttonsNamed[func];
    funcTitle.textContent=btn?.querySelector("img")?.alt||func.charAt(0).toUpperCase()+func.slice(1)+" Automático";
    funcDesc.textContent=descriptions[func]||"";
    saveSwitch.checked=localStorage.getItem(LS_SAVE_PREFIX+func)==="true";
    enableSwitch.checked=localStorage.getItem(LS_ENABLE_PREFIX+func)==="true";
    funcPanel.style.display="flex";
    buttons.forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.func===func);
      btn.setAttribute("aria-pressed",btn.dataset.func===func?"true":"false");
    });
    setActiveButton(btnPadrao);
    funcPanel.focus();
  }
  buttons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(currentFunc===btn.dataset.func&&funcPanel.style.display==="flex"){
        funcPanel.style.display="none";
        currentFunc=null;
        buttons.forEach(b=>{
          b.classList.remove("active");
          b.setAttribute("aria-pressed","false");
        });
        return;
      }
      updatePanel(btn.dataset.func);
    });
  });
  saveSwitch.addEventListener("change",()=>{
    if(!currentFunc) return;
    localStorage.setItem(LS_SAVE_PREFIX+currentFunc,saveSwitch.checked);
  });
  enableSwitch.addEventListener("change",()=>{
    if(!currentFunc) return;
    localStorage.setItem(LS_ENABLE_PREFIX+currentFunc,enableSwitch.checked);
  });
  document.body.addEventListener("click",e=>{
    if(funcPanel.style.display==="flex"&&!funcPanel.contains(e.target)&&!e.target.closest("#menu")&&e.target!==toggleBtn){
      funcPanel.style.display="none";
      currentFunc=null;
      buttons.forEach(btn=>{
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed","false");
      });
    }
  });
  toggleBtn.addEventListener("click",()=>menu.classList.toggle("collapsed"));
});
