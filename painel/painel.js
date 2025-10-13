
(async function(){
  const $ = id => document.getElementById(id);
  const pageProdutos = $('page-produtos'), pageStats = $('page-stats');
  const navProdutos = $('nav-produtos'), navStats = $('nav-stats'), btnLogout = $('btn-logout');
  const prodList = $('product-list'), form = $('product-form'), btnSave = $('btn-save'), btnClear = $('btn-clear');
  const filesInput = $('prod-files'), previewList = $('preview-list');
  const statTotal = $('stat-total'), statNovos = $('stat-novos'), statSemi = $('stat-semi'), statLow = $('stat-low');
  const clicksCtx = document.getElementById('clicksChart').getContext('2d');
  let produtos = [], clicksChart = null;
  async function checkAuth(){ try{ const r = await fetch('/auth/me'); if(!r.ok) throw new Error('unauth'); return true; }catch(e){ window.location.href='/login.html'; return false; } }
  async function load(){ const r = await fetch('/api/produtos'); produtos = await r.json(); renderList(produtos); renderStats(produtos); }
  function renderList(list){
    prodList.innerHTML='';
    if(!list.length){ prodList.innerHTML='<div class="muted">Nenhum produto</div>'; return; }
    list.forEach(p=>{
      const row = document.createElement('div'); row.className='prod-row';
      row.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img class="prod-thumb" src="${p.imagem||'/public/imagens/placeholder.png'}"><div><strong>${p.nome}</strong><div class="muted">Estoque: ${p.estoque} • ${p.categoria}</div></div></div><div><button class="btn" data-id="${p.id}" data-action="edit">Editar</button><button class="btn" style="background:#ff6b6b;color:#fff" data-id="${p.id}" data-action="del">Excluir</button></div>`;
      prodList.appendChild(row);
    });
    prodList.querySelectorAll('button').forEach(b=> b.addEventListener('click', onProdAction));
  }
  function onProdAction(e){
    const id = e.currentTarget.dataset.id; const act = e.currentTarget.dataset.action;
    if(act==='edit') editProduct(id); else if(act==='del'){ if(confirm('Excluir?')) deleteProduct(id); }
  }
  async function editProduct(id){
    const r = await fetch('/api/produtos/'+id); if(!r.ok) return alert('Erro'); const p = await r.json();
    $('prod-id').value = p.id; $('prod-nome').value = p.nome; $('prod-categoria').value = p.categoria; $('prod-estoque').value = p.estoque; $('prod-descricao').value = p.descricao||'';
    previewList.innerHTML = p.imagens.map(u=>`<img src="${u}" style="width:80px;height:56px;object-fit:cover;margin-right:6px">`).join('');
  }
  async function deleteProduct(id){ await fetch('/api/produtos/'+id,{method:'DELETE'}); await load(); }
  filesInput.addEventListener('change', ()=>{
    previewList.innerHTML = '';
    Array.from(filesInput.files).forEach(f=>{
      const url = URL.createObjectURL(f);
      const img = document.createElement('img'); img.src = url; img.style.width='80px'; img.style.height='56px'; img.style.objectFit='cover'; img.style.marginRight='6px';
      previewList.appendChild(img);
    });
  });
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault(); btnSave.disabled=true; btnSave.textContent='Salvando...';
    const id = $('prod-id').value; const payload = { nome:$('prod-nome').value.trim(), categoria:$('prod-categoria').value, estoque:Number($('prod-estoque').value)||0, descricao:$('prod-descricao').value.trim() };
    try{
      // if files chosen, upload first
      let urls = [];
      if(filesInput.files.length>0){
        const fd = new FormData();
        Array.from(filesInput.files).forEach(f=> fd.append('files', f));
        const up = await fetch('/api/upload',{ method:'POST', body: fd });
        const ju = await up.json();
        if(ju.ok) urls = ju.urls;
      }
      if(id){
        if(urls.length) payload.imagens = urls; // replace or append logic could be improved
        await fetch('/api/produtos/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      } else {
        if(urls.length) payload.imagens = urls;
        await fetch('/api/produtos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      }
      clearForm(); await load();
    }catch(err){ alert('Erro ao salvar: '+err.message); } finally { btnSave.disabled=false; btnSave.textContent='Salvar'; }
  });
  btnClear.addEventListener('click', clearForm);
  function clearForm(){ $('prod-id').value=''; $('prod-nome').value=''; $('prod-categoria').value='novo'; $('prod-estoque').value='1'; $('prod-descricao').value=''; filesInput.value=''; previewList.innerHTML=''; }
  function renderStats(list){
    statTotal.textContent = list.length; statNovos.textContent = list.filter(x=>x.categoria==='novo').length; statSemi.textContent = list.filter(x=>x.categoria==='seminovo').length;
    statLow.textContent = list.filter(x=>x.estoque && x.estoque<=2).length;
    // chart
    const labels = list.slice().sort((a,b)=> (b.whatsappClicks||0)-(a.whatsappClicks||0)).slice(0,8).map(p=>p.nome);
    const data = list.slice().sort((a,b)=> (b.whatsappClicks||0)-(a.whatsappClicks||0)).slice(0,8).map(p=>p.whatsappClicks||0);
    if(clicksChart) clicksChart.destroy();
    clicksChart = new Chart(clicksCtx,{ type:'bar', data:{ labels, datasets:[{ label:'Cliques WhatsApp', data, backgroundColor:'rgba(11,110,168,0.8)' }] }, options:{ responsive:true } });
  }
  navProdutos.addEventListener('click', ()=>{ pageProdutos.style.display='block'; pageStats.style.display='none'; $('page-title').textContent='Produtos'; });
  navStats.addEventListener('click', ()=>{ pageProdutos.style.display='none'; pageStats.style.display='block'; $('page-title').textContent='Estatísticas'; if(produtos.length) renderStats(produtos); });
  btnLogout.addEventListener('click', async ()=>{ await fetch('/auth/logout',{method:'POST'}); window.location.href='/'; });
  if(await checkAuth()) await load();
})();
