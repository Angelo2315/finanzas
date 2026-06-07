// ═══ SHEETS URL ═══
const SHEETS_URL='https://script.google.com/macros/s/AKfycbxV4hmnyt3Xz11IdyM5GeV9l1RvKT8o4ltFmMPoRLHKhH964SbF0uPpcFzvV2egb7vESQ/exec';
let sheetUrl=SHEETS_URL||localStorage.getItem('fp_url')||'';

// ═══ TRANSLATIONS (i18n) ═══
const i18n = {
  es: {
    nav_home: 'Home', nav_reports: 'Statistic', nav_budget: 'Target', nav_more: 'Menu',
    net_balance: 'Balance Neto', available: 'Disponible', savings: 'Ahorro', income: 'Ingresos', expenses: 'Gastos',
    expenses_cat: 'Gastos por Categoría', transactions: 'Movimientos',
    nav_debts: 'Deudas', nav_taxes: 'Taxes', modules: 'Módulos', debts_sub: 'Gestiona créditos',
    taxes_sub: 'Deducibles', preferences: 'Preferencias', language: 'Idioma', savings_goal: 'Meta Ahorro',
    categories: 'Categorías', payment_methods: 'Métodos Pago', your_name: 'Nombre',
    data_cloud: 'Datos & Nube', export_csv: 'Exportar CSV', force_sync: 'Sincronizar', delete_data: 'Borrar Datos',
    total_owed: 'Adeudado', new_debt: '+ Nueva Deuda', suggested_reserve: 'Reserva Sugerida', gross_income: 'Ingresos Brutos',
    deductible_exp: 'Gastos Deducibles', net_income: 'Ingreso Neto', deductible_categories: 'Categorías Deducibles',
    export_cpa: 'Exportar CPA', edit: 'Editar'
  },
  en: {
    nav_home: 'Home', nav_reports: 'Statistic', nav_budget: 'Target', nav_more: 'Menu',
    net_balance: 'Net Balance', available: 'Available', savings: 'Savings', income: 'Income', expenses: 'Expenses',
    expenses_cat: 'Expenses by Category', transactions: 'Transactions',
    nav_debts: 'Debts', nav_taxes: 'Taxes', modules: 'Modules', debts_sub: 'Manage credits',
    taxes_sub: 'Deductibles', preferences: 'Preferences', language: 'Language', savings_goal: 'Savings Goal',
    categories: 'Categories', payment_methods: 'Payment Methods', your_name: 'Your Name',
    data_cloud: 'Data & Cloud', export_csv: 'Export CSV', force_sync: 'Force Sync', delete_data: 'Erase Data',
    total_owed: 'Total Owed', new_debt: '+ New Debt', suggested_reserve: 'Suggested Reserve', gross_income: 'Gross Income',
    deductible_exp: 'Deductible Expenses', net_income: 'Net Income', deductible_categories: 'Deductible Categories',
    export_cpa: 'Export CPA', edit: 'Edit'
  }
};

// ═══ DEFAULTS & STATE ═══
const DEF_CATS={Ingreso:{"Ingresos":{color:"#D4FF00",subs:["Sueldo","Negocio","Propinas","Freelance","Otros"]}},Gasto:{"Rent":{color:"#D4FF00",subs:["House Rent","Mortgage"],deductible:true},"Food":{color:"#D4FF00",subs:["Groceries","Restaurants","Coffee"],deductible:false},"Transport":{color:"#D4FF00",subs:["Gas","Car Payment","Uber","Transit"],deductible:true},"Utilities":{color:"#D4FF00",subs:["Internet","Phone","Electricity","Water"],deductible:true},"Entertainment":{color:"#D4FF00",subs:["Movies","Subscriptions","Drinks"],deductible:false},"Savings":{color:"#D4FF00",subs:["Emergency Fund","Vacation","Goal"],deductible:false},"Other":{color:"#D4FF00",subs:["Shopping","Health","Misc"],deductible:false}}};
const DEF_BUDGETS=[{cat:"Rent",limit:1260},{cat:"Food",limit:770},{cat:"Transport",limit:465},{cat:"Utilities",limit:200},{cat:"Entertainment",limit:250},{cat:"Savings",limit:500},{cat:"Other",limit:200}];
const DEF_PAYS=["Débito","Crédito","Efectivo","Apple Pay","Zelle","Venmo","Cash App","Transferencia"];
const PAY_ICONS={"Débito":"💳","Crédito":"💳","Efectivo":"💵","Apple Pay":"🍎","Zelle":"⚡","Venmo":"🔵","Cash App":"💚","Transferencia":"🏦"};
const CAT_ICONS={"Ingresos":"💵","Rent":"🏠","Food":"🍔","Transport":"🚗","Utilities":"⚡","Entertainment":"🎮","Savings":"🐷","Other":"📦","Deudas":"🏦"};

let cats=JSON.parse(localStorage.getItem('fp_cats'))||JSON.parse(JSON.stringify(DEF_CATS));
let txs=JSON.parse(localStorage.getItem('fp_txs'))||[];
let budgets=JSON.parse(localStorage.getItem('fp_budgets'))||{};
let payments=JSON.parse(localStorage.getItem('fp_payments'))||[...DEF_PAYS];
let userName=localStorage.getItem('fp_name')||'User';
let savGoal=parseFloat(localStorage.getItem('fp_goal'))||2000;
let taxPct=parseFloat(localStorage.getItem('fp_taxpct'))||20;
let currentLang=localStorage.getItem('fp_lang')||'es';

let curDate=new Date(),calYear=new Date().getFullYear();
let catMgrT='Gasto',curType='Ingreso',isEditBud=false,rChart=null;
let selCat='',selSub='',selPay=payments[0]||'Débito';
let debts = JSON.parse(localStorage.getItem('fp_debts')) || [];
let editDebtId = null, tt=null;

const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MSF=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const fmt=v=>{if(v===undefined||v===null||isNaN(v))return'$0';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(v));};
const fmt2=v=>{if(!v&&v!==0)return'$0.00';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v));};
const fmtK=v=>{const n=Number(v)||0;return Math.abs(n)>=1000?'$'+(n/1000).toFixed(1)+'k':fmt(n);};

function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2800);}

// ═══ INIT & BLINDADO ═══
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  
  if(document.getElementById('txDate')) document.getElementById('txDate').valueAsDate=new Date();
  if(document.getElementById('sv-name')) document.getElementById('sv-name').textContent=userName;
  if(document.getElementById('inp-taxpct')) document.getElementById('inp-taxpct').value=taxPct;

  const finishLoad = () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }
    updateMonthDisplay();
  };

  const fallbackTimer = setTimeout(finishLoad, 1500);

  if(sheetUrl) { 
     loadFromSheets(false).then(() => { clearTimeout(fallbackTimer); finishLoad(); });
  } else {
     clearTimeout(fallbackTimer); finishLoad();
  }

  setInterval(()=>{if(sheetUrl&&document.visibilityState==='visible')loadFromSheets(false);},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&sheetUrl){retryQueue();loadFromSheets(false);}});
});

// ═══ LANG ═══
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
  });
  const svLang = document.getElementById('sv-lang');
  if(svLang) svLang.textContent = currentLang.toUpperCase();
}
function toggleLang() {
  currentLang = currentLang === 'es' ? 'en' : 'es';
  localStorage.setItem('fp_lang', currentLang);
  applyLang();
  toast(currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English');
  updateMonthDisplay();
}

// ═══ NAV BAR ═══
function switchView(v) {
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('on'));
  const tgt = document.getElementById('v-'+v);
  if(tgt) tgt.classList.add('on');
  
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  const btn = document.getElementById('nav-'+v);
  if(btn) btn.classList.add('on');

  if(v==='home')renderHome(); if(v==='reports')renderReports();
  if(v==='budget')renderBudget(); if(v==='taxes')renderTaxes(); if(v==='debts')renderDebts();
}

function openModalNav(type) {
    curType = type;
    openModal();
}

function getKey(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function changeMonth(d){curDate=new Date(curDate.getFullYear(),curDate.getMonth()+d,1);updateMonthDisplay();}
function updateMonthDisplay(){
  const ss=`${MS[curDate.getMonth()]} ${curDate.getFullYear()}`;
  ['mn-home','mn-rep','mn-bud'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=ss;});
  const bs=document.getElementById('bud-sub');if(bs)bs.textContent=(currentLang==='es'?'Mes actual':'Current month');
  renderHome();
  const ov=document.querySelector('.view.on');
  if(ov){if(ov.id==='v-reports')renderReports();if(ov.id==='v-budget')renderBudget();if(ov.id==='v-taxes')renderTaxes();}
}
function getMonthTxs(yr,mo){
  const fy=yr!==undefined?yr:curDate.getFullYear(),fm=mo!==undefined?mo:curDate.getMonth();
  return txs.filter(tx=>{if(!tx||!tx.date)return false;const d=new Date(tx.date+'T12:00:00');return d.getMonth()===fm&&d.getFullYear()===fy;});
}

// ═══ HOME ═══
function renderHome(){
  const mt=getMonthTxs(); let inc=0,exp=0,catSums={},savByCat={},totalSaved=0;
  mt.forEach(tx=>{
    const amt=Number(tx.amount)||0;
    if(tx.type==='Ingreso')inc+=amt;
    else{exp+=amt;catSums[tx.category]=(catSums[tx.category]||0)+amt;if(tx.category==='Savings'){totalSaved+=amt;savByCat[tx.subcategory]=(savByCat[tx.subcategory]||0)+amt;}}
  });
  
  const gap=inc-exp;
  
  const sci = document.getElementById('sc-inc'); if(sci) sci.textContent=fmt(inc); 
  const sce = document.getElementById('sc-exp'); if(sce) sce.textContent=fmt(exp); 
  const scs = document.getElementById('sc-sav'); if(scs) scs.textContent=fmt(totalSaved);
  
  const gEl=document.getElementById('sc-gap');
  if(gEl) gEl.textContent=fmt(gap);
  
  const scr = document.getElementById('sc-rate'); if(scr) scr.textContent=(currentLang==='es'?'Meta: ':'Goal: ')+fmt(savGoal);
  const hct = document.getElementById('h-count'); if(hct) hct.textContent=mt.length;

  const pct=Math.max(0,Math.min(100,(totalSaved/savGoal)*100));
  const md = document.getElementById('mini-donut'); if(md) md.style.background=`conic-gradient(var(--neon) ${pct}%,var(--card) 0%)`;
  const mdp = document.getElementById('mini-donut-pct'); if(mdp) mdp.textContent=pct.toFixed(0)+'%';
  
  const hc=document.getElementById('home-cats'); 
  if(hc) {
    const entries=Object.entries(catSums).sort((a,b)=>b[1]-a[1]);
    if(!entries.length){hc.innerHTML=`<p style="font-size:12px;color:var(--text-muted);padding:4px 0;font-weight:600">${currentLang==='es'?'Sin gastos este mes':'No expenses this month'}</p>`;}
    else{const mx=entries[0][1]||1;hc.innerHTML=entries.map(([cat,amt])=>{return`<div class="catbar"><div class="catbar-name">${CAT_ICONS[cat]||'📁'} ${cat}</div><div class="catbar-bg"><div class="catbar-fill" style="width:${(amt/mx*100).toFixed(0)}%;background:var(--neon)"></div></div><div class="catbar-amt">${fmtK(amt)}</div></div>`;}).join('');}
  }
  
  renderDayList(mt);
}

function renderDayList(monthly){
  const list=document.getElementById('h-list');
  if(!list) return;
  if(!monthly.length){list.innerHTML=`<div style="text-align:center;padding:40px 0"><p style="font-size:14px;font-weight:800;color:var(--text-muted)">${currentLang==='es'?'Sin movimientos':'No transactions'}</p></div>`;return;}
  const groups={}; monthly.forEach(tx=>{if(!groups[tx.date])groups[tx.date]=[];groups[tx.date].push(tx);});
  const dates=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
  
  list.innerHTML=dates.map(ds=>{
    const d=new Date(ds+'T12:00:00'); 
    const label=`${DAYS[d.getDay()]} ${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`;
    const g=groups[ds]; const dayInc=g.filter(t=>t.type==='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0); const dayExp=g.filter(t=>t.type!=='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0); const dayNet=dayInc-dayExp;
    
    const rows=g.map(tx=>{
      const isI=tx.type==='Ingreso'; const sign=isI?'+':'-'; const sub=tx.subcategory||tx.category||'—'; const metaParts=[tx.category,tx.method].filter(Boolean);
      return`<div class="txr-wrap" id="txw-${tx.id}">
        <div class="txr-hint edit"><i class="fa-solid fa-pen"></i></div>
        <div class="txr-hint del"><i class="fa-solid fa-trash"></i></div>
        <div class="txr-surface" id="txs-${tx.id}">
          <div class="tx-icon"><img src="https://ui-avatars.com/api/?name=${sub.replace(' ','+')}&background=random&color=fff&rounded=true" style="width:32px;border-radius:10px"></div>
          <div class="tx-info">
            <div class="tx-name">${sub}</div>
            <div class="tx-meta">${metaParts.join(' · ')}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amt ${isI?'pos':''}">${sign}${fmt(Number(tx.amount)||0)}</div>
            <div class="txr-badge">${tx.type}</div>
          </div>
        </div>
      </div>`;
    }).join('');
    return`<div><div class="day-hdr"><span class="day-lbl">${label}</span></div>${rows}</div>`;
  }).join('');
  initSwipe();
}

// CORRECCIÓN SWIPE
function initSwipe(){
  document.querySelectorAll('.txr-wrap').forEach(wrap=>{
    const id=wrap.id.replace('txw-','');const surf=document.getElementById('txs-'+id);if(!surf)return;
    let sx=0,dx=0,active=false;
    wrap.addEventListener('touchstart',e=>{
      sx=e.touches[0].clientX; dx=0; active=true;
      surf.style.transition='none';
    },{passive:true});
    wrap.addEventListener('touchmove',e=>{
      if(!active)return;
      dx=e.touches[0].clientX-sx;
      surf.style.transform=`translateX(${Math.max(-80,Math.min(80,dx))}px)`;
    },{passive:true});
    wrap.addEventListener('touchend',()=>{
      if(!active)return;
      active=false;
      surf.style.transition='transform .25s ease';
      if(dx>45){
        surf.style.transform='translateX(0)';
        openEditModal(id);
      }else if(dx<-45){
        surf.style.transform='translateX(-100%)';
        setTimeout(()=>{
          surf.style.transform='translateX(0)';
          confirmDelete(id);
        }, 250);
      }else{
        surf.style.transform='translateX(0)';
      }
    },{passive:true});
  });
}

function openEditModal(id){const tx=txs.find(t=>t.id===id);if(!tx)return;document.getElementById('edit-id').value=id;document.getElementById('edit-amt').value=tx.amount;document.getElementById('modal-edit').classList.add('mon');}
function closeEditModal(){document.getElementById('modal-edit').classList.remove('mon');}
function saveEdit(){const id=document.getElementById('edit-id').value,amt=parseFloat(document.getElementById('edit-amt').value);if(!amt||amt<=0){toast('⚠️ Error');return;}const tx=txs.find(t=>t.id===id);if(!tx)return;tx.amount=amt;localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('save_tx',tx);closeEditModal();updateMonthDisplay();toast('✏️ OK');}
function confirmDelete(id){if(!confirm('¿Seguro? / Sure?')){updateMonthDisplay();return;}txs=txs.filter(t=>t.id!==id);localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('delete_tx',{id});updateMonthDisplay();toast('🗑 OK');}

// ═══ TARGET (BUDGET VERTICAL CHARTS) ═══
function getCurrentBudgets(){
  const key=getKey(curDate);
  if(!budgets[key]){const prev=new Date(curDate.getFullYear(),curDate.getMonth()-1,1),pk=getKey(prev);budgets[key]=budgets[pk]?JSON.parse(JSON.stringify(budgets[pk])):JSON.parse(JSON.stringify(DEF_BUDGETS));Object.keys(cats.Gasto).forEach(c=>{if(!budgets[key].find(b=>b.cat===c))budgets[key].push({cat:c,limit:0});});localStorage.setItem('fp_budgets',JSON.stringify(budgets));}
  return budgets[key];
}

function renderBudget(){
  const bl=document.getElementById('bud-list'); 
  const bc=document.getElementById('bud-chart'); 
  if(!bl || !bc) return;
  
  const monthly=getMonthTxs(),curr=getCurrentBudgets();
  let totalLimit=0, totalSpent=0;
  
  // Render Vertical Bars
  let chartHtml = '';
  
  curr.forEach((b,i)=>{
    totalLimit += b.limit;
    const spent=monthly.filter(tx=>tx.type!=='Ingreso'&&tx.category===b.cat).reduce((s,tx)=>s+(Number(tx.amount)||0),0);
    totalSpent += spent;
    
    const raw=b.limit>0?(spent/b.limit)*100:0;
    const pct=Math.min(raw,100);
    const color = raw > 100 ? 'var(--danger)' : 'var(--neon)';
    
    chartHtml += `
      <div class="budget-bar-wrap">
        <div class="bbar-bg">
          <div class="bbar-fill" style="height:${pct}%; background:${color}"></div>
        </div>
        <span class="bbar-lbl">${b.cat.substring(0,3)}</span>
      </div>`;
  });
  
  bc.innerHTML = chartHtml;
  document.getElementById('bud-total-spent').textContent = fmt(totalSpent);

  // Render List
  bl.innerHTML=curr.map((b,i)=>{
    const spent=monthly.filter(tx=>tx.type!=='Ingreso'&&tx.category===b.cat).reduce((s,tx)=>s+(Number(tx.amount)||0),0);
    const raw=b.limit>0?(spent/b.limit)*100:0;
    
    const lf=isEditBud?`<input type="number" value="${b.limit}" onchange="updateBL(${i},this.value)" style="border:1px solid var(--neon);border-radius:8px;padding:6px;font-size:15px;font-weight:900;width:90px;text-align:right;background:transparent;color:var(--neon);outline:none">`:`<div style="font-size:16px;font-weight:900;color:var(--text-main)">${fmt(spent)}</div><div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-top:2px">de ${fmt(b.limit)}</div>`;
    
    return`<div class="card" style="margin-bottom:12px;padding:16px"><div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:12px"><div style="width:38px;height:38px;border-radius:12px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px">${CAT_ICONS[b.cat]||'📁'}</div><div><div style="font-size:14px;font-weight:900;color:var(--text-main)">${b.cat}</div></div></div><div style="text-align:right">${lf}</div></div></div>`;
  }).join('');
}
function toggleEditBud(){isEditBud=!isEditBud;const btn=document.getElementById('edit-bud-btn');if(isEditBud){btn.style.color='var(--success)';}else{btn.style.color='var(--text-main)';localStorage.setItem('fp_budgets',JSON.stringify(budgets));syncData('save_config',{type:'budgets',content:budgets});toast('💾 OK');}renderBudget();}
function updateBL(i,v){getCurrentBudgets()[i].limit=parseFloat(v)||0;}

function renderReports(){
  const rcats=document.getElementById('r-cats'); 
  if(rcats) rcats.innerHTML=`<p style="font-size:12px;color:var(--text-muted);padding:4px 0;font-weight:600">En desarrollo para nueva versión</p>`;
}

function renderTaxes(){
  const Y=curDate.getFullYear();
  let incY=0,expY=0,dedMap={}; txs.forEach(tx=>{const d=new Date(tx.date+'T12:00:00');if(d.getFullYear()!==Y)return;const a=Number(tx.amount)||0;if(tx.type==='Ingreso')incY+=a;else{expY+=a;const cd=cats.Gasto[tx.category];if(cd&&cd.deductible){dedMap[tx.category]=(dedMap[tx.category]||0)+a;}}});
  const net=Math.max(0,incY-expY),est=net*(taxPct/100);
  
  const tt=document.getElementById('tax-total'); if(tt) tt.textContent=fmt2(est);
  const ti=document.getElementById('tax-inc'); if(ti) ti.textContent=fmt(incY);
  const te=document.getElementById('tax-exp'); if(te) te.textContent='-'+fmt(expY);
  
  const dl=document.getElementById('deduct-list');
  if(dl) dl.innerHTML=Object.entries(cats.Gasto).map(([cat,cd])=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--bdr)"><div style="font-size:14px;font-weight:800;color:var(--text-main)">${cat}</div></div>`).join('');
}
function calcTaxes(){taxPct=parseFloat(document.getElementById('inp-taxpct').value)||0;localStorage.setItem('fp_taxpct',taxPct);renderTaxes();}

// ═══ MODAL TX ═══
function openModal(){
  selCat='';selSub='';selPay=payments[0]||'Débito';
  document.getElementById('txDate').valueAsDate=new Date();
  document.getElementById('txAmt').value='';document.getElementById('txNote').value='';
  onTC();renderPayGridModal();
  document.getElementById('modal-tx').classList.add('mon');
}
function closeModal(){ document.getElementById('modal-tx').classList.remove('mon'); }

function onTC(){
  curType=document.querySelector('input[name="tt"]:checked').value;
  document.getElementById('lbl-i').className='slbl'+(curType==='Ingreso'?' ai':''); document.getElementById('lbl-e').className='slbl'+(curType==='Gasto'?' ae':'');
  const grid=document.getElementById('cat-grid');grid.innerHTML='';
  Object.entries(cats[curType]).forEach(([key,cd])=>{grid.innerHTML+=`<button class="cbtn" onclick="selectCat('${key}',this)"><span class="cbtn-ico">${CAT_ICONS[key]||'📁'}</span><span>${key.substring(0,8)}</span></button>`;});
}

function selectCat(key,btn){
  selCat=key;selSub=''; document.querySelectorAll('.cbtn').forEach(b=>{b.classList.remove('sel');});
  btn.classList.add('sel');
}

function renderPayGridModal() {
  const grid = document.getElementById('pay-grid-modal'); if(!grid) return;
  grid.innerHTML = payments.slice(0,3).map(p => {
    const isSel = p === selPay;
    return `<button class="cbtn${isSel?' sel':''}" onclick="selectPayModal('${p}',this)"><span class="cbtn-ico">${PAY_ICONS[p]||'💳'}</span><span>${p}</span></button>`;
  }).join('');
}
function selectPayModal(p, btn) { selPay = p; document.querySelectorAll('#pay-grid-modal button').forEach(b => b.classList.remove('sel')); btn.classList.add('sel'); }

function saveTx(){
  const amt=parseFloat(document.getElementById('txAmt').value);
  if(!amt||amt<=0){toast('⚠️ Monto');return;} if(!selCat){toast('⚠️ Categoría');return;}
  const tx={id:'TX-'+Date.now().toString().slice(-9),date:document.getElementById('txDate').value,type:curType,category:selCat,subcategory:selSub||selCat,amount:amt,method:selPay,notes:document.getElementById('txNote').value};
  txs.unshift(tx);localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('save_tx',tx);closeModal();updateMonthDisplay();toast('✅ Guardado');
}

// ═══ PAYMENT MGR ═══
function openPayMgr() { renderPayMgrList(); document.getElementById('modal-pay').classList.add('mon'); }
function closePayMgr() { document.getElementById('modal-pay').classList.remove('mon'); }
function renderPayMgrList() {
  const list = document.getElementById('pay-mgr-list');
  list.innerHTML = payments.map((p,i) => {
    const ico = PAY_ICONS[p]||'💰'; const delBtn = payments.length > 1 ? `<button onclick="delPay(${i})" style="color:var(--danger);border:none;background:transparent;cursor:pointer;padding:4px 10px;font-size:16px"><i class="fa-solid fa-xmark"></i></button>` : ``;
    return `<div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--bdr)"><div style="width:42px;height:42px;border-radius:14px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:20px;">${ico}</div><span style="flex:1;font-size:15px;font-weight:800;">${p}</span>${delBtn}</div>`;
  }).join('');
}
function addPayMethod() {
  const inp = document.getElementById('new-pay-inp'); const val = inp.value.trim();
  if(!val) return; if(payments.includes(val)) return;
  payments.push(val); localStorage.setItem('fp_payments', JSON.stringify(payments)); syncData('save_config', { type: 'payments', content: payments });
  inp.value = ''; renderPayMgrList(); renderPayGridModal(); toast('✅ OK');
}
function delPay(i) {
  if(!confirm(`¿Borrar "${payments[i]}"?`)) return;
  payments.splice(i,1); localStorage.setItem('fp_payments', JSON.stringify(payments)); syncData('save_config', { type: 'payments', content: payments });
  if(!payments.includes(selPay)) selPay = payments[0]||'Efectivo'; renderPayMgrList(); renderPayGridModal();
}

// ═══ CATS ═══
function openCatMgr(){document.getElementById('modal-cats').classList.add('mon');renderCatMgr('Gasto');}
function closeCatMgr(){document.getElementById('modal-cats').classList.remove('mon');}
function renderCatMgr(type){
  catMgrT=type;
  const ed=document.getElementById('cat-editor');ed.innerHTML='';
  Object.entries(cats[type]).forEach(([cat,cd])=>{
    ed.innerHTML+=`<div style="background:var(--card);border:1px solid var(--bdr);border-radius:16px;margin-bottom:12px;overflow:hidden;"><div style="display:flex;align-items:center;justify-content:space-between;padding:16px;"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:14px;font-weight:900;">${CAT_ICONS[cat]||'📁'} ${cat}</span></div><button onclick="delCat('${type}','${cat}')" style="color:var(--danger);border:none;background:transparent;cursor:pointer;font-size:15px"><i class="fa-solid fa-trash"></i></button></div></div>`;
  });
}
function promptNewCat(){const n=prompt('Nombre:');if(!n?.trim())return;if(cats[catMgrT][n.trim()]){return;}cats[catMgrT][n.trim()]={color:'#D4FF00',subs:['General'],deductible:false};saveCats();renderCatMgr(catMgrT);}
function delCat(t,c){if(!confirm(`¿Borrar "${c}"?`))return;delete cats[t][c];saveCats();renderCatMgr(t);}
function saveCats(){localStorage.setItem('fp_cats',JSON.stringify(cats));syncData('save_config',{type:'categories',content:cats});}

// ═══ OTHERS ═══
function promptName(){const n=prompt('Tu nombre / Your name:',userName);if(!n?.trim())return;userName=n.trim();localStorage.setItem('fp_name',userName);document.getElementById('sv-name').textContent=userName;}
function promptGoal(){const n=prompt('Meta mensual ($):',savGoal);if(!n||isNaN(n))return;savGoal=parseFloat(n);localStorage.setItem('fp_goal',savGoal);renderHome();}
function openSheetsModal(){document.getElementById('modal-sheets').classList.add('mon');}
function closeSheetsModal(){document.getElementById('modal-sheets').classList.remove('mon');}
function saveSheetUrl(){const url=document.getElementById('sheet-url').value.trim();localStorage.setItem('fp_url',url);sheetUrl=url;closeSheetsModal();toast('✅ URL OK');if(url)loadFromSheets(true);}

function openCal(){calYear=curDate.getFullYear();renderCal();document.getElementById('modal-cal').classList.add('mon');}
function closeCal(){document.getElementById('modal-cal').classList.remove('mon');}
function changeCalYear(d){calYear+=d;renderCal();}
function renderCal(){
  document.getElementById('cal-yr').textContent=calYear; const g=document.getElementById('cal-grid');g.innerHTML='';
  for(let i=0;i<12;i++){
    const mt=getMonthTxs(calYear,i);let inc=0,exp=0; mt.forEach(t=>{const a=Number(t.amount)||0;if(t.type==='Ingreso')inc+=a;else{exp+=a;}});
    const sel=i===curDate.getMonth()&&calYear===curDate.getFullYear();
    g.innerHTML+=`<div style="background:var(--card);border-radius:14px;padding:12px 6px;text-align:center;cursor:pointer;border:${sel?'2px solid var(--neon)':'none'}" onclick="selCalMonth(${i},${calYear})"><div style="font-size:13px;font-weight:900;">${MS[i]}</div></div>`;
  }
}
function selCalMonth(m,y){curDate=new Date(y,m,1);updateMonthDisplay();closeCal();}

async function postToSheets(body){if(!sheetUrl)return;await fetch(sheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});}
async function loadFromSheets(show){
  if(!sheetUrl)return false;
  try{
    const res=await fetch(sheetUrl+'?action=get_all');const data=await res.json(); let changed=false;
    if(data.transactions&&data.transactions.length>0){txs=data.transactions;localStorage.setItem('fp_txs',JSON.stringify(txs));changed=true;}
    if(data.categories){cats=data.categories;localStorage.setItem('fp_cats',JSON.stringify(cats));}
    if(data.budgets&&Object.keys(data.budgets).length>0){budgets=data.budgets;localStorage.setItem('fp_budgets',JSON.stringify(budgets));}
    if(data.debts){debts=data.debts;localStorage.setItem('fp_debts',JSON.stringify(debts));changed=true;}
    if(data.payments){payments=data.payments;localStorage.setItem('fp_payments',JSON.stringify(payments));}
    if(changed){ updateMonthDisplay(); renderDebts(); } if(show)toast('✅ OK'); return true;
  }catch(e){if(show)toast('⚠️ Data local');return false;}
}
async function syncData(action,payload){
  if(!sheetUrl)return;
  try{await postToSheets({action,data:payload});}
  catch(e){const q=JSON.parse(localStorage.getItem('fp_sync_queue')||'[]');q.push({action,payload,ts:Date.now()});localStorage.setItem('fp_sync_queue',JSON.stringify(q));}
}
async function retryQueue(){
  if(!sheetUrl)return;const q=JSON.parse(localStorage.getItem('fp_sync_queue')||'[]');if(!q.length)return;
  const rem=[];for(const item of q){try{await postToSheets({action:item.action,data:item.payload});}catch(e){rem.push(item);}}
  localStorage.setItem('fp_sync_queue',JSON.stringify(rem));
}
async function forceSyncToSheets(){
  if(!sheetUrl){toast('⚠️ Sin URL');return;}toast('⬆️ Subiendo...');
  try{await postToSheets({action:'sync_all',data:{transactions:txs,categories:cats,budgets,debts,payments}});toast('✅ OK');setTimeout(()=>loadFromSheets(false),2000);}
  catch(e){toast('❌ Error');}
}

function exportCSV() {
  const year = curDate.getFullYear(), name = userName||'Cliente';
  const csv = "Export available on desktop version.";
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv); a.download = `Finanzas_${name}_${year}.csv`; a.click();
}

function exportTaxReport() {
  toast('Reporte en desarrollo');
}

function openDebtModal(id) {
  editDebtId = id || null; document.getElementById('debt-modal-title').textContent = id ? 'Editar Deuda' : 'Nueva Deuda';
  if(id) { const d = debts.find(x => x.id === id); if(d) { document.getElementById('debt-name').value = d.name; document.getElementById('debt-type').value = d.type; document.getElementById('debt-original').value = d.original; document.getElementById('debt-rate').value = d.rate; document.getElementById('debt-term').value = d.term; document.getElementById('debt-start').value = d.startDate; } } else { ['debt-name','debt-original','debt-rate','debt-term'].forEach(id => document.getElementById(id).value = ''); document.getElementById('debt-start').valueAsDate = new Date(); }
  document.getElementById('modal-debt').classList.add('mon');
}
function closeDebtModal() { document.getElementById('modal-debt').classList.remove('mon'); editDebtId = null; }
function saveDebt() {
  const name = document.getElementById('debt-name').value.trim(), original = parseFloat(document.getElementById('debt-original').value)||0, rate = parseFloat(document.getElementById('debt-rate').value)||0, term = parseInt(document.getElementById('debt-term').value)||12;
  if(!name || !original) return;
  const debt = { id: editDebtId || ('DEBT-'+Date.now().toString().slice(-8)), name, type: document.getElementById('debt-type').value, original, rate, term, startDate: document.getElementById('debt-start').value, note: "" };
  if(editDebtId) { debts = debts.map(d => d.id===editDebtId ? debt : d); } else { debts.push(debt); } localStorage.setItem('fp_debts', JSON.stringify(debts)); syncData('save_debt', debt);
  closeDebtModal(); renderDebts(); toast('✅ OK');
}
function deleteDebt(id) {
  if(!confirm('¿Eliminar? / Delete?')) return; debts = debts.filter(d => d.id !== id); localStorage.setItem('fp_debts', JSON.stringify(debts)); syncData('delete_debt', { id }); renderDebts();
}
function calcDebtProgress(debt) {
  const paidSoFar = txs.filter(t => t.type === 'Gasto' && t.subcategory === debt.name).reduce((sum, t) => sum + Number(t.amount), 0);
  const monthlyRate = debt.rate / (100*12); const now = new Date(), start = new Date(debt.startDate + 'T12:00:00');
  let monthlyPayment; if(monthlyRate > 0) { monthlyPayment = debt.original * (monthlyRate * Math.pow(1+monthlyRate, debt.term)) / (Math.pow(1+monthlyRate, debt.term) - 1); } else { monthlyPayment = debt.original / debt.term; }
  const totalCost = monthlyPayment * debt.term; const totalInterest = totalCost - debt.original; const remaining = Math.max(0, totalCost - paidSoFar); const pct = totalCost > 0 ? Math.min(100, (paidSoFar / totalCost) * 100) : 0;
  const monthsElapsed = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44))); const monthsLeft = Math.max(0, debt.term - monthsElapsed); const endDate = new Date(start); endDate.setMonth(endDate.getMonth() + debt.term);
  return { monthlyPayment, totalInterest, pct, remaining, monthsLeft, endDate, paidSoFar };
}
function renderDebts() {
  const list = document.getElementById('debt-list'); const dtEl = document.getElementById('debt-total-remaining');
  if(!debts.length) { if(list) list.innerHTML = `<div style="text-align:center;padding:48px 0"><p style="font-size:14px;font-weight:700;color:var(--text-muted)">Sin deudas registradas</p></div>`; if(dtEl) dtEl.textContent = '$0'; return; }
  let totalRem = 0;
  if(list) list.innerHTML = debts.map(debt => {
    const p = calcDebtProgress(debt); totalRem += p.remaining;
    return `<div class="card" style="margin-bottom:12px">
      <div style="font-size:16px;font-weight:900;margin-bottom:12px;">${debt.name}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div><div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Saldo</div><div style="font-size:24px;font-weight:900;">${fmt(p.remaining)}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Mensual</div><div style="font-size:16px;font-weight:900;color:var(--neon)">${fmt(p.monthlyPayment)}</div></div>
      </div>
      <div style="height:8px;background:var(--bg);border-radius:4px;margin:16px 0 10px;overflow:hidden"><div style="height:100%;width:${p.pct.toFixed(0)}%;background:var(--neon)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-bottom:16px"><span style="color:var(--text-muted)">${p.pct.toFixed(0)}%</span><span style="color:var(--neon)">${p.monthsLeft} meses</span></div>
      <div style="display:flex;gap:10px"><button onclick="openDebtModal('${debt.id}')" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--bdr);background:transparent;color:var(--text-main);cursor:pointer">Editar</button><button onclick="deleteDebt('${debt.id}')" style="padding:12px;border-radius:12px;border:1.5px solid var(--bdr);background:transparent;color:var(--danger);cursor:pointer"><i class="fa-solid fa-trash"></i></button></div>
    </div>`;
  }).join('');
  if(dtEl) dtEl.textContent = fmt(totalRem);
}

function clearData() {
  let storedPin = localStorage.getItem('fp_del_pin');
  if (!storedPin) {
    let newPin = prompt('🔒 Crea un PIN de seguridad para borrar:');
    if (!newPin || newPin.trim() === '') return;
    localStorage.setItem('fp_del_pin', newPin.trim()); toast('✅ OK'); return;
  }
  let enteredPin = prompt('🔒 Introduce tu PIN de seguridad:');
  if (enteredPin !== storedPin) { toast('❌ Error'); return; }
  if(!confirm('🚨 ¿SEGURO? / ARE YOU SURE?')) return;
  ['fp_txs','fp_cats','fp_budgets','fp_url','fp_name','fp_goal','fp_taxpct','fp_sync_queue','fp_payments','fp_dark','fp_debts','fp_lang','fp_del_pin'].forEach(k=>localStorage.removeItem(k)); location.reload();
}
