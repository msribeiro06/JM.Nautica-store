document.addEventListener('DOMContentLoaded', () => {

  // 👉 BACKEND NA RENDER
  const API = "https://jm-nautica-store.onrender.com";

  const whatsNumber = (window.WHATSAPP_NUMBER = '55092991208673');
  const novos = document.getElementById('lista-novos');
  const semi = document.getElementById('lista-seminovos');
  const search = document.getElementById('search');
  const darkToggle = document.getElementById('dark-toggle');

  let produtos = [];

  // 🔹 Carrega os produtos do servidor
  async function carregarProdutos() {
    try {
      const res = await fetch(`${API}/api/produtos`);
      produtos = await res.json();
      render(produtos);
    } catch (err) {
      console.error('Erro ao carregar produtos', err);
      produtos = [];
      render([]);
    }
  }

  // 🔹 Renderiza os produtos
  function render(list = []) {
    if (!novos || !semi) return;

    novos.innerHTML = '';
    semi.innerHTML = '';

    const q = search?.value?.toLowerCase() || '';

    list.forEach(p => {
      if (q && !(p.nome || '').toLowerCase().includes(q)) return;

      const card = document.createElement('div');
      card.className = 'card-prod';

      // 🔹 Ajuste das imagens (Hostinger)
      let imgUrl = p.imagem;
      
      // Se backend enviar apenas o nome do arquivo:
      if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
        imgUrl = `/imagens/${imgUrl}`;
      }

      const img = document.createElement('img');
      img.src = imgUrl || '/imagens/placeholder.png';
      img.alt = p.nome || 'Produto';
      img.loading = 'lazy';
      card.appendChild(img);

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = p.nome || '';
      card.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = p.descricao || '';
      card.appendChild(desc);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const btn = document.createElement('button');
      btn.className = 'whatsapp-btn';
      btn.type = 'button';
      btn.dataset.id = p.id || '';
      btn.dataset.name = encodeURIComponent(p.nome || '');
      btn.textContent = 'Conversar via WhatsApp';
      actions.appendChild(btn);
      card.appendChild(actions);

      (p.categoria === 'novo' ? novos : semi).appendChild(card);
    });

    attachButtons();
  }

  function attachButtons() {
    document.querySelectorAll('.whatsapp-btn').forEach(b => {
      b.onclick = async (e) => {
        const id = e.currentTarget.dataset.id;
        const name = decodeURIComponent(e.currentTarget.dataset.name || '');

        // 🔹 Agora usando backend render corretamente:
        try {
          await fetch(`${API}/api/produtos/${id}/click`, { method: 'POST' });
        } catch (err) { /* ignore */ }

        const msg = encodeURIComponent('Olá! Tenho interesse no produto: ' + name);
        window.open('https://wa.me/' + whatsNumber + '?text=' + msg, '_blank', 'noopener');
      };
    });
  }

  // 🔹 Scroll
  function setupScrollButtons() {
    document.querySelectorAll('.scroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const container = document.getElementById(targetId);
        if (!container) return;

        const card = container.querySelector('.card-prod');
        const step = (card ? card.getBoundingClientRect().width : 280) + 16;

        container.scrollBy({
          left: btn.classList.contains('scroll-left') ? -step : step,
          behavior: 'smooth'
        });
      });
    });

    // Teclado
    document.querySelectorAll('.product-list').forEach(list => {
      list.tabIndex = 0;
      list.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowRight') { list.scrollBy({ left: 300, behavior: 'smooth' }); ev.preventDefault(); }
        if (ev.key === 'ArrowLeft') { list.scrollBy({ left: -300, behavior: 'smooth' }); ev.preventDefault(); }
      });
    });
  }

  // Filtros gerais
  if (search) search.addEventListener('input', () => render(produtos));
  if (darkToggle) darkToggle.addEventListener('click', () => document.body.classList.toggle('dark'));

  // 🔹 Inicializa
  carregarProdutos().then(() => setupScrollButtons());

});
