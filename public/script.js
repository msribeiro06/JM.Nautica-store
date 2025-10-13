document.addEventListener('DOMContentLoaded', () => {
  const whatsNumber = (window.WHATSAPP_NUMBER = '55092991208673');
  const novos = document.getElementById('lista-novos');
  const semi = document.getElementById('lista-seminovos');
  const search = document.getElementById('search');
  const darkToggle = document.getElementById('dark-toggle');
  const areaRestrita = document.getElementById('area-restrita');
  const modal = document.getElementById('modal-login');
  const modalClose = document.getElementById('modal-close');
  const modalForm = document.getElementById('modal-login-form');
  const modalError = document.getElementById('modal-error');
  const cartToggle = document.getElementById('cart-toggle');
  const fecharCarrinhoBtn = document.getElementById('fechar-carrinho');
  const carrinho = document.getElementById('carrinho');
  const whatsappFloat = document.getElementById('btn-whatsapp-float');
  const btnFinalizar = document.getElementById('btn-finalizar');
  const ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  let produtos = [];

  // 🔹 Carrega os produtos do servidor
  async function carregarProdutos() {
    try {
      const res = await fetch('/api/produtos');
      produtos = await res.json();
      render(produtos);
    } catch (err) {
      console.error('Erro ao carregar produtos', err);
    }
  }

  // 🔹 Renderiza os produtos nas listas "novos" e "seminovos"
  function render(list = []) {
    if (!novos || !semi) return;
    novos.innerHTML = '';
    semi.innerHTML = '';

    const q = (search && search.value ? search.value.toLowerCase() : '');

    list.forEach(p => {
      if (q && !(p.nome || '').toLowerCase().includes(q)) return;

      const card = document.createElement('div');
      card.className = 'card-prod';

      const img = document.createElement('img');
      img.src = p.imagem || 'imagens/placeholder.png';
      img.alt = p.nome || 'Produto';
      img.loading = 'lazy';

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = p.nome || '';

      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = p.descricao || '';

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      // ✅ Link compatível com iPhone (sem bloqueio de popup)
      const btn = document.createElement('a');
      btn.className = 'whatsapp-btn';
      btn.href = `https://wa.me/${whatsNumber}?text=${encodeURIComponent('Olá! Tenho interesse no produto: ' + (p.nome || ''))}`;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.textContent = 'Conversar via WhatsApp';
      btn.dataset.id = p.id || '';

      // registra o clique sem bloquear o link
      btn.addEventListener('mousedown', () => {
        fetch('/api/produtos/' + btn.dataset.id + '/click', { method: 'POST' }).catch(() => {});
      });

      actions.appendChild(btn);
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(actions);

      (p.categoria === 'novo' ? novos : semi).appendChild(card);
    });
  }

  // 🔹 Configura botões de rolagem dos catálogos
  function setupScrollButtons() {
    document.querySelectorAll('.scroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const container = document.getElementById(targetId);
        if (!container) return;
        const card = container.querySelector('.card-prod');
        const step = (card ? card.getBoundingClientRect().width : 280) + 16; // largura + gap
        if (btn.classList.contains('scroll-left'))
          container.scrollBy({ left: -step, behavior: 'smooth' });
        else
          container.scrollBy({ left: step, behavior: 'smooth' });
      });
    });

    // suporte a teclado (setas esquerda/direita)
    document.querySelectorAll('.product-list').forEach(list => {
      list.addEventListener('keydown', ev => {
        if (ev.key === 'ArrowRight') {
          list.scrollBy({ left: 300, behavior: 'smooth' });
          ev.preventDefault();
        }
        if (ev.key === 'ArrowLeft') {
          list.scrollBy({ left: -300, behavior: 'smooth' });
          ev.preventDefault();
        }
      });
      list.tabIndex = 0;
    });
  }

  // 🔹 Filtros e interações gerais
  if (search) search.addEventListener('input', () => render(produtos));
  if (darkToggle)
    darkToggle.addEventListener('click', () => document.body.classList.toggle('dark'));

  // 🔹 Modal de login
  if (areaRestrita && modal)
    areaRestrita.addEventListener('click', () => modal.setAttribute('aria-hidden', 'false'));
  if (modalClose && modal)
    modalClose.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));

  if (modalForm && modalError) {
    modalForm.addEventListener('submit', async ev => {
      ev.preventDefault();
      modalError.style.display = 'none';
      const fd = new FormData(modalForm);
      const body = { user: fd.get('user'), pass: fd.get('pass') };
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) window.location.href = '/painel/dashboard.html';
        else {
          const j = await res.json().catch(() => ({}));
          modalError.textContent = j.error || 'Usuário ou senha inválidos';
          modalError.style.display = 'block';
        }
      } catch (err) {
        modalError.textContent = 'Erro de conexão';
        modalError.style.display = 'block';
      }
    });
  }

  // 🔹 Carrinho lateral
  if (fecharCarrinhoBtn && carrinho)
    fecharCarrinhoBtn.addEventListener('click', () => carrinho.classList.remove('open'));

  document.addEventListener('click', e => {
    if (!carrinho || !cartToggle) return;
    if (!carrinho.contains(e.target) && !cartToggle.contains(e.target))
      carrinho.classList.remove('open');
  });

  if (cartToggle && carrinho)
    cartToggle.addEventListener('click', () => carrinho.classList.toggle('open'));

  if (btnFinalizar)
    btnFinalizar.addEventListener('click', () =>
      alert('Finalize via WhatsApp (botão de conversa por produto)')
    );

  // 🔹 Botão flutuante do WhatsApp
  if (whatsappFloat)
    whatsappFloat.addEventListener('click', ev => {
      ev.preventDefault();
      const msg = encodeURIComponent('Olá! Tenho interesse em peças da JM.Náutica Store.');
      window.open('https://wa.me/' + whatsNumber + '?text=' + msg, '_blank', 'noopener');
    });

  // 🔹 Inicializa o catálogo
  carregarProdutos().then(() => setupScrollButtons());
});