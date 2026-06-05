// ═══ SHEETS URL ═══
const SHEETS_URL='https://script.google.com/macros/s/AKfycbxV4hmnyt3Xz11IdyM5GeV9l1RvKT8o4ltFmMPoRLHKhH964SbF0uPpcFzvV2egb7vESQ/exec';
let sheetUrl=localStorage.getItem('fp_url')||SHEETS_URL||'';

// ═══ DEFAULTS ═══
const DEF_CATS={
  Ingreso:{"Ingresos":{color:"#D18F77",subs:["Sueldo","Negocio","Propinas","Freelance","Otros"]}},
  Gasto:{
    "Rent":{color:"#8C867F",subs:["House Rent","Mortgage"],deductible:true},
    "Food":{color:"#8C867F",subs:["Groceries","Restaurants","Coffee"],deductible:false},
    "Transport":{color:"#8C867F",subs:["Gas","Car Payment","Uber","Transit"],deductible:true},
    "Utilities":{color:"#8C867F",subs:["Internet","Phone","Electricity","Water"],deductible:true},
    "Entertainment":{color:"#8C867F",subs:["Movies","Subscriptions","Drinks"],deductible:false},
    "Savings":{color:"#8C867F",subs:["Emergency Fund","Vacation","Goal"],deductible:false},
    "Other":{color:"#8C867F",subs:["Shopping","Health","Misc"],deductible:false}
  }
};
const DEF_BUDGETS=[{cat:"Rent",limit:1260},{cat:"Food",limit:770},{cat:"Transport",limit:465},{cat:"Utilities",limit:200},{cat:"Entertainment",limit:250},{cat:"Savings",limit:500},{cat:"Other",limit:200}];
const DEF_PAYS=["Débito","Crédito","Efectivo","Apple Pay","Zelle","Venmo","Cash App","Transferencia","Cheque"];
const PAY_ICONS={"Débito":"💳","Crédito":"💳","Efectivo":"💵","Apple Pay":"🍎","Zelle":"⚡","Venmo":"🔵","Cash App":"💚","Transferencia":"🏦","Cheque":"📄"};
const CAT_ICONS={"Ingresos":"💵","Rent":"🏠","Food":"🍔","Transport":"🚗","Utilities":"⚡","Entertainment":"🎮","Savings":"🐷","Other":"📦","Deudas":"🏦"};
const SUB_ICONS={"House Rent":"🏠","Mortgage":"🏦","Groceries":"🛒","Restaurants":"🍽️","Coffee":"☕","Gas":"⛽","Car Payment":"🚗","Uber":"🚕","Transit":"🚌","Internet":"🌐","Phone":"📱","Electricity":"💡","Water":"💧","Movies":"🎬","Subscriptions":"📺","Drinks":"🥂","Emergency Fund":"🛡️","Vacation":"✈️","Goal":"🎯","Shopping":"🛍️","Health":"💊","Misc":"📦","Sueldo":"💰","Negocio":"💼","Propinas":"🪙","Freelance":"💻","Otros":"➕"};

// ═══ STATE ═══
let cats=JSON.parse(localStorage.getItem('fp_cats'))||JSON.parse(JSON.stringify(DEF_CATS));
let txs=JSON.parse(localStorage.getItem('fp_txs'))||[];
let budgets=JSON.parse(localStorage.getItem('fp_budgets'))||{};
let payments=JSON.parse(localStorage.getItem('fp_payments'))||[...DEF_PAYS];
let userName=localStorage.getItem('fp_name')||'Angelo';
let savGoal=parseFloat(localStorage.getItem('fp_goal'))||2000;
let taxPct=parseFloat(localStorage.getItem('fp_taxpct'))||20;
let darkMode=localStorage.getItem('fp_dark')==='1';

let curDate=new Date(),calYear=new Date().getFullYear();
let catMgrT='Gasto',curType='Ingreso',curPeriod='month',isEditBud=false,rChart=null;
let selCat='',selSub='',selPay=payments[0]||'Débito';
let debts = JSON.parse(localStorage.getItem('fp_debts')) || [];
let editDebtId = null;
let tt=null;

const MS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MSF=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const fmt=v=>{if(v===undefined||v===null||isNaN(v))return'$0';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(v));};
const fmt2=v=>{if(!v&&v!==0)return'$0.00';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v));};
const fmtK=v=>{const n=Number(v)||0;return Math.abs(n)>=1000?'$'+(n/1000).toFixed(1)+'k':fmt(n);};

function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2800);}

// ═══ INIT & LOADING ═══
document.addEventListener('DOMContentLoaded', async () => {
  applyDark();
  document.getElementById('txDate').valueAsDate=new Date();
  document.getElementById('sheet-url').value=sheetUrl;
  document.getElementById('sv-name').textContent=userName;
  document.getElementById('sv-goal').textContent=fmt(savGoal);
  document.getElementById('inp-taxpct').value=taxPct;
  updateSheetBadge();

  // Animación del login loader alineado con el color fuerte
  let count = 0;
  const ls = document.getElementById('loading-status');
  const bar = document.querySelector('.loading-bar-fill');
  
  const interval = setInterval(() => {
    count += Math.floor(Math.random() * 12) + 4;
    if(count > 85) count = 85; // Se detiene en 85% esperando datos de internet
    if(ls) ls.textContent = count + '%';
    if(bar) bar.style.width = count + '%';
  }, 120);

  const finishLoad = () => {
    clearInterval(interval);
    if(ls) ls.textContent = '100%';
    if(bar) bar.style.width = '100%';
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) loader.classList.add('hide');
      updateMonthDisplay();
    }, 450);
  };

  if(sheetUrl) {
    await loadFromSheets(false);
  }
  
  finishLoad();

  setInterval(()=>{if(sheetUrl&&document.visibilityState==='visible')loadFromSheets(false);},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&sheetUrl){retryQueue();loadFromSheets(false);}});
});

// ═══ DARK MODE ═══
function applyDark() {
  document.body.classList.toggle('dark', darkMode);
  const tw = document.getElementById('dark-toggle');
  if(tw) tw.className = 'tw ' + (darkMode ? 'on' : 'off');
}
function toggleDark() {
  darkMode = !darkMode;
  localStorage.setItem('fp_dark', darkMode ? '1' : '0');
  applyDark();
  toast(darkMode ? '🌙 Modo oscuro' : '☀️ Modo claro');
}

// ═══ NAV ═══
function switchView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('on'));
  const tgt = document.getElementById('v-'+v);
  if(tgt) tgt.classList.add('on');
  ['home','reports','budget','taxes','debts','settings'].forEach(n=>{const b=document.getElementById('nav-'+n);if(b)b.classList.toggle('on',n===v);});
  if(v==='home')renderHome();
  if(v==='reports')renderReports();
  if(v==='budget')renderBudget();
  if(v==='taxes')renderTaxes();
  if(v==='debts')renderDebts();
}

// ═══ MES ═══
function getKey(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function changeMonth(d){curDate=new Date(curDate.getFullYear(),curDate.getMonth()+d,1);updateMonthDisplay();}
function updateMonthDisplay(){
  const ss=`${MS[curDate.getMonth()]} ${curDate.getFullYear()}`;
  ['mn-home','mn-rep','mn-bud'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=ss;});
  const bs=document.getElementById('bud-sub');if(bs)bs.textContent='Topes de '+MSF[curDate.getMonth()]+' '+curDate.getFullYear();
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
  const mt=getMonthTxs();
  let inc=0,exp=0,catSums={},savByCat={},totalSaved=0;
  mt.forEach(tx=>{
    const amt=Number(tx.amount)||0;
    if(tx.type==='Ingreso')inc+=amt;
    else{exp+=amt;catSums[tx.category]=(catSums[tx.category]||0)+amt;if(tx.category==='Savings'){totalSaved+=amt;savByCat[tx.subcategory]=(savByCat[tx.subcategory]||0)+amt;}}
  });
  const prev=new Date(curDate.getFullYear(),curDate.getMonth()-1,1);
  const pm=getMonthTxs(prev.getFullYear(),prev.getMonth());
  let pInc=0,pExp=0;pm.forEach(t=>t.type==='Ingreso'?pInc+=Number(t.amount||0):pExp+=Number(t.amount||0));
  const gap=inc-exp,incDiff=inc-pInc,expDiff=exp-pExp;
  document.getElementById('sc-inc').textContent=fmt(inc);
  document.getElementById('sc-exp').textContent=fmt(exp);
  document.getElementById('sc-sav').textContent=fmt(totalSaved);
  
  const gEl=document.getElementById('sc-gap'),gSub=document.getElementById('sc-gap-sub'),gCard=document.getElementById('gap-card');
  gEl.textContent=fmt(gap);
  if(gCard) gCard.className='bal-card '+(gap>=0?'gap-pos':'gap-neg');
  if(gSub) {
    gSub.textContent=gap>=0?'Disponible este mes':'Déficit este mes';
    gSub.style.color=gap>=0?'var(--terra)':'var(--gray)';
  }
  
  document.getElementById('sc-rate').textContent='Meta: '+fmt(savGoal);
  document.getElementById('h-count').textContent=mt.length;

  const setDiff=(id,diff,goodPos)=>{const el=document.getElementById(id);if(!el)return;const sign=diff>=0?'+':'',arr=diff>=0?'↑':'↓';const isGood=(diff>=0&&goodPos)||(diff<0&&!goodPos);el.textContent=`${arr} ${sign}${fmt(diff)} vs ${MS[prev.getMonth()]}`;el.className='kpi-diff '+(isGood?'good':'bad');};
  setDiff('sd-inc',incDiff,true);setDiff('sd-exp',expDiff,false);
  const pct=Math.max(0,Math.min(100,(totalSaved/savGoal)*100));
  document.getElementById('mini-donut').style.background=`conic-gradient(var(--t2) ${pct}%,rgba(15,42,29,.1) 0%)`;
  document.getElementById('mini-donut-pct').textContent=pct.toFixed(0)+'%';
  
  const hc=document.getElementById('home-cats');
  const entries=Object.entries(catSums).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){hc.innerHTML='<p style="font-size:12px;color:var(--t2);padding:4px 0;font-weight:500">Sin gastos este mes</p>';}
  else{const mx=entries[0][1]||1;hc.innerHTML=entries.map(([cat,amt])=>{const cd=cats.Gasto[cat]||{color:'var(--t3)'};return`<div class="catbar"><div class="catbar-dot" style="background:var(--t1)"></div><div class="catbar-name">${cat}</div><div class="catbar-bg"><div class="catbar-fill" style="width:${(amt/mx*100).toFixed(0)}%;background:var(--t3)"></div></div><div class="catbar-amt">${fmt(amt)}</div></div>`;}).join('');}
  
  const sbc=document.getElementById('sav-by-cat'),savCard=document.getElementById('sav-by-cat-card');
  const savEntries=Object.entries(savByCat).sort((a,b)=>b[1]-a[1]);
  if(!savEntries.length){if(savCard) savCard.style.display='none';}
  else{if(savCard) savCard.style.display='';const mx=savEntries[0][1]||1;sbc.innerHTML=savEntries.map(([sub,amt])=>`<div class="catbar"><div class="catbar-dot" style="background:var(--t1)"></div><div class="catbar-name">${sub}</div><div class="catbar-bg"><div class="catbar-fill" style="width:${(amt/mx*100).toFixed(0)}%;background:var(--t2)"></div></div><div class="catbar-amt">${fmt(amt)}</div></div>`).join('');}
  renderDayList(mt);
}

function renderDayList(monthly){
  const list=document.getElementById('h-list');
  if(!monthly.length){list.innerHTML=`<div style="text-align:center;padding:40px 0"><div style="font-size:40px;margin-bottom:10px">👻</div><p style="font-size:13px;font-weight:700;color:var(--t2)">Sin movimientos este mes</p><p style="font-size:11px;color:var(--t3);margin-top:4px;font-weight:500">Toca + para agregar</p></div>`;return;}
  const groups={};
  monthly.forEach(tx=>{if(!groups[tx.date])groups[tx.date]=[];groups[tx.date].push(tx);});
  const dates=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
  list.innerHTML=dates.map(ds=>{
    const d=new Date(ds+'T12:00:00');
    const label=`${DAYS[d.getDay()]} ${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`;
    const g=groups[ds];
    const dayInc=g.filter(t=>t.type==='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const dayExp=g.filter(t=>t.type!=='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0);
    const dayNet=dayInc-dayExp;
    
    const rows=g.map(tx=>{
      const isI=tx.type==='Ingreso';
      const sign=isI?'+':'-';
      const sub=tx.subcategory||tx.category||'—';
      const metaParts=[tx.category,tx.method,tx.notes].filter(Boolean);
      
      /* Insignias usando los colores de la corrección del usuario */
      const badgeBg=isI?'rgba(209,143,119,.15)':'rgba(140,134,127,.15)';
      const badgeClr=isI?'var(--terra)':'var(--gray)';
      const dotClr=isI?'var(--terra)':'var(--gray)';

      return`<div class="txr-wrap" id="txw-${tx.id}">
        <div class="txr-hint edit"><i class="fa-solid fa-pen"></i></div>
        <div class="txr-hint del"><i class="fa-solid fa-trash"></i></div>
        <div class="txr-surface" id="txs-${tx.id}">
          <div class="txr-body">
            <div class="txr-dot" style="background:${dotClr};width:8px;height:8px;border-radius:50%;flex-shrink:0;"></div>
            <div class="txr-info">
              <div class="txr-name">${sub}</div>
              <div class="txr-meta">${metaParts.join(' · ')}</div>
            </div>
            <div class="txr-right">
              <div class="txr-amt">${sign}${fmt(Number(tx.amount)||0)}</div>
              <div class="txr-badge" style="background:${badgeBg};color:${badgeClr}">${tx.type}</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    return`<div><div class="day-hdr"><span class="day-lbl">${label}</span><span class="day-net">${dayNet>=0?'+':''}${fmt(dayNet)}</span></div>${rows}</div>`;
  }).join('');
  initSwipe();
}

function initSwipe(){
  document.querySelectorAll('.txr-wrap').forEach(wrap=>{
    const id=wrap.id.replace('txw-','');const surf=document.getElementById('txs-'+id);if(!surf)return;
    let sx=0,sy=0,dx=0,active=false;
    wrap.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;active=true;surf.style.transition='none';document.querySelectorAll('.txr-surface').forEach(s=>{if(s!==surf){s.style.transition='transform .25s';s.style.transform='translateX(0)';}});},{passive:true});
    wrap.addEventListener('touchmove',e=>{if(!active)return;dx=e.touches[0].clientX-sx;const dy=e.touches[0].clientY-sy;if(Math.abs(dy)>Math.abs(dx)+8){active=false;surf.style.transform='translateX(0)';return;}surf.style.transform=`translateX(${Math.max(-110,Math.min(110,dx))}px)`;},{passive:true});
    wrap.addEventListener('touchend',()=>{if(!active)return;active=false;surf.style.transition='transform .25s cubic-bezier(.25,.8,.25,1)';if(dx>75){surf.style.transform='translateX(0)';openEditModal(id);}else if(dx<-75){surf.style.transform='translateX(-110%)';surf.style.opacity='0';surf.style.transition='transform .22s,opacity .22s';setTimeout(()=>confirmDelete(id),230);}else{surf.style.transform='translateX(0)';}},{passive:true});
  });
}

function openEditModal(id){const tx=txs.find(t=>t.id===id);if(!tx)return;document.getElementById('edit-id').value=id;document.getElementById('edit-amt').value=tx.amount;document.getElementById('modal-edit').classList.add('mon');}
function closeEditModal(){document.getElementById('modal-edit').classList.remove('mon');}
function saveEdit(){const id=document.getElementById('edit-id').value,amt=parseFloat(document.getElementById('edit-amt').value);if(!amt||amt<=0){toast('⚠️ Monto inválido');return;}const tx=txs.find(t=>t.id===id);if(!tx)return;tx.amount=amt;localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('save_tx',tx);closeEditModal();updateMonthDisplay();toast('✏️ Monto actualizado');}
function confirmDelete(id){if(!confirm('¿Eliminar esta transacción?')){updateMonthDisplay();return;}txs=txs.filter(t=>t.id!==id);localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('delete_tx',{id});updateMonthDisplay();toast('🗑 Eliminada');}

// ═══ PRESUPUESTO ═══
function getCurrentBudgets(){
  const key=getKey(curDate);
  if(!budgets[key]){const prev=new Date(curDate.getFullYear(),curDate.getMonth()-1,1),pk=getKey(prev);budgets[key]=budgets[pk]?JSON.parse(JSON.stringify(budgets[pk])):JSON.parse(JSON.stringify(DEF_BUDGETS));Object.keys(cats.Gasto).forEach(c=>{if(!budgets[key].find(b=>b.cat===c))budgets[key].push({cat:c,limit:0});});localStorage.setItem('fp_budgets',JSON.stringify(budgets));}
  return budgets[key];
}
function renderBudget(){
  const monthly=getMonthTxs(),curr=getCurrentBudgets();let tL=0,tS=0,exceeded=0;
  document.getElementById('bud-list').innerHTML=curr.map((b,i)=>{
    tL+=b.limit;
    const spent=monthly.filter(tx=>tx.type!=='Ingreso'&&tx.category===b.cat).reduce((s,tx)=>s+(Number(tx.amount)||0),0);tS+=spent;
    const raw=b.limit>0?(spent/b.limit)*100:0,pct=Math.min(raw,100);
    let bar='var(--c3)',st='Bien',ico=`<i class="fa-solid fa-circle-check" style="color:var(--t2);font-size:11px"></i>`;
    if(raw>=100){bar='var(--terra)';st='Excedido';ico=`<i class="fa-solid fa-triangle-exclamation" style="color:var(--terra);font-size:11px"></i>`;exceeded++;}
    else if(raw>75){bar='var(--c2)';st='Cuidado';ico=`<i class="fa-solid fa-circle-exclamation" style="color:var(--c2);font-size:11px"></i>`;}
    const lf=isEditBud?`<input type="number" value="${b.limit}" onchange="updateBL(${i},this.value)" style="border:2px solid var(--c2);border-radius:8px;padding:5px 8px;font-size:15px;font-weight:800;width:100px;text-align:right;outline:none;background:rgba(55,85,52,.08);color:var(--c1);font-family:inherit;-webkit-appearance:none">`:`<div class="bcat-val">${fmt(spent)}</div><div class="bcat-rem">de ${fmt(b.limit)}</div>`;
    return`<div class="bcat"><div class="bcat-top"><div class="bcat-l"><div class="bcat-ico" style="background:rgba(15,42,29,.06);color:var(--c1);font-size:16px">${CAT_ICONS[b.cat]||'📁'}</div><div><div class="bcat-name">${ico} ${b.cat}</div><div class="bcat-spent-lbl">Gastado: ${fmt(spent)}</div></div></div><div class="bcat-r">${lf}</div></div><div class="bbar"><div class="bbar-f" style="width:${pct}%;background:${bar}"></div></div><div class="bftr"><span style="color:var(--t2)">${pct.toFixed(0)}% gastado</span><span style="color:${raw>=100?'var(--terra)':raw>75?'var(--c2)':'var(--t2)'}">${b.limit>0?fmt(b.limit-spent)+' restante':st}</span></div></div>`;
  }).join('');
  const gp=tL>0?(tS/tL)*100:0;
  const hb=document.getElementById('bud-health'),bi=document.getElementById('bh-ico'),bt=document.getElementById('bh-title'),bs=document.getElementById('bh-sub');
  if(exceeded>1||gp>90){hb.className='bh-card bad';bi.textContent='🚨';bt.textContent='Salud Financiera';bs.textContent='Precaución Alta';}
  else if(exceeded>0||gp>70){hb.className='bh-card warn';bi.textContent='⚠️';bt.textContent='Salud Financiera';bs.textContent='Bajo Control';}
  else{hb.className='bh-card ok';bi.textContent='🏆';bt.textContent='Salud Financiera';bs.textContent='Saludable';}
}
function toggleEditBud(){isEditBud=!isEditBud;const btn=document.getElementById('edit-bud-btn');if(isEditBud){btn.textContent='Guardar';btn.style.color='var(--t2)';}else{btn.textContent='Editar';btn.style.color='var(--c2)';localStorage.setItem('fp_budgets',JSON.stringify(budgets));syncData('save_config',{type:'budgets',content:budgets});toast('💾 Presupuestos guardados');}renderBudget();}
function updateBL(i,v){getCurrentBudgets()[i].limit=parseFloat(v)||0;}

// ═══ REPORTES ═══
function setPeriod(p,btn){curPeriod=p;document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderReports();}
function renderReports(){
  const mt=getMonthTxs();let inc=0,exp=0,catSums={};
  mt.forEach(tx=>{const a=Number(tx.amount)||0;if(tx.type==='Ingreso')inc+=a;else{exp+=a;catSums[tx.category]=(catSums[tx.category]||0)+a;}});
  document.getElementById('r-inc').textContent=fmt(inc);document.getElementById('r-exp').textContent=fmt(exp);document.getElementById('r-sav').textContent=fmt(inc-exp);
  const titles={month:'Por Día del Mes',week:'Últimos 7 Días',year:'Resumen Anual',day:'Por Día de la Semana'};
  document.getElementById('r-title').textContent=titles[curPeriod];
  const Y=curDate.getFullYear(),M=curDate.getMonth();
  let labels=[],incD=[],expD=[];
  if(curPeriod==='month'){const dim=new Date(Y,M+1,0).getDate();for(let d=1;d<=dim;d++){const ds=`${Y}-${String(M+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const dt=txs.filter(t=>t.date===ds);labels.push(d);incD.push(dt.filter(t=>t.type==='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));expD.push(dt.filter(t=>t.type!=='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));}}
  else if(curPeriod==='year'){for(let m=0;m<12;m++){const mt2=getMonthTxs(Y,m);labels.push(MS[m]);incD.push(mt2.filter(t=>t.type==='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));expD.push(mt2.filter(t=>t.type!=='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));}}
  else if(curPeriod==='week'){const today=new Date();for(let i=6;i>=0;i--){const dt=new Date(today);dt.setDate(today.getDate()-i);const ds=dt.toISOString().slice(0,10);const dt2=txs.filter(t=>t.date===ds);labels.push(DAYS[dt.getDay()]);incD.push(dt2.filter(t=>t.type==='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));expD.push(dt2.filter(t=>t.type!=='Ingreso').reduce((s,t)=>s+(Number(t.amount)||0),0));}}
  else if(curPeriod==='day'){for(let i=0;i<7;i++){labels.push(DAYS[i]);incD.push(0);expD.push(0);}mt.forEach(tx=>{const dw=new Date(tx.date+'T12:00:00').getDay();const a=Number(tx.amount)||0;if(tx.type==='Ingreso')incD[dw]+=a;else expD[dw]+=a;});}
  if(rChart){rChart.destroy();rChart=null;}
  const ctx=document.getElementById('rChart').getContext('2d');
  
  /* Uso de los colores de corrección para las barras de la gráfica */
  rChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Ingresos',data:incD,backgroundColor:'rgba(209,143,119,.85)',borderRadius:5,borderSkipped:false},{label:'Gastos',data:expD,backgroundColor:'rgba(140,134,127,.85)',borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{boxWidth:9,font:{size:10,family:'Inter'},color:'#375534'}}},scales:{x:{ticks:{color:'#375534',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#375534',font:{size:9},callback:v=>'$'+v},grid:{color:'rgba(15,42,29,.04)'}}}}});
  
  const mst=document.getElementById('monthly-savings-table');
  const savsByMonth=[];let maxSav=0;
  for(let m=0;m<12;m++){const mt2=getMonthTxs(Y,m);let saved=0;mt2.forEach(t=>{if(t.type!=='Ingreso'&&t.category==='Savings')saved+=Number(t.amount)||0;});savsByMonth.push({month:m,sav:saved});if(saved>maxSav)maxSav=saved;}
  maxSav=maxSav||1;
  mst.innerHTML=savsByMonth.map((r,idx)=>{
    const prev=idx>0?savsByMonth[idx-1].sav:null,diff=prev!==null?r.sav-prev:null;
    const diffStr=diff!==null&&diff!==0?(diff>0?`<span style="color:var(--t2);font-size:9px;font-weight:800">↑ ${fmt(diff)}</span>`:`<span style="color:var(--t3);font-size:9px;font-weight:800">↓ ${fmt(Math.abs(diff))}</span>`):'';
    const isCur=r.month===M&&Y===curDate.getFullYear();
    return`<div class="msav-row" style="${isCur?'background:rgba(15,42,29,.04);border-radius:8px;padding:9px 8px;':''}"><div style="font-size:12px;font-weight:${isCur?'900':'700'};width:36px">${MS[r.month]}</div><div style="flex:1;height:5px;background:rgba(15,42,29,.08);border-radius:3px;overflow:hidden;margin:0 10px"><div style="height:100%;border-radius:3px;background:var(--c2);width:${(r.sav/maxSav*100).toFixed(0)}%"></div></div><div style="font-size:12px;font-weight:800;width:54px;text-align:right">${fmt(r.sav)}</div><div style="min-width:54px;text-align:right;margin-left:6px">${diffStr}</div></div>`;
  }).join('');
  
  const rcats=document.getElementById('r-cats');
  const entries=Object.entries(catSums).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){rcats.innerHTML='<p style="font-size:12px;color:var(--t2);padding:6px 0;font-weight:500">Sin gastos</p>';return;}
  const mx=entries[0][1]||1;
  rcats.innerHTML=entries.map(([cat,amt])=>{const pct=exp>0?(amt/exp*100):0;return`<div class="rcat-row"><div style="font-size:16px;width:24px">${CAT_ICONS[cat]||'📁'}</div><div style="font-size:11px;font-weight:700;min-width:72px;color:var(--t1)">${cat.length>8?cat.substring(0,7)+'…':cat}</div><div class="rcat-bg"><div class="rcat-fill" style="width:${(amt/mx*100).toFixed(0)}%;background:var(--c3)"></div></div><div style="font-size:12px;font-weight:800;min-width:50px;text-align:right;color:var(--c1)">${fmtK(amt)}</div><div style="font-size:9px;color:var(--t2);min-width:28px;text-align:right;font-weight:700">${pct.toFixed(0)}%</div></div>`;}).join('');
}

// ═══ TAXES ═══
function renderTaxes(){
  const Y=curDate.getFullYear();document.getElementById('tax-year').textContent=Y;document.getElementById('inp-taxpct').value=taxPct;
  let incY=0,expY=0,dedMap={};
  txs.forEach(tx=>{const d=new Date(tx.date+'T12:00:00');if(d.getFullYear()!==Y)return;const a=Number(tx.amount)||0;if(tx.type==='Ingreso')incY+=a;else{expY+=a;const cd=cats.Gasto[tx.category];if(cd&&cd.deductible){dedMap[tx.category]=(dedMap[tx.category]||0)+a;}}});
  const net=Math.max(0,incY-expY),est=net*(taxPct/100);
  document.getElementById('tax-total').textContent=fmt2(est);document.getElementById('tax-inc').textContent=fmt(incY);document.getElementById('tax-exp').textContent='-'+fmt(expY);document.getElementById('tax-net').textContent=fmt(net);
  document.getElementById('deduct-list').innerHTML=Object.entries(cats.Gasto).map(([cat,cd])=>`<div style="display:flex;align-items:center;padding:12px 15px;border-bottom:1px solid var(--bdr);gap:12px"><div style="flex:1"><div style="font-size:13px;font-weight:700">${CAT_ICONS[cat]||'📁'} ${cat}</div><div style="font-size:10px;color:var(--t2);margin-top:1px">${cd.deductible?'✓ Deducible':'No deducible'}</div></div><button class="tw ${cd.deductible?'on':'off'}" onclick="toggleDed('${cat}',this)"></button></div>`).join('');
  const entries=Object.entries(dedMap).sort((a,b)=>b[1]-a[1]);
  const bd=document.getElementById('tax-breakdown');
  if(!entries.length){bd.innerHTML='<p style="font-size:12px;color:var(--t2);padding:6px 0;font-weight:500">Activa categorías arriba.</p>';}
  else{bd.innerHTML=entries.map(([cat,amt])=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:13px;color:var(--t2);font-weight:500">${cat}</span><span style="font-size:13px;font-weight:800;color:var(--t1)">${fmt(amt)}</span></div>`).join('')+`<div style="display:flex;justify-content:space-between;padding:10px 0"><span style="font-size:13px;font-weight:800">Total</span><span style="font-size:13px;font-weight:900;color:var(--t1)">${fmt(Object.values(dedMap).reduce((s,v)=>s+v,0))}</span></div>`;}
}
function toggleDed(cat,btn){if(!cats.Gasto[cat])return;cats.Gasto[cat].deductible=!cats.Gasto[cat].deductible;btn.className='tw '+(cats.Gasto[cat].deductible?'on':'off');localStorage.setItem('fp_cats',JSON.stringify(cats));syncData('save_config',{type:'categories',content:cats});renderTaxes();}
function calcTaxes(){taxPct=parseFloat(document.getElementById('inp-taxpct').value)||0;localStorage.setItem('fp_taxpct',taxPct);renderTaxes();}

// ═══ MODAL TX + SUBCATS + PAYMENT ═══
function openModal(){
  curType='Ingreso';selCat='';selSub='';selPay=payments[0]||'Débito';
  document.getElementById('txDate').valueAsDate=new Date();
  document.getElementById('txAmt').value='';document.getElementById('txNote').value='';
  document.getElementById('mttl-tx').textContent='Nuevo Movimiento';
  document.getElementById('sub-sec').style.display='none';
  onTC();renderPayGridModal();
  document.getElementById('modal-tx').classList.add('mon');
  setTimeout(()=>document.getElementById('txAmt').focus(),440);
}
function closeModal(){document.getElementById('modal-tx').classList.remove('mon');}

function onTC(){
  curType=document.querySelector('input[name="tt"]:checked').value;
  document.getElementById('lbl-i').className='slbl'+(curType==='Ingreso'?' ai':'');
  document.getElementById('lbl-e').className='slbl'+(curType==='Gasto'?' ae':'');
  selCat='';selSub='';document.getElementById('sub-sec').style.display='none';
  const grid=document.getElementById('cat-grid');grid.innerHTML='';
  Object.entries(cats[curType]).forEach(([key,cd])=>{
    grid.innerHTML+=`<button class="cbtn" onclick="selectCat('${key}',this)"><span class="cbtn-ico">${CAT_ICONS[key]||'📁'}</span><span>${key.length>8?key.substring(0,7)+'…':key}</span></button>`;
  });
}

function selectCat(key,btn){
  selCat=key;selSub='';
  document.querySelectorAll('.cbtn').forEach(b=>{b.classList.remove('sel');b.style='';});
  btn.classList.add('sel');
  btn.style=`border-color:var(--c1);background:rgba(15,42,29,.08);color:var(--c1)`;
  const subs=cats[curType][key]?.subs||[];
  renderSubGrid(subs, 'var(--c1)');
}

function saveTx(){
  const amt=parseFloat(document.getElementById('txAmt').value);
  if(!amt||amt<=0){toast('⚠️ Ingresa un monto válido');return;}
  if(!selCat){toast('⚠️ Selecciona una categoría');return;}
  const tx={id:'TX-'+Date.now().toString().slice(-9),date:document.getElementById('txDate').value,type:curType,category:selCat,subcategory:selSub||selCat,amount:amt,method:selPay,notes:document.getElementById('txNote').value};
  txs.unshift(tx);localStorage.setItem('fp_txs',JSON.stringify(txs));syncData('save_tx',tx);closeModal();updateMonthDisplay();toast('✅ Guardado');
}

// ═══ PAYMENT METHODS LIBRES ═══
function openPayMgr() { renderPayMgrList(); document.getElementById('modal-pay').classList.add('mon'); }
function closePayMgr() { document.getElementById('modal-pay').classList.remove('mon'); }
function renderPayMgrList() {
  const list = document.getElementById('pay-mgr-list');
  list.innerHTML = payments.map((p,i) => {
    const ico = PAY_ICONS[p]||'💰'; 
    const delBtn = payments.length > 1 ? `<button onclick="delPay(${i})" style="color:var(--c1);border:none;background:transparent;cursor:pointer;padding:4px 9px;font-size:14px"><i class="fa-solid fa-xmark"></i></button>` : `<span style="font-size:10px;color:var(--t3);font-weight:600">Requerido</span>`;
    
    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--bdr)">
      <div style="width:38px;height:38px;border-radius:12px;background:rgba(15,42,29,.06);display:flex;align-items:center;justify-content:center;font-size:18px">${ico}</div>
      <span style="flex:1;font-size:14px;font-weight:700">${p}</span>
      ${delBtn}
    </div>`;
  }).join('');
}
function addPayMethod() {
  const inp = document.getElementById('new-pay-inp'); const val = inp.value.trim();
  if(!val) { toast('⚠️ Escribe un nombre'); return; }
  if(payments.includes(val)) { toast('Ya existe'); return; }
  payments.push(val); localStorage.setItem('fp_payments', JSON.stringify(payments));
  inp.value = ''; renderPayMgrList(); renderPayGridModal(); toast('✅ Método agregado: '+val);
}
function delPay(i) {
  if(!confirm(`¿Borrar "${payments[i]}"?`)) return;
  payments.splice(i,1); localStorage.setItem('fp_payments', JSON.stringify(payments));
  if(!payments.includes(selPay)) selPay = payments[0]||'Efectivo';
  renderPayMgrList(); renderPayGridModal();
}
function renderPayGridModal() {
  const grid = document.getElementById('pay-grid-modal');
  if(!grid) return;
  grid.innerHTML = payments.map(p => {
    const isSel = p === selPay; const ico = PAY_ICONS[p]||'💰';
    return `<button class="pbtn-style${isSel?' sel':''}" onclick="selectPayModal('${p}',this)"
      style="padding:11px 6px;border-radius:14px;border:${isSel?'2px solid var(--c1)':'1.5px solid var(--bdr)'};background:${isSel?'rgba(15,42,29,.08)':'var(--card)'};cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:700;color:${isSel?'var(--c1)':'var(--t2)'};transition:all .2s">
      <span style="font-size:20px">${ico}</span><span>${p}</span>
    </button>`;
  }).join('');
}
function selectPayModal(p, btn) {
  selPay = p;
  document.querySelectorAll('#pay-grid-modal button').forEach(b => {
    b.style.borderColor='var(--bdr)';b.style.background='var(--card)';b.style.color='var(--t2)';b.style.borderWidth='1.5px';
  });
  btn.style.borderColor='var(--c1)';btn.style.background='rgba(15,42,29,.08)';btn.style.color='var(--c1)';btn.style.borderWidth='2px';
}

// ═══ SUB-CATEGORY GRID ═══
function renderSubGrid(subs, catColor) {
  const sec = document.getElementById('sub-sec');
  const grid = document.getElementById('sub-grid');
  if(!subs || !subs.length) { sec.style.display='none'; return; }
  sec.style.display = 'block';
  grid.innerHTML = subs.map(s => `
    <button class="sbtns" onclick="selectSub('${s}',this,'${catColor}')"
      style="padding:12px 10px;border-radius:14px;border:1.5px solid var(--bdr);background:var(--card);cursor:pointer;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--t2);transition:all .2s">
      <span style="font-size:19px">${SUB_ICONS[s]||'•'}</span><span>${s}</span>
    </button>`).join('');
  selSub = subs[0];
  setTimeout(() => {
    const first = grid.querySelector('button');
    if(first) highlightSub(first, catColor);
  }, 20);
}
function selectSub(s, btn, color) {
  selSub = s;
  document.querySelectorAll('#sub-grid button').forEach(b => {
    b.style.borderColor='var(--bdr)';b.style.background='var(--card)';b.style.color='var(--t2)';b.style.borderWidth='1.5px';
  });
  highlightSub(btn, color);
}
function highlightSub(btn, color) {
  btn.style.borderColor=color||'var(--c1)';
  btn.style.background='rgba(15,42,29,.08)';
  btn.style.color=color||'var(--c1)';
  btn.style.borderWidth='2px';
}

// ═══ CATS ═══
function openCatMgr(){document.getElementById('modal-cats').classList.add('mon');renderCatMgr('Gasto');}
function closeCatMgr(){document.getElementById('modal-cats').classList.remove('mon');}
function renderCatMgr(type){
  catMgrT=type;
  const aS='flex:1;padding:9px;border-radius:8px;border:none;font-size:13px;font-weight:800;cursor:pointer;',iS='flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:var(--t2);font-size:13px;font-weight:700;cursor:pointer';
  document.getElementById('cmt-g').style.cssText=type==='Gasto'?aS+'background:var(--card);color:var(--c1);box-shadow:var(--sh)':iS;
  document.getElementById('cmt-i').style.cssText=type==='Ingreso'?aS+'background:var(--card);color:var(--c2);box-shadow:var(--sh)':iS;
  const ed=document.getElementById('cat-editor');ed.innerHTML='';
  Object.entries(cats[type]).forEach(([cat,cd])=>{
    const subs=(cd.subs||[]).map((s,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 10px 10px 20px;border-bottom:1px solid var(--bdr)"><span style="font-size:13px;color:var(--t2);font-weight:500">${SUB_ICONS[s]||'•'} ${s}</span><button onclick="delSub('${type}','${cat}',${i})" style="color:var(--c1);border:none;background:transparent;cursor:pointer;padding:4px 8px;font-size:14px"><i class="fa-solid fa-xmark"></i></button></div>`).join('');
    ed.innerHTML+=`<div style="background:var(--card);border:1px solid var(--bdr);border-radius:11px;margin-bottom:10px;overflow:hidden;box-shadow:var(--sh)"><div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg)"><div style="display:flex;align-items:center;gap:8px"><div style="width:9px;height:9px;border-radius:50%;background:var(--c1)"></div><span style="font-size:13px;font-weight:800">${CAT_ICONS[cat]||'📁'} ${cat}</span></div><button onclick="delCat('${type}','${cat}')" style="color:var(--c1);border:none;background:transparent;cursor:pointer;font-size:13px"><i class="fa-solid fa-trash"></i></button></div>${subs}<button onclick="promptSub('${type}','${cat}')" style="width:100%;padding:11px 14px;border:none;background:transparent;font-size:13px;color:var(--c2);font-weight:700;cursor:pointer;text-align:left"><i class="fa-solid fa-plus" style="margin-right:5px"></i>Añadir subcategoría</button></div>`;
  });
}
function promptNewCat(){const n=prompt('Nombre:');if(!n?.trim())return;if(cats[catMgrT][n.trim()]){alert('Ya existe');return;}cats[catMgrT][n.trim()]={color:'var(--c3)',subs:['General'],deductible:false};saveCats();renderCatMgr(catMgrT);}
function promptSub(t,c){const n=prompt(`Subcategoría para "${c}":`);if(!n?.trim())return;cats[t][c].subs.push(n.trim());saveCats();renderCatMgr(t);}
function delCat(t,c){if(!confirm(`¿Borrar "${c}"?`))return;delete cats[t][c];saveCats();renderCatMgr(t);}
function delSub(t,c,i){cats[t][c].subs.splice(i,1);saveCats();renderCatMgr(t);}
function saveCats(){localStorage.setItem('fp_cats',JSON.stringify(cats));syncData('save_config',{type:'categories',content:cats});}

// ═══ AJUSTES ═══
function promptName(){const n=prompt('Tu nombre:',userName);if(!n?.trim())return;userName=n.trim();localStorage.setItem('fp_name',userName);document.getElementById('sv-name').textContent=userName;}
function promptGoal(){const n=prompt('Meta de ahorro mensual ($):',savGoal);if(!n||isNaN(n))return;savGoal=parseFloat(n);localStorage.setItem('fp_goal',savGoal);document.getElementById('sv-goal').textContent=fmt(savGoal);renderHome();}
function openSheetsModal(){document.getElementById('modal-sheets').classList.add('mon');}
function closeSheetsModal(){document.getElementById('modal-sheets').classList.remove('mon');}
function saveSheetUrl(){const url=document.getElementById('sheet-url').value.trim();localStorage.setItem('fp_url',url);sheetUrl=url;updateSheetBadge();closeSheetsModal();toast('✅ URL guardada');if(url)loadFromSheets(true);}
function updateSheetBadge(){const p=document.getElementById('sv-sheets-url');if(sheetUrl){if(p)p.textContent='Conectado ✓';}else{if(p)p.textContent='Sin configurar';}}

// ═══ CALENDARIO ═══
function openCal(){calYear=curDate.getFullYear();renderCal();document.getElementById('modal-cal').classList.add('mon');}
function closeCal(){document.getElementById('modal-cal').classList.remove('mon');}
function changeCalYear(d){calYear+=d;renderCal();}
function renderCal(){
  document.getElementById('cal-yr').textContent=calYear;
  const g=document.getElementById('cal-grid');g.innerHTML='';
  for(let i=0;i<12;i++){
    const mt=getMonthTxs(calYear,i);let inc=0,exp=0,saved=0;
    mt.forEach(t=>{const a=Number(t.amount)||0;if(t.type==='Ingreso')inc+=a;else{exp+=a;if(t.category==='Savings')saved+=a;}});
    const sav=inc-exp;
    const prevMt=getMonthTxs(calYear,i-1);let pSaved=0;prevMt.forEach(t=>{if(t.type!=='Ingreso'&&t.category==='Savings')pSaved+=Number(t.amount)||0;});
    const diff=saved-pSaved;const sel=i===curDate.getMonth()&&calYear===curDate.getFullYear();
    g.innerHTML+=`<div class="cmc${sel?' sel':''}" onclick="selCalMonth(${i},${calYear})"><div class="cmc-lbl">${MS[i]}</div><div style="font-size:9px;color:${sel?'#E3EED4':'var(--t2)'};font-weight:700;margin-top:2px">+${fmtK(inc)}</div><div style="font-size:9px;color:${sel?'#AEC3B0':'var(--t3)'};font-weight:700">${fmtK(exp)}</div><div class="cmc-sav" style="color:${sel?'var(--c5)':'var(--t1)'}">${sav>=0?'+':''}${fmtK(sav)}</div>${i>0?`<div class="cmc-diff" style="color:${sel?'var(--c5)':'var(--t1)'}">${diff>=0?'↑':'↓'}${fmtK(Math.abs(diff))}</div>`:''}</div>`;
  }
}
function selCalMonth(m,y){curDate=new Date(y,m,1);updateMonthDisplay();closeCal();}

// ═══ GOOGLE SHEETS ═══
function setSS(s){const d=document.getElementById('sdot');if(d)d.className='sdot'+(s==='sy'?' sy':s==='er'?' er':'');}
async function postToSheets(body){if(!sheetUrl)return;await fetch(sheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});}
async function loadFromSheets(show){
  if(!sheetUrl)return false;setSS('sy');
  try{
    const res=await fetch(sheetUrl+'?action=get_all');const data=await res.json();
    let changed=false;
    if(data.transactions&&data.transactions.length>0){txs=data.transactions;localStorage.setItem('fp_txs',JSON.stringify(txs));changed=true;}
    if(data.categories){cats=data.categories;localStorage.setItem('fp_cats',JSON.stringify(cats));}
    if(data.budgets&&Object.keys(data.budgets).length>0){budgets=data.budgets;localStorage.setItem('fp_budgets',JSON.stringify(budgets));}
    setSS('');if(changed)updateMonthDisplay();if(show)toast('✅ Datos actualizados');return true;
  }catch(e){setSS('er');if(show)toast('⚠️ Sin conexión — datos locales');return false;}
}
async function syncData(action,payload){
  if(!sheetUrl)return;setSS('sy');
  try{await postToSheets({action,data:payload});setSS('');}
  catch(e){setSS('er');const q=JSON.parse(localStorage.getItem('fp_sync_queue')||'[]');q.push({action,payload,ts:Date.now()});localStorage.setItem('fp_sync_queue',JSON.stringify(q));}
}
async function retryQueue(){
  if(!sheetUrl)return;const q=JSON.parse(localStorage.getItem('fp_sync_queue')||'[]');if(!q.length)return;
  const rem=[];for(const item of q){try{await postToSheets({action:item.action,data:item.payload});}catch(e){rem.push(item);}}
  localStorage.setItem('fp_sync_queue',JSON.stringify(rem));
  if(q.length!==rem.length)toast('✅ '+(q.length-rem.length)+' movimientos sincronizados');
}
async function forceSyncToSheets(){
  if(!sheetUrl){toast('⚠️ Sin URL configurada');return;}setSS('sy');toast('⬆️ Subiendo...');
  try{await postToSheets({action:'sync_all',data:{transactions:txs,categories:cats,budgets}});setSS('');toast('✅ Datos subidos');setTimeout(()=>loadFromSheets(false),2000);}
  catch(e){setSS('er');toast('❌ Error — revisa tu conexión');}
}

// ═══ EXPORT CSV PROFESIONAL ═══
function exportCSV() {
  const year = curDate.getFullYear(), name = userName||'Cliente';
  const now = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const yearTxs = txs.filter(t => { if(!t||!t.date) return false; return new Date(t.date+'T12:00:00').getFullYear()===year; });
  let totalInc=0,totalExp=0,totalSaved=0,dedTotal=0; const byCat={};
  yearTxs.forEach(t => {
    const a=Number(t.amount)||0;
    if(t.type==='Ingreso') totalInc+=a;
    else { totalExp+=a; byCat[t.category]=(byCat[t.category]||0)+a; if(t.category==='Savings') totalSaved+=a; const cd=cats.Gasto[t.category]; if(cd&&cd.deductible) dedTotal+=a; }
  });
  const net=totalInc-totalExp, taxEst=Math.max(0,net)*(taxPct/100);
  const DAYS2=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const info = [
    [`REPORTE FINANCIERO PERSONAL — ${name}`],[`Año Fiscal: ${year}`],[`Generado: ${now}`],[`App: Finanzas Pro`],[],
    ['RESUMEN EJECUTIVO'],['Concepto','Valor','Descripción'],
    ['Ingresos Totales',`$${totalInc.toFixed(2)}`,'Suma de todos los ingresos del año'],
    ['Gastos Totales',`$${totalExp.toFixed(2)}`,'Suma de todos los gastos del año'],
    ['Ingreso Neto',`$${net.toFixed(2)}`,'Ingresos menos Gastos'],
    ['Total Ahorrado',`$${totalSaved.toFixed(2)}`,'Depósitos en categoría Savings'],
    ['Gastos Deducibles',`$${dedTotal.toFixed(2)}`,'Gastos marcados como deducibles de impuestos'],
    ['Impuesto Estimado',`$${taxEst.toFixed(2)}`,`Tasa ${taxPct}% sobre ingreso neto`],
    [],[`GASTOS POR CATEGORÍA (${year})`],['Categoría','Total','Deducible'],
    ...Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => [cat,`$${amt.toFixed(2)}`,(cats.Gasto[cat]||{}).deductible?'SÍ':'NO']),
    [],['DETALLE COMPLETO DE TRANSACCIONES'],
    ['#','ID','Fecha','Día','Mes','Año','Tipo','Categoría','Subcategoría','Monto','Método de Pago','Notas','Deducible'],
    ...[...txs].sort((a,b)=>a.date>b.date?1:-1).map((t,i) => {
      const d = t.date ? new Date(t.date+'T12:00:00') : new Date();
      const cd = t.type==='Gasto' ? (cats.Gasto[t.category]||{}) : {};
      return [i+1,t.id||'',t.date||'',DAYS2[d.getDay()],MS[d.getMonth()],d.getFullYear(),
        t.type||'',t.category||'',t.subcategory||'',`$${(Number(t.amount)||0).toFixed(2)}`,
        t.method||'N/A',t.notes||'',(t.type==='Gasto'&&cd.deductible)?'SÍ':'NO'];
    }),
    [],[`FIN DEL REPORTE`],[`Tasa: ${taxPct}% | Año: ${year} | Presente con recibos a su agente de taxes`]
  ];
  const csv = info.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = `Reporte_Financiero_${name}_${year}.csv`;
  a.click(); toast('📊 CSV profesional exportado');
}

// ═══ TAX HTML REPORT ═══
function exportTaxReport() {
  const year=curDate.getFullYear(),name=userName||'Cliente';
  const now=new Date().toLocaleDateString('es-US',{year:'numeric',month:'long',day:'numeric'});
  const yearTxs=txs.filter(t=>{if(!t||!t.date)return false;return new Date(t.date+'T12:00:00').getFullYear()===year;});
  let inc=0,exp=0,ded=0,saved=0; const dedMap={},incMap={};
  yearTxs.forEach(t=>{const a=Number(t.amount)||0;if(t.type==='Ingreso'){inc+=a;incMap[t.subcategory]=(incMap[t.subcategory]||0)+a;}else{exp+=a;if(t.category==='Savings')saved+=a;const cd=cats.Gasto[t.category];if(cd&&cd.deductible){ded+=a;dedMap[t.category]=(dedMap[t.category]||0)+a;}}});
  const net=Math.max(0,inc-exp),est=net*(taxPct/100);
  const f=v=>'$'+v.toFixed(2);
  const dedRows=Object.entries(dedMap).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`<tr><td>${cat}</td><td style="text-align:right;color:#0F2A1D;font-weight:900">${f(amt)}</td><td style="text-align:right;color:#6B9071;font-weight:700">Deducible</td></tr>`).join('');
  const incRows=Object.entries(incMap).sort((a,b)=>b[1]-a[1]).map(([src,amt])=>`<tr><td>${src||'Otros'}</td><td style="text-align:right;color:#0F2A1D;font-weight:900">${f(amt)}</td></tr>`).join('');
  const txRows=[...yearTxs].sort((a,b)=>a.date>b.date?1:-1).map((t,i)=>{const isI=t.type==='Ingreso';const a=Number(t.amount)||0;const cd=isI?{}:(cats.Gasto[t.category]||{});return`<tr${isI?' style="background:#E3EED4"':''}><td>${i+1}</td><td style="font-family:monospace;font-size:11px">${t.date||''}</td><td>${t.type}</td><td>${t.category||''}</td><td>${t.subcategory||''}</td><td style="text-align:right;font-weight:900;color:#0F2A1D">${isI?'+':'-'}${f(a)}</td><td>${t.method||'N/A'}</td><td style="color:${cd.deductible?'#375534':'#AEC3B0'}">${cd.deductible?'✓':'-'}</td><td style="color:#6B9071;font-size:11px">${t.notes||''}</td></tr>`;}).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Taxes ${year} — ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Sora',Arial,sans-serif;color:#0F2A1D;padding:36px;font-size:14px;line-height:1.65;max-width:960px;margin:0 auto;background:#AEC3B0;}
.header{background:#0F2A1D;border-radius:18px;padding:26px;margin-bottom:28px;color:#E3EED4;}
.header h1{font-size:26px;font-weight:900;margin-bottom:4px;}.header p{font-size:12px;opacity:.8;}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;}
.kpi{background:#E3EED4;border-radius:14px;padding:14px;border:1px solid #6B9071;box-shadow:0 2px 8px rgba(15,42,29,.06);}
.kpi.g{border-top:3px solid #375534;}.kpi.r{border-top:3px solid #6B9071;}.kpi.b{border-top:3px solid #0F2A1D;}.kpi.y{border-top:3px solid #6B9071;}.kpi.c{border-top:3px solid #0F2A1D;}
.kpi-l{font-size:9px;font-weight:700;color:#375534;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;}
.kpi-v{font-size:20px;font-weight:900;color:#0F2A1D;}
h2{font-size:13px;font-weight:800;color:#0F2A1D;margin:26px 0 12px;text-transform:uppercase;letter-spacing:.07em;border-bottom:2px solid #6B9071;padding-bottom:6px;}
table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:12px;background:#E3EED4;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(15,42,29,.06);}
th{background:#0F2A1D;color:#E3EED4;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.04em;}
td{padding:8px 12px;border-bottom:1px solid #AEC3B0;}tr:last-child td{border-bottom:none;}
.tot td{font-weight:900;background:rgba(107,144,113,.2);color:#0F2A1D;}
.disc{background:#E3EED4;border:1px solid #6B9071;border-radius:14px;padding:16px;font-size:12px;color:#375534;margin-top:28px;line-height:1.75;}
.footer{text-align:center;font-size:11px;color:#375534;margin-top:32px;border-top:1px solid #6B9071;padding-top:18px;}
@media print{body{padding:16px;background:#fff;}.header{background:#0F2A1D;}}</style></head>
<body>
<div class="header"><h1>📊 Reporte Fiscal ${year}</h1><p>Cliente: <strong>${name}</strong> &nbsp;·&nbsp; ${now} &nbsp;·&nbsp; Tasa: <strong>${taxPct}%</strong></p></div>
<div class="kpi-grid">
<div class="kpi g"><div class="kpi-l">Ingresos Brutos</div><div class="kpi-v">${f(inc)}</div></div>
<div class="kpi r"><div class="kpi-l">Gastos Deducibles</div><div class="kpi-v">${f(ded)}</div></div>
<div class="kpi y"><div class="kpi-l">Impuesto Estimado</div><div class="kpi-v">${f(est)}</div></div>
<div class="kpi"><div class="kpi-l">Gastos Totales</div><div class="kpi-v">${f(exp)}</div></div>
<div class="kpi b"><div class="kpi-l">Ingreso Neto</div><div class="kpi-v">${f(net)}</div></div>
<div class="kpi c"><div class="kpi-l">Total Ahorrado</div><div class="kpi-v">${f(saved)}</div></div>
</div>
<h2>Fuentes de Ingreso</h2>
<table><thead><tr><th>Fuente</th><th style="text-align:right">Monto</th></tr></thead><tbody>${incRows}<tr class="tot"><td>TOTAL INGRESOS</td><td style="text-align:right">${f(inc)}</td></tr></tbody></table>
<h2>Gastos Deducibles</h2>
<table><thead><tr><th>Categoría</th><th style="text-align:right">Monto</th><th>Estado</th></tr></thead><tbody>${dedRows}<tr class="tot"><td>TOTAL DEDUCIBLE</td><td style="text-align:right">${f(ded)}</td><td></td></tr></tbody></table>
<h2>Cálculo Fiscal</h2>
<table><thead><tr><th>Concepto</th><th style="text-align:right">Valor</th></tr></thead><tbody>
<tr><td>Ingresos Brutos</td><td style="text-align:right;font-weight:900;color:#0F2A1D">${f(inc)}</td></tr>
<tr><td>Menos: Gastos Deducibles</td><td style="text-align:right;font-weight:900;color:#0F2A1D">(${f(ded)})</td></tr>
<tr class="tot"><td>Ingreso Neto Gravable</td><td style="text-align:right">${f(net)}</td></tr>
<tr><td>Tasa (${taxPct}%)</td><td style="text-align:right;font-weight:900;color:#0F2A1D">${taxPct}%</td></tr>
<tr class="tot"><td style="font-size:16px">⚡ RESERVA SUGERIDA IRS</td><td style="text-align:right;font-size:20px">${f(est)}</td></tr>
</tbody></table>
<h2>Detalle Completo de Transacciones</h2>
<table><thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Subcategoría</th><th style="text-align:right">Monto</th><th>Método</th><th>Ded.</th><th>Nota</th></tr></thead><tbody>${txRows}</tbody></table>
<div class="disc">⚠️ <strong>Aviso para el agente de taxes:</strong> Este reporte fue generado con Finanzas Pro. Las cifras son un estimado basado en datos del cliente. Los gastos deducibles deben verificarse con recibos. Este documento NO reemplaza la preparación oficial de taxes por un CPA. Tasa: ${taxPct}%. Año fiscal: ${year}.</div>
<div class="footer">Finanzas Pro · Reporte Fiscal ${year} · ${name} · ${now}</div>
</body></html>`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Reporte_Taxes_${name}_${year}.html`;a.click();URL.revokeObjectURL(url);toast('📄 Reporte taxes exportado');
}

// ═══ DEBTS & MOVEMENTS ═══
function openDebtModal(id) {
  editDebtId = id || null;
  document.getElementById('debt-modal-title').textContent = id ? 'Editar Deuda' : 'Nueva Deuda';
  if(id) {
    const d = debts.find(x => x.id === id);
    if(d) {
      document.getElementById('debt-name').value = d.name;
      document.getElementById('debt-type').value = d.type;
      document.getElementById('debt-original').value = d.original;
      document.getElementById('debt-rate').value = d.rate;
      document.getElementById('debt-term').value = d.term;
      document.getElementById('debt-start').value = d.startDate;
      document.getElementById('debt-note').value = d.note||'';
    }
  } else {
    ['debt-name','debt-original','debt-rate','debt-term','debt-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('debt-term').placeholder = '60';
    document.getElementById('debt-start').valueAsDate = new Date();
  }
  document.getElementById('modal-debt').classList.add('mon');
}
function closeDebtModal() { document.getElementById('modal-debt').classList.remove('mon'); editDebtId = null; }
function saveDebt() {
  const name = document.getElementById('debt-name').value.trim();
  const original = parseFloat(document.getElementById('debt-original').value)||0;
  const rate = parseFloat(document.getElementById('debt-rate').value)||0;
  const term = parseInt(document.getElementById('debt-term').value)||12;
  if(!name || !original) { toast('⚠️ Nombre y monto requeridos'); return; }
  const debt = {
    id: editDebtId || ('DEBT-'+Date.now().toString().slice(-8)),
    name, type: document.getElementById('debt-type').value,
    original, rate, term,
    startDate: document.getElementById('debt-start').value,
    note: document.getElementById('debt-note').value
  };
  
  if(!cats.Gasto['Deudas']) { cats.Gasto['Deudas'] = { color: 'var(--c1)', subs: [], deductible: false }; }
  if(!cats.Gasto['Deudas'].subs.includes(debt.name)) { cats.Gasto['Deudas'].subs.push(debt.name); }
  localStorage.setItem('fp_cats', JSON.stringify(cats));

  if(editDebtId) { debts = debts.map(d => d.id===editDebtId ? debt : d); }
  else { debts.push(debt); }
  localStorage.setItem('fp_debts', JSON.stringify(debts));
  closeDebtModal(); renderDebts(); toast('✅ Deuda guardada');
}
function deleteDebt(id) {
  if(!confirm('¿Eliminar esta deuda? (El historial de movimientos no se borrará)')) return;
  debts = debts.filter(d => d.id !== id);
  localStorage.setItem('fp_debts', JSON.stringify(debts));
  renderDebts(); toast('🗑 Deuda eliminada');
}

function payDebt(id) {
    const d = debts.find(x => x.id === id);
    if(!d) return;
    if(!cats.Gasto['Deudas']) cats.Gasto['Deudas'] = { color: 'var(--c1)', subs: [], deductible: false };
    if(!cats.Gasto['Deudas'].subs.includes(d.name)) cats.Gasto['Deudas'].subs.push(d.name);
    
    openModal();
    document.querySelector('input[name="tt"][value="Gasto"]').checked = true;
    onTC(); 
    
    setTimeout(() => {
        const catBtns = Array.from(document.querySelectorAll('.cbtn'));
        const deudasBtn = catBtns.find(b => b.textContent.includes('Deudas'));
        if(deudasBtn) {
            selectCat('Deudas', deudasBtn);
            setTimeout(() => {
                const subBtns = Array.from(document.querySelectorAll('.sbtns'));
                const debtSubBtn = subBtns.find(b => b.textContent.includes(d.name));
                if(debtSubBtn) {
                    selectSub(d.name, debtSubBtn, 'var(--c1)');
                }
                document.getElementById('txAmt').focus();
            }, 50);
        }
    }, 50);
}

function calcDebtProgress(debt) {
  const paidSoFar = txs.filter(t => t.type === 'Gasto' && t.category === 'Deudas' && t.subcategory === debt.name).reduce((sum, t) => sum + Number(t.amount), 0);
  
  const monthlyRate = debt.rate / (100*12);
  const now = new Date(), start = new Date(debt.startDate + 'T12:00:00');
  
  let monthlyPayment;
  if(monthlyRate > 0) {
    monthlyPayment = debt.original * (monthlyRate * Math.pow(1+monthlyRate, debt.term)) / (Math.pow(1+monthlyRate, debt.term) - 1);
  } else {
    monthlyPayment = debt.original / debt.term;
  }
  
  const totalCost = monthlyPayment * debt.term;
  const totalInterest = totalCost - debt.original;
  
  const remaining = Math.max(0, totalCost - paidSoFar);
  const pct = totalCost > 0 ? Math.min(100, (paidSoFar / totalCost) * 100) : 0;
  
  const monthsElapsed = Math.max(0, Math.floor((now - start) / (1000*60*60*24*30.44)));
  const monthsLeft = Math.max(0, debt.term - monthsElapsed);
  const endDate = new Date(start); endDate.setMonth(endDate.getMonth() + debt.term);
  
  return { monthlyPayment, totalInterest, pct, remaining, monthsLeft, endDate, paidSoFar };
}

function renderDebts() {
  const list = document.getElementById('debt-list');
  const dtEl = document.getElementById('debt-total-remaining');
  if(!debts.length) {
    if(list) list.innerHTML = '<div style="text-align:center;padding:48px 0"><div style="font-size:40px;margin-bottom:12px">💳</div><p style="font-size:14px;font-weight:700;color:var(--t2)">Sin deudas registradas</p><p style="font-size:12px;color:var(--t3);margin-top:5px">Toca + Nueva para agregar</p></div>';
    if(dtEl) dtEl.textContent = '$0'; return;
  }
  const typeEmojis = {'Préstamo Personal':'👤','Auto Loan':'🚗','Tarjeta de Crédito':'💳','Hipoteca':'🏠','Estudiante':'🎓','Otro':'📋'};
  let totalRem = 0;
  if(list) list.innerHTML = debts.map(debt => {
    const p = calcDebtProgress(debt); totalRem += p.remaining;
    const MS2 = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `<div class="debt-card">
      <div style="display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:700;padding:3px 9px;border-radius:50px;background:rgba(15,42,29,.1);color:var(--c1);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${typeEmojis[debt.type]||'📋'} ${debt.type}</div>
      <div style="font-size:15px;font-weight:700;color:var(--t2);margin-bottom:3px">${debt.name}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;color:var(--t3);font-weight:600;margin-bottom:2px">Saldo pendiente</div>
          <div style="font-size:22px;font-weight:800;color:var(--t1);font-family:'Sora',sans-serif">${fmt(p.remaining)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--t3);font-weight:600;margin-bottom:2px">Pago mensual</div>
          <div style="font-size:15px;font-weight:800;color:var(--t1);font-family:'Sora',sans-serif">${fmt(p.monthlyPayment)}</div>
        </div>
      </div>
      <div class="debt-progress-bar"><div class="debt-progress-fill" style="width:${p.pct.toFixed(0)}%; background:var(--grad-main)"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:10px">
        <span style="color:var(--t2)">${p.pct.toFixed(0)}% pagado (${fmt(p.paidSoFar)})</span>
        <span style="color:var(--c1)">${p.monthsLeft} meses restantes</span>
      </div>
      <div class="debt-stats">
        <div class="debt-stat"><div class="debt-stat-lbl">Original</div><div class="debt-stat-val">${fmtK(debt.original)}</div></div>
        <div class="debt-stat"><div class="debt-stat-lbl">Interés est.</div><div class="debt-stat-val" style="color:var(--t1)">${fmtK(p.totalInterest)}</div></div>
        <div class="debt-stat"><div class="debt-stat-lbl">Termina</div><div class="debt-stat-val" style="color:var(--t1)">${MS2[p.endDate.getMonth()]} ${p.endDate.getFullYear()}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="payDebt('${debt.id}')" style="flex:1;padding:9px;border-radius:10px;border:none;background:var(--c1);font-size:12px;font-weight:800;color:var(--c5);cursor:pointer;box-shadow:0 3px 8px rgba(15,42,29,.3)"><i class="fa-solid fa-dollar-sign" style="margin-right:5px"></i>Abonar</button>
        <button onclick="openDebtModal('${debt.id}')" style="padding:9px;border-radius:10px;border:1px solid var(--bdr);background:rgba(15,42,29,.04);font-size:12px;font-weight:700;color:var(--t2);cursor:pointer"><i class="fa-solid fa-pen"></i></button>
        <button onclick="deleteDebt('${debt.id}')" style="padding:9px 12px;border-radius:10px;border:1px solid rgba(15,42,29,.15);background:rgba(15,42,29,.04);font-size:12px;font-weight:700;color:var(--c1);cursor:pointer"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
  if(dtEl) dtEl.textContent = fmt(totalRem);
}

// ═══ UTILS ═══
function clearData(){if(!confirm('¿Borrar TODOS los datos?'))return;['fp_txs','fp_cats','fp_budgets','fp_url','fp_name','fp_goal','fp_taxpct','fp_sync_queue','fp_payments','fp_dark','fp_debts'].forEach(k=>localStorage.removeItem(k));location.reload();}
