'use strict';

// ---------- Dados ----------
const STORAGE_KEY = 'compras.v1';
const CATEGORIES = [
  'Hortifruti', 'Açougue', 'Padaria', 'Laticínios', 'Mercearia', 'Bebidas',
  'Congelados', 'Limpeza', 'Higiene', 'Pet', 'Outros'
];

const $ = (sel) => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseNum = (s) => {
  if (s == null) return 0;
  const t = String(s).trim().replace(/[R$\s]/g, '');
  if (!t) return 0;
  // aceita "1.234,56", "1234,56" e "1234.56"
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = parseFloat(norm);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const fmtNum = (n) => (n ? String(n).replace('.', ',') : '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.lists)) {
      return { lists: data.lists, history: data.history || [], known: data.known || {} };
    }
  } catch (e) { /* armazenamento indisponível ou corrompido */ }
  return { lists: [], history: [], known: {} };
}
let state = load();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Não foi possível salvar no aparelho'); }
}

let currentId = null;
const current = () => state.lists.find((l) => l.id === currentId);
const itemTotal = (it) => (it.price || 0) * (it.qty || 0);
const listTotals = (l) => l.items.reduce((acc, it) => {
  const v = itemTotal(it);
  acc.total += v;
  if (it.done) { acc.cart += v; acc.done++; }
  return acc;
}, { total: 0, cart: 0, done: 0 });

// ---------- Toast ----------
let toastTimer;
function toast(msg, actionLabel, action) {
  const el = $('#toast');
  el.innerHTML = esc(msg);
  if (actionLabel) {
    const b = document.createElement('button');
    b.textContent = actionLabel;
    b.onclick = () => { action(); el.classList.remove('show'); };
    el.appendChild(b);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 5000 : 2500);
}

// ---------- Caixa de diálogo (substitui prompt/confirm) ----------
// Resolve com true (confirmação), o texto digitado (campo) ou null (cancelado).
function ask({ title, message = '', input = null, ok = 'OK', danger = false }) {
  return new Promise((resolve) => {
    const d = $('#askDialog');
    const field = $('#askInput');
    $('#askTitle').textContent = title;
    $('#askMsg').textContent = message;
    $('#askMsg').classList.toggle('hidden', !message);
    field.classList.toggle('hidden', input === null);
    if (input !== null) {
      field.value = input.value || '';
      field.placeholder = input.placeholder || '';
      field.inputMode = input.mode || 'text';
    }
    const okBtn = $('#askOk');
    okBtn.textContent = ok;
    okBtn.className = 'btn ' + (danger ? 'danger-fill' : 'primary');
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      d.close();
      resolve(v);
    };
    $('#formAsk').onsubmit = (e) => { e.preventDefault(); done(input === null ? true : field.value); };
    $('#askCancel').onclick = () => done(null);
    d.oncancel = (e) => { e.preventDefault(); done(null); };
    d.showModal();
    if (input !== null) { field.focus(); field.select(); }
  });
}

// ---------- Navegação ----------
function showLists() {
  currentId = null;
  $('#viewLists').classList.remove('hidden');
  $('#viewList').classList.add('hidden');
  $('#btnBack').classList.add('hidden');
  $('#btnMenu').classList.add('hidden');
  $('#title').textContent = 'Minhas listas';
  renderLists();
}
function openList(id) {
  currentId = id;
  $('#viewLists').classList.add('hidden');
  $('#viewList').classList.remove('hidden');
  $('#btnBack').classList.remove('hidden');
  $('#btnMenu').classList.remove('hidden');
  $('#search').value = '';
  renderList();
  window.scrollTo(0, 0);
}

// ---------- Render: listas ----------
function renderLists() {
  const ul = $('#lists');
  ul.innerHTML = '';
  state.lists.forEach((l) => {
    const t = listTotals(l);
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <div class="grow">
        <div class="name">${esc(l.name)}</div>
        <div class="meta">${t.done}/${l.items.length} itens${l.budget ? ' · orçamento ' + money(l.budget) : ''}</div>
      </div>
      <div class="amount">${money(t.total)}</div>`;
    li.onclick = () => openList(l.id);
    ul.appendChild(li);
  });
  $('#listsEmpty').classList.toggle('hidden', state.lists.length > 0);

  const hs = $('#historySection');
  const hu = $('#history');
  hu.innerHTML = '';
  hs.classList.toggle('hidden', state.history.length === 0);
  state.history.slice(0, 30).forEach((h) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <div class="grow">
        <div class="name">${esc(h.name)}</div>
        <div class="meta">${new Date(h.date).toLocaleDateString('pt-BR')} · ${h.count} itens</div>
      </div>
      <div class="amount">${money(h.total)}</div>`;
    li.onclick = async () => {
      const yes = await ask({ title: 'Remover do histórico?', message: `${h.name} · ${money(h.total)}`, ok: 'Remover', danger: true });
      if (!yes) return;
      state.history = state.history.filter((x) => x.id !== h.id);
      save(); renderLists();
    };
    hu.appendChild(li);
  });
}

// ---------- Render: itens ----------
function renderList() {
  const l = current();
  if (!l) return showLists();
  $('#title').textContent = l.name;

  const t = listTotals(l);
  $('#sumCart').textContent = money(t.cart);
  $('#sumTotal').textContent = money(t.total);
  $('#sumBudget').textContent = l.budget ? money(l.budget) : 'definir';

  const bar = $('#progressBar');
  const warn = $('#budgetWarn');
  if (l.budget) {
    const pct = Math.min(100, (t.cart / l.budget) * 100);
    bar.style.width = pct + '%';
    bar.classList.toggle('over', t.cart > l.budget);
    if (t.cart > l.budget) {
      warn.textContent = `Carrinho passou do orçamento em ${money(t.cart - l.budget)}.`;
      warn.classList.remove('hidden');
    } else if (t.total > l.budget) {
      warn.textContent = `A lista completa passa do orçamento em ${money(t.total - l.budget)}.`;
      warn.classList.remove('hidden');
    } else warn.classList.add('hidden');
  } else {
    bar.style.width = l.items.length ? (t.done / l.items.length) * 100 + '%' : '0';
    bar.classList.remove('over');
    warn.classList.add('hidden');
  }

  const q = $('#search').value.trim().toLowerCase();
  const hideDone = $('#hideDone').checked;
  const visible = l.items.filter((it) => (!q || it.name.toLowerCase().includes(q)) && !(hideDone && it.done));

  const box = $('#items');
  box.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const group = visible.filter((it) => (it.cat || 'Outros') === cat)
      .sort((a, b) => (a.done - b.done) || a.name.localeCompare(b.name, 'pt-BR'));
    if (!group.length) return;
    const h = document.createElement('div');
    h.className = 'cat-title';
    h.textContent = cat;
    box.appendChild(h);
    group.forEach((it) => box.appendChild(itemRow(it)));
  });
  $('#itemsEmpty').classList.toggle('hidden', l.items.length > 0);
  $('#btnFinish').classList.toggle('hidden', l.items.length === 0);
  renderSuggestions();
}

function itemRow(it) {
  const row = document.createElement('div');
  row.className = 'item' + (it.done ? ' done' : '');
  const price = it.price ? `${money(it.price)} / ${it.unit}` : 'sem preço';
  row.innerHTML = `
    <input type="checkbox" ${it.done ? 'checked' : ''} aria-label="Marcar ${esc(it.name)}">
    <div class="grow">
      <div class="name">${esc(it.name)}</div>
      <div class="meta">${fmtNum(it.qty) || 0} ${esc(it.unit)} · ${price}</div>
    </div>
    <div class="amount">${it.price ? money(itemTotal(it)) : ''}</div>
    <div class="qty-btns">
      <button data-d="-1" aria-label="Diminuir">−</button>
      <button data-d="1" aria-label="Aumentar">+</button>
    </div>`;
  row.querySelector('input').onchange = async (e) => {
    it.done = e.target.checked;
    save(); renderList();
    if (it.done && !it.price) {
      // pede o preço na hora de pegar o item
      const p = await ask({
        title: `Preço de ${it.name}`,
        message: `Valor por ${it.unit}. Deixe vazio se não souber.`,
        input: { placeholder: 'Ex: 7,50', mode: 'decimal' },
        ok: 'Salvar preço'
      });
      if (p !== null) it.price = parseNum(p);
    }
    remember(it); save(); renderList();
  };
  row.querySelector('.grow').onclick = () => openEdit(it);
  row.querySelectorAll('.qty-btns button').forEach((b) => {
    b.onclick = () => {
      const step = it.unit === 'kg' || it.unit === 'L' ? 0.5 : 1;
      it.qty = Math.max(0, Math.round(((it.qty || 0) + step * Number(b.dataset.d)) * 100) / 100);
      save(); renderList();
    };
  });
  return row;
}

// Lembra preço/categoria de itens para autocompletar
function remember(it) {
  const key = it.name.trim().toLowerCase();
  const prev = state.known[key] || {};
  state.known[key] = { name: it.name.trim(), cat: it.cat, unit: it.unit, price: it.price || prev.price || 0 };
}
function renderSuggestions() {
  const dl = $('#suggestions');
  dl.innerHTML = Object.values(state.known)
    .map((k) => `<option value="${esc(k.name)}">${k.price ? money(k.price) : ''}</option>`).join('');
}

// ---------- Ações ----------
function fillCats(sel) {
  sel.innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join('');
}
fillCats($('#itemCat'));
fillCats($('#editCat'));
$('#itemCat').value = 'Mercearia';

$('#formNewList').onsubmit = (e) => {
  e.preventDefault();
  const name = $('#newListName').value.trim();
  if (!name) return;
  const l = { id: uid(), name, budget: 0, createdAt: Date.now(), items: [] };
  state.lists.unshift(l);
  save();
  $('#newListName').value = '';
  openList(l.id);
};

$('#itemName').addEventListener('change', () => {
  const k = state.known[$('#itemName').value.trim().toLowerCase()];
  if (!k) return;
  $('#itemCat').value = k.cat || 'Outros';
  $('#itemUnit').value = k.unit || 'un';
  if (k.price && !$('#itemPrice').value) $('#itemPrice').value = fmtNum(k.price);
});

$('#formItem').onsubmit = (e) => {
  e.preventDefault();
  const l = current();
  const name = $('#itemName').value.trim();
  if (!l || !name) return;
  const existing = l.items.find((it) => it.name.toLowerCase() === name.toLowerCase());
  const qty = parseNum($('#itemQty').value) || 1;
  if (existing) {
    existing.qty = (existing.qty || 0) + qty;
    toast(`Quantidade de "${existing.name}" atualizada`);
  } else {
    const it = {
      id: uid(), name, qty,
      unit: $('#itemUnit').value,
      price: parseNum($('#itemPrice').value),
      cat: $('#itemCat').value,
      done: false
    };
    l.items.push(it);
    remember(it);
  }
  save();
  $('#itemName').value = '';
  $('#itemQty').value = '1';
  $('#itemPrice').value = '';
  $('#itemUnit').value = 'un';
  $('#itemName').focus();
  renderList();
};

$('#search').oninput = renderList;
$('#hideDone').onchange = renderList;
$('#btnBack').onclick = showLists;

$('#sumBudget').onclick = async () => {
  const l = current();
  const v = await ask({
    title: 'Orçamento da compra',
    message: 'Quanto você quer gastar? Deixe vazio para remover.',
    input: { value: l.budget ? fmtNum(l.budget) : '', placeholder: 'Ex: 400', mode: 'decimal' },
    ok: 'Salvar'
  });
  if (v === null) return;
  l.budget = parseNum(v);
  save(); renderList();
};

$('#btnFinish').onclick = async () => {
  const l = current();
  const t = listTotals(l);
  if (!t.done) return toast('Marque os itens que você pegou');
  const pending = l.items.length - t.done;
  const yes = await ask({
    title: `Finalizar compra de ${money(t.cart)}?`,
    message: `${t.done} itens vão para o histórico.` +
      (pending ? ` ${pending} item(ns) não marcado(s) continuam na lista.` : ''),
    ok: 'Finalizar'
  });
  if (!yes) return;
  state.history.unshift({ id: uid(), name: l.name, date: Date.now(), total: t.cart, count: t.done });
  l.items.forEach(remember);
  l.items = l.items.filter((it) => !it.done);
  save();
  toast(`Compra registrada: ${money(t.cart)}`);
  if (!l.items.length) showLists(); else renderList();
};

// ---------- Editar item ----------
let editing = null;
function openEdit(it) {
  editing = it;
  $('#editName').value = it.name;
  $('#editQty').value = it.qty;
  $('#editUnit').value = it.unit;
  $('#editPrice').value = fmtNum(it.price);
  $('#editCat').value = it.cat || 'Outros';
  $('#editDialog').showModal();
}
$('#formEdit').onsubmit = () => {
  if (!editing) return;
  editing.name = $('#editName').value.trim() || editing.name;
  editing.qty = parseNum($('#editQty').value);
  editing.unit = $('#editUnit').value;
  editing.price = parseNum($('#editPrice').value);
  editing.cat = $('#editCat').value;
  remember(editing);
  save(); renderList();
};
$('#btnCancelEdit').onclick = () => $('#editDialog').close();
$('#btnDeleteItem').onclick = () => {
  const l = current();
  const it = editing;
  const idx = l.items.indexOf(it);
  l.items.splice(idx, 1);
  save();
  $('#editDialog').close();
  renderList();
  toast(`"${it.name}" removido`, 'Desfazer', () => { l.items.splice(idx, 0, it); save(); renderList(); });
};

// ---------- Menu ----------
function listAsText(l) {
  const lines = [`🛒 *${l.name}*`, ''];
  CATEGORIES.forEach((cat) => {
    const group = l.items.filter((it) => (it.cat || 'Outros') === cat);
    if (!group.length) return;
    lines.push(`*${cat}*`);
    group.forEach((it) => {
      const p = it.price ? ` — ${money(itemTotal(it))}` : '';
      lines.push(`${it.done ? '✅' : '▫️'} ${fmtNum(it.qty)} ${it.unit} ${it.name}${p}`);
    });
    lines.push('');
  });
  lines.push(`Total previsto: ${money(listTotals(l).total)}`);
  return lines.join('\n');
}

$('#btnMenu').onclick = () => {
  $('#shareLink').href = 'https://wa.me/?text=' + encodeURIComponent(listAsText(current()));
  $('#menu').showModal();
};
$('#menu').addEventListener('click', async (e) => {
  if (e.target === $('#menu')) return $('#menu').close();
  const act = e.target.dataset && e.target.dataset.act;
  if (!act) return;
  const l = current();
  $('#menu').close();
  switch (act) {
    case 'share': // o próprio link abre o WhatsApp
      break;
    case 'copy':
      try { await navigator.clipboard.writeText(listAsText(l)); toast('Lista copiada'); }
      catch (err) { toast('Não foi possível copiar neste aparelho'); }
      break;
    case 'rename': {
      const n = await ask({ title: 'Renomear lista', input: { value: l.name }, ok: 'Salvar' });
      if (n && n.trim()) { l.name = n.trim(); save(); renderList(); }
      break;
    }
    case 'duplicate': {
      const copy = {
        id: uid(), name: l.name + ' (cópia)', budget: l.budget, createdAt: Date.now(),
        items: l.items.map((it) => ({ ...it, id: uid(), done: false }))
      };
      state.lists.unshift(copy);
      save();
      openList(copy.id);
      toast('Lista duplicada');
      break;
    }
    case 'uncheck':
      l.items.forEach((it) => { it.done = false; });
      save(); renderList();
      break;
    case 'clearDone': {
      const removed = l.items.filter((it) => it.done);
      if (!removed.length) return toast('Nenhum item pego');
      const before = l.items.slice();
      l.items = l.items.filter((it) => !it.done);
      save(); renderList();
      toast(`${removed.length} item(ns) removido(s)`, 'Desfazer', () => { l.items = before; save(); renderList(); });
      break;
    }
    case 'delete':
      if (await ask({ title: `Excluir "${l.name}"?`, message: 'A lista e seus itens serão apagados.', ok: 'Excluir', danger: true })) {
        state.lists = state.lists.filter((x) => x.id !== l.id);
        save();
        showLists();
      }
      break;
  }
});

// ---------- Início ----------
showLists();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* sem suporte */ }
}
