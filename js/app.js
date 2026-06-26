// ═══════════ BUDGET APP — simple & clean ═══════════
const SHEETS_URL='https://script.google.com/macros/s/AKfycbxV4hmnyt3Xz11IdyM5GeV9l1RvKT8o4ltFmMPoRLHKhH964SbF0uPpcFzvV2egb7vESQ/exec';
let sheetUrl=localStorage.getItem('fp_url')||SHEETS_URL;

// Categories — simple fixed set
const CATS={
  Comida:{ico:'🍔',color:'#FF9F0A',subs:['Supermercado','Restaurantes','Café','Delivery']},
  Transporte:{ico:'🚗',color:'#FF453A',subs:['Gasolina','Uber','Transporte','Estacionamiento']},
  Casa:{ico:'🏠',color:'#7C5CFC',subs:['Renta','Hipoteca','Mantenimiento','Muebles']},
  Servicios:{ico:'⚡',color:'#64D2FF',subs:['Luz','Agua','Internet','Teléfono']},
  Compras:{ico:'🛍️',color:'#FF375F',subs:['Ropa','Tecnología','Hogar','Regalos']},
  Entretenimiento:{ico:'🎮',color:'#30D158',subs:['Cine','Streaming','Salidas','Juegos']},
  Salud:{ico:'💊',color:'#0A84FF',subs:['Farmacia','Doctor','Gym','Seguro']},
  Otros:{ico:'📦',color:'#8E8E93',subs:['Varios','Imprevistos']}
};
const INC_CAT={ico:'💰',color:'#30D158',subs:['Sueldo','Negocio','Freelance','Propinas','Otros']};
const MS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MSS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// State
let txs=JSON.parse(localStorage.getItem('fp_txs'))||[];
let budgets=JSON.parse(localStorage.getItem('fp_budgets'))||{
  Comida:500,Transporte:300,Casa:1200,Servicios:200,Compras:250,Entretenimiento:150,Salud:100,Otros:100
};
Object.keys(budgets).forEach(k=>budgets[k]=Number(budgets[k])||0);
let savGoal=parseFloat(localStorage.getItem('fp_savgoal'))||2000;
let curDate=new Date();
let curType='Gasto', selCat='', selSub='';

// Helpers
const fmt=n=>'$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtS=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US');
const $=id=>document.getElementById(id);
function setSS(s){const d=$('sdot');if(d)d.className=s;}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);}

function monthTxs(yr,mo){
  const y=yr??curDate.getFullYear(), m=mo??curDate.getMonth();
  return txs.filter(t=>{if(!t||!t.date)return false;const d=new Date(t.date+'T12:00:00');return d.getMonth()===m&&d.getFullYear()===y;});
}

// ═══ NAV ═══
function go(v){
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('on'));
  $('v-'+v).classList.add('on');
  ['home','budget','savings','more'].forEach(n=>{const b=$('nav-'+n);if(b)b.classList.toggle('on',n===v);});
  if(v==='home')renderHome();
  if(v==='budget')renderBudget();
  if(v==='savings')renderSavings();
}
function changeMonth(d){curDate=new Date(curDate.getFullYear(),curDate.getMonth()+d,1);updateMonth();}
function updateMonth(){
  const s=`${MSS[curDate.getMonth()]} ${curDate.getFullYear()}`;
  ['mn-home','mn-bud','mn-sav'].forEach(id=>{const e=$(id);if(e)e.textContent=s;});
  const ov=document.querySelector('.view.on');
  if(ov){if(ov.id==='v-home')renderHome();if(ov.id==='v-budget')renderBudget();if(ov.id==='v-savings')renderSavings();}
}

// ═══ HOME ═══
function renderHome(){
  const mt=monthTxs();
  let inc=0,exp=0,catSums={};
  mt.forEach(t=>{const a=Number(t.amount)||0;
    if(t.type==='Ingreso')inc+=a;
    else{exp+=a;catSums[t.category]=(catSums[t.category]||0)+a;}
  });
  const bal=inc-exp;
  // balance
  $('h-bal').innerHTML=fmtS(bal)+'<span class="c">.'+(Math.abs(bal)%1).toFixed(2).slice(2)+'</span>';
  $('h-inc').textContent=fmtS(inc);
  $('h-exp').textContent=fmtS(exp);
  // budget summary
  const totalBud=Object.values(budgets).reduce((s,v)=>s+(Number(v)||0),0);
  const left=totalBud-exp;
  $('h-bud-left').innerHTML=fmtS(left)+'<span class="lt">restante</span>';
  $('h-bud-spent').textContent=fmtS(exp)+' gastado de '+fmtS(totalBud);
  const budPct=totalBud>0?Math.min(100,(exp/totalBud)*100):0;
  $('h-bud-bar').style.width=budPct+'%';
  $('h-bud-bar').style.background=budPct>=100?'var(--red)':budPct>=80?'var(--amber)':'var(--grad-v)';
  // budget chips — top spent categories
  const chipEntries=Object.entries(catSums).sort((a,b)=>b[1]-a[1]).slice(0,4);
  $('h-bud-chips').innerHTML=chipEntries.length?chipEntries.map(([cat,amt])=>{
    const c=CATS[cat]||CATS.Otros;const lim=budgets[cat]||0;
    const pct=lim>0?Math.min(100,(amt/lim)*100):0;
    const circ=2*Math.PI*14;const dash=(pct/100)*circ;
    return `<div class="bud-chip">
      <svg class="bud-chip-ring" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="14" fill="none" stroke="var(--card)" stroke-width="3"/>
        <circle cx="17" cy="17" r="14" fill="none" stroke="${c.color}" stroke-width="3" stroke-dasharray="${dash} ${circ}" stroke-linecap="round" transform="rotate(-90 17 17)"/>
      </svg>
      <div class="bud-chip-info"><div class="bud-chip-name">${cat}</div><div class="bud-chip-spent">${fmtS(amt)} gastado</div></div>
    </div>`;
  }).join(''):'<p style="font-size:13px;color:var(--t2);padding:6px">Sin gastos aún</p>';
  // donut
  renderDonut(catSums,exp);
  // transactions
  renderTx(mt);
}

function renderDonut(sums,total){
  const svg=$('donut-svg');const legend=$('cat-legend');
  $('donut-total').textContent=fmtS(total);
  const entries=Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  const R=62,C=2*Math.PI*R,cx=80,cy=80;
  if(!entries.length){
    svg.innerHTML=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--card2)" stroke-width="18"/>`;
    legend.innerHTML='<p style="font-size:13px;color:var(--t2);text-align:center">Sin gastos este mes</p>';return;
  }
  let off=0,seg='';
  entries.forEach(([cat,amt])=>{
    const c=CATS[cat]||CATS.Otros;const len=(amt/total)*C;
    seg+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c.color}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}"/>`;
    off+=len;
  });
  svg.innerHTML=seg;
  legend.innerHTML=entries.map(([cat,amt])=>{
    const c=CATS[cat]||CATS.Otros;const pct=((amt/total)*100).toFixed(0);
    return `<div class="cl-row"><div class="cl-dot" style="background:${c.color}"></div><div class="cl-name">${cat}</div><div class="cl-amt">${fmtS(amt)}</div><div class="cl-pct">${pct}%</div></div>`;
  }).join('');
}

function renderTx(mt){
  const el=$('tx-list');
  if(!mt.length){el.innerHTML='<div class="empty"><div class="empty-emoji">👻</div><p>Sin movimientos</p><span>Toca + para agregar</span></div>';return;}
  const sorted=[...mt].sort((a,b)=>b.date.localeCompare(a.date));
  el.innerHTML=sorted.slice(0,30).map(t=>{
    const isI=t.type==='Ingreso';
    const c=isI?INC_CAT:(CATS[t.category]||CATS.Otros);
    const d=new Date(t.date+'T12:00:00');
    const dstr=`${d.getDate()} ${MSS[d.getMonth()]}`;
    const meta=t.subcategory&&t.subcategory!==t.category?t.category+(t.notes?' · '+t.notes:''):(t.notes||t.category);
    return `<div class="swipe-wrap" data-id="${t.id}">
      <div class="swipe-action edit"><i class="fa-solid fa-pen"></i></div>
      <div class="swipe-action del"><i class="fa-solid fa-trash"></i></div>
      <div class="tx-row swipe-surface" onclick="rowTap('${t.id}')">
        <div class="tx-ico" style="background:${c.color}22;color:${c.color}">${c.ico}</div>
        <div class="tx-mid"><div class="tx-name">${t.subcategory||t.category}</div><div class="tx-meta">${meta}</div></div>
        <div class="tx-r"><div class="tx-amt ${isI?'i':''}">${isI?'+':'-'}${fmtS(t.amount)}</div><div class="tx-date">${dstr}</div></div>
      </div>
    </div>`;
  }).join('');
  attachSwipe();
}

// ═══ SWIPE GESTURE ═══
let swipeOpen=null;
function rowTap(id){
  // if a row is open, tapping closes it instead of editing
  if(swipeOpen){closeSwipe();return;}
  editTx(id);
}
function closeSwipe(){
  if(swipeOpen){swipeOpen.style.transform='translateX(0)';swipeOpen=null;}
}
function attachSwipe(){
  document.querySelectorAll('.swipe-wrap').forEach(wrap=>{
    const surface=wrap.querySelector('.swipe-surface');
    const id=wrap.dataset.id;
    let startX=0,startY=0,curX=0,dragging=false,locked=false;
    const TH=72; // threshold to reveal action
    surface.addEventListener('touchstart',e=>{
      if(swipeOpen&&swipeOpen!==surface){closeSwipe();}
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;dragging=true;locked=false;
      surface.style.transition='none';
    },{passive:true});
    surface.addEventListener('touchmove',e=>{
      if(!dragging)return;
      const dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
      if(!locked){ if(Math.abs(dx)>Math.abs(dy)+4){locked=true;} else if(Math.abs(dy)>8){dragging=false;return;} }
      if(locked){ curX=Math.max(-96,Math.min(96,dx)); surface.style.transform=`translateX(${curX}px)`; }
    },{passive:true});
    surface.addEventListener('touchend',()=>{
      if(!dragging)return;dragging=false;
      surface.style.transition='transform .25s cubic-bezier(.25,.8,.25,1)';
      if(curX<=-TH){ // swiped LEFT → delete (red revealed on right)
        surface.style.transform='translateX(-500px)';
        setTimeout(()=>doDelete(id),180);
      } else if(curX>=TH){ // swiped RIGHT → edit (blue revealed on left)
        surface.style.transform='translateX(0)';swipeOpen=null;editTx(id);
      } else { surface.style.transform='translateX(0)';swipeOpen=null; }
      curX=0;
    });
  });
}
function doDelete(id){
  txs=txs.filter(t=>t.id!==id);
  localStorage.setItem('fp_txs',JSON.stringify(txs));
  syncData('delete_tx',{id});
  swipeOpen=null;updateMonth();toast('🗑 Eliminado');
}

// ═══ BUDGET VIEW ═══
function renderBudget(){
  const mt=monthTxs();const spent={};
  mt.forEach(t=>{if(t.type==='Gasto')spent[t.category]=(spent[t.category]||0)+(Number(t.amount)||0);});
  const totalBud=Object.values(budgets).reduce((s,v)=>s+(Number(v)||0),0);
  const totalSpent=Object.values(spent).reduce((s,v)=>s+(Number(v)||0),0);
  const pct=totalBud>0?Math.min(100,(totalSpent/totalBud)*100):0;
  $('b-total').textContent=fmtS(totalBud);
  $('b-pct').textContent='%'+pct.toFixed(0);
  $('b-bar').style.width=pct+'%';
  $('b-spent').textContent=fmtS(totalSpent)+' gastado';
  $('b-left').textContent=fmtS(totalBud-totalSpent)+' restante';
  $('b-list').innerHTML=Object.keys(CATS).map(cat=>{
    const lim=budgets[cat]||0;const sp=spent[cat]||0;
    const p=lim>0?(sp/lim)*100:0;const c=CATS[cat];
    let bc=c.color;if(p>=100)bc='var(--red)';else if(p>=80)bc='var(--amber)';
    return `<div class="be-row">
      <div class="be-ico" style="background:${c.color}22;color:${c.color}">${c.ico}</div>
      <div class="be-mid">
        <div class="be-name">${cat}</div>
        <div class="be-bar"><div class="be-bar-f" style="width:${Math.min(100,p)}%;background:${bc}"></div></div>
        <div class="be-sub">${fmtS(sp)} de ${fmtS(lim)}</div>
      </div>
      <button class="be-edit" onclick="editBudget('${cat}')">${lim>0?p.toFixed(0)+'%':'+'}</button>
    </div>`;
  }).join('');
}
function editBudget(cat){
  const cur=budgets[cat]||0;
  const v=prompt('Presupuesto mensual para '+cat+':',cur);
  if(v===null)return;
  budgets[cat]=parseFloat(v)||0;
  localStorage.setItem('fp_budgets',JSON.stringify(budgets));
  syncData('save_budget',{category:cat,limit:budgets[cat]});
  renderBudget();toast('✅ Presupuesto actualizado');
}

// ═══ SAVINGS VIEW ═══
function renderSavings(){
  // total saved = sum of all income - all expense across all time
  let saved=0;
  txs.forEach(t=>saved+=(t.type==='Ingreso'?1:-1)*(Number(t.amount)||0));
  saved=Math.max(0,saved);
  $('s-val').textContent=fmtS(saved);
  $('s-goal').textContent='Meta: '+fmtS(savGoal);
  const pct=savGoal>0?Math.min(100,(saved/savGoal)*100):0;
  $('s-bar').style.width=pct+'%';
  $('s-pct').textContent=pct.toFixed(0)+'% de tu meta';
  // monthly savings breakdown (last 6 months)
  const rows=[];
  for(let i=0;i<6;i++){
    const d=new Date(curDate.getFullYear(),curDate.getMonth()-i,1);
    const mt=monthTxs(d.getFullYear(),d.getMonth());
    let inc=0,exp=0;mt.forEach(t=>t.type==='Ingreso'?inc+=Number(t.amount)||0:exp+=Number(t.amount)||0);
    rows.push({m:d.getMonth(),y:d.getFullYear(),net:inc-exp});
  }
  $('s-months').innerHTML=rows.map(r=>{
    const pos=r.net>=0;
    return `<div class="tx-row">
      <div class="tx-ico" style="background:${pos?'rgba(48,209,88,.15)':'rgba(255,69,58,.15)'};color:${pos?'var(--green)':'var(--red)'}"><i class="fa-solid fa-${pos?'arrow-trend-up':'arrow-trend-down'}"></i></div>
      <div class="tx-mid"><div class="tx-name">${MS[r.m]} ${r.y}</div><div class="tx-meta">${pos?'Ahorrado':'Déficit'}</div></div>
      <div class="tx-r"><div class="tx-amt ${pos?'i':''}" style="color:${pos?'var(--green)':'var(--red)'}">${pos?'+':''}${fmtS(r.net)}</div></div>
    </div>`;
  }).join('');
}
function editGoal(){
  const v=prompt('Meta de ahorro:',savGoal);
  if(v===null)return;
  savGoal=parseFloat(v)||2000;
  localStorage.setItem('fp_savgoal',savGoal);
  renderSavings();toast('✅ Meta actualizada');
}

// ═══ ADD/EDIT TRANSACTION ═══
function openAdd(){
  curType='Gasto';selCat='';selSub='';
  $('m-title').textContent='Nuevo Movimiento';
  $('edit-id').value='';
  $('amt').value='';
  $('note').value='';
  $('tdate').valueAsDate=new Date();
  $('del-btn').style.display='none';
  setType('Gasto');
  $('modal').classList.add('mon');
  setTimeout(()=>$('amt').focus(),400);
}
function editTx(id){
  const t=txs.find(x=>x.id===id);if(!t)return;
  curType=t.type;selCat=t.category;selSub=t.subcategory||'';
  $('m-title').textContent='Editar Movimiento';
  $('edit-id').value=id;
  $('amt').value=t.amount;
  $('note').value=t.notes||'';
  $('tdate').value=t.date;
  $('del-btn').style.display='block';
  setType(t.type);
  // re-select the category + subcategory after grid renders
  setTimeout(()=>{
    const btn=document.querySelector(`.cat-btn[data-cat="${selCat}"]`);
    if(btn)pickCat(selCat,btn,true);
  },20);
  $('modal').classList.add('mon');
}
function closeAdd(){$('modal').classList.remove('mon');}
function setType(t){
  curType=t;
  $('seg-i').className='seg-b'+(t==='Ingreso'?' act-i':'');
  $('seg-e').className='seg-b'+(t==='Gasto'?' act-e':'');
  selCat='';selSub='';
  $('sub-sec').style.display='none';
  renderCatGrid();
}
function renderCatGrid(){
  const grid=$('cat-grid');
  if(curType==='Ingreso'){
    grid.innerHTML=Object.entries({Ingreso:INC_CAT}).map(()=>'').join('');
    grid.innerHTML=`<div class="cat-btn sel" data-cat="Ingreso" style="grid-column:span 3;border-color:${INC_CAT.color};background:${INC_CAT.color}18;color:${INC_CAT.color}" onclick="pickCat('Ingreso',this)"><span class="cat-btn-ico">${INC_CAT.ico}</span>Ingreso</div>`;
    selCat='Ingreso';renderSubGrid('Ingreso');return;
  }
  grid.innerHTML=Object.entries(CATS).map(([cat,c])=>
    `<div class="cat-btn" data-cat="${cat}" onclick="pickCat('${cat}',this)"><span class="cat-btn-ico">${c.ico}</span>${cat}</div>`
  ).join('');
}
function pickCat(cat,btn,keepSub){
  selCat=cat;
  const c=cat==='Ingreso'?INC_CAT:CATS[cat];
  document.querySelectorAll('.cat-btn').forEach(b=>{b.classList.remove('sel');b.style='';});
  btn.classList.add('sel');btn.style=`border-color:${c.color};background:${c.color}18;color:${c.color}`;
  if(!keepSub)selSub='';
  renderSubGrid(cat);
}
function renderSubGrid(cat){
  const sec=$('sub-sec'),grid=$('sub-grid');
  const c=cat==='Ingreso'?INC_CAT:CATS[cat];
  const subs=c&&c.subs?c.subs:[];
  if(!subs.length){sec.style.display='none';return;}
  sec.style.display='block';
  grid.innerHTML=subs.map(s=>
    `<div class="sub-btn${s===selSub?' sel':''}" data-sub="${s}" onclick="pickSub('${s}',this,'${c.color}')" ${s===selSub?`style="border-color:${c.color};background:${c.color}18;color:${c.color}"`:''}>${s}</div>`
  ).join('');
  // auto-select first if none chosen
  if(!selSub){selSub=subs[0];const f=grid.querySelector('.sub-btn');if(f){f.classList.add('sel');f.style=`border-color:${c.color};background:${c.color}18;color:${c.color}`;}}
}
function pickSub(s,btn,color){
  selSub=s;
  document.querySelectorAll('.sub-btn').forEach(b=>{b.classList.remove('sel');b.style='';});
  btn.classList.add('sel');btn.style=`border-color:${color};background:${color}18;color:${color}`;
}
function saveTx(){
  const amt=parseFloat($('amt').value);
  if(!amt||amt<=0){toast('⚠️ Ingresa un monto');return;}
  if(!selCat){toast('⚠️ Selecciona categoría');return;}
  const editId=$('edit-id').value;
  const tx={
    id:editId||('TX-'+Date.now().toString().slice(-9)),
    date:$('tdate').value,type:curType,
    category:selCat,
    subcategory:selSub||selCat,
    amount:amt,notes:$('note').value
  };
  if(editId){txs=txs.map(t=>t.id===editId?tx:t);}
  else{txs.unshift(tx);}
  localStorage.setItem('fp_txs',JSON.stringify(txs));
  syncData('save_tx',tx);
  closeAdd();updateMonth();toast('✅ Guardado');
}
function delTx(){
  const id=$('edit-id').value;if(!id)return;
  if(!confirm('¿Eliminar este movimiento?'))return;
  txs=txs.filter(t=>t.id!==id);
  localStorage.setItem('fp_txs',JSON.stringify(txs));
  syncData('delete_tx',{id});
  closeAdd();updateMonth();toast('🗑 Eliminado');
}

// ═══ GOOGLE SHEETS ═══
async function loadFromSheets(show){
  if(!sheetUrl)return;setSS('sy');
  try{
    const res=await fetch(sheetUrl+'?action=get_all');
    const data=await res.json();
    if(data.transactions&&Array.isArray(data.transactions)){
      txs=data.transactions;localStorage.setItem('fp_txs',JSON.stringify(txs));
    }
    if(data.budgets&&typeof data.budgets==='object'){
      const clean={};Object.keys(data.budgets).forEach(k=>clean[k]=Number(data.budgets[k])||0);
      budgets={...budgets,...clean};localStorage.setItem('fp_budgets',JSON.stringify(budgets));
    }
    setSS('');updateMonth();
    if(show)toast('✅ Sincronizado');
  }catch(e){setSS('er');if(show)toast('⚠️ Sin conexión');}
}
async function postToSheets(body){
  if(!sheetUrl)return;
  await fetch(sheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});
}
async function syncData(action,payload){
  if(!sheetUrl)return;setSS('sy');
  try{await postToSheets({action,data:payload});setSS('');}
  catch(e){
    setSS('er');
    const q=JSON.parse(localStorage.getItem('fp_queue')||'[]');
    q.push({action,payload});localStorage.setItem('fp_queue',JSON.stringify(q));
  }
}
async function retryQueue(){
  const q=JSON.parse(localStorage.getItem('fp_queue')||'[]');if(!q.length)return;
  const rem=[];
  for(const item of q){try{await postToSheets({action:item.action,data:item.payload});}catch(e){rem.push(item);}}
  localStorage.setItem('fp_queue',JSON.stringify(rem));
}
function saveUrl(){
  const u=$('url-inp').value.trim();
  localStorage.setItem('fp_url',u);sheetUrl=u;
  toast('✅ URL guardada');if(u)loadFromSheets(true);
}

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded',()=>{
  $('tdate').valueAsDate=new Date();
  if($('url-inp'))$('url-inp').value=sheetUrl;
  // ALWAYS exit loading after 1.4s
  setTimeout(()=>{
    $('load').classList.add('hide');
    updateMonth();
    if(sheetUrl)setTimeout(()=>{loadFromSheets(false);retryQueue();},400);
  },1400);
  setInterval(()=>{if(sheetUrl&&document.visibilityState==='visible')loadFromSheets(false);},5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&sheetUrl){retryQueue();loadFromSheets(false);}});
});
