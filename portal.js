const SB_URL='https://wbriqlcqfgnpjbxesmdc.supabase.co';
const SB_KEY='sb_publishable_T2GYe2-5dVrXLWZasUzPZQ_DnS7k-27';
function toast(msg,tipo){
  const el=document.createElement('div');
  const cor=tipo==='erro'?'#E24B4A':'#152B55';
  el.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${cor};color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s`;
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),300);},3000);
}

const sb=supabase.createClient(SB_URL,SB_KEY);
const EJ_SERVICE='Fortix-portal';
const EJ_TEMPLATE='template_9cnwr2b';
const EJ_KEY='VVnUaYw4nWoK2VpdJ';
emailjs.init(EJ_KEY);
let cu=null,clkInt=null,sigCtx,sigCvs,drawing=false,curRec=null,pontosData=[];

async function doLogin(){
  const nif=document.getElementById('lNif').value.trim();
  const pwd=document.getElementById('lPwd').value;
  const err=document.getElementById('lErr');
  err.style.display='none';
  if(!nif||!pwd){err.textContent='Preencha NIF e senha.';err.style.display='block';return;}
  // Try active first
  let{data,error}=await sb.from('colaboradores').select('*').eq('nif',nif).eq('senha',pwd).eq('ativo',true).maybeSingle();
  
  // If not active, check if deactivated (show limited access)
  if(!data){
    const{data:inativo}=await sb.from('colaboradores').select('*').eq('nif',nif).eq('senha',pwd).eq('ativo',false).maybeSingle();
    if(inativo){
      err.textContent='O seu acesso ao portal foi encerrado. Apenas pode ver os seus recibos e contrato. Contacte a administração.';
      err.style.display='block';
      err.style.color='#BA7517';
      inativo._acessoLimitado=true;
      cu=inativo;
      iniciarPortalLimitado();
      return;
    }
  }
  
  if(error||!data){err.style.display='block';return;}
  cu=data;localStorage.setItem('fx_user',JSON.stringify(data));iniciarPortal();
}

function iniciarPortalLimitado(){
  // Show only recibos and contrato
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('appBox').classList.remove('hidden');
  document.getElementById('sbName').textContent=cu.nome||'—';
  document.getElementById('sbRole').textContent='Acesso limitado';
  document.getElementById('admNav')?.classList.add('hidden');
  // Hide all menu items except recibos and docs
  ['n-dash','n-ponto','n-ficha','n-meusdocs','n-meusepis'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  showP('recibos');
  // Show warning banner
  const main=document.querySelector('.mn');
  if(main){
    const banner=document.createElement('div');
    banner.style.cssText='background:#FAEEDA;border:1px solid #E8C97A;border-radius:10px;padding:12px 16px;font-size:13px;color:#854F0B;margin-bottom:1rem;display:flex;align-items:center;gap:8px';
    banner.innerHTML='<i class="ti ti-alert-triangle"></i> A sua conta foi desativada. Pode ainda consultar os seus recibos e contrato. Contacte a administração para mais informações.';
    main.insertBefore(banner,main.firstChild);
  }
}

function iniciarPortal(){
  document.getElementById('loginWrap').style.display='none';
  document.getElementById('portalWrap').style.display='block';
  document.getElementById('sbAv').textContent=cu.nome.charAt(0).toUpperCase();
  document.getElementById('sbName').textContent=cu.nome;
  document.getElementById('sbRole').textContent=cu.cargo||'Colaborador';
  document.getElementById('dashTitle').textContent='Bem-vindo, '+cu.nome+'! 👋';
  if(cu.is_admin)document.getElementById('admNav').classList.remove('hidden');
  if(cu.troca_senha)showModal('modalSenha');
  startClock();showP('dash');
  initNotificacoes();
  initSessionTimer();
  initPushNotifications();
  // Add menu toggle button to sidebar
  const sbLogo=document.querySelector('.sb-logo');
  if(sbLogo&&!document.getElementById('sidebarToggleBtn')){
    const btn=document.createElement('button');
    btn.id='sidebarToggleBtn';
    btn.className='hamburger-btn';
    btn.title='Ocultar menu';
    btn.innerHTML='<i class="ti ti-layout-sidebar-left-collapse" style="font-size:18px"></i>';
    btn.onclick=toggleSidebar;
    btn.style.marginLeft='auto';
    sbLogo.style.display='flex';
    sbLogo.style.alignItems='center';
    sbLogo.style.justifyContent='space-between';
    sbLogo.appendChild(btn);
  }loadDashboard();
}

async function trocarSenha(){
  const n1=document.getElementById('ts1').value;
  const n2=document.getElementById('ts2').value;
  const err=document.getElementById('tsErr');
  if(!n1||n1.length<6){err.textContent='Mínimo 6 caracteres.';return;}
  if(n1!==n2){err.textContent='As senhas não coincidem.';return;}
  await sb.from('colaboradores').update({senha:n1,troca_senha:false}).eq('id',cu.id);
  cu.senha=n1;cu.troca_senha=false;localStorage.setItem('fx_user',JSON.stringify(cu));
  closeModal('modalSenha');
}

function doLogout(){
  cu=null;localStorage.removeItem('fx_user');
  document.getElementById('loginWrap').style.display='flex';
  document.getElementById('portalWrap').style.display='none';
  if(clkInt)clearInterval(clkInt);
}

function startClock(){
  function tick(){
    const now=new Date();
    const cl=document.getElementById('clkDisp');
    const cd=document.getElementById('clkDate');
    if(cl)cl.textContent=now.toLocaleTimeString('pt-PT');
    if(cd)cd.textContent=now.toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  tick();if(clkInt)clearInterval(clkInt);clkInt=setInterval(tick,1000);
}

function showP(page){
  ['dash','dashadm','ponto','recibos','docs','ficha','acolab','apontos','arecibos','adocs','assinaturas','relatorio','epis','alertas','meusepis','meusdocs','ausencias','historico','aniversarios','financeiro'].forEach(p=>{
    const el=document.getElementById('p-'+p);if(el)el.classList.add('hidden');
    const n=document.getElementById('n-'+p);if(n)n.classList.remove('active');
  });
  const np=document.getElementById('notifPanel');if(np)np.classList.remove('open');
  const el=document.getElementById('p-'+page);if(el)el.classList.remove('hidden');
  const nav=document.getElementById('n-'+page);if(nav)nav.classList.add('active');
  if(page==='ponto')loadPonto();
  if(page==='recibos')loadRecibos();
  if(page==='docs')loadDocs();
  if(page==='ficha')loadFicha();
  if(page==='acolab')loadAColab();
  if(page==='apontos')loadAPontos();
  if(page==='arecibos')loadARForm();
  if(page==='dash'){loadDashboard();if(cu&&cu.is_admin)loadDashAdm();}
  if(page==='assinaturas')loadAssinaturas();
  if(page==='relatorio')initRelatorio();
  if(page==='epis')initEPIs();
  if(page==='alertas')loadAlertas();
  if(page==='meusepis')loadMeusEPIs();
  if(page==='meusdocs')loadMeusDocs();
  if(page==='ausencias')initAusencias();
  if(page==='dashadm')loadDashAdm();
  if(page==='historico')initHistorico();
  if(page==='aniversarios')loadAniversarios();
  if(page==='financeiro')initFinanceiro();
}

async function loadDashboard(){
  if(!cu)return;
  if(cu.is_admin){
    const{count:tc}=await sb.from('colaboradores').select('*',{count:'exact',head:true}).eq('ativo',true);
    const{count:rp}=await sb.from('recibos').select('*',{count:'exact',head:true}).eq('assinado',false);
    const{count:dc}=await sb.from('documentos').select('*',{count:'exact',head:true});
    const hoje=new Date().toISOString().split('T')[0];
    const{count:pp}=await sb.from('ponto').select('*',{count:'exact',head:true}).eq('data',hoje);
    document.getElementById('stPonto').textContent=tc||0;
    document.getElementById('stRecibos').textContent=rp||0;
    document.getElementById('stDocs').textContent=dc||0;
    document.getElementById('stLabel1').textContent='Colaboradores ativos';
    document.getElementById('stLabel2').textContent='Recibos por assinar';
    document.getElementById('stLabel3').textContent='Documentos publicados';
    document.getElementById('stIcon4').textContent='📋';
    document.getElementById('stLabel4').textContent='Registos hoje';
    document.getElementById('stVal4').textContent=pp||0;
    const{data:pts}=await sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(5);
    if(pts&&pts.length){
      document.getElementById('dashPonto').innerHTML='<table><thead><tr><th>Colaborador</th><th>Data</th><th>Entrada</th><th>Saída</th><th>Total</th></tr></thead><tbody>'+
        pts.map(r=>'<tr><td>'+(r.colaboradores?.nome||'—')+'</td><td>'+r.data+'</td><td>'+(r.entrada||'—')+'</td><td>'+(r.saida||'—')+'</td><td>'+(r.total_horas?'<span class="badge bg2">'+r.total_horas+'</span>':'—')+'</td></tr>').join('')+'</tbody></table>';
    }
  } else {
    const{count:rc}=await sb.from('recibos').select('*',{count:'exact',head:true}).eq('colaborador_id',cu.id);
    const{count:dc}=await sb.from('documentos').select('*',{count:'exact',head:true});
    const{data:pts}=await sb.from('ponto').select('*').eq('colaborador_id',cu.id).order('data',{ascending:false}).limit(5);
    document.getElementById('stRecibos').textContent=rc||0;
    document.getElementById('stDocs').textContent=dc||0;
    if(pts&&pts.length){document.getElementById('stPonto').textContent=pts.length;document.getElementById('dashPonto').innerHTML=renderPontoTable(pts);}
  }
}

function timeToMin(t){if(!t)return 0;const p=t.split(':');return parseInt(p[0])*60+parseInt(p[1]);}

async function guardarPontoManual(){
  const data=document.getElementById('mData').value;
  const entrada=document.getElementById('mEntrada').value;
  const inicio_pausa=document.getElementById('mInicioPausa').value;
  const fim_pausa=document.getElementById('mFimPausa').value;
  const saida=document.getElementById('mSaida').value;
  const msg=document.getElementById('mMsg');
  if(!data||!entrada){msg.style.color='var(--red)';msg.textContent='Data e entrada são obrigatórias.';setTimeout(()=>{msg.textContent='';},3000);return;}
  let total_horas=null;
  if(entrada&&saida){
    const pm=inicio_pausa&&fim_pausa?timeToMin(fim_pausa)-timeToMin(inicio_pausa):0;
    const tot=timeToMin(saida)-timeToMin(entrada)-pm;
    if(tot>0)total_horas=Math.floor(tot/60)+'h'+String(tot%60).padStart(2,'0');
  }
  const{data:ex}=await sb.from('ponto').select('id').eq('colaborador_id',cu.id).eq('data',data).maybeSingle();
  if(ex){
    await sb.from('ponto').update({entrada:entrada||null,inicio_pausa:inicio_pausa||null,fim_pausa:fim_pausa||null,saida:saida||null,total_horas}).eq('id',ex.id);
  } else {
    await sb.from('ponto').insert({colaborador_id:cu.id,data,entrada:entrada||null,inicio_pausa:inicio_pausa||null,fim_pausa:fim_pausa||null,saida:saida||null,total_horas});
  }
  if(total_horas)document.getElementById('totHoje').textContent=total_horas;
  msg.style.color='var(--green)';msg.textContent='✅ Registo guardado!';
  setTimeout(()=>{msg.textContent='';},3000);
  loadPonto();
}

async function regP(tipo){
  const now=new Date();
  const data=now.toISOString().split('T')[0];
  const hora=now.toTimeString().substring(0,5);
  const msg=document.getElementById('pMsg');
  const{data:ex}=await sb.from('ponto').select('*').eq('colaborador_id',cu.id).eq('data',data).maybeSingle();
  let txt='';
  if(tipo==='entrada'&&!ex){await sb.from('ponto').insert({colaborador_id:cu.id,data,entrada:hora});txt='✅ Entrada às '+hora;}
  else if(tipo==='inicio_pausa'&&ex&&!ex.inicio_pausa){await sb.from('ponto').update({inicio_pausa:hora}).eq('id',ex.id);txt='⏸ Pausa iniciada às '+hora;}
  else if(tipo==='fim_pausa'&&ex&&ex.inicio_pausa&&!ex.fim_pausa){await sb.from('ponto').update({fim_pausa:hora}).eq('id',ex.id);txt='▶ Pausa terminada às '+hora;}
  else if(tipo==='saida'&&ex&&!ex.saida){
    const pm=ex.inicio_pausa&&ex.fim_pausa?timeToMin(ex.fim_pausa)-timeToMin(ex.inicio_pausa):0;
    const tot=timeToMin(hora)-timeToMin(ex.entrada)-pm;
    const th=Math.floor(tot/60)+'h'+String(tot%60).padStart(2,'0');
    await sb.from('ponto').update({saida:hora,total_horas:th}).eq('id',ex.id);
    document.getElementById('totHoje').textContent=th;txt='✅ Saída às '+hora+' · Total: '+th;
  }else{txt='⚠️ Verifique a ordem dos registos';}
  msg.textContent=txt;setTimeout(()=>{msg.textContent='';},4000);loadPonto();
}

async function loadPonto(){
  const today=new Date().toISOString().split('T')[0];
  const mData=document.getElementById('mData');
  if(mData&&!mData.value)mData.value=today;
  const{data:hoje}=await sb.from('ponto').select('*').eq('colaborador_id',cu.id).eq('data',today).maybeSingle();
  if(hoje){
    if(document.getElementById('mEntrada'))document.getElementById('mEntrada').value=hoje.entrada||'';
    if(document.getElementById('mInicioPausa'))document.getElementById('mInicioPausa').value=hoje.inicio_pausa||'';
    if(document.getElementById('mFimPausa'))document.getElementById('mFimPausa').value=hoje.fim_pausa||'';
    if(document.getElementById('mSaida'))document.getElementById('mSaida').value=hoje.saida||'';
    if(hoje.total_horas)document.getElementById('totHoje').textContent=hoje.total_horas;
  }
  const{data}=await sb.from('ponto').select('*').eq('colaborador_id',cu.id).order('data',{ascending:false}).limit(20);
  document.getElementById('pontoHist').innerHTML=data&&data.length?renderPontoTable(data):'<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos</p>';
  const mes=new Date().getMonth()+1;
  const ano=new Date().getFullYear();
  const mesPad=String(mes).padStart(2,'0');
  const mesData=data?data.filter(r=>r.data&&r.data.startsWith(ano+'-'+mesPad)):[];
  document.getElementById('diasMes').textContent=mesData.length;
  let totalMin=0;
  mesData.forEach(r=>{
    if(r.total_horas){
      const p=r.total_horas.split('h');
      totalMin+=parseInt(p[0]||0)*60+parseInt(p[1]||0);
    }
  });
  const th=Math.floor(totalMin/60);
  const tm=totalMin%60;
  document.getElementById('horasMes').textContent=totalMin>0?th+'h'+String(tm).padStart(2,'0'):'—';
}

function renderPontoTable(rows){
  const periodo=getPeriodoAtual();
  // Summary stats
  let totalNormais=0,totalExtra25=0,totalExtra375=0,totalExtra50=0,totalExtra100=0,totalFalta=0;
  rows.forEach(r=>{
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const calc=calcHorasExtras(h,tipo);
    totalNormais+=calc.normais;totalExtra25+=calc.extra25;totalExtra375+=calc.extra375;
    totalExtra50+=calc.extra50;totalExtra100+=calc.extra100;totalFalta+=calc.falta;
  });
  const stats=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:1rem">
    <div style="background:var(--blu);border-radius:8px;padding:10px"><div style="font-size:11px;color:var(--text2)">Normais</div><div style="font-size:18px;font-weight:600;color:var(--blue)">${totalNormais.toFixed(1)}h</div></div>
    <div style="background:#EAF3DE;border-radius:8px;padding:10px"><div style="font-size:11px;color:#3B6D11">Extra 25%</div><div style="font-size:18px;font-weight:600;color:#3B6D11">${totalExtra25.toFixed(1)}h</div></div>
    <div style="background:#EAF3DE;border-radius:8px;padding:10px"><div style="font-size:11px;color:#3B6D11">Extra 37,5%</div><div style="font-size:18px;font-weight:600;color:#3B6D11">${totalExtra375.toFixed(1)}h</div></div>
    <div style="background:#FAEEDA;border-radius:8px;padding:10px"><div style="font-size:11px;color:#854F0B">Sáb 50%</div><div style="font-size:18px;font-weight:600;color:#BA7517">${totalExtra50.toFixed(1)}h</div></div>
    <div style="background:#FAEEDA;border-radius:8px;padding:10px"><div style="font-size:11px;color:#854F0B">Dom/Fer 100%</div><div style="font-size:18px;font-weight:600;color:#BA7517">${totalExtra100.toFixed(1)}h</div></div>
    <div style="background:#FCEBEB;border-radius:8px;padding:10px"><div style="font-size:11px;color:#A32D2D">Em falta</div><div style="font-size:18px;font-weight:600;color:#E24B4A">${totalFalta.toFixed(1)}h</div></div>
  </div>
  <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Período: ${periodo.label}</div>`;

  const tableRows=rows.map(r=>{
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const diaSem=getDiaSemana(r.data);
    const calc=calcHorasExtras(h,tipo);
    const dataFmt=r.data.split('-').reverse().join('/');
    
    let totalBadge='—';
    let rowBg='';
    if(h>0){
      if(tipo==='sabado'){
        totalBadge=`<span style="background:#FAEEDA;color:#854F0B;padding:3px 10px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
        rowBg='background:#FFFBF0';
      } else if(tipo==='domingo'||tipo==='feriado'){
        totalBadge=`<span style="background:#FCEBEB;color:#A32D2D;padding:3px 10px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
        rowBg='background:#FFF5F5';
      } else if(h<8){
        totalBadge=`<span style="background:#FCEBEB;color:#A32D2D;padding:3px 10px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
        rowBg='background:#FFF8F8';
      } else {
        totalBadge=`<span style="background:#EAF3DE;color:#3B6D11;padding:3px 10px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
      }
    }

    let tipoLabel='';
    if(tipo==='sabado') tipoLabel=`<span style="background:#FAEEDA;color:#854F0B;padding:2px 8px;border-radius:6px;font-size:11px">Sáb 50%</span>`;
    else if(tipo==='domingo') tipoLabel=`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:6px;font-size:11px">Dom 100%</span>`;
    else if(tipo==='feriado') tipoLabel=`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:6px;font-size:11px">Fer 100%</span>`;
    else if(calc.falta>0) tipoLabel=`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 8px;border-radius:6px;font-size:11px">-${calc.falta.toFixed(1)}h falta</span>`;
    else if(calc.extra25>0||calc.extra375>0){
      let parts=[];
      if(calc.extra25>0) parts.push(`+${calc.extra25.toFixed(1)}h 25%`);
      if(calc.extra375>0) parts.push(`+${calc.extra375.toFixed(1)}h 37,5%`);
      tipoLabel=parts.map(p=>`<span style="background:#EAF3DE;color:#3B6D11;padding:2px 8px;border-radius:6px;font-size:11px">${p}</span>`).join(' ');
    } else if(h>0) tipoLabel=`<span style="background:var(--blu);color:var(--blue);padding:2px 8px;border-radius:6px;font-size:11px">Normal</span>`;

    const diasemColor=tipo==='sabado'?'color:#BA7517;font-weight:500':tipo==='domingo'||tipo==='feriado'?'color:#E24B4A;font-weight:500':'color:var(--text2)';
    const pausa=r.inicio_pausa&&r.fim_pausa?r.inicio_pausa+'–'+r.fim_pausa:'—';

    return `<tr style="${rowBg};border-top:0.5px solid var(--border)">
      <td style="padding:9px 12px">${dataFmt}</td>
      <td style="padding:9px 12px;${diasemColor}">${diaSem}</td>
      <td style="padding:9px 12px;text-align:center">${r.entrada||'—'}</td>
      <td style="padding:9px 12px;text-align:center;color:var(--text2);font-size:12px">${pausa}</td>
      <td style="padding:9px 12px;text-align:center">${r.saida||'—'}</td>
      <td style="padding:9px 12px;text-align:center">${totalBadge}</td>
      <td style="padding:9px 12px">${tipoLabel}</td>
    </tr>`;
  }).join('');

  return stats+'<table><thead><tr><th>Data</th><th>Dia</th><th>Entrada</th><th>Pausa</th><th>Saída</th><th>Total</th><th>Tipo</th></tr></thead><tbody>'+tableRows+'</tbody></table>'+
    '<div style="background:var(--blu);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;color:var(--text2)">Normal = 8h/dia · Extra semana: 1ª hora 25%, demais 37,5% · Sábado = 50% · Domingo/Feriado = 100%</div>';
}

async function loadRecibos(){
  const{data}=await sb.from('recibos').select('*').eq('colaborador_id',cu.id).order('ano',{ascending:false});
  const el=document.getElementById('recibosLista');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem recibos</p>';return;}
  el.innerHTML=data.map(r=>'<div class="ri"><div><div style="font-size:14px;font-weight:600">'+r.mes+' '+r.ano+'</div><div style="margin-top:4px">'+(r.assinado?'<span class="badge bg2">✓ Assinado</span>':'<span class="badge br2">Não assinado</span>')+'</div></div><div style="display:flex;gap:8px">'+(r.ficheiro_url?'<a href="'+r.ficheiro_url+'" target="_blank" class="bs" style="text-decoration:none;font-size:13px;padding:6px 12px;display:inline-flex;align-items:center;gap:5px"><i class="ti ti-download"></i> Abrir</a>':'')+(!r.assinado?'<button class="bs bb" onclick="abrirRec(\''+r.id+'\',\''+r.mes+' '+r.ano+'\',\''+r.ficheiro_url+'\')"><i class="ti ti-pencil"></i> Ver e assinar</button>':'')+'</div></div>').join('');
}

function showRecLista(){document.getElementById('recLista').classList.remove('hidden');document.getElementById('recViewer').classList.add('hidden');}

function abrirRec(id,titulo,url){
  curRec=id;
  document.getElementById('recLista').classList.add('hidden');
  document.getElementById('recViewer').classList.remove('hidden');
  document.getElementById('recViewTitle').textContent=titulo;
  document.getElementById('recBtnConf').classList.remove('hidden');
  document.getElementById('recSigArea').classList.add('hidden');
  document.getElementById('recSigOk').classList.add('hidden');
  document.getElementById('rs1').className='sd sact';
  document.getElementById('rs2').className='sd spend';
  document.getElementById('rs3').className='sd spend';
  document.getElementById('recDocContent').innerHTML='<div style="text-align:center;padding:1rem"><div style="font-size:16px;font-weight:700;color:var(--blue);margin-bottom:4px">FORTIX SOLUTIONS, LDA</div><div style="font-size:12px;color:var(--text2);margin-bottom:1rem">'+titulo+'</div>'+(url&&url!=='null'?'<a href="'+url+'" target="_blank" class="bs bb" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-external-link"></i> Abrir documento completo</a>':'<p style="color:var(--text2);font-size:13px">Sem link disponível</p>')+'</div>';
}

function confirmarLeitura(){
  document.getElementById('recBtnConf').classList.add('hidden');
  document.getElementById('recSigArea').classList.remove('hidden');
  document.getElementById('rs1').className='sd sdone';document.getElementById('rs2').className='sd sact';
  sigCvs=document.getElementById('sigCanvas');sigCtx=sigCvs.getContext('2d');
  sigCvs.width=sigCvs.offsetWidth;sigCtx.lineWidth=2;sigCtx.lineCap='round';sigCtx.strokeStyle='#1a1a18';
  sigCvs.onmousedown=e=>{drawing=true;sigCtx.beginPath();sigCtx.moveTo(e.offsetX,e.offsetY);};
  sigCvs.onmousemove=e=>{if(drawing){sigCtx.lineTo(e.offsetX,e.offsetY);sigCtx.stroke();}};
  sigCvs.onmouseup=()=>drawing=false;sigCvs.onmouseleave=()=>drawing=false;
  sigCvs.ontouchstart=e=>{e.preventDefault();drawing=true;const r=sigCvs.getBoundingClientRect();const t=e.touches[0];sigCtx.beginPath();sigCtx.moveTo(t.clientX-r.left,t.clientY-r.top);};
  sigCvs.ontouchmove=e=>{e.preventDefault();if(drawing){const r=sigCvs.getBoundingClientRect();const t=e.touches[0];sigCtx.lineTo(t.clientX-r.left,t.clientY-r.top);sigCtx.stroke();}};
  sigCvs.ontouchend=()=>drawing=false;
}

function clrSig(){if(sigCtx)sigCtx.clearRect(0,0,sigCvs.width,sigCvs.height);}

async function saveSig(){
  const img=sigCvs.toDataURL();const now=new Date();
  await sb.from('assinaturas_recibos').insert({recibo_id:curRec,colaborador_id:cu.id,assinatura_img:img});
  await sb.from('recibos').update({assinado:true}).eq('id',curRec);
  document.getElementById('recSigArea').classList.add('hidden');
  document.getElementById('recSigOk').classList.remove('hidden');
  document.getElementById('recSigData').textContent='Assinado em '+now.toLocaleDateString('pt-PT')+' às '+now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('rs2').className='sd sdone';document.getElementById('rs3').className='sd sdone';
}

async function loadDocs(){
  const{data:allDocs}=await sb.from('documentos').select('*').order('criado_em',{ascending:false});
  const data=(allDocs||[]).filter(d=>{
    if(!d.visibilidade||d.visibilidade==='todos')return true;
    if(d.visibilidade==='especifico'&&d.colaboradores_ids){
      return d.colaboradores_ids.split(',').includes(cu.id);
    }
    return false;
  });
  const el=document.getElementById('docsGrid');
  if(!data||!data.length){
    el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem;grid-column:1/-1">Sem documentos</p>';
    return;
  }
  let html='';
  data.forEach(function(d){
    html+='<div style="border:1px solid var(--border);border-radius:10px;padding:1rem">';
    html+='<i class="ti ti-file-description" style="font-size:28px;color:var(--blue);display:block;margin-bottom:8px"></i>';
    html+='<div style="font-size:14px;font-weight:600;margin-bottom:4px">'+d.titulo+'</div>';
    html+='<div style="font-size:12px;color:var(--text2);margin-bottom:10px">'+(d.descricao||'')+'</div>';
    html+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    if(d.ficheiro_url){
      html+='<a href="'+d.ficheiro_url+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;text-decoration:none;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:500"><i class="ti ti-external-link"></i> Abrir</a>';
    }
    if(cu&&cu.is_admin){
      html+='<button data-id="'+d.id+'" class="btn-del-doc" style="display:inline-flex;align-items:center;gap:5px;background:var(--redl);color:var(--red);border:1px solid #F09595;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer"><i class="ti ti-trash"></i> Excluir</button>';
    }
    html+='</div></div>';
  });
  el.innerHTML=html;
  el.querySelectorAll('.btn-del-doc').forEach(function(btn){
    btn.addEventListener('click',function(){excluirDoc(btn.dataset.id);});
  });
}

async function loadFicha(){
  const u=cu;
  const{data:ficha}=await sb.from('fichas').select('*').eq('colaborador_id',u.id).maybeSingle();
  let html='';

  html+='<div style="margin-bottom:12px">';
  html+='<div class="fsec"><i class="ti ti-briefcase"></i> Dados profissionais</div>';
  html+='<div class="fr"><span class="fl">Nome</span><span>'+u.nome+'</span></div>';
  html+='<div class="fr"><span class="fl">NIF</span><span>'+u.nif+'</span></div>';
  html+='<div class="fr"><span class="fl">Email</span><span>'+(u.email||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Cargo</span><span>'+(u.cargo||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Departamento</span><span>'+(u.departamento||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Data admissão</span><span>'+(u.data_admissao||'—')+'</span></div>';
  html+='</div>';

  if(ficha){
    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-user"></i> Identificação</div>';
    html+='<div class="fr"><span class="fl">NISS</span><span>'+(ficha.niss||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Documento</span><span>'+(ficha.tipo_doc||'—')+' — '+(ficha.num_doc||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Validade doc.</span><span>'+(ficha.validade_doc||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Nacionalidade</span><span>'+(ficha.nacionalidade||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Data nascimento</span><span>'+(ficha.data_nasc||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Género</span><span>'+(ficha.genero||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-map-pin"></i> Morada</div>';
    html+='<div class="fr"><span class="fl">Morada</span><span>'+(ficha.morada||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Código postal</span><span>'+(ficha.cod_postal||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Localidade</span><span>'+(ficha.localidade||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Telemóvel</span><span>'+(ficha.telemovel||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Contacto urgência</span><span>'+(ficha.contacto_emerg||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-building-bank"></i> Dados bancários</div>';
    html+='<div class="fr"><span class="fl">IBAN</span><span>'+(ficha.iban||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Banco</span><span>'+(ficha.banco||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">IRS</span><span>'+(ficha.irs||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-heart"></i> Família</div>';
    html+='<div class="fr"><span class="fl">Estado civil</span><span>'+(ficha.estado_civil||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Dependentes</span><span>'+(ficha.tem_dep==='sim'?'Sim — '+(ficha.num_dep||'')+'':'Não')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-shirt"></i> Fardamento</div>';
    html+='<div class="fr"><span class="fl">Nº bota</span><span>'+(ficha.num_bota||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Tamanho fato</span><span>'+(ficha.num_fato||'—')+'</span></div>';
    html+='</div>';
  } else {
    html+='<div style="background:var(--ambl);border:1px solid #E8C97A;border-radius:8px;padding:12px 16px;font-size:13px;color:var(--amber);margin-top:8px"><i class="ti ti-info-circle"></i> Ficha pessoal ainda não preenchida. Clique em <strong>Preencher ficha</strong> para começar.</div>';
  }

  html+='<div style="background:var(--blu);border:1px solid #B5D4F4;border-radius:8px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-top:8px">';
  html+='<div><div style="font-size:14px;font-weight:600;color:var(--blue)">'+( ficha ? 'Atualizar dados pessoais' : 'Preencher ficha de dados' )+'</div><div style="font-size:12px;color:var(--text2)">'+( ficha ? 'Submeta alterações à administração' : 'Preencha os seus dados pessoais' )+'</div></div>';
  html+='<button onclick="abrirFicha()" class="bs bb" style="display:inline-flex;align-items:center;gap:6px"><i class="ti ti-edit"></i> '+( ficha ? 'Atualizar ficha' : 'Preencher ficha' )+'</button>';
  html+='</div>';

  document.getElementById('fichaContent').innerHTML=html;
}

function abrirFicha(){
  var nif = cu ? cu.nif : '';
  window.open('https://fortix-solutions.github.io/Ficha-Colaborador-Fortix/?nif=' + nif, '_blank');
}

async function loadAColab(){
  const{data}=await sb.from('colaboradores').select('*').order('nome');
  const el=document.getElementById('aColabLista');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem colaboradores</p>';return;}
  
  const pendentes=data.filter(c=>c.ficha_pendente);
  let html='';
  
  if(pendentes.length>0){
    html+='<div style="background:var(--ambl);border:1px solid #E8C97A;border-radius:8px;padding:10px 14px;margin-bottom:1rem;font-size:13px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> <strong>'+pendentes.length+' colaborador(es)</strong> com ficha pendente de preenchimento ADM.</div>';
  }
  
  const ativos = data.filter(c=>c.ativo).length;
  const inativos = data.filter(c=>!c.ativo).length;
  html+=`<div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px">
    <span style="color:var(--text2)"><i class="ti ti-users"></i> Total: <strong style="color:var(--text)">${data.length}</strong></span>
    <span style="color:#3B6D11"><i class="ti ti-circle-check"></i> Ativos: <strong>${ativos}</strong></span>
    ${inativos>0?`<span style="color:#E24B4A"><i class="ti ti-circle-x"></i> Inativos: <strong>${inativos}</strong></span>`:''}
  </div>`;

  html+='<table><thead><tr><th style="width:40px;text-align:center">#</th><th>Nome</th><th>NIF</th><th>Cargo</th><th>Ficha</th><th>1.º login</th><th>Estado</th><th>Ação</th></tr></thead><tbody>';
  
  data.forEach(function(c,idx){
    const btnEditar='<button data-idx="'+idx+'" class="btn-edit-colab" style="font-size:11px;padding:3px 8px;margin-right:3px;background:var(--amber);color:#fff;border:none;border-radius:6px;cursor:pointer">Editar</button>';
    const btnVer='<button data-idx="'+idx+'" class="btn-ver-colab" style="font-size:11px;padding:3px 8px;margin-right:3px;background:var(--blue);color:#fff;border:none;border-radius:6px;cursor:pointer">Ver</button>';
    const btnDesativar='<button data-idx="'+idx+'" class="btn-toggle-colab" data-ativo="'+c.ativo+'" style="font-size:11px;padding:3px 8px;margin-right:3px;color:var(--red);border:1px solid #F09595;border-radius:6px;cursor:pointer;background:var(--redl)">'+(c.ativo?'Desativar':'Reativar')+'</button>';
    const btnExcluir='<button data-idx="'+idx+'" class="btn-del-colab" style="font-size:11px;padding:3px 8px;color:#fff;background:var(--red);border:none;border-radius:6px;cursor:pointer">Excluir</button>';
    const btnCompletarFicha=c.ficha_pendente?'<button data-idx="'+idx+'" class="btn-completar-ficha" style="font-size:11px;padding:3px 8px;margin-right:3px;background:var(--amber);color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="ti ti-pencil"></i> Completar ficha</button>':'';
    
    const fichaBadge=c.ficha_pendente?
      '<span class="badge ba2">⚠️ Pendente ADM</span>':
      '<span class="badge bg2">✓ OK</span>';
    
    html+='<tr>';
    html+='<td style="text-align:center;color:var(--text2);font-size:12px">'+(idx+1)+'</td>';
    html+='<td><strong>'+c.nome+'</strong></td>';
    html+='<td>'+c.nif+'</td>';
    html+='<td>'+(c.cargo||'—')+'</td>';
    html+='<td>'+fichaBadge+'</td>';
    html+='<td>'+(c.troca_senha?'<span class="badge br2">Pendente</span>':'<span class="badge bg2">✓ Trocada</span>')+'</td>';
    html+='<td>'+(c.ativo?'<span class="badge bg2">Ativo</span>':'<span class="badge br2">Inativo</span>')+'</td>';
    html+='<td style="white-space:nowrap">'+btnCompletarFicha+btnVer+(c.nif!=='000000000'?btnEditar+btnDesativar+btnExcluir:'')+'</td>';
    html+='</tr>';
  });
  
  html+='</tbody></table>';

  el.innerHTML=html;
  
  // Store data for buttons
  window._colabData=data;
  
  el.querySelectorAll('.btn-ver-colab').forEach(function(btn){
    btn.addEventListener('click',function(){verColab(window._colabData[btn.dataset.idx].id);});
  });
  el.querySelectorAll('.btn-edit-colab').forEach(function(btn){
    btn.addEventListener('click',function(){editarColab(window._colabData[btn.dataset.idx].id);});
  });
  el.querySelectorAll('.btn-toggle-colab').forEach(function(btn){
    btn.addEventListener('click',function(){toggleAtivo(window._colabData[btn.dataset.idx].id,btn.dataset.ativo==='false');});
  });
  el.querySelectorAll('.btn-del-colab').forEach(function(btn){
    btn.addEventListener('click',function(){excluirColab(window._colabData[btn.dataset.idx].id,window._colabData[btn.dataset.idx].nome);});
  });
  el.querySelectorAll('.btn-completar-ficha').forEach(function(btn){
    btn.addEventListener('click',function(){
      const colab=window._colabData[btn.dataset.idx];
      window.open('https://fortix-solutions.github.io/Ficha-Colaborador-Fortix/?adm=1&nif='+colab.nif,'_blank');
    });
  });
}

function editarDadosAdm(id){
  // Find colab data
  const data = window._colabData ? window._colabData.find(c=>c.id===id) : null;
  const d = data || {};
  
  const modal = document.createElement('div');
  modal.id = 'modalEditAdm';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:1.5rem;max-width:500px;width:100%;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div style="font-size:16px;font-weight:600;color:#1a1a18"><i class="ti ti-pencil"></i> Editar dados profissionais</div>
        <button onclick="document.getElementById('modalEditAdm').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#888">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Cargo</label>
          <input id="ea_cargo" value="${d.cargo||''}" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Departamento</label>
          <select id="ea_dep" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            ${['Administração','Comercial','Financeiro','Logística','Operações','Recursos Humanos','Tecnologia','Outro'].map(o=>`<option value="${o}" ${d.departamento===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Data admissão</label>
          <input id="ea_admissao" type="date" value="${d.data_admissao||''}" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Tipo contrato</label>
          <select id="ea_contrato" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            ${['','Sem termo (efetivo)','A termo certo','A termo incerto','Prestação de serviços','Estágio profissional'].map(o=>`<option value="${o}" ${d.tipo_contrato===o?'selected':''}>${o||'Selecionar...'}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Salário base (€)</label>
          <input id="ea_salario" type="number" value="${d.salario_base||''}" placeholder="Ex: 1200" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Preço H.H (€/hora)</label>
          <input id="ea_hh" type="number" step="0.01" value="${d.preco_hh||''}" placeholder="Ex: 18.50" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Horário</label>
          <select id="ea_horario" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            ${['','08h–17h','09h–18h','Turnos rotativos','Part-time','Flexível'].map(o=>`<option value="${o}" ${d.horario===o?'selected':''}>${o||'Selecionar...'}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">N.º colaborador</label>
          <input id="ea_num" value="${d.num_colaborador||''}" placeholder="Ex: COL-0042" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Notas internas</label>
          <textarea id="ea_notas" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px;resize:vertical;min-height:60px">${d.notas_adm||''}</textarea>
        </div>
      </div>
      <div id="ea_erro" style="display:none;background:#FCEBEB;border:1px solid #F09595;border-radius:8px;padding:10px;font-size:13px;color:#A32D2D;margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:1rem;justify-content:flex-end">
        <button onclick="document.getElementById('modalEditAdm').remove()" style="padding:9px 20px;border-radius:8px;border:1px solid #d4d2ca;background:#fff;cursor:pointer;font-size:13px">Cancelar</button>
        <button onclick="guardarEditAdm('${id}')" style="padding:9px 20px;border-radius:8px;border:none;background:#152B55;color:#fff;cursor:pointer;font-size:13px;font-weight:500">Guardar alterações</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function guardarEditAdm(id){
  const payload = {
    cargo:          document.getElementById('ea_cargo').value.trim(),
    departamento:   document.getElementById('ea_dep').value,
    data_admissao:  document.getElementById('ea_admissao').value,
    tipo_contrato:  document.getElementById('ea_contrato').value,
    salario_base:   document.getElementById('ea_salario').value || null,
    preco_hh:       document.getElementById('ea_hh').value || null,
    horario:        document.getElementById('ea_horario').value,
    num_colaborador:document.getElementById('ea_num').value.trim(),
    notas_adm:      document.getElementById('ea_notas').value.trim()
  };
  // Get current values BEFORE update
  const{data:antes}=await sb.from('colaboradores').select('*').eq('id',id).maybeSingle();
  const{error}=await sb.from('colaboradores').update(payload).eq('id',id);
  if(error){
    document.getElementById('ea_erro').style.display='block';
    document.getElementById('ea_erro').textContent='Erro ao guardar: '+error.message;
    return;
  }
  // Register in historico
  const campoLabels={
    cargo:'Cargo',departamento:'Departamento',data_admissao:'Data admissão',
    tipo_contrato:'Tipo contrato',salario_base:'Salário base',preco_hh:'Preço H.H',
    horario:'Horário',num_colaborador:'N.º colaborador',notas_adm:'Notas internas'
  };
  const campos=Object.keys(payload)
    .filter(k=>payload[k]!==null&&payload[k]!=='')
    .map(k=>{
      const label=campoLabels[k]||k;
      const valorAntes=antes?antes[k]||'—':'—';
      const valorDepois=payload[k]||'—';
      return label+': '+valorAntes+' → '+valorDepois;
    });
  await registarHistorico(id,'profissional','Dados profissionais editados',campos);
  document.getElementById('modalEditAdm').remove();
  verColab(id);
  toast('Dados profissionais atualizados!');
}

async function criarColab(){
  const nome=document.getElementById('nNome').value.trim();
  const nif=document.getElementById('nNif').value.trim();
  const email=document.getElementById('nEmail').value.trim();
  const senha=document.getElementById('nSenha').value;
  const cargo=document.getElementById('nCargo').value.trim();
  const depto=document.getElementById('nDepto').value.trim();
  const isAdm=document.getElementById('nIsAdm').checked;
  const msg=document.getElementById('nColabMsg');
  if(!nome||!nif||!senha){msg.textContent='Nome, NIF e senha são obrigatórios.';return;}
  const{error}=await sb.from('colaboradores').insert({nome,nif,email,senha,cargo,departamento:depto,is_admin:isAdm});
  if(error){msg.textContent='Erro: '+(error.message||'NIF já existe');return;}
  if(email){
    emailjs.send(EJ_SERVICE,EJ_TEMPLATE,{nome,nif,senha,email_destino:email})
      .then(()=>console.log('Email enviado'))
      .catch(e=>console.log('Erro email:',e));
  }
  closeModal('modalColab');['nNome','nNif','nEmail','nSenha','nCargo','nDepto'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('nIsAdm').checked=false;
  msg.style.color='var(--green)';msg.textContent=email?'✅ Colaborador criado e email enviado!':'✅ Colaborador criado!';
  setTimeout(()=>{msg.textContent='';},4000);
  loadAColab();
}

async function loadAPontos(){
  const colabId=document.getElementById('pontosFilterColab')?.value||'';
  const dataInicio=document.getElementById('pontosDataInicio')?.value||'';
  const dataFim=document.getElementById('pontosDataFim')?.value||'';

  // Populate filter if empty
  const sel=document.getElementById('pontosFilterColab');
  if(sel&&sel.options.length<=1){
    const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
    if(colabs)colabs.forEach(c=>{
      const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;sel.appendChild(o);
    });
  }

  let query=sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(500);
  if(colabId)query=query.eq('colaborador_id',colabId);
  if(dataInicio)query=query.gte('data',dataInicio);
  if(dataFim)query=query.lte('data',dataFim);
  const{data}=await query;
  const el=document.getElementById('aPontosLista');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos</p>';return;}
  pontosData=data;

  let rows='';
  data.forEach(function(r,i){
    const nome=r.colaboradores?r.colaboradores.nome:'—';
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const diaSem=getDiaSemana(r.data);
    const calc=calcHorasExtras(h,tipo);
    const dataFmt=r.data?r.data.split('-').reverse().join('/'):'—';
    const pausa=r.inicio_pausa&&r.fim_pausa?r.inicio_pausa+'–'+r.fim_pausa:'—';

    // Total badge color
    let totalBadge='—';
    if(h>0){
      if(tipo==='sabado') totalBadge=`<span style="background:#FAEEDA;color:#854F0B;padding:3px 8px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
      else if(tipo==='domingo'||tipo==='feriado') totalBadge=`<span style="background:#FCEBEB;color:#A32D2D;padding:3px 8px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
      else if(h<8) totalBadge=`<span style="background:#FCEBEB;color:#A32D2D;padding:3px 8px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
      else totalBadge=`<span style="background:#EAF3DE;color:#3B6D11;padding:3px 8px;border-radius:20px;font-weight:500">${h.toFixed(1)}h</span>`;
    }

    // Tipo label
    let tipoLabel='';
    if(tipo==='sabado') tipoLabel='<span style="background:#FAEEDA;color:#854F0B;padding:2px 6px;border-radius:6px;font-size:11px">Sáb 50%</span>';
    else if(tipo==='domingo') tipoLabel='<span style="background:#FCEBEB;color:#A32D2D;padding:2px 6px;border-radius:6px;font-size:11px">Dom 100%</span>';
    else if(tipo==='feriado') tipoLabel='<span style="background:#FCEBEB;color:#A32D2D;padding:2px 6px;border-radius:6px;font-size:11px">Fer 100%</span>';
    else if(calc.falta>0) tipoLabel=`<span style="background:#FCEBEB;color:#A32D2D;padding:2px 6px;border-radius:6px;font-size:11px">-${calc.falta.toFixed(1)}h falta</span>`;
    else{
      let parts=[];
      if(calc.extra25>0) parts.push(`+${calc.extra25.toFixed(1)}h 25%`);
      if(calc.extra375>0) parts.push(`+${calc.extra375.toFixed(1)}h 37,5%`);
      if(parts.length) tipoLabel=parts.map(p=>`<span style="background:#EAF3DE;color:#3B6D11;padding:2px 6px;border-radius:6px;font-size:11px">${p}</span>`).join(' ');
      else if(h>0) tipoLabel='<span style="background:var(--blu);color:var(--blue);padding:2px 6px;border-radius:6px;font-size:11px">Normal</span>';
    }

    const diasemColor=tipo==='sabado'?'color:#BA7517;font-weight:500':tipo==='domingo'||tipo==='feriado'?'color:#E24B4A;font-weight:500':'color:var(--text2)';
    const rowBg=tipo==='sabado'?'background:#FFFBF0':tipo==='domingo'||tipo==='feriado'?'background:#FFF5F5':h>0&&h<8?'background:#FFF8F8':'';

    rows+=`<tr data-id="${r.id}" data-idx="${i}" style="${rowBg};border-top:0.5px solid var(--border)">
      <td style="padding:8px 10px;text-align:center">
        <input type="checkbox" class="ponto-chk" data-id="${r.id}" onchange="updatePontoBarra()" style="width:15px;height:15px;cursor:pointer" />
      </td>
      <td style="padding:8px 10px;font-weight:500">${nome}</td>
      <td style="padding:8px 10px">${dataFmt}</td>
      <td style="padding:8px 10px;text-align:center;${diasemColor}">${diaSem}</td>
      <td style="padding:8px 10px;text-align:center">${r.entrada||'—'}</td>
      <td style="padding:8px 10px;text-align:center;color:var(--text2);font-size:12px">${pausa}</td>
      <td style="padding:8px 10px;text-align:center">${r.saida||'—'}</td>
      <td style="padding:8px 10px;text-align:center">${totalBadge}</td>
      <td style="padding:8px 10px;text-align:center;color:#3B6D11;font-size:12px">${calc.extra25>0?calc.extra25.toFixed(1)+'h':'—'}</td>
      <td style="padding:8px 10px;text-align:center;color:#3B6D11;font-size:12px">${calc.extra375>0?calc.extra375.toFixed(1)+'h':'—'}</td>
      <td style="padding:8px 10px;text-align:center;color:#BA7517;font-size:12px">${calc.extra50>0?calc.extra50.toFixed(1)+'h':'—'}</td>
      <td style="padding:8px 10px;text-align:center;color:#A32D2D;font-size:12px">${calc.extra100>0?calc.extra100.toFixed(1)+'h':'—'}</td>
      <td style="padding:8px 10px;text-align:center;color:#E24B4A;font-size:12px">${calc.falta>0?calc.falta.toFixed(1)+'h':'—'}</td>
      <td style="padding:8px 10px;text-align:center">
        <button onclick="editarPontoIdx(${i})" style="background:none;border:none;cursor:pointer;color:#BA7517"><i class="ti ti-pencil" style="font-size:15px"></i></button>
      </td>
    </tr>`;
  });

  el.innerHTML=`
    <div id="pontoBarra" style="display:none;align-items:center;gap:10px;background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:10px;padding:10px 14px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:13px;color:#185FA5;font-weight:500"><span id="pontoSelCount">0</span> selecionados</span>
      <button onclick="selecionarTodosPontos()" style="font-size:12px;padding:4px 10px;border-radius:6px;border:0.5px solid #B5D4F4;background:#fff;color:#185FA5;cursor:pointer">Todos</button>
      <button onclick="limparSelecaoPontos()" style="font-size:12px;padding:4px 10px;border-radius:6px;border:0.5px solid #B5D4F4;background:#fff;color:#185FA5;cursor:pointer">Limpar</button>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button onclick="eliminarPontosSelecionados()" style="font-size:12px;padding:5px 12px;border-radius:6px;border:none;background:#E24B4A;color:#fff;cursor:pointer;display:flex;align-items:center;gap:4px"><i class="ti ti-trash"></i> Eliminar</button>
      </div>
    </div>
    <table style="min-width:900px"><thead><tr>
      <th style="width:36px;text-align:center"><input type="checkbox" id="chkAllPontos" onclick="toggleAllPontos()" style="width:15px;height:15px;cursor:pointer" /></th>
      <th>Colaborador</th><th>Data</th><th>Dia</th><th>Entrada</th><th>Pausa</th><th>Saída</th><th>Total</th>
      <th style="color:#3B6D11">Extra 25%</th><th style="color:#3B6D11">Extra 37,5%</th>
      <th style="color:#BA7517">Sáb 50%</th><th style="color:#A32D2D">Dom/Fer 100%</th>
      <th style="color:#E24B4A">Em falta</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

function updatePontoBarra(){
  const sel=document.querySelectorAll('.ponto-chk:checked');
  const barra=document.getElementById('pontoBarra');
  const count=document.getElementById('pontoSelCount');
  if(barra){barra.style.display=sel.length>0?'flex':'none';}
  if(count)count.textContent=sel.length;
  document.querySelectorAll('.ponto-chk').forEach(c=>{
    const row=c.closest('tr');
    if(row){
      const bg=row.style.background;
      if(c.checked) row.style.outline='2px solid #B5D4F4';
      else row.style.outline='none';
    }
  });
}

function toggleAllPontos(){
  const all=document.getElementById('chkAllPontos')?.checked;
  document.querySelectorAll('.ponto-chk').forEach(c=>{c.checked=all;});
  updatePontoBarra();
}

function selecionarTodosPontos(){
  document.getElementById('chkAllPontos').checked=true;
  toggleAllPontos();
}

function limparSelecaoPontos(){
  document.getElementById('chkAllPontos').checked=false;
  toggleAllPontos();
}

async function eliminarPontosSelecionados(){
  const ids=Array.from(document.querySelectorAll('.ponto-chk:checked')).map(c=>c.dataset.id);
  if(!ids.length)return;
  if(!confirm('Eliminar '+ids.length+' registo(s) de ponto?'))return;
  for(const id of ids){
    await sb.from('ponto').delete().eq('id',id);
  }
  toast('✅ '+ids.length+' registo(s) eliminado(s)');
  loadAPontos();
}


async function loadARForm(){
  const{data}=await sb.from('colaboradores').select('id,nome').order('nome');
  const sel=document.getElementById('aRColabSel');
  sel.innerHTML=(data||[]).map(c=>'<option value="'+c.id+'">'+c.nome+'</option>').join('');
}

async function carregarRecibo(){
  const cid=document.getElementById('aRColabSel').value;
  const mes=document.getElementById('aRMes').value;
  const ano=parseInt(document.getElementById('aRAno').value);
  const msg=document.getElementById('aRMsg');
  const fileInput=document.getElementById('aRFile');
  const urlInput=document.getElementById('aRUrl');
  let ficheiro_url='';

  if(fileInput&&fileInput.files&&fileInput.files[0]){
    const file=fileInput.files[0];
    const fileName=cid+'_'+mes+'_'+ano+'_'+Date.now()+'.pdf';
    msg.style.color='var(--blue)';msg.textContent='A carregar PDF...';
    const{data:upData,error:upErr}=await sb.storage.from('Recibos').upload(fileName,file,{contentType:'application/pdf',upsert:true});
    if(upErr){msg.style.color='var(--red)';msg.textContent='Erro upload: '+upErr.message;return;}
    const{data:urlData}=sb.storage.from('Recibos').getPublicUrl(fileName);
    ficheiro_url=urlData.publicUrl;
  } else if(urlInput&&urlInput.value.trim()){
    ficheiro_url=urlInput.value.trim();
  } else {
    msg.style.color='var(--red)';msg.textContent='Selecione um PDF ou introduza um link.';return;
  }

  const{error}=await sb.from('recibos').insert({colaborador_id:cid,mes,ano,ficheiro_url});
  if(error){msg.style.color='var(--red)';msg.textContent='Erro: '+error.message;return;}
  const{data:colab}=await sb.from('colaboradores').select('nome,email').eq('id',cid).maybeSingle();
  if(colab&&colab.email){
    emailjs.send(EJ_SERVICE,'template_9cnwr2b',{
      nome:colab.nome,email_destino:colab.email,
      assunto:'Novo recibo disponível — '+mes+' '+ano,
      mensagem:'O seu recibo de '+mes+' de '+ano+' já está disponível no portal.',
      nif:'—',senha:'—'
    }).catch(e=>console.log('Email erro:',e));
  }
  msg.style.color='var(--green)';msg.textContent='✅ Recibo carregado'+(colab?.email?' e email enviado!':'!');
  if(fileInput)fileInput.value='';
  if(urlInput)urlInput.value='';
  setTimeout(()=>{msg.textContent='';},3000);
}

function toggleDocVis(){
  const esp=document.getElementById('docVisEsp');
  const sel=document.getElementById('docColabSelect');
  const lista=document.getElementById('docColabLista');
  if(esp&&esp.checked){
    if(sel)sel.style.display='block';
    // Load colaboradores
    if(lista&&lista.children.length===0){
      sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome').then(({data})=>{
        if(data)lista.innerHTML=data.map(c=>`
          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:0.5px solid #f0ede6;cursor:pointer">
            <input type="checkbox" class="doc-colab-check" value="${c.id}" style="width:15px;height:15px" />
            <span style="font-size:13px">${c.nome}</span>
          </label>`).join('');
      });
    }
  } else {
    if(sel)sel.style.display='none';
  }
}

async function publicarDoc(){
  const titulo=document.getElementById('aDTit').value.trim();
  const desc=document.getElementById('aDDesc').value.trim();
  const msg=document.getElementById('aDMsg');
  const fileInput=document.getElementById('aDFile');
  const urlInput=document.getElementById('aDUrl');
  if(!titulo){msg.style.color='var(--red)';msg.textContent='O título é obrigatório.';return;}
  let ficheiro_url='';
  if(fileInput&&fileInput.files&&fileInput.files[0]){
    const file=fileInput.files[0];
    const fileName='doc_'+Date.now()+'.pdf';
    msg.style.color='var(--blue)';msg.textContent='A carregar PDF...';
    const{error:upErr}=await sb.storage.from('Documentos').upload(fileName,file,{contentType:'application/pdf',upsert:true});
    if(upErr){msg.style.color='var(--red)';msg.textContent='Erro upload: '+upErr.message;return;}
    const{data:urlData}=sb.storage.from('Documentos').getPublicUrl(fileName);
    ficheiro_url=urlData.publicUrl;
  } else if(urlInput&&urlInput.value.trim()){
    ficheiro_url=urlInput.value.trim();
  } else {
    msg.style.color='var(--red)';msg.textContent='Selecione um PDF ou introduza um link.';return;
  }
  // Get visibility setting
  const visAll=document.getElementById('docVisAll');
  const visEsp=document.getElementById('docVisEsp');
  const visibilidade=visEsp&&visEsp.checked?'especifico':'todos';
  let colaboradores_ids=null;
  if(visibilidade==='especifico'){
    const checkboxes=document.querySelectorAll('.doc-colab-check:checked');
    colaboradores_ids=Array.from(checkboxes).map(c=>c.value).join(',');
  }
  const{error}=await sb.from('documentos').insert({titulo,descricao:desc,ficheiro_url,visibilidade,colaboradores_ids});
  if(error){msg.style.color='var(--red)';msg.textContent='Erro: '+error.message;return;}
  msg.style.color='var(--green)';msg.textContent='✅ Documento publicado!';
  document.getElementById('aDTit').value='';
  document.getElementById('aDDesc').value='';
  document.getElementById('aDUrl').value='';
  if(fileInput)fileInput.value='';
  setTimeout(()=>{msg.textContent='';loadDocs();},2000);
}

async function verColab(id){
  const{data}=await sb.from('colaboradores').select('*').eq('id',id).maybeSingle();
  if(!data)return;
  // Try by colaborador_id first, then by nif as fallback
  let{data:ficha}=await sb.from('fichas').select('*').eq('colaborador_id',id).maybeSingle();
  if(!ficha && data.nif){
    const{data:fichaByNif}=await sb.from('fichas').select('*').eq('nif',data.nif).maybeSingle();
    ficha=fichaByNif;
    // If found by nif, update colaborador_id
    if(ficha && !ficha.colaborador_id){
      await sb.from('fichas').update({colaborador_id:id}).eq('nif',data.nif);
    }
  }

  let html='';
  html+='<div style="margin-bottom:12px">';
  html+='<div class="fsec"><i class="ti ti-briefcase"></i> Dados profissionais</div>';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  html+='<div class="fsec" style="margin-bottom:0;border:none"><i class="ti ti-briefcase"></i> Dados profissionais</div>';
  html+='<button onclick="editarDadosAdm(\''+id+'\')" class="bs ba" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-pencil"></i> Editar</button>';
  html+='</div>';
  html+='<div class="fr"><span class="fl">Nome</span><span>'+data.nome+'</span></div>';
  html+='<div class="fr"><span class="fl">NIF</span><span>'+data.nif+'</span></div>';
  html+='<div class="fr"><span class="fl">Email</span><span>'+(data.email||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Cargo</span><span>'+(data.cargo||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Departamento</span><span>'+(data.departamento||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Data admissão</span><span>'+(data.data_admissao||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Salário base</span><span>'+(data.salario_base?data.salario_base+' €':'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Preço H.H</span><span>'+(data.preco_hh?data.preco_hh+' €/hora':'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Tipo contrato</span><span>'+(data.tipo_contrato||'—')+'</span></div>';
  html+='<div class="fr"><span class="fl">Estado</span><span>'+(data.ativo?'Ativo':'Inativo')+'</span></div>';
  html+='<div class="fr"><span class="fl">Administrador</span><span>'+(data.is_admin?'Sim':'Não')+'</span></div>';
  html+='</div>';

  if(ficha){
    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-user"></i> Identificação pessoal</div>';
    html+='<div class="fr"><span class="fl">NISS</span><span>'+(ficha.niss||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Documento</span><span>'+(ficha.tipo_doc||'—')+' — '+(ficha.num_doc||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Validade doc.</span><span>'+(ficha.validade_doc||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Nacionalidade</span><span>'+(ficha.nacionalidade||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Data nascimento</span><span>'+(ficha.data_nasc||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-map-pin"></i> Morada</div>';
    html+='<div class="fr"><span class="fl">Morada</span><span>'+(ficha.morada||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Código postal</span><span>'+(ficha.cod_postal||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Localidade</span><span>'+(ficha.localidade||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Telemóvel</span><span>'+(ficha.telemovel||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Contacto urgência</span><span>'+(ficha.contacto_emerg||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-building-bank"></i> Dados bancários</div>';
    html+='<div class="fr"><span class="fl">IBAN</span><span>'+(ficha.iban||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Banco</span><span>'+(ficha.banco||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">IRS</span><span>'+(ficha.irs||'—')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-heart"></i> Família</div>';
    html+='<div class="fr"><span class="fl">Estado civil</span><span>'+(ficha.estado_civil||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Dependentes</span><span>'+(ficha.tem_dep==='sim'?'Sim — '+(ficha.num_dep||''):'Não')+'</span></div>';
    html+='</div>';

    html+='<div style="margin-bottom:12px">';
    html+='<div class="fsec"><i class="ti ti-shirt"></i> Fardamento</div>';
    html+='<div class="fr"><span class="fl">Nº bota</span><span>'+(ficha.num_bota||'—')+'</span></div>';
    html+='<div class="fr"><span class="fl">Tamanho fato</span><span>'+(ficha.num_fato||'—')+'</span></div>';
    html+='</div>';
  } else {
    html+='<div style="background:var(--ambl);border:1px solid #E8C97A;border-radius:8px;padding:10px 14px;font-size:13px;color:var(--amber);margin-top:8px"><i class="ti ti-info-circle"></i> Ficha pessoal ainda não preenchida pelo colaborador.</div>';
  }

  // Documents section
  html+='<div style="margin-bottom:12px">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  html+='<div class="fsec" style="margin-bottom:0;border:none"><i class="ti ti-files"></i> Documentos</div>';
  html+='<button onclick="abrirUploadDoc(\''+id+'\')" class="bs bb" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:4px"><i class="ti ti-upload"></i> Carregar</button>';
  html+='</div>';
  html+='<div id="docsColab_'+id+'"><p style="font-size:13px;color:var(--text2)">A carregar...</p></div>';
  html+='</div>';

  document.getElementById('vColabContent').innerHTML=html;
  showModal('modalVerColab');

  // Load docs after modal opens
  loadDocsColab(id);
}

async function loadDocsColab(colaboradorId){
  const el=document.getElementById('docsColab_'+colaboradorId);
  if(!el)return;
  const{data}=await sb.from('documentos_ficha').select('*').eq('colaborador_id',colaboradorId).order('criado_em',{ascending:false});
  if(!data||!data.length){el.innerHTML='<p style="font-size:13px;color:var(--text2)">Sem documentos.</p>';return;}
  const icons={identificacao:'ti-id-badge',iban:'ti-building-bank',contrato:'ti-file-text'};
  const cores={identificacao:'#E6F1FB,#185FA5',iban:'#EAF3DE,#3B6D11',contrato:'#FAEEDA,#BA7517'};
  let html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">';
  data.forEach(d=>{
    const icon=icons[d.tipo]||'ti-file';
    const [bg,fc]=(cores[d.tipo]||'#f9f8f5,#555').split(',');
    html+=`<div style="background:#fff;border:0.5px solid #d4d2ca;border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px">
      <div style="width:32px;height:32px;border-radius:6px;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ${icon}" style="font-size:16px;color:${fc}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.nome_ficheiro||d.tipo}</div>
        <div style="font-size:11px;color:var(--text2)">${d.carregado_por==='colaborador'?'Colaborador':'ADM'} · ${new Date(d.criado_em).toLocaleDateString('pt-PT')}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <a href="${d.ficheiro_url}" target="_blank" style="color:var(--text2);display:flex"><i class="ti ti-eye" style="font-size:14px"></i></a>
        <button onclick="eliminarDocColab('${d.id}','${colaboradorId}')" style="background:none;border:none;cursor:pointer;color:#E24B4A;padding:0;display:flex"><i class="ti ti-trash" style="font-size:14px"></i></button>
      </div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

async function eliminarDocColab(docId,colaboradorId){
  if(!confirm('Eliminar este documento?'))return;
  await sb.from('documentos_ficha').delete().eq('id',docId);
  loadDocsColab(colaboradorId);
  toast('Documento eliminado');
}

function abrirUploadDoc(colaboradorId){
  const modal=document.createElement('div');
  modal.id='modalUploadDoc';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:16px;padding:1.5rem;max-width:420px;width:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div style="font-size:16px;font-weight:600"><i class="ti ti-upload"></i> Carregar documento</div>
        <button onclick="document.getElementById('modalUploadDoc').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="font-size:12px;color:#555;font-weight:500;display:block;margin-bottom:4px">Tipo de documento</label>
          <select id="upDocTipo" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px;width:100%">
            <option value="contrato">Contrato de trabalho</option>
            <option value="identificacao">Documento de identificação</option>
            <option value="iban">Comprovativo IBAN</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#555;font-weight:500;display:block;margin-bottom:4px">Ficheiro (PDF, JPG, PNG · máx. 10MB)</label>
          <input type="file" id="upDocFile" accept=".pdf,.jpg,.jpeg,.png" style="font-size:13px;width:100%" />
        </div>
      </div>
      <div id="upDocErro" style="display:none;background:#FCEBEB;border-radius:8px;padding:10px;font-size:13px;color:#A32D2D;margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:1rem;justify-content:flex-end">
        <button onclick="document.getElementById('modalUploadDoc').remove()" style="padding:9px 20px;border-radius:8px;border:1px solid #d4d2ca;background:#fff;cursor:pointer;font-size:13px">Cancelar</button>
        <button onclick="confirmarUploadDoc('${colaboradorId}')" style="padding:9px 20px;border-radius:8px;border:none;background:#152B55;color:#fff;cursor:pointer;font-size:13px;font-weight:500"><i class="ti ti-upload"></i> Carregar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function confirmarUploadDoc(colaboradorId){
  const tipo=document.getElementById('upDocTipo').value;
  const file=document.getElementById('upDocFile')?.files[0];
  const erroEl=document.getElementById('upDocErro');
  if(!file){erroEl.style.display='block';erroEl.textContent='Selecione um ficheiro.';return;}
  if(file.size>10*1024*1024){erroEl.style.display='block';erroEl.textContent='Ficheiro demasiado grande. Máx. 10MB.';return;}
  const ext=file.name.split('.').pop();
  const path=`docs-ficha/${colaboradorId}/${tipo}-${Date.now()}.${ext}`;
  const{error:upErr}=await sb.storage.from('Documentos').upload(path,file,{upsert:true});
  if(upErr){erroEl.style.display='block';erroEl.textContent='Erro ao carregar: '+upErr.message;return;}
  const{data:urlData}=sb.storage.from('Documentos').getPublicUrl(path);
  await sb.from('documentos_ficha').insert({
    colaborador_id:colaboradorId,
    tipo,
    nome_ficheiro:file.name,
    ficheiro_url:urlData.publicUrl,
    carregado_por:'adm'
  });
  document.getElementById('modalUploadDoc').remove();
  loadDocsColab(colaboradorId);
  toast('Documento carregado!');
}

async function editarColab(id){
  const{data}=await sb.from('colaboradores').select('*').eq('id',id).maybeSingle();
  if(!data)return;
  document.getElementById('editId').value=id;
  document.getElementById('editNome').value=data.nome||'';
  document.getElementById('editEmail').value=data.email||'';
  document.getElementById('editCargo').value=data.cargo||'';
  document.getElementById('editDepto').value=data.departamento||'';
  document.getElementById('editAdmissao').value=data.data_admissao||'';
  document.getElementById('editSenha').value='';
  showModal('modalEditColab');
}

async function guardarEditColab(){
  const id=document.getElementById('editId').value;
  const nome=document.getElementById('editNome').value.trim();
  const email=document.getElementById('editEmail').value.trim();
  const cargo=document.getElementById('editCargo').value.trim();
  const depto=document.getElementById('editDepto').value.trim();
  const admissao=document.getElementById('editAdmissao').value;
  const senha=document.getElementById('editSenha').value;
  const msg=document.getElementById('editMsg');
  if(!nome){msg.textContent='O nome é obrigatório.';return;}
  const upd={nome,email,cargo,departamento:depto,data_admissao:admissao||null};
  if(senha){upd.senha=senha;upd.troca_senha=true;}
  const{error}=await sb.from('colaboradores').update(upd).eq('id',id);
  if(error){msg.textContent='Erro: '+error.message;return;}
  closeModal('modalEditColab');loadAColab();
}

async function excluirColab(id, nome){
  if(!confirm('Tem a certeza que deseja EXCLUIR o colaborador "'+nome+'"? Esta ação não pode ser revertida!')) return;
  await sb.from('assinaturas_recibos').delete().eq('colaborador_id',id);
  await sb.from('recibos').delete().eq('colaborador_id',id);
  await sb.from('ponto').delete().eq('colaborador_id',id);
  await sb.from('colaboradores').delete().eq('id',id);
  loadAColab();
}

async function toggleAtivo(id, ativo){
  const acao = ativo ? 'reativar' : 'desativar';
  if(!confirm('Tem a certeza que deseja '+acao+' este colaborador?'+(ativo?'':' \n\nSerá enviado um email com aviso de 3 dias para fazer backup dos documentos.'))) return;
  
  if(!ativo){
    // Reactivate
    await sb.from('colaboradores').update({ativo:true}).eq('id',id);
    toast('Colaborador reativado!');
  } else {
    // Deactivate - send backup warning email
    const{data:colab}=await sb.from('colaboradores').select('nome,email').eq('id',id).maybeSingle();
    const dataLimite=new Date();dataLimite.setDate(dataLimite.getDate()+3);
    const prazoStr=dataLimite.toLocaleDateString('pt-PT');
    await sb.from('colaboradores').update({ativo:false}).eq('id',id);
    if(colab&&colab.email){
      emailjs.send(EJ_SERVICE,'template_ype66lh',{
        name:colab.nome,
        email:colab.email,
        nome:colab.nome,
        email_destino:colab.email,
        assunto:'Aviso importante — Acesso ao portal Fortix',
        mensagem:'Informamos que o seu acesso ao Portal Fortix foi encerrado.\n\nTem até '+prazoStr+' (3 dias) para aceder ao portal e fazer o download dos seus recibos e contrato de trabalho.\n\nApós esta data, o acesso será bloqueado definitivamente.\n\nFortix Solutions, Lda.'
      }).catch(e=>{});
    }
    toast('Colaborador desativado — email de aviso enviado!');
  }
  loadAColab();
}

function editarPontoIdx(i){
  const r=pontosData[i];
  if(!r)return;
  editarPonto(r.id,r.colaboradores?.nome||'',r.data,r.entrada||'',r.inicio_pausa||'',r.fim_pausa||'',r.saida||'');
}

function editarPonto(id,nome,data,entrada,inicioPausa,fimPausa,saida){
  document.getElementById('epId').value=id;
  document.getElementById('epColabNome').textContent='Colaborador: '+nome;
  document.getElementById('epData').value=data||'';
  document.getElementById('epEntrada').value=entrada||'';
  document.getElementById('epInicioPausa').value=inicioPausa||'';
  document.getElementById('epFimPausa').value=fimPausa||'';
  document.getElementById('epSaida').value=saida||'';
  showModal('modalEditPonto');
}

async function guardarEditPonto(){
  const id=document.getElementById('epId').value;
  const data=document.getElementById('epData').value;
  const entrada=document.getElementById('epEntrada').value;
  const inicio_pausa=document.getElementById('epInicioPausa').value;
  const fim_pausa=document.getElementById('epFimPausa').value;
  const saida=document.getElementById('epSaida').value;
  const msg=document.getElementById('epMsg');
  let total_horas=null;
  if(entrada&&saida){
    const pm=inicio_pausa&&fim_pausa?timeToMin(fim_pausa)-timeToMin(inicio_pausa):0;
    const tot=timeToMin(saida)-timeToMin(entrada)-pm;
    total_horas=Math.floor(tot/60)+'h'+String(tot%60).padStart(2,'0');
  }
  const{error}=await sb.from('ponto').update({data,entrada:entrada||null,inicio_pausa:inicio_pausa||null,fim_pausa:fim_pausa||null,saida:saida||null,total_horas}).eq('id',id);
  if(error){msg.textContent='Erro: '+error.message;return;}
  closeModal('modalEditPonto');loadAPontos();
}

function eliminarPontoIdx(i){
  const r=pontosData[i];
  if(!r)return;
  eliminarPonto(r.id);
}

async function eliminarPonto(id){
  if(!confirm('Eliminar este registo de ponto?'))return;
  await sb.from('ponto').delete().eq('id',id);
  loadAPontos();
}

async function loadAssinaturas(){
  const{data}=await sb.from('assinaturas_recibos').select('*,colaboradores(nome),recibos(mes,ano,ficheiro_url)').order('data_assinatura',{ascending:false});
  const el=document.getElementById('assLista');
  if(!data||!data.length){
    el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text2)"><i class="ti ti-files" style="font-size:40px;display:block;margin-bottom:10px;opacity:0.4"></i><p style="font-size:14px">Sem recibos assinados</p></div>';
    return;
  }
  const groups={};
  data.forEach(function(a){
    const key=(a.recibos?a.recibos.mes:'—')+' '+(a.recibos?a.recibos.ano:'');
    if(!groups[key])groups[key]=[];
    groups[key].push(a);
  });
  let html='';
  Object.keys(groups).forEach(function(key){
    html+='<div style="margin-bottom:1.5rem">';
    html+='<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--blu);border-radius:10px 10px 0 0;border:1px solid var(--border)">';
    html+='<i class="ti ti-folder" style="color:var(--blue);font-size:18px"></i>';
    html+='<span style="font-size:15px;font-weight:600;color:var(--blue)">'+key+'</span>';
    html+='<span class="badge bb2" style="margin-left:auto">'+groups[key].length+' recibo(s)</span>';
    html+='</div>';
    html+='<div style="border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden">';
    groups[key].forEach(function(a,i){
      const dataAss=new Date(a.data_assinatura);
      const dataFmt=dataAss.toLocaleDateString('pt-PT')+' às '+dataAss.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
      html+='<div style="padding:12px 16px;border-bottom:'+(i<groups[key].length-1?'1px solid #f0ede6':'none')+';display:flex;align-items:center;gap:14px">';
      html+='<div style="flex:1">';
      html+='<div style="font-size:14px;font-weight:600">'+(a.colaboradores?a.colaboradores.nome:'—')+'</div>';
      html+='<div style="font-size:12px;color:var(--text2);margin-top:2px">Assinado em '+dataFmt+'</div>';
      html+='</div>';
      if(a.assinatura_img){
        html+='<div style="text-align:center">';
        html+='<div style="font-size:10px;color:var(--text2);margin-bottom:3px">Assinatura</div>';
        html+='<img src="'+a.assinatura_img+'" style="height:45px;border:1px solid var(--border);border-radius:6px;background:#fff;display:block"/>';
        html+='</div>';
      }
      if(a.recibos&&a.recibos.ficheiro_url){
        html+='<a href="'+a.recibos.ficheiro_url+'" target="_blank" class="bs bb" style="text-decoration:none;font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:5px"><i class="ti ti-file-text"></i> Ver recibo</a>';
      }
      html+='<button data-id="'+a.id+'" class="btn-del-ass" style="background:var(--redl);color:var(--red);border:1px solid #F09595;border-radius:7px;padding:5px 10px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-left:6px"><i class="ti ti-trash"></i> Excluir</button>';
      html+='</div>';
    });
    html+='</div></div>';
  });
  el.innerHTML=html;
  el.querySelectorAll('.btn-del-ass').forEach(function(btn){
    btn.addEventListener('click',function(){excluirAssinatura(btn.dataset.id);});
  });
}

function exportarPontoExcel(){
  const el=document.getElementById('aPontosLista')||document.getElementById('pontoHist');
  const table=el?el.querySelector('table'):null;
  if(!table){alert('Sem dados para exportar');return;}
  let csv='Colaborador,Data,Entrada,Inicio Pausa,Fim Pausa,Saida,Total\n';
  const rows=table.querySelectorAll('tbody tr');
  rows.forEach(function(r){
    const cells=r.querySelectorAll('td');
    const vals=[];
    for(let i=0;i<Math.min(cells.length,7);i++){
      vals.push(cells[i].textContent.trim());
    }
    csv+=vals.join(',')+('\n');
  });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='ponto_fortix.csv';a.click();
  URL.revokeObjectURL(url);
}

async function excluirDoc(id){
  if(!confirm('Tem a certeza que deseja excluir este documento?'))return;
  await sb.from('documentos').delete().eq('id',id);
  loadDocs();
}

async function excluirAssinatura(id){
  if(!confirm('Tem a certeza que deseja excluir este recibo assinado?'))return;
  await sb.from('assinaturas_recibos').delete().eq('id',id);
  loadAssinaturas();
}

function showModal(id){document.getElementById(id).style.display='flex';}
function closeModal(id){document.getElementById(id).style.display='none';}
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m&&m.id!=='modalSenha')m.style.display='none';}));

(function(){
  const s=localStorage.getItem('fx_user');
  if(s){try{cu=JSON.parse(s);iniciarPortal();}catch(e){}}
})();

// ─────────────────────────────────────────────────────
// RELATÓRIO MENSAL DE HORAS
// ─────────────────────────────────────────────────────
async function initRelatorio(){
  // Set default to current period (21 prev → 20 current)
  const periodo=getPeriodoAtual();
  const iniEl=document.getElementById('relDataInicio');
  const fimEl=document.getElementById('relDataFim');
  if(iniEl&&!iniEl.value)iniEl.value=periodo.inicio;
  if(fimEl&&!fimEl.value)fimEl.value=periodo.fim;
  const selC=document.getElementById('relColab');
  const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
  if(colabs)colabs.forEach(c=>{
    const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;selC.appendChild(o);
  });
  loadRelatorio();
}

async function loadRelatorio(){
  const inicio=document.getElementById('relDataInicio')?.value||'';
  const fim=document.getElementById('relDataFim')?.value||'';
  const colabId=document.getElementById('relColab')?.value||'';
  if(!inicio&&!fim)return;
  let query=sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(500);
  if(inicio)query=query.gte('data',inicio);
  if(fim)query=query.lte('data',fim);
  if(colabId)query=query.eq('colaborador_id',colabId);
  const{data}=await query;
  if(!data){return;}

  // Group by colaborador
  const map={};
  data.forEach(r=>{
    const nome=r.colaboradores?.nome||'—';
    const cid=r.colaborador_id;
    if(!map[cid])map[cid]={nome,cid,dias:0,horas:0};
    map[cid].dias++;
    const h=parseFloat(r.total_horas)||0;
    map[cid].horas+=h;
  });

  const vals=Object.values(map);

  // Calculate totals with extras
  let tNormais=0,tE25=0,tE375=0,tE50=0,tE100=0,tFalta=0;
  data.forEach(r=>{
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const calc=calcHorasExtras(h,tipo);
    tNormais+=calc.normais;tE25+=calc.extra25;tE375+=calc.extra375;
    tE50+=calc.extra50;tE100+=calc.extra100;tFalta+=calc.falta;
  });
  const totalH=vals.reduce((a,b)=>a+b.horas,0);

  document.getElementById('relStats').innerHTML=`
    <div style="background:var(--blu);border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:var(--text2)">Total horas</div>
      <div style="font-size:22px;font-weight:600;color:var(--blue)">${totalH.toFixed(1)}h</div>
    </div>
    <div style="background:var(--blu);border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:var(--text2)">H. Normais</div>
      <div style="font-size:22px;font-weight:600;color:var(--blue)">${tNormais.toFixed(1)}h</div>
    </div>
    <div style="background:#EAF3DE;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#3B6D11">Extra 25%</div>
      <div style="font-size:22px;font-weight:600;color:#3B6D11">${tE25.toFixed(1)}h</div>
    </div>
    <div style="background:#EAF3DE;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#3B6D11">Extra 37,5%</div>
      <div style="font-size:22px;font-weight:600;color:#3B6D11">${tE375.toFixed(1)}h</div>
    </div>
    <div style="background:#FAEEDA;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#854F0B">Sáb 50%</div>
      <div style="font-size:22px;font-weight:600;color:#BA7517">${tE50.toFixed(1)}h</div>
    </div>
    <div style="background:#FAEEDA;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#854F0B">Dom/Fer 100%</div>
      <div style="font-size:22px;font-weight:600;color:#BA7517">${tE100.toFixed(1)}h</div>
    </div>
    <div style="background:#FCEBEB;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#A32D2D">Em falta</div>
      <div style="font-size:22px;font-weight:600;color:#E24B4A">${tFalta.toFixed(1)}h</div>
    </div>
    <div style="background:var(--blu);border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:var(--text2)">Colaboradores</div>
      <div style="font-size:22px;font-weight:600;color:var(--blue)">${vals.length}</div>
    </div>`;

  let rows='';
  vals.forEach(v=>{
    const meusPontos=(data||[]).filter(p=>p.colaborador_id===v.cid);
    let normais=0,e25=0,e375=0,e50=0,e100=0,falta=0;
    meusPontos.forEach(p=>{
      const h=parseFloat(p.total_horas)||0;
      const tipo=getTipoDia(p.data);
      const calc=calcHorasExtras(h,tipo);
      normais+=calc.normais;e25+=calc.extra25;e375+=calc.extra375;
      e50+=calc.extra50;e100+=calc.extra100;falta+=calc.falta;
    });
    rows+=`<tr>
      <td><strong>${v.nome}</strong></td>
      <td style="text-align:center">${v.dias}</td>
      <td style="text-align:center;font-weight:500">${normais.toFixed(1)}h</td>
      <td style="text-align:center;color:#3B6D11">${e25>0?e25.toFixed(1)+'h':'—'}</td>
      <td style="text-align:center;color:#3B6D11">${e375>0?e375.toFixed(1)+'h':'—'}</td>
      <td style="text-align:center;color:#BA7517">${e50>0?e50.toFixed(1)+'h':'—'}</td>
      <td style="text-align:center;color:#A32D2D">${e100>0?e100.toFixed(1)+'h':'—'}</td>
      <td style="text-align:center;color:#E24B4A">${falta>0?falta.toFixed(1)+'h':'—'}</td>
    </tr>`;
  });

  document.getElementById('relTabela').innerHTML=`
    <table><thead><tr>
      <th>Colaborador</th><th>Dias</th><th>Normais</th>
      <th style="color:#3B6D11">Extra 25%</th>
      <th style="color:#3B6D11">Extra 37,5%</th>
      <th style="color:#BA7517">Sáb 50%</th>
      <th style="color:#A32D2D">Dom/Fer 100%</th>
      <th style="color:#E24B4A">Em falta</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div style="background:var(--blu);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;color:var(--text2)">Normal = 8h/dia · Extra semana: 1ª hora 25%, demais 37,5% · Sábado = 50% · Domingo/Feriado = 100%</div>`;
}

// ─────────────────────────────────────────────────────
// GESTÃO DE EPIs
// ─────────────────────────────────────────────────────
async function initEPIs(){
  const sel=document.getElementById('epiFilterColab');
  if(sel && sel.options.length<=1){
    const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
    if(colabs)colabs.forEach(c=>{
      const o=document.createElement('option');
      o.value=c.id;o.textContent=c.nome;
      sel.appendChild(o);
    });
  }
  loadEPIs();
}

async function loadEPIs(){
  const filtro=document.getElementById('epiFilterColab')?.value||'';
  let query=sb.from('epis').select('*,colaboradores(nome)').order('data_entrega',{ascending:false});
  if(filtro)query=query.eq('colaborador_id',filtro);
  const{data}=await query;
  const el=document.getElementById('episTabela');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos de EPIs</p>';return;}

  const now=new Date();
  let urgente=0,atencao=0;
  let rows='';
  data.forEach(r=>{
    const nome=r.colaboradores?.nome||'—';
    const entrega=r.data_entrega?new Date(r.data_entrega):null;
    let meses=0;
    if(entrega)meses=(now-entrega)/(1000*60*60*24*30);
    let badge='',estado='';
    if(meses>=12){badge='badge br2';estado='Renovar';urgente++;}
    else if(meses>=6){badge='badge ba2';estado='Atenção';atencao++;}
    else{badge='badge bg2';estado='OK';}
    const confirmaStr = r.data_confirmacao
      ? `<span style="font-size:11px;color:#3B6D11"><i class="ti ti-circle-check"></i> ${new Date(r.data_confirmacao).toLocaleDateString('pt-PT')}</span>`
      : '<span style="font-size:11px;color:#E24B4A"><i class="ti ti-circle-x"></i> Pendente</span>';
    rows+=`<tr>
      <td><strong>${nome}</strong></td>
      <td>${r.tipo||'—'}</td>
      <td style="text-align:center">${r.tamanho||'—'}</td>
      <td style="text-align:center">${r.data_entrega||'—'}</td>
      <td style="text-align:center">${r.proximo_renovacao||'—'}</td>
      <td style="text-align:center"><span class="${badge}">${estado}</span></td>
      <td style="text-align:center">${confirmaStr}</td>
      <td style="text-align:center"><button class="bs" style="font-size:11px;padding:3px 8px" onclick="eliminarEPI('${r.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  });

  document.getElementById('episStats').innerHTML=`
    <div style="background:var(--blu);border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:var(--text2)">Total entregas</div>
      <div style="font-size:22px;font-weight:600;color:var(--blue)">${data.length}</div>
    </div>
    <div style="background:#FCEBEB;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#A32D2D">A renovar</div>
      <div style="font-size:22px;font-weight:600;color:#E24B4A">${urgente}</div>
    </div>
    <div style="background:#FAEEDA;border-radius:8px;padding:1rem">
      <div style="font-size:12px;color:#854F0B">Atenção</div>
      <div style="font-size:22px;font-weight:600;color:#BA7517">${atencao}</div>
    </div>`;

  el.innerHTML=`<table><thead><tr>
    <th>Colaborador</th><th>EPI</th><th>Tam.</th><th>Entrega</th><th>Renovação</th><th>Estado</th><th>Confirmação recebimento</th><th></th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function abrirModalEPI(){
  const modal=document.createElement('div');
  modal.id='modalEPI';
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:16px;padding:1.5rem;max-width:480px;width:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div style="font-size:16px;font-weight:600">Registar entrega EPI</div>
        <button onclick="document.getElementById('modalEPI').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="grid-column:1/-1;display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Colaborador</label>
          <select id="epi_colab" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            <option value="">Selecionar...</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Tipo de EPI</label>
          <select id="epi_tipo" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            <option value="">Selecionar...</option>
            <option>Botas de segurança</option>
            <option>Fato de trabalho</option>
            <option>Luvas</option>
            <option>Capacete</option>
            <option>Colete refletor</option>
            <option>Óculos de proteção</option>
            <option>Arnês</option>
            <option>Outro</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Tamanho</label>
          <input id="epi_tam" placeholder="Ex: 42, M, L" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Data de entrega</label>
          <input id="epi_data" type="date" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px" />
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Periodicidade</label>
          <select id="epi_period" onchange="calcRenovacaoEPI()" style="border:1px solid #d4d2ca;border-radius:8px;padding:8px 10px;font-size:13px">
            <option value="7">Semanal (7 dias)</option>
            <option value="15">Quinzenal (15 dias)</option>
            <option value="30">Mensal (30 dias)</option>
            <option value="180" selected>Semestral (6 meses)</option>
            <option value="365">Anual (12 meses)</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="font-size:12px;color:#555;font-weight:500">Próx. renovação <span style="color:#3B6D11;font-weight:400">(automático)</span></label>
          <input id="epi_renov" type="date" style="border:1px solid #C0DD97;border-radius:8px;padding:8px 10px;font-size:13px;background:#EAF3DE;color:#3B6D11" readonly />
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:18px">
          <input type="checkbox" id="epi_assn" style="width:16px;height:16px" />
          <label for="epi_assn" style="font-size:13px;color:#555">Colaborador assinou</label>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:1rem;justify-content:flex-end">
        <button onclick="document.getElementById('modalEPI').remove()" style="padding:9px 20px;border-radius:8px;border:1px solid #d4d2ca;background:#fff;cursor:pointer;font-size:13px">Cancelar</button>
        <button onclick="guardarEPI()" style="padding:9px 20px;border-radius:8px;border:none;background:#152B55;color:#fff;cursor:pointer;font-size:13px;font-weight:500">Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Populate colaboradores
  sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome').then(({data})=>{
    if(data)data.forEach(c=>{
      const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;
      document.getElementById('epi_colab').appendChild(o);
    });
  });
  // Set today and auto-fill 6 months for renovacao
  const hoje=new Date();
  document.getElementById('epi_data').value=hoje.toISOString().split('T')[0];
  const renovDate=new Date(hoje.setMonth(hoje.getMonth()+6));
  document.getElementById('epi_renov').value=renovDate.toISOString().split('T')[0];

  // Auto-update renovacao when entrega changes
  document.getElementById('epi_data').addEventListener('change', calcRenovacaoEPI);
  document.getElementById('epi_period').addEventListener('change', calcRenovacaoEPI);
}

function calcRenovacaoEPI(){
  const dataEl=document.getElementById('epi_data');
  const periodEl=document.getElementById('epi_period');
  const renovEl=document.getElementById('epi_renov');
  if(!dataEl||!periodEl||!renovEl)return;
  const dias=parseInt(periodEl.value)||180;
  const d=new Date(dataEl.value);
  if(isNaN(d.getTime()))return;
  d.setDate(d.getDate()+dias);
  renovEl.value=d.toISOString().split('T')[0];
}

async function guardarEPI(){
  const cid=document.getElementById('epi_colab').value;
  const tipo=document.getElementById('epi_tipo').value;
  const tam=document.getElementById('epi_tam').value;
  const data=document.getElementById('epi_data').value;
  const renov=document.getElementById('epi_renov').value;
  const assn=document.getElementById('epi_assn').checked;
  if(!cid||!tipo||!data){alert('Preencha colaborador, tipo e data.');return;}
  const period=document.getElementById('epi_period')?.value||'180';
  const periodLabel={'7':'semanal','15':'quinzenal','30':'mensal','180':'semestral','365':'anual'}[period]||'semestral';
  const{error}=await sb.from('epis').insert({colaborador_id:cid,tipo,tamanho:tam,data_entrega:data,proximo_renovacao:renov||null,assinado:assn,periodicidade:periodLabel});
  if(error){alert('Erro: '+error.message);return;}
  document.getElementById('modalEPI').remove();
  loadEPIs();
  toast('EPI registado!');
}

async function eliminarEPI(id){
  if(!confirm('Eliminar este registo de EPI?'))return;
  await sb.from('epis').delete().eq('id',id);
  loadEPIs();
  toast('EPI eliminado');
}

// ─────────────────────────────────────────────────────
// ALERTAS DE DOCUMENTOS
// ─────────────────────────────────────────────────────
async function loadAlertas(){
  const el=document.getElementById('alertasContent');
  const{data}=await sb.from('fichas').select('nif,validade_doc,tipo_doc,colaborador_id,colaboradores(nome,email)').not('validade_doc','is',null);
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem documentos registados</p>';return;}

  const now=new Date();
  const urgentes=[];const atencao=[];const ok=[];

  data.forEach(r=>{
    if(!r.validade_doc)return;
    const validade=new Date(r.validade_doc);
    const dias=Math.round((validade-now)/(1000*60*60*24));
    const nome=r.colaboradores?.nome||'—';
    const email=r.colaboradores?.email||'';
    const tipo=r.tipo_doc||'Documento';
    const item={nome,email,tipo,validade:r.validade_doc,dias,nif:r.nif};
    if(dias<=30)urgentes.push(item);
    else if(dias<=90)atencao.push(item);
    else ok.push(item);
  });

  let html='';
  if(urgentes.length){
    html+=`<div style="font-size:14px;font-weight:600;color:#A32D2D;margin-bottom:8px;margin-top:8px"><i class="ti ti-alert-triangle"></i> Urgente — expira em menos de 30 dias</div>`;
    urgentes.forEach(i=>{
      html+=`<div style="background:#fff;border:0.5px solid #F09595;border-left:3px solid #E24B4A;border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div><strong>${i.nome}</strong> — ${i.tipo}<br><span style="font-size:12px;color:#A32D2D">Expira em ${i.dias} dias (${i.validade})</span></div>
        <button class="bs" style="font-size:12px;padding:5px 10px;border-color:#F09595;color:#A32D2D" onclick="notificarDoc('${i.email}','${i.nome}','${i.tipo}','${i.dias}')"><i class="ti ti-mail"></i> Notificar</button>
      </div>`;
    });
  }
  if(atencao.length){
    html+=`<div style="font-size:14px;font-weight:600;color:#854F0B;margin-bottom:8px;margin-top:12px"><i class="ti ti-clock"></i> Atenção — expira em menos de 90 dias</div>`;
    atencao.forEach(i=>{
      html+=`<div style="background:#fff;border:0.5px solid #FAC775;border-left:3px solid #BA7517;border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div><strong>${i.nome}</strong> — ${i.tipo}<br><span style="font-size:12px;color:#854F0B">Expira em ${i.dias} dias (${i.validade})</span></div>
        <button class="bs" style="font-size:12px;padding:5px 10px;border-color:#FAC775;color:#854F0B" onclick="notificarDoc('${i.email}','${i.nome}','${i.tipo}','${i.dias}')"><i class="ti ti-mail"></i> Notificar</button>
      </div>`;
    });
  }
  if(ok.length){
    html+=`<div style="font-size:14px;font-weight:600;color:#3B6D11;margin-bottom:8px;margin-top:12px"><i class="ti ti-circle-check"></i> OK — mais de 90 dias</div>`;
    ok.forEach(i=>{
      html+=`<div style="background:#fff;border:0.5px solid #C0DD97;border-left:3px solid #639922;border-radius:10px;padding:12px 14px;margin-bottom:8px">
        <strong>${i.nome}</strong> — ${i.tipo}<span style="font-size:12px;color:#3B6D11;margin-left:8px">Válido até ${i.validade} (${i.dias} dias)</span>
      </div>`;
    });
  }
  if(!html)html='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Nenhum alerta</p>';
  el.innerHTML=html;
}

async function notificarDoc(email,nome,tipo,dias){
  if(!email){alert('Colaborador sem email registado.');return;}
  // Send via EmailJS
  emailjs.send(EJ_SERVICE,'template_ype66lh',{
    name:nome,
    email:email,
    nome:nome,
    email_destino:email,
    assunto:'Aviso: documento a expirar — Fortix Solutions',
    mensagem:`O seu documento (${tipo}) expira em ${dias} dias. Por favor contacte a administração para proceder à renovação.`
  }).then(()=>toast('✅ Email enviado a '+nome)).catch(e=>{
    console.error('EmailJS error:',e);
    toast('Erro ao enviar email','erro');
  });
}

// ─────────────────────────────────────────────────────
// DOCUMENTOS DA FICHA (ADM + Colaborador)
// ─────────────────────────────────────────────────────
async function loadMeusDocs(){
  if(!cu)return;
  const el=document.getElementById('meusdocsContent');
  const contratoEl=document.getElementById('contratoContent');

  // Load all docs for this colaborador
  const{data}=await sb.from('documentos_ficha').select('*').eq('colaborador_id',cu.id).order('criado_em',{ascending:false});

  // Separate contrato (uploaded by ADM) from own docs
  const meusDocs=(data||[]).filter(d=>d.carregado_por==='colaborador');
  const contratoDocs=(data||[]).filter(d=>d.tipo==='contrato');

  // Show contrato
  if(contratoEl){
    if(contratoDocs.length){
      contratoEl.innerHTML=contratoDocs.map(d=>`
        <div style="background:#f9f8f5;border:1px solid #e8e6df;border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <i class="ti ti-file-text" style="font-size:22px;color:#BA7517"></i>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${d.nome_ficheiro||'Contrato'}</div>
            <div style="font-size:12px;color:var(--text2)">Disponibilizado pela ADM · ${new Date(d.criado_em).toLocaleDateString('pt-PT')}</div>
          </div>
          <a href="${d.ficheiro_url}" target="_blank" class="bs bb" style="font-size:12px;padding:5px 10px;text-decoration:none"><i class="ti ti-eye"></i> Ver</a>
        </div>`).join('');
    } else {
      contratoEl.innerHTML='<p style="font-size:13px;color:var(--text2)">Contrato ainda não disponível.</p>';
    }
  }

  if(!meusDocs.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;margin-bottom:1rem">Ainda não carregou documentos.</p>';return;}
  let html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:1rem">';
  data.forEach(d=>{
    const icon=d.tipo==='identificacao'?'ti-id-badge':d.tipo==='iban'?'ti-building-bank':'ti-file-text';
    const cor=d.tipo==='identificacao'?'#E6F1FB,#185FA5':d.tipo==='iban'?'#EAF3DE,#3B6D11':'#FAEEDA,#BA7517';
    const [bg,fc]=cor.split(',');
    html+=`<div style="background:#fff;border:0.5px solid #d4d2ca;border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px">
      <div style="width:36px;height:36px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ${icon}" style="font-size:18px;color:${fc}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${d.nome_ficheiro||d.tipo}</div>
        <div style="font-size:11px;color:var(--text2)">${new Date(d.criado_em).toLocaleDateString('pt-PT')}</div>
      </div>
      <a href="${d.ficheiro_url}" target="_blank" style="color:var(--text2)"><i class="ti ti-eye" style="font-size:16px"></i></a>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

async function uploadDocColab(tipo, inputId){
  if(!inputId)inputId=tipo==='identificacao'?'uploadDocId':'uploadDocIban';
  const file=document.getElementById(inputId)?.files[0];
  if(!file){toast('Selecione um ficheiro primeiro.','erro');return;}
  if(file.size>10*1024*1024){toast('Ficheiro demasiado grande. Máx. 10MB.','erro');return;}
  if(!cu)return;

  // Disable button to prevent double click
  const btn=document.querySelector(`button[onclick*="${inputId}"]`);
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> A carregar...';}

  const ext=file.name.split('.').pop();
  const path=`docs-ficha/${cu.id}/${tipo}-${Date.now()}.${ext}`;
  const{error:upErr}=await sb.storage.from('Documentos').upload(path,file,{upsert:true});
  if(upErr){
    toast('Erro ao carregar: '+upErr.message,'erro');
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-upload"></i> Carregar';}
    return;
  }
  const{data:urlData}=sb.storage.from('Documentos').getPublicUrl(path);
  await sb.from('documentos_ficha').insert({
    colaborador_id:cu.id,
    tipo,
    nome_ficheiro:file.name,
    ficheiro_url:urlData.publicUrl,
    carregado_por:'colaborador'
  });
  toast('✅ Documento carregado com sucesso!');
  loadMeusDocs();
  // Clear file input
  document.getElementById(inputId).value='';
}

async function loadMeusEPIs(){
  if(!cu)return;
  const el=document.getElementById('meusEpisContent');
  const{data}=await sb.from('epis').select('*').eq('colaborador_id',cu.id).order('data_entrega',{ascending:false});
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px">Sem EPIs registados.</p>';return;}
  const now=new Date();
  let html='<div style="display:flex;flex-direction:column;gap:8px">';
  data.forEach(r=>{
    const renovacao=r.proximo_renovacao?new Date(r.proximo_renovacao):null;
    const period=r.periodicidade||'semestral';
    const periodLabel={'semanal':'Semanal','quinzenal':'Quinzenal','mensal':'Mensal','semestral':'Semestral','anual':'Anual'}[period]||period;
    let badge='badge bg2',estado='OK',podeRenovar=false;
    if(renovacao){
      const diasParaRenovar=Math.round((renovacao-now)/(1000*60*60*24));
      if(diasParaRenovar<=0){badge='badge br2';estado='Renovação disponível';podeRenovar=true;}
      else if(diasParaRenovar<=7){badge='badge ba2';estado='Renovação em '+diasParaRenovar+' dia(s)';}
      else if(diasParaRenovar<=30){badge='badge ba2';estado='Renovação em '+diasParaRenovar+' dias';}
      else{badge='badge bg2';estado='Válido até '+renovacao.toLocaleDateString('pt-PT');}
    }
    html+=`<div style="background:#fff;border:0.5px solid #d4d2ca;border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong>${r.tipo||'—'}</strong> ${r.tamanho?'('+r.tamanho+')':''} <span style="font-size:11px;color:var(--text2)">· ${periodLabel}</span>
        <div style="font-size:12px;color:var(--text2)">Entregue: ${r.data_entrega||'—'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="${badge}">${estado}</span>
        ${podeRenovar?`<button class="bs ba" style="font-size:12px;padding:4px 10px" onclick="pedirRenovacaoEPI('${r.tipo}','${r.tamanho||''}')"><i class="ti ti-refresh"></i> Pedir renovação</button>`:''}
        ${!r.data_confirmacao?`<button class="bs bb" style="font-size:12px;padding:4px 10px" onclick="confirmarRecebimentoEPI('${r.id}')"><i class="ti ti-circle-check"></i> Confirmar recebimento</button>`:`<span style="font-size:11px;color:#3B6D11"><i class="ti ti-circle-check"></i> Recebido em ${new Date(r.data_confirmacao).toLocaleDateString('pt-PT')}</span>`}
      </div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

async function confirmarRecebimentoEPI(epiId){
  const{error}=await sb.from('epis').update({
    data_confirmacao: new Date().toISOString(),
    assinado: true
  }).eq('id',epiId);
  if(error){alert('Erro: '+error.message);return;}
  toast('✅ Recebimento confirmado!');
  loadMeusEPIs();
}

async function pedirRenovacaoEPI(tipo, tamanho){
  // Send email to ADM
  emailjs.send(EJ_SERVICE,'template_ype66lh',{
    name:cu.nome,
    email:cu.email||'geral@fortix.pt',
    nome:'Administração Fortix',
    email_destino:'geral@fortix.pt',
    assunto:`Pedido de renovação EPI — ${cu.nome}`,
    mensagem:`O colaborador ${cu.nome} (NIF: ${cu.nif}) solicita renovação do EPI: ${tipo}${tamanho?' (tamanho: '+tamanho+')':''}.`
  }).then(()=>toast('✅ Pedido enviado à administração!')).catch(e=>{
    console.error('EmailJS error:',e);
    toast('Erro ao enviar. Tente novamente.','erro');
  });
}


// ─────────────────────────────────────────────────────
// MENU COLAPSÁVEL
// ─────────────────────────────────────────────────────
function toggleNavSection(id, chevId){
  const el=document.getElementById(id);
  const chev=document.getElementById(chevId);
  if(!el)return;
  const isOpen=el.style.maxHeight!=='0px';
  el.style.maxHeight=isOpen?'0px':'600px';
  if(chev)chev.style.transform=isOpen?'rotate(-90deg)':'rotate(0deg)';
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const btn=document.getElementById('hamburguerBtn');
  const icon=document.getElementById('hamburguerIcon');
  const isHidden=sb.classList.toggle('hidden-menu');
  if(isHidden){
    // Menu hidden - show hamburger button
    if(btn)btn.style.display='flex';
    if(icon)icon.className='ti ti-menu-2';
  } else {
    // Menu visible - hide hamburger button
    if(btn)btn.style.display='none';
  }
}



// ─────────────────────────────────────────────────────
// FERIADOS NACIONAIS PORTUGAL + HELPERS PONTO
// ─────────────────────────────────────────────────────
function calcPascoa(ano){
  const a=ano%19, b=Math.floor(ano/100), c=ano%100;
  const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const mes=Math.floor((h+l-7*m+114)/31);
  const dia=(h+l-7*m+114)%31+1;
  return new Date(ano,mes-1,dia);
}

function getFeriadosPortugal(ano){
  const pascoa=calcPascoa(ano);
  const addDias=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
  const fmt=(d)=>d.toISOString().split('T')[0];
  return new Set([
    ano+'-01-01', // Ano Novo
    ano+'-04-25', // 25 Abril
    ano+'-05-01', // Dia do Trabalhador
    ano+'-06-10', // Dia de Portugal
    ano+'-08-15', // Assunção
    ano+'-10-05', // Implantação República
    ano+'-11-01', // Todos os Santos
    ano+'-12-01', // Restauração Independência
    ano+'-12-08', // Imaculada Conceição
    ano+'-12-25', // Natal
    fmt(addDias(pascoa,-2)), // Sexta-feira Santa
    fmt(pascoa),             // Páscoa
    fmt(addDias(pascoa,60)), // Corpo de Deus
  ]);
}

function getDiaSemana(dataStr){
  const dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  return dias[new Date(dataStr+'T12:00:00').getDay()];
}

function getTipoDia(dataStr){
  const d=new Date(dataStr+'T12:00:00');
  const dow=d.getDay();
  const feriados=getFeriadosPortugal(d.getFullYear());
  if(feriados.has(dataStr)) return 'feriado';
  if(dow===0) return 'domingo';
  if(dow===6) return 'sabado';
  return 'normal';
}

function calcHorasExtras(totalHoras, tipoDia){
  const result={normais:0,extra25:0,extra375:0,extra50:0,extra100:0,falta:0};
  if(tipoDia==='sabado'){
    result.extra50=totalHoras;
  } else if(tipoDia==='domingo'||tipoDia==='feriado'){
    result.extra100=totalHoras;
  } else {
    // Dia normal
    if(totalHoras<=8){
      result.normais=totalHoras;
      if(totalHoras<8) result.falta=parseFloat((8-totalHoras).toFixed(2));
    } else {
      result.normais=8;
      const extra=totalHoras-8;
      if(extra<=1){
        result.extra25=extra;
      } else {
        result.extra25=1;
        result.extra375=parseFloat((extra-1).toFixed(2));
      }
    }
  }
  return result;
}

// Get current period (21 of prev month to 20 of current month)
function getPeriodoAtual(){
  const hoje=new Date();
  let inicio, fim;
  if(hoje.getDate()>=21){
    inicio=new Date(hoje.getFullYear(),hoje.getMonth(),21);
    fim=new Date(hoje.getFullYear(),hoje.getMonth()+1,20);
  } else {
    inicio=new Date(hoje.getFullYear(),hoje.getMonth()-1,21);
    fim=new Date(hoje.getFullYear(),hoje.getMonth(),20);
  }
  return{
    inicio:inicio.toISOString().split('T')[0],
    fim:fim.toISOString().split('T')[0],
    label:inicio.toLocaleDateString('pt-PT',{day:'numeric',month:'short'})+' → '+fim.toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric'})
  };
}

// Get list of periods (last 12)
function getUltimosPeriodos(){
  const periodos=[];
  const hoje=new Date();
  for(let i=0;i<12;i++){
    const ref=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
    let inicio, fim;
    inicio=new Date(ref.getFullYear(),ref.getMonth()-1,21);
    fim=new Date(ref.getFullYear(),ref.getMonth(),20);
    periodos.push({
      inicio:inicio.toISOString().split('T')[0],
      fim:fim.toISOString().split('T')[0],
      label:inicio.toLocaleDateString('pt-PT',{day:'numeric',month:'short'})+' → '+fim.toLocaleDateString('pt-PT',{day:'numeric',month:'short',year:'numeric'})
    });
  }
  return periodos;
}

// ─────────────────────────────────────────────────────
// SESSÃO - EXPIRAR AUTOMATICAMENTE
// ─────────────────────────────────────────────────────
let sessionTimer=null, warningTimer=null;
const SESSION_TIMEOUT=30*60*1000; // 30 min
const WARNING_TIME=2*60*1000; // 2 min before

function resetSessionTimer(){
  clearTimeout(sessionTimer);
  clearTimeout(warningTimer);
  const warning=document.getElementById('sessionWarning');
  if(warning)warning.style.display='none';
  warningTimer=setTimeout(showSessionWarning, SESSION_TIMEOUT-WARNING_TIME);
  sessionTimer=setTimeout(()=>{ doLogout(); }, SESSION_TIMEOUT);
}

function showSessionWarning(){
  let secs=120;
  let modal=document.getElementById('sessionWarning');
  if(!modal){
    modal=document.createElement('div');
    modal.id='sessionWarning';
    modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.innerHTML=`
      <div style="background:#fff;border-radius:16px;padding:2rem;max-width:320px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
        <div style="width:48px;height:48px;border-radius:50%;background:#FAEEDA;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
          <i class="ti ti-clock" style="font-size:24px;color:#BA7517"></i>
        </div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Sessão prestes a expirar</div>
        <div style="font-size:13px;color:#666;margin-bottom:1.5rem">A sua sessão expira em <strong id="sessionCountdown">2:00</strong>. Deseja continuar?</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button onclick="doLogout()" style="padding:9px 20px;border-radius:8px;border:1px solid #d4d2ca;background:#fff;cursor:pointer;font-size:13px">Sair</button>
          <button onclick="resetSessionTimer()" style="padding:9px 20px;border-radius:8px;border:none;background:#152B55;color:#fff;cursor:pointer;font-size:13px;font-weight:500">Continuar sessão</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display='flex';
  const cdEl=document.getElementById('sessionCountdown');
  const cdInt=setInterval(()=>{
    secs--;
    if(secs<=0){clearInterval(cdInt);return;}
    if(cdEl)cdEl.textContent=Math.floor(secs/60)+':'+(secs%60).toString().padStart(2,'0');
  },1000);
}

function initSessionTimer(){
  ['click','keypress','mousemove','touchstart'].forEach(e=>{
    document.addEventListener(e, resetSessionTimer, {passive:true});
  });
  resetSessionTimer();
}

// ─────────────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────────────
function toggleNotifPanel(e){
  if(e)e.stopPropagation();
  const panel=document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open')){
    if(cu&&cu.is_admin) loadAdmNotifPanel();
    else loadNotificacoes();
  }
}

document.addEventListener('click',function(e){
  const panel=document.getElementById('notifPanel');
  const bell=document.getElementById('notifBell');
  if(panel && bell && !panel.contains(e.target) && !bell.contains(e.target)){
    panel.classList.remove('open');
  }
});

async function loadNotificacoes(){
  if(!cu)return;
  const{data}=await sb.from('notificacoes').select('*').eq('colaborador_id',cu.id).order('criado_em',{ascending:false}).limit(20);
  const lista=document.getElementById('notifLista');
  const badge=document.getElementById('notifBadge');
  if(!data||!data.length){
    if(lista)lista.innerHTML='<div style="padding:2rem;text-align:center;color:var(--text2);font-size:13px"><i class="ti ti-bell-off" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.4"></i>Sem notificações</div>';
    if(badge)badge.style.display='none';
    return;
  }
  const naoLidas=data.filter(n=>!n.lida).length;
  if(badge){
    badge.textContent=naoLidas;
    badge.style.display=naoLidas>0?'flex':'none';
  }
  const icons={recibo:'ti-file-invoice',epi:'ti-shield-check',documento:'ti-id-badge',ficha:'ti-id-badge-2'};
  const cores={recibo:'#FCEBEB,#E24B4A',epi:'#FAEEDA,#BA7517',documento:'#FCEBEB,#E24B4A',ficha:'#FAEEDA,#BA7517'};
  let html='';
  data.forEach(n=>{
    const [bg,fc]=(cores[n.tipo]||'#f9f8f5,#555').split(',');
    const icon=icons[n.tipo]||'ti-bell';
    const tempo=new Date(n.criado_em).toLocaleDateString('pt-PT');
    html+=`<div class="notif-item ${n.lida?'':'unread'}" onclick="lerNotificacao('${n.id}',this)">
      <div style="width:34px;height:34px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ${icon}" style="font-size:16px;color:${fc}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:${n.lida?'400':'600'};color:var(--text)">${n.titulo}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">${n.mensagem}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">${tempo}</div>
      </div>
    </div>`;
  });
  if(lista)lista.innerHTML=html;
}

async function lerNotificacao(id,el){
  await sb.from('notificacoes').update({lida:true}).eq('id',id);
  if(el)el.classList.remove('unread');
  // Update badge
  const badge=document.getElementById('notifBadge');
  if(badge){
    const count=parseInt(badge.textContent)||0;
    const newCount=Math.max(0,count-1);
    badge.textContent=newCount;
    badge.style.display=newCount>0?'flex':'none';
  }
}

async function marcarTodasLidas(){
  if(!cu)return;
  await sb.from('notificacoes').update({lida:true}).eq('colaborador_id',cu.id).eq('lida',false);
  loadNotificacoes();
  toast('Notificações marcadas como lidas');
}

async function criarNotificacao(colaboradorId,tipo,titulo,mensagem){
  await sb.from('notificacoes').insert({colaborador_id:colaboradorId,tipo,titulo,mensagem});
}

async function initNotificacoes(){
  if(!cu)return;
  const bell=document.getElementById('notifBell');
  if(bell)bell.style.display='flex';

  if(cu.is_admin){
    // For ADM: count pending items
    await loadAdmNotifBadge();
  } else {
    // For colaborador: count unread notifications
    const{count}=await sb.from('notificacoes').select('*',{count:'exact',head:true}).eq('colaborador_id',cu.id).eq('lida',false);
    const badge=document.getElementById('notifBadge');
    if(badge){
      badge.textContent=count||0;
      badge.style.display=(count&&count>0)?'flex':'none';
    }
  }
}

async function loadAdmNotifBadge(){
  const hoje=new Date().toISOString().split('T')[0];
  const now=new Date();
  const em30=new Date();em30.setDate(em30.getDate()+30);

  const[
    {count:fichasPend},
    {data:episRen},
    {data:fichasDoc},
    {count:recibos}
  ]=await Promise.all([
    sb.from('colaboradores').select('*',{count:'exact',head:true}).eq('ficha_pendente',true).eq('ativo',true),
    sb.from('epis').select('proximo_renovacao').lte('proximo_renovacao',hoje),
    sb.from('fichas').select('validade_doc').not('validade_doc','is',null),
    sb.from('recibos').select('*',{count:'exact',head:true}).eq('assinado',false)
  ]);

  const docsExp=(fichasDoc||[]).filter(f=>{
    if(!f.validade_doc)return false;
    const v=new Date(f.validade_doc);
    return v<=em30&&v>=now;
  }).length;

  const total=(fichasPend||0)+(episRen||[]).length+docsExp+(recibos||0);
  const badge=document.getElementById('notifBadge');
  if(badge){
    badge.textContent=total;
    badge.style.display=total>0?'flex':'none';
  }

  // Store for panel
  window._admAlerts={fichasPend:fichasPend||0,episRen:(episRen||[]).length,docsExp,recibos:recibos||0};
}

async function loadAdmNotifPanel(){
  const lista=document.getElementById('notifLista');
  if(!lista)return;
  const a=window._admAlerts||{fichasPend:0,episRen:0,docsExp:0,recibos:0};
  let html='';

  if(a.fichasPend>0){
    html+=`<div class="notif-item unread" onclick="showP('acolab');toggleNotifPanel()">
      <div style="width:34px;height:34px;border-radius:50%;background:#FAEEDA;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-id-badge" style="font-size:16px;color:#BA7517"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${a.fichasPend} ficha(s) pendente(s)</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Colaboradores aguardam preenchimento ADM</div>
      </div>
    </div>`;
  }

  if(a.episRen>0){
    html+=`<div class="notif-item unread" onclick="showP('epis');toggleNotifPanel()">
      <div style="width:34px;height:34px;border-radius:50%;background:#FCEBEB;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-shield-x" style="font-size:16px;color:#E24B4A"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${a.episRen} EPI(s) a renovar</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Data de renovação ultrapassada</div>
      </div>
    </div>`;
  }

  if(a.docsExp>0){
    html+=`<div class="notif-item unread" onclick="showP('alertas');toggleNotifPanel()">
      <div style="width:34px;height:34px;border-radius:50%;background:#FAEEDA;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-alert-triangle" style="font-size:16px;color:#BA7517"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${a.docsExp} documento(s) a expirar</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Expira nos próximos 30 dias</div>
      </div>
    </div>`;
  }

  if(a.recibos>0){
    html+=`<div class="notif-item unread" onclick="showP('assinaturas');toggleNotifPanel()">
      <div style="width:34px;height:34px;border-radius:50%;background:#E6F1FB;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="ti ti-file-invoice" style="font-size:16px;color:#185FA5"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${a.recibos} recibo(s) por assinar</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Aguardam assinatura dos colaboradores</div>
      </div>
    </div>`;
  }

  if(!html){
    html='<div style="padding:2rem;text-align:center;color:var(--text2);font-size:13px"><i class="ti ti-circle-check" style="font-size:32px;display:block;margin-bottom:8px;color:#3B6D11;opacity:0.6"></i>Tudo em ordem!</div>';
  }

  lista.innerHTML=html;
}

// ─────────────────────────────────────────────────────
// RELATÓRIO DE AUSÊNCIAS
// ─────────────────────────────────────────────────────
async function initAusencias(){
  const periodo=getPeriodoAtual();
  const iniEl=document.getElementById('ausDataInicio');
  const fimEl=document.getElementById('ausDataFim');
  if(iniEl&&!iniEl.value)iniEl.value=periodo.inicio;
  if(fimEl&&!fimEl.value)fimEl.value=periodo.fim;
  const selC=document.getElementById('ausColab');
  if(selC && selC.options.length<=1){
    const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
    if(colabs)colabs.forEach(c=>{
      const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;selC.appendChild(o);
    });
  }
  loadAusencias();
}

function getDiasUteis(ano,mes){
  const dias=[];
  const ultimoDia=new Date(ano,mes,0).getDate();
  for(let d=1;d<=ultimoDia;d++){
    const date=new Date(ano,mes-1,d);
    const dow=date.getDay();
    if(dow!==0&&dow!==6)dias.push(date.toISOString().split('T')[0]);
  }
  return dias;
}

async function loadAusencias(){
  const inicio=document.getElementById('ausDataInicio')?.value||'';
  const fim=document.getElementById('ausDataFim')?.value||'';
  const colabId=document.getElementById('ausColab')?.value||'';
  if(!inicio&&!fim)return;
  const today=new Date().toISOString().split('T')[0];

  let query=sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
  if(colabId)query=sb.from('colaboradores').select('id,nome').eq('id',colabId);
  const{data:colabs}=await query;
  if(!colabs||!colabs.length)return;

  // Get business days in range
  const diasUteis=[];
  const startD=new Date(inicio||today);
  const endD=new Date(fim||today);
  for(let d=new Date(startD);d<=endD;d.setDate(d.getDate()+1)){
    const dow=d.getDay();
    if(dow!==0&&dow!==6){
      const str=d.toISOString().split('T')[0];
      if(str<=today)diasUteis.push(str);
    }
  }

  // Get all ponto records for this month
  const{data:pontos}=await sb.from('ponto').select('colaborador_id,data,entrada,saida').gte('data',inicio).lte('data',fim);

  let totalPresencas=0,totalFaltas=0,totalIncomp=0;
  let rows='';

  for(const c of colabs){
    const meusPontos=(pontos||[]).filter(p=>p.colaborador_id===c.id);
    const pontoDias=new Set(meusPontos.map(p=>p.data));
    let presencas=0,faltas=0,incomp=0;
    const detalhes=[];

    diasUteis.forEach(dia=>{
      if(pontoDias.has(dia)){
        const reg=meusPontos.find(p=>p.data===dia);
        if(reg&&reg.entrada&&reg.saida){presencas++;detalhes.push({dia,estado:'ok'});}
        else{incomp++;detalhes.push({dia,estado:'incomp'});}
      } else {
        faltas++;detalhes.push({dia,estado:'falta'});
      }
    });

    totalPresencas+=presencas;totalFaltas+=faltas;totalIncomp+=incomp;
    const total=presencas+faltas+incomp||1;
    const pct=Math.round((presencas/total)*100);
    const cor=pct>=90?'#3B6D11':pct>=75?'#BA7517':'#E24B4A';
    const barW=pct+'%';

    const detHtml=detalhes.map(d=>{
      if(d.estado==='ok')return `<span style="background:#EAF3DE;color:#3B6D11;padding:3px 8px;border-radius:6px;font-size:11px">${d.dia.split('-').reverse().slice(0,2).join('/')} ✓</span>`;
      if(d.estado==='incomp')return `<span style="background:#FAEEDA;color:#854F0B;padding:3px 8px;border-radius:6px;font-size:11px">${d.dia.split('-').reverse().slice(0,2).join('/')} ⚠️</span>`;
      return `<span style="background:#FCEBEB;color:#A32D2D;padding:3px 8px;border-radius:6px;font-size:11px">${d.dia.split('-').reverse().slice(0,2).join('/')} ✗</span>`;
    }).join('');

    const rid='aus_'+c.id.replace(/-/g,'');
    rows+=`<tr>
      <td><strong>${c.nome}</strong></td>
      <td style="text-align:center;color:#3B6D11;font-weight:500">${presencas}</td>
      <td style="text-align:center;color:#E24B4A;font-weight:500">${faltas}</td>
      <td style="text-align:center;color:#BA7517;font-weight:500">${incomp}</td>
      <td style="text-align:center;min-width:100px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;background:#f0ede6;border-radius:4px;height:6px"><div style="background:${cor};border-radius:4px;height:6px;width:${barW}"></div></div>
          <span style="font-size:12px;color:${cor};font-weight:500">${pct}%</span>
        </div>
      </td>
      <td style="text-align:center">
        <button onclick="toggleAusDetalhe('${rid}')" style="font-size:12px;padding:4px 10px;border-radius:6px;border:0.5px solid #d4d2ca;cursor:pointer">Ver dias</button>
      </td>
    </tr>
    <tr id="${rid}" style="display:none;background:var(--blu)">
      <td colspan="6" style="padding:10px 14px"><div style="display:flex;flex-wrap:wrap;gap:6px">${detHtml}</div></td>
    </tr>`;
  }

  document.getElementById('ausStats').innerHTML=`
    <div style="background:var(--blu);border-radius:8px;padding:1rem"><div style="font-size:12px;color:var(--text2)">Dias úteis</div><div style="font-size:22px;font-weight:600;color:var(--blue)">${diasUteis.length}</div></div>
    <div style="background:#EAF3DE;border-radius:8px;padding:1rem"><div style="font-size:12px;color:#3B6D11">Presenças</div><div style="font-size:22px;font-weight:600;color:#3B6D11">${totalPresencas}</div></div>
    <div style="background:#FCEBEB;border-radius:8px;padding:1rem"><div style="font-size:12px;color:#A32D2D">Faltas</div><div style="font-size:22px;font-weight:600;color:#E24B4A">${totalFaltas}</div></div>
    <div style="background:#FAEEDA;border-radius:8px;padding:1rem"><div style="font-size:12px;color:#854F0B">Incompletos</div><div style="font-size:22px;font-weight:600;color:#BA7517">${totalIncomp}</div></div>`;

  document.getElementById('ausTabela').innerHTML=`<table><thead><tr>
    <th>Colaborador</th><th>Presenças</th><th>Faltas</th><th>Incompletos</th><th>% Presença</th><th>Detalhe</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function toggleAusDetalhe(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.style.display=el.style.display==='none'?'table-row':'none';
}


// ─────────────────────────────────────────────────────
// DASHBOARD ADM MELHORADO
// ─────────────────────────────────────────────────────
async function loadDashAdm(){
  if(!cu||!cu.is_admin)return;
  const hoje=new Date().toISOString().split('T')[0];
  const now=new Date();

  const[
    {count:totalColabs},
    {data:fichasPendentes},
    {count:recibosNaoAssinados},
    {data:episRenovar},
    {data:fichasData},
    {count:registosHoje}
  ]=await Promise.all([
    sb.from('colaboradores').select('*',{count:'exact',head:true}).eq('ativo',true),
    sb.from('colaboradores').select('id,nome,nif').eq('ficha_pendente',true).eq('ativo',true),
    sb.from('recibos').select('*',{count:'exact',head:true}).eq('assinado',false),
    sb.from('epis').select('*,colaboradores(nome)').lte('proximo_renovacao',hoje),
    sb.from('fichas').select('validade_doc').not('validade_doc','is',null),
    sb.from('ponto').select('*',{count:'exact',head:true}).eq('data',hoje)
  ]);

  const em90=new Date();em90.setDate(em90.getDate()+90);
  const docsExpirando=(fichasData||[]).filter(f=>{
    if(!f.validade_doc)return false;
    const v=new Date(f.validade_doc);
    return v<=em90&&v>=now;
  }).length;

  const pendentes=(fichasPendentes||[]).length;
  const nEpisRenovar=(episRenovar||[]).length;

  // Build fichas pendentes expandable list
  const fichasHTML=(fichasPendentes||[]).map(c=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid #E8C97A;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:500">${c.nome}</div>
        <div style="font-size:12px;color:#854F0B">NIF: ${c.nif}</div>
      </div>
      <button onclick="window.open('https://fortix-solutions.github.io/Ficha-Colaborador-Fortix/?adm=1&nif=${c.nif}','_blank')" style="font-size:12px;padding:5px 12px;border-radius:8px;border:none;background:#BA7517;color:#fff;cursor:pointer">Completar ficha</button>
    </div>`).join('');

  // Build EPIs expandable list
  const episHTML=(episRenovar||[]).map(e=>{
    const nome=e.colaboradores?.nome||'—';
    const diasAtraso=e.proximo_renovacao?Math.abs(Math.round((new Date(e.proximo_renovacao)-now)/(1000*60*60*24))):0;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid #F09595;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:500">${nome}</div>
        <div style="font-size:12px;color:#A32D2D">${e.tipo||'—'} ${e.tamanho?'('+e.tamanho+')':''} · Expirou há ${diasAtraso} dia(s)</div>
      </div>
      <button onclick="showP('epis')" style="font-size:12px;padding:5px 12px;border-radius:8px;border:none;background:#152B55;color:#fff;cursor:pointer">Ver EPI</button>
    </div>`;
  }).join('');

  const dashEl=document.getElementById('dashAdmContent')||document.getElementById('dashContent');
  if(!dashEl)return;

  dashEl.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:1.5rem">
      <div style="background:#fff;border:0.5px solid var(--border);border-radius:12px;padding:1rem;cursor:pointer" onclick="showP('acolab')">
        <div style="font-size:12px;color:var(--text2)">Colaboradores ativos</div>
        <div style="font-size:28px;font-weight:600;color:#152B55">${totalColabs||0}</div>
      </div>
      <div style="background:${pendentes?'#FAEEDA':'#EAF3DE'};border-radius:12px;padding:1rem;cursor:pointer" onclick="toggleDashPanel('fichasPendPanel')">
        <div style="font-size:12px;color:${pendentes?'#854F0B':'#3B6D11'}">Fichas pendentes</div>
        <div style="font-size:28px;font-weight:600;color:${pendentes?'#BA7517':'#3B6D11'}">${pendentes||0}</div>
        ${pendentes?'<div style="font-size:11px;color:#854F0B;margin-top:4px">▼ clique para ver</div>':''}
      </div>
      <div style="background:${recibosNaoAssinados?'#FCEBEB':'#EAF3DE'};border-radius:12px;padding:1rem;cursor:pointer" onclick="showP('assinaturas')">
        <div style="font-size:12px;color:${recibosNaoAssinados?'#A32D2D':'#3B6D11'}">Recibos p/ assinar</div>
        <div style="font-size:28px;font-weight:600;color:${recibosNaoAssinados?'#E24B4A':'#3B6D11'}">${recibosNaoAssinados||0}</div>
      </div>
      <div style="background:${nEpisRenovar?'#FCEBEB':'#EAF3DE'};border-radius:12px;padding:1rem;cursor:pointer" onclick="toggleDashPanel('episRenovPanel')">
        <div style="font-size:12px;color:${nEpisRenovar?'#A32D2D':'#3B6D11'}">EPIs a renovar</div>
        <div style="font-size:28px;font-weight:600;color:${nEpisRenovar?'#E24B4A':'#3B6D11'}">${nEpisRenovar||0}</div>
        ${nEpisRenovar?'<div style="font-size:11px;color:#A32D2D;margin-top:4px">▼ clique para ver</div>':''}
      </div>
      <div style="background:${docsExpirando?'#FAEEDA':'#EAF3DE'};border-radius:12px;padding:1rem;cursor:pointer" onclick="showP('alertas')">
        <div style="font-size:12px;color:${docsExpirando?'#854F0B':'#3B6D11'}">Docs a expirar</div>
        <div style="font-size:28px;font-weight:600;color:${docsExpirando?'#BA7517':'#3B6D11'}">${docsExpirando||0}</div>
      </div>
      <div style="background:#EAF3DE;border-radius:12px;padding:1rem;cursor:pointer" onclick="showP('apontos')">
        <div style="font-size:12px;color:#3B6D11">Registos hoje</div>
        <div style="font-size:28px;font-weight:600;color:#3B6D11">${registosHoje||0}</div>
      </div>
    </div>

    ${pendentes?`<div id="fichasPendPanel" style="display:none;background:#fff;border:0.5px solid #E8C97A;border-radius:12px;overflow:hidden;margin-bottom:1rem">
      <div style="padding:10px 14px;background:#FAEEDA;border-bottom:0.5px solid #E8C97A;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:500;color:#854F0B"><i class="ti ti-id-badge"></i> Fichas pendentes</div>
        <button onclick="toggleDashPanel('fichasPendPanel')" style="background:none;border:none;cursor:pointer;color:#854F0B;font-size:18px">×</button>
      </div>
      ${fichasHTML}
    </div>`:''}

    ${nEpisRenovar?`<div id="episRenovPanel" style="display:none;background:#fff;border:0.5px solid #F09595;border-radius:12px;overflow:hidden;margin-bottom:1rem">
      <div style="padding:10px 14px;background:#FCEBEB;border-bottom:0.5px solid #F09595;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:500;color:#A32D2D"><i class="ti ti-shield-x"></i> EPIs a renovar</div>
        <button onclick="toggleDashPanel('episRenovPanel')" style="background:none;border:none;cursor:pointer;color:#A32D2D;font-size:18px">×</button>
      </div>
      ${episHTML}
    </div>`:''}`;
}

function toggleDashPanel(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
}



// ─────────────────────────────────────────────────────
// EXPORTAR RELATÓRIOS - PDF E EXCEL
// ─────────────────────────────────────────────────────
function exportarRelatorioExcel(dados, nomeFile){
  if(!dados||!dados.length){toast('Sem dados para exportar','erro');return;}
  const headers=Object.keys(dados[0]);
  const rows=[headers,...dados.map(r=>headers.map(h=>r[h]||''))];
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const bom='\uFEFF';
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=nomeFile+'.csv';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('✅ Ficheiro exportado!');
}

function exportarRelatorioPDF(titulo, headers, rows){
  const win=window.open('','_blank');
  const agora=new Date().toLocaleDateString('pt-PT');
  const tableRows=rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${titulo}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#1a1a18}
      h1{font-size:18px;color:#152B55;margin-bottom:4px}
      .sub{font-size:12px;color:#888;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th{background:#152B55;color:#fff;padding:8px 10px;text-align:left;font-weight:500}
      td{padding:8px 10px;border-bottom:1px solid #e8e6df}
      tr:nth-child(even) td{background:#f9f8f5}
      .footer{margin-top:20px;font-size:11px;color:#888;text-align:right}
    </style>
  </head><body>
    <h1>${titulo}</h1>
    <div class="sub">Fortix Solutions, Lda. &nbsp;|&nbsp; Gerado em ${agora}</div>
    <table>
      <thead><tr>${headers.map(h=>'<th>'+h+'</th>').join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">Fortix Solutions · geral@fortix.pt</div>
  </body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

async function exportarRelatorioHorasPDF(){
  const inicio=document.getElementById('relDataInicio')?.value||'';
  const fim=document.getElementById('relDataFim')?.value||'';
  const colabId=document.getElementById('relColab')?.value||'';
  if(!inicio&&!fim){toast('Selecione um período','erro');return;}
  let query=sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(500);
  if(inicio)query=query.gte('data',inicio);
  if(fim)query=query.lte('data',fim);
  if(colabId)query=query.eq('colaborador_id',colabId);
  const{data}=await query;
  if(!data||!data.length){toast('Sem dados','erro');return;}
  const map={};
  data.forEach(r=>{
    const nome=r.colaboradores?.nome||'—';
    if(!map[nome])map[nome]={nome,dias:0,horas:0};
    map[nome].dias++;
    map[nome].horas+=(parseFloat(r.total_horas)||0);
  });
  const periodoLabel=(inicio||'')+(fim?' até '+fim:'');
  const rows=Object.values(map).map(v=>[v.nome,v.dias,v.horas.toFixed(1)+'h',(v.horas/v.dias).toFixed(1)+'h']);
  exportarRelatorioPDF('Relatório de horas — '+periodoLabel,['Colaborador','Dias','Total horas','Média/dia'],rows);
}

async function exportarRelatorioHorasExcel(){
  const inicio=document.getElementById('relDataInicio')?.value||'';
  const fim=document.getElementById('relDataFim')?.value||'';
  const colabId=document.getElementById('relColab')?.value||'';
  if(!inicio&&!fim){toast('Selecione um período','erro');return;}
  let query=sb.from('ponto').select('*,colaboradores(nome)').gte('data',inicio).lte('data',fim).order('data',{ascending:true});
  if(colabId)query=query.eq('colaborador_id',colabId);
  const{data}=await query;
  if(!data||!data.length){toast('Sem dados','erro');return;}
  const rows=data.map(r=>({'Colaborador':r.colaboradores?.nome||'—','Data':r.data,'Entrada':r.entrada||'','Início pausa':r.inicio_pausa||'','Fim pausa':r.fim_pausa||'','Saída':r.saida||'','Total horas':r.total_horas||''}));
  const periodoLabel2=(inicio||'')+(fim?'_'+fim:'');
  exportarRelatorioExcel(rows,'Relatorio_Horas_'+periodoLabel2);
}

async function exportarAusenciasPDF(){
  const inicio=document.getElementById('ausDataInicio')?.value||'';
  const fim=document.getElementById('ausDataFim')?.value||'';
  if(!inicio&&!fim){toast('Selecione um período','erro');return;}
  const hoje=new Date().toISOString().split('T')[0];
  const diasUteis=[];
  const startD=new Date(inicio||hoje);
  const endD=new Date(fim||hoje);
  for(let d=new Date(startD);d<=endD;d.setDate(d.getDate()+1)){
    const dow=d.getDay();
    if(dow!==0&&dow!==6){const str=d.toISOString().split('T')[0];if(str<=hoje)diasUteis.push(str);}
  }
  const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
  const{data:pontos}=await sb.from('ponto').select('colaborador_id,data,entrada,saida').gte('data',inicio).lte('data',fim);
  const rows=(colabs||[]).map(c=>{
    const meusPontos=(pontos||[]).filter(p=>p.colaborador_id===c.id);
    const pontoDias=new Set(meusPontos.map(p=>p.data));
    let presencas=0,faltas=0,incomp=0;
    diasUteis.forEach(dia=>{
      if(pontoDias.has(dia)){
        const reg=meusPontos.find(p=>p.data===dia);
        if(reg&&reg.entrada&&reg.saida)presencas++;
        else incomp++;
      } else faltas++;
    });
    const pct=Math.round((presencas/(diasUteis.length||1))*100);
    return [c.nome,diasUteis.length,presencas,faltas,incomp,pct+'%'];
  });
  const mesLabel=new Date(parseInt(ano),parseInt(m)-1,1).toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
  exportarRelatorioPDF('Relatório de ausências — '+(inicio||'')+(fim?' até '+fim:''),['Colaborador','Dias úteis','Presenças','Faltas','Incompletos','% Presença'],rows);
}

async function exportarAusenciasExcel(){
  const inicio=document.getElementById('ausDataInicio')?.value||'';
  const fim=document.getElementById('ausDataFim')?.value||'';
  if(!inicio&&!fim){toast('Selecione um período','erro');return;}
  const hoje=new Date().toISOString().split('T')[0];
  const diasUteis=[];
  const startD2=new Date(inicio||hoje);
  const endD2=new Date(fim||hoje);
  for(let d=new Date(startD2);d<=endD2;d.setDate(d.getDate()+1)){
    const dow=d.getDay();
    if(dow!==0&&dow!==6){const str=d.toISOString().split('T')[0];if(str<=hoje)diasUteis.push(str);}
  }
  const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
  const{data:pontos}=await sb.from('ponto').select('colaborador_id,data,entrada,saida').gte('data',inicio).lte('data',fim);
  const rows=(colabs||[]).map(c=>{
    const meusPontos=(pontos||[]).filter(p=>p.colaborador_id===c.id);
    const pontoDias=new Set(meusPontos.map(p=>p.data));
    let presencas=0,faltas=0,incomp=0;
    diasUteis.forEach(dia=>{
      if(pontoDias.has(dia)){const reg=meusPontos.find(p=>p.data===dia);if(reg&&reg.entrada&&reg.saida)presencas++;else incomp++;}
      else faltas++;
    });
    const pct=Math.round((presencas/(diasUteis.length||1))*100);
    return{'Colaborador':c.nome,'Dias úteis':diasUteis.length,'Presenças':presencas,'Faltas':faltas,'Incompletos':incomp,'% Presença':pct+'%'};
  });
  const mesLabel=new Date(parseInt(ano),parseInt(m)-1,1).toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
  exportarRelatorioExcel(rows,'Ausencias_'+(inicio||'')+(fim?'_'+fim:''));
}

async function exportarPontosPDF(){
  const colabId=document.getElementById('pontosFilterColab')?.value||'';
  const dataInicio=document.getElementById('pontosDataInicio')?.value||'';
  const dataFim=document.getElementById('pontosDataFim')?.value||'';
  let query=sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(500);
  if(colabId)query=query.eq('colaborador_id',colabId);
  if(dataInicio)query=query.gte('data',dataInicio);
  if(dataFim)query=query.lte('data',dataFim);
  const{data}=await query;
  if(!data||!data.length){toast('Sem dados','erro');return;}

  const diasPT=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const rows=data.map(r=>{
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const diaSem=getDiaSemana(r.data);
    const calc=calcHorasExtras(h,tipo);
    const dataFmt=r.data?r.data.split('-').reverse().join('/'):'—';
    const pausa=r.inicio_pausa&&r.fim_pausa?r.inicio_pausa+'–'+r.fim_pausa:'—';

    let tipoStr='Normal';
    if(tipo==='sabado') tipoStr='Sábado (50%)';
    else if(tipo==='domingo') tipoStr='Domingo (100%)';
    else if(tipo==='feriado') tipoStr='Feriado (100%)';
    else if(calc.falta>0) tipoStr='-'+calc.falta.toFixed(1)+'h em falta';
    else{
      let parts=[];
      if(calc.extra25>0) parts.push('+'+calc.extra25.toFixed(1)+'h 25%');
      if(calc.extra375>0) parts.push('+'+calc.extra375.toFixed(1)+'h 37,5%');
      if(parts.length) tipoStr=parts.join(' | ');
    }

    return[
      dataFmt,
      diaSem,
      r.entrada||'—',
      pausa,
      r.saida||'—',
      h>0?h.toFixed(1)+'h':'—',
      tipoStr
    ];
  });

  // Get colaborador name for title
  const nomeColab=data[0]?.colaboradores?.nome||'Todos os colaboradores';
  const periodo=(dataInicio||'')+(dataFim?' até '+dataFim:'');
  exportarRelatorioPDF(
    'Folha de ponto — '+nomeColab+(periodo?' | '+periodo:''),
    ['Data','Dia','Entrada','Pausa','Saída','Total','Tipo/Extra'],
    rows
  );
}

async function exportarPontosExcel(){
  const colabId=document.getElementById('pontosFilterColab')?.value||'';
  const dataInicio=document.getElementById('pontosDataInicio')?.value||'';
  const dataFim=document.getElementById('pontosDataFim')?.value||'';
  let query=sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(500);
  if(colabId)query=query.eq('colaborador_id',colabId);
  if(dataInicio)query=query.gte('data',dataInicio);
  if(dataFim)query=query.lte('data',dataFim);
  const{data}=await query;
  if(!data||!data.length){toast('Sem dados','erro');return;}
  const rows=data.map(r=>{
    const h=parseFloat(r.total_horas)||0;
    const tipo=getTipoDia(r.data);
    const calc=calcHorasExtras(h,tipo);
    const pausa=r.inicio_pausa&&r.fim_pausa?r.inicio_pausa+'–'+r.fim_pausa:'—';
    return{
      'Colaborador':r.colaboradores?.nome||'—',
      'Data':r.data?r.data.split('-').reverse().join('/'):'—',
      'Dia':getDiaSemana(r.data),
      'Entrada':r.entrada||'—',
      'Pausa':pausa,
      'Saída':r.saida||'—',
      'Total horas':h>0?h.toFixed(1):'—',
      'H. Normais':calc.normais>0?calc.normais.toFixed(1):'—',
      'Extra 25%':calc.extra25>0?calc.extra25.toFixed(1):'—',
      'Extra 37,5%':calc.extra375>0?calc.extra375.toFixed(1):'—',
      'Sáb 50%':calc.extra50>0?calc.extra50.toFixed(1):'—',
      'Dom/Fer 100%':calc.extra100>0?calc.extra100.toFixed(1):'—',
      'Em falta':calc.falta>0?calc.falta.toFixed(1):'—',
      'Tipo':tipo==='sabado'?'Sábado':tipo==='domingo'?'Domingo':tipo==='feriado'?'Feriado':'Normal'
    };
  });
  exportarRelatorioExcel(rows,'Relatorio_Ponto_'+(dataInicio||'')+(dataFim?'_'+dataFim:''));
}

// ─────────────────────────────────────────────────────
// HISTÓRICO DE ALTERAÇÕES
// ─────────────────────────────────────────────────────
async function registarHistorico(colaboradorId, tipo, descricao, campos){
  try{
    await sb.from('historico_alteracoes').insert({
      colaborador_id:colaboradorId,
      tipo,
      descricao,
      campos:campos?JSON.stringify(campos):null,
      feito_por:cu?.nome||'—',
      criado_em:new Date().toISOString()
    });
  }catch(e){}
}

async function eliminarHistorico(id){
  if(!confirm('Eliminar este registo do histórico?'))return;
  await sb.from('historico_alteracoes').delete().eq('id',id);
  loadHistorico();
  toast('Registo eliminado');
}

async function limparHistorico(){
  const colabId=document.getElementById('histFilterColab')?.value||'';
  const msg=colabId?'Eliminar todo o histórico deste colaborador?':'Eliminar TODO o histórico de alterações?';
  if(!confirm(msg))return;
  let query=sb.from('historico_alteracoes').delete().neq('id','00000000-0000-0000-0000-000000000000');
  if(colabId)query=sb.from('historico_alteracoes').delete().eq('colaborador_id',colabId);
  await query;
  loadHistorico();
  toast('Histórico eliminado');
}

async function loadHistorico(){
  const colabId=document.getElementById('histFilterColab')?.value||'';
  const el=document.getElementById('histContent');
  if(!el)return;
  let query=sb.from('historico_alteracoes').select('*,colaboradores(nome)').order('criado_em',{ascending:false}).limit(50);
  if(colabId)query=query.eq('colaborador_id',colabId);
  const{data}=await query;
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:2rem">Sem registos de alterações</p>';return;}
  const icons={ficha:'ti-pencil',profissional:'ti-briefcase',epi:'ti-shield-check',documento:'ti-upload',colaborador:'ti-user-plus',recibo:'ti-file-invoice'};
  const cores={ficha:'#EAF3DE,#3B6D11',profissional:'#FAEEDA,#BA7517',epi:'#E6F1FB,#185FA5',documento:'#FCEBEB,#E24B4A',colaborador:'#EAF3DE,#3B6D11',recibo:'#E6F1FB,#185FA5'};
  let html='<div style="display:flex;flex-direction:column">';
  data.forEach((h,i)=>{
    const nome=h.colaboradores?.nome||'—';
    const icon=icons[h.tipo]||'ti-history';
    const[bg,fc]=(cores[h.tipo]||'#f9f8f5,#555').split(',');
    const campos=h.campos?JSON.parse(h.campos):[];
    const camposHTML=Array.isArray(campos)&&campos.length?'<div style="display:flex;flex-direction:column;gap:3px;margin-top:6px">'+campos.map(c=>`<div style="font-size:11px;color:${fc};background:${bg};padding:3px 8px;border-radius:6px;font-family:monospace">${c}</div>`).join('')+'</div>':'';
    const data_hora=new Date(h.criado_em).toLocaleDateString('pt-PT')+' · '+new Date(h.criado_em).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    html+=`<div style="display:flex;gap:14px;padding:12px 0;border-bottom:0.5px solid var(--border)">
      <div style="display:flex;flex-direction:column;align-items:center;min-width:36px">
        <div style="width:32px;height:32px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ${icon}" style="font-size:15px;color:${fc}"></i>
        </div>
        ${i<data.length-1?'<div style="width:1px;flex:1;background:var(--border);margin-top:4px"></div>':''}
      </div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
          <div style="font-size:13px;font-weight:500;color:var(--text)">${h.descricao||'—'}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--text2)">${data_hora}</span>
            <button onclick="eliminarHistorico('${h.id}')" style="background:none;border:none;cursor:pointer;color:#E24B4A;padding:0" title="Eliminar"><i class="ti ti-trash" style="font-size:14px"></i></button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px">Colaborador: <strong>${nome}</strong> · Por: ${h.feito_por||'—'}</div>
        ${camposHTML}
      </div>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}

async function initHistorico(){
  const sel=document.getElementById('histFilterColab');
  if(sel&&sel.options.length<=1){
    const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
    if(colabs)colabs.forEach(c=>{
      const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;sel.appendChild(o);
    });
  }
  loadHistorico();
}


// ─────────────────────────────────────────────────────
// NOTIFICAÇÕES PUSH - FIREBASE
// ─────────────────────────────────────────────────────
const VAPID_KEY = 'BGNt8yKFZCWKfV1hKcoLmYGycCDOl4fHGUzQ3NgZkZ3PyepLZ_46OQCUO73Z_xG6vIB6PKpVZvMuvG4XOjefH4o';

async function initPushNotifications(){
  try {
    if(!('Notification' in window) || !firebase.messaging) return;
    const messaging = firebase.messaging();

    // Request permission
    const permission = await Notification.requestPermission();
    if(permission !== 'granted') return;

    // Get token
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if(!token || !cu) return;

    // Save token to Supabase
    await sb.from('colaboradores').update({ push_token: token }).eq('id', cu.id);
    console.log('Push token saved');

    // Handle foreground messages
    messaging.onMessage(function(payload){
      const { title, body } = payload.notification || {};
      if(title) toast('🔔 ' + title + (body ? ' — ' + body : ''));
    });
  } catch(e) {
    console.log('Push notifications not available:', e.message);
  }
}

async function enviarPushColab(colaboradorId, titulo, corpo){
  // Store notification in DB - the actual push is sent server-side
  // For now create in-app notification
  await criarNotificacao(colaboradorId, 'push', titulo, corpo);
}


// ─────────────────────────────────────────────────────
// ANIVERSÁRIOS
// ─────────────────────────────────────────────────────
async function loadAniversarios(){
  const el=document.getElementById('aniversariosContent');
  if(!el)return;
  const{data:fichas}=await sb.from('fichas').select('colaborador_id,data_nasc,colaboradores(nome,email,ativo)');
  if(!fichas||!fichas.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:2rem">Sem datas de nascimento registadas nas fichas</p>';return;}

  const hoje=new Date();
  const anoAtual=hoje.getFullYear();

  const lista=fichas.filter(f=>f.data_nasc&&f.colaboradores?.ativo).map(f=>{
    const nasc=new Date(f.data_nasc);
    const aniversario=new Date(anoAtual, nasc.getMonth(), nasc.getDate());
    if(aniversario<hoje) aniversario.setFullYear(anoAtual+1);
    const diasAte=Math.round((aniversario-hoje)/(1000*60*60*24));
    const idade=anoAtual-nasc.getFullYear()+(diasAte>0?0:0);
    return{
      nome:f.colaboradores?.nome||'—',
      email:f.colaboradores?.email||'',
      data_nasc:f.data_nasc,
      aniversario,
      diasAte,
      idade
    };
  }).sort((a,b)=>a.diasAte-b.diasAte);

  let html='<div style="display:flex;flex-direction:column;gap:10px">';
  lista.forEach(c=>{
    const dataStr=c.aniversario.toLocaleDateString('pt-PT',{day:'numeric',month:'long'});
    let badge,bg,border;
    if(c.diasAte===0){badge='🎉 Hoje!';bg='#FAEEDA';border='#BA7517';}
    else if(c.diasAte<=3){badge='Em '+c.diasAte+' dia(s)';bg='#FCEBEB';border='#E24B4A';}
    else if(c.diasAte<=30){badge=dataStr;bg='#E6F1FB';border='#B5D4F4';}
    else{badge=dataStr;bg='var(--bg)';border='var(--border)';}

    html+=`<div style="background:${bg};border:0.5px solid ${border};border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:50%;background:${border};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🎂</div>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--text)">${c.nome}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${c.idade} anos · ${new Date(c.data_nasc).toLocaleDateString('pt-PT')}</div>
        </div>
      </div>
      <span style="background:${border};color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:500">${badge}</span>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;

  // Send birthday email to colaboradores whose birthday is today
  lista.filter(c=>c.diasAte===0).forEach(async c=>{
    if(!c.email)return;
    try{
      await emailjs.send(EJ_SERVICE,'template_ype66lh',{
        name:c.nome,
        email:c.email,
        nome:c.nome,
        email_destino:c.email,
        assunto:'🎂 Feliz Aniversário, '+c.nome.split(' ')[0]+'! — Fortix Solutions',
        mensagem:'No seu dia especial, toda a equipa da Fortix Solutions deseja-lhe um feliz aniversário! Que este seja um dia incrível, repleto de alegria e momentos especiais. Um brinde a si! 🥂\n\nCom carinho,\nFortix Solutions, Lda.'
      });
    }catch(e){}
  });

  // Update ADM bell badge if birthday in 3 days
  const proximos=lista.filter(c=>c.diasAte<=3).length;
  if(proximos>0) toast('🎂 '+proximos+' aniversário(s) nos próximos 3 dias!');
}

// ─────────────────────────────────────────────────────
// FINANCEIRO
// ─────────────────────────────────────────────────────
async function initFinanceiro(){
  const now=new Date();
  const inicio=now.getFullYear()+'-'+(String(now.getMonth()+1).padStart(2,'0'))+'-01';
  const fim=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().split('T')[0];
  const iniEl=document.getElementById('finDataInicio');
  const fimEl=document.getElementById('finDataFim');
  if(iniEl&&!iniEl.value)iniEl.value=inicio;
  if(fimEl&&!fimEl.value)fimEl.value=fim;

  // Populate colaborador filter
  const sel=document.getElementById('finColab');
  if(sel&&sel.options.length<=1){
    const{data:colabs}=await sb.from('colaboradores').select('id,nome').eq('ativo',true).order('nome');
    if(colabs)colabs.forEach(c=>{
      const o=document.createElement('option');o.value=c.id;o.textContent=c.nome;sel.appendChild(o);
    });
  }
  loadFinanceiro();
}

async function loadFinanceiro(){
  const inicio=document.getElementById('finDataInicio')?.value||'';
  const fim=document.getElementById('finDataFim')?.value||'';
  const colabId=document.getElementById('finColab')?.value||'';
  if(!inicio&&!fim)return;

  // Get colaboradores with salary and price
  let colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).order('nome');
  if(colabId)colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).eq('id',colabId);
  const{data:colabs}=await colabQuery;

  // Get ponto records
  let pontoQuery=sb.from('ponto').select('colaborador_id,data,total_horas').gte('data',inicio||'2000-01-01').lte('data',fim||'2099-12-31');
  if(colabId)pontoQuery=pontoQuery.eq('colaborador_id',colabId);
  const{data:pontos}=await pontoQuery;
  if(!pontos||!pontos.length){
    document.getElementById('finStats').innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos no período selecionado</p>';
    document.getElementById('finTabela').innerHTML='';
    return;
  }

  let totalBruto=0,totalSalario=0,totalAjuda=0;
  let rows='';

  (colabs||[]).forEach(c=>{
    const meusPontos=(pontos||[]).filter(p=>p.colaborador_id===c.id);
    // Calculate hours with extras
    let normais=0,e25=0,e375=0,e50=0,e100=0;
    meusPontos.forEach(p=>{
      const h=parseFloat(p.total_horas)||0;
      const tipo=getTipoDia(p.data);
      const calc=calcHorasExtras(h,tipo);
      normais+=calc.normais;e25+=calc.extra25;e375+=calc.extra375;
      e50+=calc.extra50;e100+=calc.extra100;
    });
    const horas=normais+e25+e375+e50+e100;
    // Extra value: extras are paid at percentage above normal
    const precoHH=parseFloat(c.preco_hh)||0;
    const salario=parseFloat(c.salario_base)||0;
    // Normal hours value + extra percentages
    const valorNormais=normais*precoHH;
    const valorE25=e25*precoHH*1.25;
    const valorE375=e375*precoHH*1.375;
    const valorE50=e50*precoHH*1.50;
    const valorE100=e100*precoHH*2.00;
    const bruto=valorNormais+valorE25+valorE375+valorE50+valorE100;
    const ajuda=bruto-salario;
    totalBruto+=bruto;totalSalario+=salario;totalAjuda+=ajuda;
    const ajudaColor=ajuda>=0?'#EAF3DE,#3B6D11':'#FCEBEB,#E24B4A';
    const[ajBg,ajFc]=ajudaColor.split(',');
    rows+=`<tr>
      <td style="padding:10px 14px;font-weight:500">${c.nome}</td>
      <td style="padding:10px 14px;text-align:center">${normais.toFixed(1)}h</td>
      <td style="padding:10px 14px;text-align:center;color:#3B6D11">${e25>0?e25.toFixed(1)+'h':'—'}</td>
      <td style="padding:10px 14px;text-align:center;color:#3B6D11">${e375>0?e375.toFixed(1)+'h':'—'}</td>
      <td style="padding:10px 14px;text-align:center;color:#BA7517">${e50>0?e50.toFixed(1)+'h':'—'}</td>
      <td style="padding:10px 14px;text-align:center;color:#A32D2D">${e100>0?e100.toFixed(1)+'h':'—'}</td>
      <td style="padding:10px 14px;text-align:center">${precoHH.toFixed(2)} €</td>
      <td style="padding:10px 14px;text-align:center;font-weight:500">${bruto.toFixed(2)} €</td>
      <td style="padding:10px 14px;text-align:center;color:#E24B4A">${salario.toFixed(2)} €</td>
      <td style="padding:10px 14px;text-align:center"><span style="background:${ajBg};color:${ajFc};padding:4px 12px;border-radius:20px;font-weight:600">${ajuda.toFixed(2)} €</span></td>
    </tr>`;
  });

  // Totals row
  rows+=`<tr style="border-top:2px solid var(--border);background:var(--blu)">
    <td style="padding:10px 14px;font-weight:700">Total</td>
    <td style="padding:10px 14px;text-align:center;font-weight:600">—</td>
    <td style="padding:10px 14px;text-align:center">—</td>
    <td style="padding:10px 14px;text-align:center;font-weight:700">${totalBruto.toFixed(2)} €</td>
    <td style="padding:10px 14px;text-align:center;font-weight:700;color:#E24B4A">${totalSalario.toFixed(2)} €</td>
    <td style="padding:10px 14px;text-align:center"><span style="background:#EAF3DE;color:#3B6D11;padding:4px 12px;border-radius:20px;font-weight:700">${totalAjuda.toFixed(2)} €</span></td>
  </tr>`;

  document.getElementById('finStats').innerHTML=`
    <div style="background:#EAF3DE;border-radius:12px;padding:1rem">
      <div style="font-size:12px;color:#3B6D11">Total valor bruto</div>
      <div style="font-size:22px;font-weight:600;color:#3B6D11">${totalBruto.toFixed(2)} €</div>
    </div>
    <div style="background:#FCEBEB;border-radius:12px;padding:1rem">
      <div style="font-size:12px;color:#A32D2D">Total salários</div>
      <div style="font-size:22px;font-weight:600;color:#E24B4A">${totalSalario.toFixed(2)} €</div>
    </div>
    <div style="background:#E6F1FB;border-radius:12px;padding:1rem">
      <div style="font-size:12px;color:#185FA5">Total ajuda de custo</div>
      <div style="font-size:22px;font-weight:600;color:#185FA5">${totalAjuda.toFixed(2)} €</div>
    </div>`;

  document.getElementById('finTabela').innerHTML=`
    <div style="background:#fff;border:0.5px solid var(--border);border-radius:12px;overflow:auto">
      <table style="min-width:800px"><thead><tr>
        <th>Colaborador</th>
        <th>H. Normais</th>
        <th style="color:#3B6D11">H.Extra 25%</th>
        <th style="color:#3B6D11">H.Extra 37,5%</th>
        <th style="color:#BA7517">H.Extra 50%</th>
        <th style="color:#A32D2D">H.Extra 100%</th>
        <th>Preço H.H</th>
        <th>Valor bruto</th>
        <th>Salário base</th>
        <th>Ajuda de custo</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div style="background:var(--blu);border-radius:10px;padding:12px;margin-top:1rem;font-size:12px;color:var(--text2)">
      <i class="ti ti-info-circle"></i> Fórmula: <strong>Horas × Preço H.H = Valor bruto</strong> · <strong>Valor bruto - Salário base = Ajuda de custo</strong>
    </div>`;
}

async function exportarFinanceiroPDF(){
  const inicio=document.getElementById('finDataInicio')?.value||'';
  const fim=document.getElementById('finDataFim')?.value||'';
  const colabId=document.getElementById('finColab')?.value||'';
  let colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).order('nome');
  if(colabId)colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).eq('id',colabId);
  const{data:colabs}=await colabQuery;
  let pontoQuery=sb.from('ponto').select('colaborador_id,data,total_horas').gte('data',inicio||'2000-01-01').lte('data',fim||'2099-12-31');
  if(colabId)pontoQuery=pontoQuery.eq('colaborador_id',colabId);
  const{data:pontos}=await pontoQuery;
  if(!pontos||!pontos.length){
    document.getElementById('finStats').innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos no período selecionado</p>';
    document.getElementById('finTabela').innerHTML='';
    return;
  }
  const rows=(colabs||[]).map(c=>{
    const horas=(pontos||[]).filter(p=>p.colaborador_id===c.id).reduce((a,p)=>a+(parseFloat(p.total_horas)||0),0);
    const bruto=horas*(parseFloat(c.preco_hh)||0);
    const ajuda=bruto-(parseFloat(c.salario_base)||0);
    return[c.nome,horas.toFixed(1)+'h',(parseFloat(c.preco_hh)||0).toFixed(2)+' €',bruto.toFixed(2)+' €',(parseFloat(c.salario_base)||0).toFixed(2)+' €',ajuda.toFixed(2)+' €'];
  });
  exportarRelatorioPDF('Resumo financeiro — '+(inicio||'')+(fim?' até '+fim:''),['Colaborador','Horas','Preço H.H','Valor bruto','Salário base','Ajuda de custo'],rows);
}

async function exportarFinanceiroExcel(){
  const inicio=document.getElementById('finDataInicio')?.value||'';
  const fim=document.getElementById('finDataFim')?.value||'';
  const colabId=document.getElementById('finColab')?.value||'';
  let colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).order('nome');
  if(colabId)colabQuery=sb.from('colaboradores').select('id,nome,salario_base,preco_hh').eq('ativo',true).eq('id',colabId);
  const{data:colabs}=await colabQuery;
  let pontoQuery=sb.from('ponto').select('colaborador_id,data,total_horas').gte('data',inicio||'2000-01-01').lte('data',fim||'2099-12-31');
  if(colabId)pontoQuery=pontoQuery.eq('colaborador_id',colabId);
  const{data:pontos}=await pontoQuery;
  if(!pontos||!pontos.length){
    document.getElementById('finStats').innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos no período selecionado</p>';
    document.getElementById('finTabela').innerHTML='';
    return;
  }
  const rows=(colabs||[]).map(c=>{
    const horas=(pontos||[]).filter(p=>p.colaborador_id===c.id).reduce((a,p)=>a+(parseFloat(p.total_horas)||0),0);
    const bruto=horas*(parseFloat(c.preco_hh)||0);
    const ajuda=bruto-(parseFloat(c.salario_base)||0);
    return{'Colaborador':c.nome,'Horas':horas.toFixed(1),'Preço H.H':parseFloat(c.preco_hh)||0,'Valor bruto':bruto.toFixed(2),'Salário base':parseFloat(c.salario_base)||0,'Ajuda de custo':ajuda.toFixed(2)};
  });
  exportarRelatorioExcel(rows,'Financeiro_'+(inicio||'')+(fim?'_'+fim:''));
}

