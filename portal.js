const SB_URL='https://wbriqlcqfgnpjbxesmdc.supabase.co';
const SB_KEY='sb_publishable_T2GYe2-5dVrXLWZasUzPZQ_DnS7k-27';
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
  const{data,error}=await sb.from('colaboradores').select('*').eq('nif',nif).eq('senha',pwd).eq('ativo',true).maybeSingle();
  if(error||!data){err.style.display='block';return;}
  cu=data;localStorage.setItem('fx_user',JSON.stringify(data));iniciarPortal();
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
  startClock();showP('dash');loadDashboard();
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
  ['dash','ponto','recibos','docs','ficha','acolab','apontos','arecibos','adocs','assinaturas'].forEach(p=>{
    const el=document.getElementById('p-'+p);if(el)el.classList.add('hidden');
    const n=document.getElementById('n-'+p);if(n)n.classList.remove('active');
  });
  const el=document.getElementById('p-'+page);if(el)el.classList.remove('hidden');
  const nav=document.getElementById('n-'+page);if(nav)nav.classList.add('active');
  if(page==='ponto')loadPonto();
  if(page==='recibos')loadRecibos();
  if(page==='docs')loadDocs();
  if(page==='ficha')loadFicha();
  if(page==='acolab')loadAColab();
  if(page==='apontos')loadAPontos();
  if(page==='arecibos')loadARForm();
  if(page==='dash')loadDashboard();
  if(page==='assinaturas')loadAssinaturas();
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
  return '<table><thead><tr><th>Data</th><th>Entrada</th><th>Início pausa</th><th>Fim pausa</th><th>Saída</th><th>Total</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+r.data+'</td><td>'+(r.entrada||'—')+'</td><td>'+(r.inicio_pausa||'—')+'</td><td>'+(r.fim_pausa||'—')+'</td><td>'+(r.saida||'—')+'</td><td>'+(r.total_horas?'<span class="badge bg2">'+r.total_horas+'</span>':'—')+'</td></tr>').join('')+'</tbody></table>';
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
  const{data}=await sb.from('documentos').select('*').order('criado_em',{ascending:false});
  const el=document.getElementById('docsGrid');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem;grid-column:1/-1">Sem documentos</p>';return;}
  let html='';
  data.forEach(d=>{
    html+='<div style="border:1px solid var(--border);border-radius:10px;padding:1rem;cursor:pointer">';
    html+='<i class="ti ti-file-description" style="font-size:28px;color:var(--blue);display:block;margin-bottom:8px"></i>';
    html+='<div style="font-size:14px;font-weight:600;margin-bottom:4px">'+d.titulo+'</div>';
    html+='<div style="font-size:12px;color:var(--text2);margin-bottom:10px">'+(d.descricao||'')+'</div>';
    if(d.ficheiro_url){
      html+='<a href="'+d.ficheiro_url+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;text-decoration:none;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:500"><i class="ti ti-external-link"></i> Abrir documento</a>';
    }
    html+='</div>';
  });
  el.innerHTML=html;
}

async function loadFicha(){
  const u=cu;
  document.getElementById('fichaContent').innerHTML=
    '<div class="fsec"><i class="ti ti-briefcase"></i> Dados profissionais</div>'+
    '<div class="fr"><span class="fl">Nome</span><span>'+u.nome+'</span></div>'+
    '<div class="fr"><span class="fl">NIF</span><span>'+u.nif+'</span></div>'+
    '<div class="fr"><span class="fl">Email</span><span>'+(u.email||'—')+'</span></div>'+
    '<div class="fr"><span class="fl">Cargo</span><span>'+(u.cargo||'—')+'</span></div>'+
    '<div class="fr"><span class="fl">Departamento</span><span>'+(u.departamento||'—')+'</span></div>'+
    '<div class="fr"><span class="fl">Data admissão</span><span>'+(u.data_admissao||'—')+'</span></div>';
}

async function loadAColab(){
  const{data}=await sb.from('colaboradores').select('*').order('nome');
  const el=document.getElementById('aColabLista');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem colaboradores</p>';return;}
  el.innerHTML='<table><thead><tr><th>Nome</th><th>NIF</th><th>Cargo</th><th>1.º login</th><th>Admin</th><th>Estado</th><th>Ação</th></tr></thead><tbody>'+
    data.map(c=>{
      const btnDesativar='<button class="bs" style="font-size:11px;padding:4px 10px;color:var(--red);border-color:#F09595" onclick="toggleAtivo(\'' +c.id+ '\',false)">Desativar</button>';
      const btnReativar='<button class="bs" style="font-size:11px;padding:4px 10px;color:var(--green);border-color:#9fd3a8" onclick="toggleAtivo(\'' +c.id+ '\',true)">Reativar</button>';
      const btnEditar='<button class="bs" style="font-size:11px;padding:4px 10px;margin-right:4px;background:var(--amber);color:#fff;border-color:var(--amber)" onclick="editarColab(\'' +c.id+ '\')">Editar</button>';
      const btnVer='<button class="bs bb" style="font-size:11px;padding:4px 10px;margin-right:4px" onclick="verColab(\'' +c.id+ '\')">Ver dados</button>';
      const btnExcluir='<button class="bs" style="font-size:11px;padding:4px 10px;color:#fff;background:#C0392B;border-color:#C0392B;margin-left:4px" onclick="excluirColab(\'' +c.id+ '\',\'' +c.nome+ '\')">Excluir</button>';
      const acao=btnEditar+btnVer+(c.nif!=='000000000'?(c.ativo?btnDesativar:btnReativar)+btnExcluir:'');
      return '<tr><td><strong>'+c.nome+'</strong></td><td>'+c.nif+'</td><td>'+(c.cargo||'—')+'</td><td>'+(c.troca_senha?'<span class="badge br2">Pendente</span>':'<span class="badge bg2">✓ Trocada</span>')+'</td><td>'+(c.is_admin?'<span class="badge ba2">Sim</span>':'Não')+'</td><td>'+(c.ativo?'<span class="badge bg2">Ativo</span>':'<span class="badge br2">Inativo</span>')+'</td><td>'+acao+'</td></tr>';
    }).join('')+'</tbody></table>';
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
  const{data}=await sb.from('ponto').select('*,colaboradores(nome)').order('data',{ascending:false}).limit(50);
  const el=document.getElementById('aPontosLista');
  if(!data||!data.length){el.innerHTML='<p style="color:var(--text2);font-size:13px;text-align:center;padding:1rem">Sem registos</p>';return;}
  pontosData=data;
  let rows='';
  data.forEach(function(r,i){
    const nome=r.colaboradores?r.colaboradores.nome:'—';
    const total=r.total_horas?'<span class="badge bg2">'+r.total_horas+'</span>':'—';
    rows+='<tr>';
    rows+='<td>'+nome+'</td>';
    rows+='<td>'+(r.data||'—')+'</td>';
    rows+='<td>'+(r.entrada||'—')+'</td>';
    rows+='<td>'+(r.inicio_pausa||'—')+'</td>';
    rows+='<td>'+(r.fim_pausa||'—')+'</td>';
    rows+='<td>'+(r.saida||'—')+'</td>';
    rows+='<td>'+total+'</td>';
    rows+='<td style="white-space:nowrap">';
    rows+='<button class="bs bb" style="font-size:11px;padding:3px 8px;margin-right:3px" onclick="editarPontoIdx('+i+')">Editar</button>';
    rows+='<button class="bs" style="font-size:11px;padding:3px 8px;color:var(--red);border-color:#F09595" onclick="eliminarPontoIdx('+i+')">Eliminar</button>';
    rows+='</td></tr>';
  });
  el.innerHTML='<table><thead><tr><th>Colaborador</th><th>Data</th><th>Entrada</th><th>Início pausa</th><th>Fim pausa</th><th>Saída</th><th>Total</th><th>Ação</th></tr></thead><tbody>'+rows+'</tbody></table>';
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
  const{error}=await sb.from('documentos').insert({titulo,descricao:desc,ficheiro_url});
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
  document.getElementById('vNome').textContent=data.nome||'—';
  document.getElementById('vNif').textContent=data.nif||'—';
  document.getElementById('vEmail').textContent=data.email||'—';
  document.getElementById('vCargo').textContent=data.cargo||'—';
  document.getElementById('vDepto').textContent=data.departamento||'—';
  document.getElementById('vAdmissao').textContent=data.data_admissao||'—';
  document.getElementById('vEstado').textContent=data.ativo?'Ativo':'Inativo';
  document.getElementById('vAdmin').textContent=data.is_admin?'Sim':'Não';
  document.getElementById('vSenha').textContent=data.troca_senha?'Pendente (não trocou ainda)':'Trocada';
  showModal('modalVerColab');
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
  if(!confirm('Tem a certeza que deseja '+acao+' este colaborador?')) return;
  await sb.from('colaboradores').update({ativo}).eq('id',id);
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
  if(!data||!data.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text2)"><i class="ti ti-files" style="font-size:40px;display:block;margin-bottom:10px;opacity:0.4"></i><p style="font-size:14px">Sem recibos assinados</p></div>';return;}
  
  // Group by month/year
  const groups={};
  data.forEach(a=>{
    const key=(a.recibos?.mes||'—')+' '+(a.recibos?.ano||'');
    if(!groups[key])groups[key]=[];
    groups[key].push(a);
  });

  let html='';
  Object.keys(groups).forEach(key=>{
    html+='<div style="margin-bottom:1.5rem">';
    html+='<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--blu);border-radius:10px 10px 0 0;border:1px solid var(--border)">';
    html+='<i class="ti ti-folder" style="color:var(--blue);font-size:18px"></i>';
    html+='<span style="font-size:15px;font-weight:600;color:var(--blue)">'+key+'</span>';
    html+='<span class="badge bb2" style="margin-left:auto">'+groups[key].length+' recibo(s)</span>';
    html+='</div>';
    html+='<div style="border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden">';
    groups[key].forEach((a,i)=>{
      const dataAss=new Date(a.data_assinatura);
      const dataFmt=dataAss.toLocaleDateString('pt-PT')+' às '+dataAss.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
      html+='<div style="padding:12px 16px;border-bottom:'+(i<groups[key].length-1?'1px solid #f0ede6':'none')+';display:flex;align-items:center;gap:14px">';
      html+='<div style="flex:1">';
      html+='<div style="font-size:14px;font-weight:600">'+(a.colaboradores?.nome||'—')+'</div>';
      html+='<div style="font-size:12px;color:var(--text2);margin-top:2px">✅ Assinado em '+dataFmt+'</div>';
      html+='</div>';
      if(a.assinatura_img){
        html+='<div style="text-align:center">';
        html+='<div style="font-size:10px;color:var(--text2);margin-bottom:3px">Assinatura</div>';
        html+='<img src="'+a.assinatura_img+'" style="height:45px;border:1px solid var(--border);border-radius:6px;background:#fff;display:block"/>';
        html+='</div>';
      }
      if(a.recibos?.ficheiro_url){
        html+='<a href="'+a.recibos.ficheiro_url+'" target="_blank" class="bs bb" style="text-decoration:none;font-size:12px;padding:6px 12px;display:inline-flex;align-items:center;gap:5px"><i class="ti ti-file-text"></i> Ver recibo</a>';
      }
      html+='</div>';
    });
    html+='</div></div>';
  });
  el.innerHTML=html;
}

function exportarPontoExcel(){
  const el=document.getElementById('aPontosLista')||document.getElementById('pontoHist');
  const table=el?el.querySelector('table'):null;
  if(!table){alert('Sem dados para exportar');return;}
  let csv='Colaborador,Data,Entrada,Início Pausa,Fim Pausa,Saída,Total\n';
  const rows=table.querySelectorAll('tbody tr');
  rows.forEach(r=>{
    const cells=r.querySelectorAll('td');
    const vals=[];
    for(let i=0;i<Math.min(cells.length,7);i++){
      vals.push('"'+(cells[i].textContent.trim().replace(/"/g,"'"))+'"');
    }
    csv+=vals.join(',')+('\n');
  });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='ponto_fortix.csv';a.click();
  URL.revokeObjectURL(url);
}

function showModal(id){document.getElementById(id).style.display='flex';}
function closeModal(id){document.getElementById(id).style.display='none';}
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m&&m.id!=='modalSenha')m.style.display='none';}));

(function(){
  const s=localStorage.getItem('fx_user');
  if(s){try{cu=JSON.parse(s);iniciarPortal();}catch(e){}}
})();
