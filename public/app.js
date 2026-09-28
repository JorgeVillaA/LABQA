let products = [];
let page = 1;
let perPage = 10;
let editingId = null;

// BUG-QA-ADV-01 (avanzado): chequeo de auth desactivado.
// Un QA debe probar entrar directo a /dashboard.html sin login.
(function checkAuth() {
  const token = localStorage.getItem('qa_token');
  const user = localStorage.getItem('qa_user');
  document.getElementById('userLabel').textContent = user ? JSON.parse(user).username : 'invitado';
  // if (!token) { window.location.href = '/login.html'; return; } // <-- desactivado a propósito
})();

/* ---------- efectos estilo bencho.dev (decorativos, no tocan la lógica QA) ---------- */
(function particles() {
  const c = document.getElementById('particles');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts = [];
  function resize() {
    W = c.width = innerWidth; H = c.height = innerHeight;
    pts = Array.from({ length: 34 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      s: ['○', '✕', '△', '〜'][Math.floor(Math.random() * 4)],
      r: Math.random() * Math.PI * 2
    }));
  }
  resize(); addEventListener('resize', resize);
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,177,157,.30)';
    ctx.font = '16px serif';
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy; p.r += .005;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillText(p.s, 0, 0); ctx.restore();
    }
    requestAnimationFrame(tick);
  })();
})();

// Bloque bencho: tilt-card en hover
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(600px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-2px)`;
    card.style.setProperty('--mx', `${((x + .5) * 100).toFixed(0)}%`);
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// Bloque bencho: animated counter (siempre termina en el valor exacto, bugs incluidos)
function animateNumber(el, target, format) {
  const fmt = format || (v => String(Math.round(v)));
  const from = 0, dur = 500, t0 = performance.now();
  function frame(t) {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (target - from) * eased);
    if (k < 1) requestAnimationFrame(frame);
    else el.textContent = fmt(target); // aterriza exacto (incluye floats sin redondear)
  }
  requestAnimationFrame(frame);
}

const CHART_COLORS = ['#00B19D', '#2BBFA9', '#5CCABC', '#8FD8CD', '#087F73', '#9AA3AD'];
let chartProgress = 0, chartRaf = null;
function drawChart(list) {
  const canvas = document.getElementById('chart');
  const legend = document.getElementById('chartLegend');
  if (!canvas) return;
  const cats = {};
  for (const p of list) cats[p.category] = (cats[p.category] || 0) + Number(p.stock || 0);
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));

  legend.innerHTML = entries.map(([k, v], i) =>
    `<span><span class="dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>${k}: <b>${v}</b></span>`
  ).join('');

  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = canvas.clientWidth || 900, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (chartRaf) cancelAnimationFrame(chartRaf);
  const t0 = performance.now(), dur = 600;
  function frame(t) {
    chartProgress = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - chartProgress, 3);
    ctx.clearRect(0, 0, W, H);
    const n = Math.max(1, entries.length);
    const gap = 18, bw = Math.min(90, (W - gap * (n + 1)) / n);
    entries.forEach(([k, v], i) => {
      const x = gap + i * (bw + gap);
      const bh = Math.max(4, (H - 60) * (v / max) * eased);
      const y = H - 30 - bh;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      const col = CHART_COLORS[i % CHART_COLORS.length];
      g.addColorStop(0, col); g.addColorStop(1, col + '55');
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 8);
      else ctx.rect(x, y, bw, bh);
      ctx.fill();
      ctx.fillStyle = '#2B2F33'; ctx.font = 'bold 13px "Inter", -apple-system, "Segoe UI", Arial'; ctx.textAlign = 'center';
      ctx.fillText(String(v), x + bw / 2, y - 6);
      ctx.fillStyle = '#8A94A0'; ctx.font = '11px "Inter", -apple-system, "Segoe UI", Arial';
      ctx.fillText(k.slice(0, 12), x + bw / 2, H - 12);
    });
    if (chartProgress < 1) chartRaf = requestAnimationFrame(frame);
  }
  chartRaf = requestAnimationFrame(frame);
}

/* ---------- lógica QA (con bugs intencionales, sin tocar) ---------- */
async function load() {
  const r = await fetch('/api/products');
  products = await r.json();
  render();
}

function getFiltered() {
  const q = document.getElementById('search').value;
  const cat = document.getElementById('filterCat').value;
  let list = [...products];

  // BUG-QA-07 (principiante): búsqueda case-SENSITIVE.
  // Buscar "laptop" no encuentra "Laptop HP 15". Debería ser case-insensitive.
  if (q) list = list.filter(p => p.name.includes(q));

  // BUG-QA-08 (principiante): filtro "Ropa" roto por comparar en minúsculas.
  if (cat) {
    if (cat === 'Ropa') {
      list = list.filter(p => p.category === 'ropa'); // nunca coincide ('Ropa' !== 'ropa')
    } else {
      list = list.filter(p => p.category === cat);
    }
  }
  return list;
}

// BUG-QA-09 (principiante): ordena precio como STRING.
// 100 < 20 alfabéticamente ("100" < "20"), el orden sale mal.
let sortAsc = true;
function sortByPrice(list) {
  return list.sort((a, b) => {
    const r = String(a.price).localeCompare(String(b.price));
    return sortAsc ? r : -r;
  });
}

function fmtDate(iso, id) {
  // BUG-QA-10 (principiante/i18n): formato inconsistente en la misma tabla.
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (id % 2 === 0) return `${m}/${d}/${y}`; // MM/DD/YYYY
  return `${d}/${m}/${y}`;                   // DD/MM/YYYY
}

function fmtPrice(price, id) {
  // BUG-QA-11 (principiante/i18n): moneda mezclada $ y €.
  const symbol = id % 3 === 0 ? '€' : '$';
  return `${symbol}${price}`;
}

// Bloque bencho: progress-ticks de stock (visual; no altera el valor)
function stockTicks(stock) {
  const filled = Math.max(0, Math.min(10, Math.round(Number(stock) / 10)));
  let cls = 'on-ok';
  if (Number(stock) < 5) cls = 'on-low';
  else if (Number(stock) < 20) cls = 'on-mid';
  let h = '';
  for (let i = 0; i < 10; i++) h += `<span class="tick${i < filled ? ' ' + cls : ''}"></span>`;
  return `<div class="ticks">${h}</div>`;
}

// BUG-QA-XSS (avanzado): nombre renderizado con innerHTML sin escapar.
// Probar crear un producto llamado: <img src=x onerror=alert(1)>
function rowHtml(p) {
  return `<tr style="animation-delay:${(p.id % 10) * 30}ms">
    <td>${p.id}</td>
    <td>${p.name}</td>
    <td>${p.category}</td>
    <td><span class="stock-num">${p.stock}</span>${stockTicks(p.stock)}</td>
    <td>${fmtPrice(p.price, p.id)}</td>
    <td>${fmtDate(p.date, p.id)}</td>
    <td>
      <button onclick="sell(${p.id}, this)">Vender 1</button>
      <button onclick="editProduct(${p.id})">Editar</button>
      <button onclick="delProduct(${p.id})">Eliminar</button>
    </td>
  </tr>`;
}

function render() {
  let list = getFiltered();

  // ---- stats ----
  // BUG-QA-12 (principiante): "Valor total" solo suma la PÁGINA actual, no todo el inventario.
  // BUG-QA-ADV-05 (avanzado): suma con floats sin redondear -> 0.1+0.2 = 0.30000000004
  const totalPagesForValue = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(page, totalPagesForValue);
  const start = (safePage - 1) * perPage;
  const pageItems = list.slice(start, start + perPage);
  let total = 0;
  for (const p of pageItems) total += p.price * p.stock;
  const low = list.filter(p => p.stock < 5).length;

  // Animación bencho: termina en el valor exacto (bugs preservados, sin toFixed)
  animateNumber(document.getElementById('statTotal'), list.length);
  animateNumber(document.getElementById('statValue'), total, v => String(v));
  animateNumber(document.getElementById('statLow'), low);
  drawChart(list);
  updateKpis();
  drawLine();
  drawStacked();
  drawDonut();
  renderIngresos();
  refreshPosOptions();
  const _rc = document.getElementById('repCount');
  if (_rc) _rc.textContent = products.length;

  // ---- paginación ----
  // BUG-QA-13 (principiante, off-by-one): usa Math.floor en vez de Math.ceil.
  // Con 23 productos y 10 por página calcula 2 páginas y los últimos 3 son inaccesibles.
  const totalPages = Math.max(1, Math.floor(list.length / perPage));
  if (page > totalPages) page = totalPages;
  const s = (page - 1) * perPage;
  const items = list.slice(s, s + perPage);
  document.getElementById('tbody').innerHTML = items.map(rowHtml).join('');
  const from = list.length === 0 ? 0 : s + 1;
  const to = Math.min(s + perPage, list.length);
  document.getElementById('pageInfo').textContent = `Mostrando ${from}-${to} de ${list.length} (página ${page} de ${totalPages})`;
}

// BUG-QA-ADV-04 (avanzado, race / lost update): el botón no se deshabilita durante el fetch.
// Doble clic rápido envía 2 ventas paralelas pero el backend las pierde (solo descuenta 1).
async function sell(id, btn) {
  // debería ser: btn.disabled = true; ... finally btn.disabled = false;
  await fetch(`/api/products/${id}/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qty: 1 })
  });
  await load();
}

// BUG-QA-14 (principiante): eliminar sin confirmación (sin confirm()).
async function delProduct(id) {
  await fetch(`/api/products/${id}`, { method: 'DELETE' });
  await load();
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Editar producto';
  document.getElementById('fName').value = p.name;
  document.getElementById('fCat').value = p.category;
  document.getElementById('fStock').value = p.stock;
  document.getElementById('fPrice').value = p.price;
  document.getElementById('fDate').value = String(p.date).slice(0, 10);
  document.getElementById('modal').classList.remove('hidden');
}

document.getElementById('btnAdd').addEventListener('click', () => {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Agregar producto';
  document.getElementById('modal').classList.remove('hidden');
});
document.getElementById('btnCancel').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});
document.getElementById('btnSave').addEventListener('click', () => {
  // BUG-QA-i18n: botón "Save" no hace nada (debería guardar o no existir).
  document.getElementById('pageInfo').textContent = 'Saved!';
});
document.getElementById('btnConfirm').addEventListener('click', async () => {
  // BUG-QA-06 (principiante): sin validación, acepta stock/precio negativos y nombre vacío.
  const body = {
    name: document.getElementById('fName').value,
    category: document.getElementById('fCat').value,
    stock: Number(document.getElementById('fStock').value),
    price: Number(document.getElementById('fPrice').value),
    date: document.getElementById('fDate').value || '2026-01-01'
  };
  if (editingId) {
    await fetch(`/api/products/${editingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  } else {
    await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
  }
  document.getElementById('modal').classList.add('hidden');
  await load();
});

document.getElementById('search').addEventListener('input', () => { page = 1; render(); });
document.getElementById('filterCat').addEventListener('change', () => { page = 1; render(); });
document.getElementById('btnSort').addEventListener('click', () => {
  sortAsc = !sortAsc;
  products = sortByPrice(products);
  render();
});
document.getElementById('btnPrev').addEventListener('click', () => { if (page > 1) page--; render(); });
document.getElementById('btnNext').addEventListener('click', () => { page++; render(); });
document.getElementById('btnLogout').addEventListener('click', () => {
  localStorage.removeItem('qa_token');
  localStorage.removeItem('qa_user');
  window.location.href = '/login.html';
});

/* ---------- paneles ERP (derivados de products; no alteran ningún bug QA) ---------- */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_SHADES = ['#00B19D', '#2BBFA9', '#7FD8CC', '#BFE9E2', '#9AA3AD', '#087F73'];
const TIERS = [
  { n: 'Económico (<$10)', c: '#BFE9E2' },
  { n: 'Medio ($10–50)', c: '#2BBFA9' },
  { n: 'Premium (>$50)', c: '#087F73' }
];
let lineMode = 'valor';
let lineRange = 6;
let donutK = 'value';

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2500);
}

const VIEWS = { 'Inicio': 'home', 'Inventario': 'inventario', 'Ingresos': 'ingresos', 'Reportes': 'reportes', 'POS': 'pos', 'Configuración': 'config' };
function showView(name, btn) {
  document.querySelectorAll('[data-view]').forEach(v => {
    v.hidden = (v.getAttribute('data-view') !== name);
  });
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  if (btn && btn.classList) btn.classList.add('active');
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-item').forEach(b => {
  b.addEventListener('click', () => {
    const mod = (b.dataset && b.dataset.mod) || '';
    if (VIEWS[mod]) {
      showView(VIEWS[mod], b);
    } else if (mod) {
      const t = document.getElementById('emptyTitle');
      const d = document.getElementById('emptyDesc');
      if (t) t.textContent = mod;
      if (d) d.textContent = `El módulo «${mod}» no tiene datos en este entorno de laboratorio.`;
      showView('empty', b);
    }
  });
});
const _bh = document.getElementById('btnBackHome');
if (_bh) _bh.addEventListener('click', () => {
  const inicio = Array.from(document.querySelectorAll('.nav-item')).find(b => b.dataset && b.dataset.mod === 'Inicio');
  showView('home', inicio || null);
});

function monthKey(d) {
  const p = String(d).slice(0, 10).split('-');
  return p.length === 3 ? `${p[0]}-${p[1]}` : null;
}
function lastMonths(n) {
  const out = []; let y = 2026, m = 3; // ventana termina en Mar 2026 (último dato seed)
  for (let i = 0; i < n; i++) { out.unshift({ y, m }); m--; if (m < 1) { m = 12; y--; } }
  return out;
}
function monthAgg() {
  const m = {};
  for (const p of products) {
    const k = monthKey(p.date);
    if (!k) continue;
    m[k] = m[k] || { valor: 0, unidades: 0 };
    m[k].valor += Number(p.price) * Number(p.stock);
    m[k].unidades += Number(p.stock);
  }
  return m;
}
function compact(v) {
  const n = Number(v);
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n * 100) / 100);
}
function setupCanvas(id, h) {
  const c = document.getElementById(id);
  if (!c || !c.getContext) return null;
  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1) || 1);
  const W = c.clientWidth || 900;
  c.width = W * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H: h };
}

// KPI globales (total correcto de referencia; statValue del módulo sigue con su bug de página)
function updateKpis() {
  let val = 0, units = 0, low = 0;
  const cats = new Set();
  for (const p of products) {
    val += Number(p.price) * Number(p.stock);
    units += Number(p.stock);
    if (Number(p.stock) < 5) low++;
    cats.add(p.category);
  }
  animateNumber(document.getElementById('kpiValue'), val, v => String(v));
  animateNumber(document.getElementById('kpiUnits'), units);
  animateNumber(document.getElementById('kpiProducts'), products.length);
  animateNumber(document.getElementById('kpiLow'), low);
  animateNumber(document.getElementById('kpiCats'), cats.size);
}

function drawLine() {
  const s = setupCanvas('lineChart', 240);
  if (!s) return;
  const { ctx, W, H } = s;
  const months = lastMonths(lineRange), agg = monthAgg();
  const key = ({ y, m }) => `${y}-${String(m).padStart(2, '0')}`;
  const vals = months.map(o => (agg[key(o)] ? agg[key(o)].valor : 0));
  const units = months.map(o => (agg[key(o)] ? agg[key(o)].unidades : 0));
  const maxV = Math.max(1, ...vals), maxU = Math.max(1, ...units);
  const L = 46, R = 40, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
  const X = i => L + iw * (months.length === 1 ? 0.5 : i / (months.length - 1));
  const Yv = v => T + ih * (1 - v / maxV);
  const Yu = u => T + ih * (1 - u / maxU);
  ctx.clearRect(0, 0, W, H);
  ctx.font = '10px "Inter", -apple-system, "Segoe UI", Arial';
  for (let g = 0; g <= 4; g++) {
    const y = T + ih * g / 4;
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke();
    ctx.fillStyle = '#8A94A0'; ctx.textAlign = 'right';
    ctx.fillText(compact(maxV * (1 - g / 4)), L - 6, y + 3);
    ctx.fillText(String(Math.round(maxU * (1 - g / 4))), W - R + 6, y + 3);
  }
  months.forEach((o, i) => {
    ctx.fillStyle = '#8A94A0'; ctx.textAlign = 'center';
    ctx.fillText(MESES[o.m - 1], X(i), H - 8);
  });
  const active = lineMode === 'valor' ? vals : units;
  const Y = lineMode === 'valor' ? Yv : Yu;
  const fill = lineMode === 'valor' ? 'rgba(0,177,157,.14)' : 'rgba(154,163,173,.30)';
  ctx.beginPath();
  active.forEach((v, i) => { const x = X(i), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.lineTo(X(active.length - 1), H - B); ctx.lineTo(X(0), H - B); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  // serie Valor (clara, continua)
  ctx.beginPath();
  vals.forEach((v, i) => { const x = X(i), y = Yv(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = '#00B19D'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#00B19D';
  vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Yv(v), 3.5, 0, 7); ctx.fill(); });
  // serie Unidades (gris, punteada)
  ctx.beginPath();
  units.forEach((u, i) => { const x = X(i), y = Yu(u); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.strokeStyle = '#9AA3AD'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
}

function tierOf(p) {
  const pr = Number(p.price);
  if (pr < 10) return 0;
  if (pr <= 50) return 1;
  return 2;
}
function drawStacked() {
  const s = setupCanvas('stackChart', 240);
  if (!s) return;
  const { ctx, W, H } = s;
  const months = lastMonths(6);
  const data = months.map(({ y, m }) => {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    const t = [0, 0, 0];
    for (const p of products) if (monthKey(p.date) === k) t[tierOf(p)] += Number(p.price) * Number(p.stock);
    return t;
  });
  const max = Math.max(1, ...data.map(d => d[0] + d[1] + d[2]));
  const L = 44, B = 26, T = 12, iw = W - L - 10, ih = H - T - B;
  ctx.clearRect(0, 0, W, H);
  ctx.font = '10px "Inter", -apple-system, "Segoe UI", Arial';
  for (let g = 0; g <= 4; g++) {
    const y = T + ih * g / 4;
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - 10, y); ctx.stroke();
    ctx.fillStyle = '#8A94A0'; ctx.textAlign = 'right';
    ctx.fillText(compact(max * (1 - g / 4)), L - 6, y + 3);
  }
  const n = months.length, gap = 14, bw = Math.min(64, (iw - gap * (n + 1)) / n);
  data.forEach((t, i) => {
    const x = L + gap + i * (bw + gap);
    let y = T + ih;
    const tot = t[0] + t[1] + t[2];
    t.forEach((v, k) => {
      const h = tot ? ih * (v / max) : 0;
      y -= h;
      if (h > 0) { ctx.fillStyle = TIERS[k].c; ctx.fillRect(x, y, bw, h); }
    });
    ctx.strokeStyle = '#087F73'; ctx.strokeRect(x, T + ih - (tot ? ih * (tot / max) : 0), bw, tot ? ih * (tot / max) : 2);
    ctx.fillStyle = '#8A94A0'; ctx.textAlign = 'center';
    ctx.fillText(MESES[months[i].m - 1], x + bw / 2, H - 8);
  });
  const lg = document.getElementById('stackLegend');
  if (lg) lg.innerHTML = TIERS.map(t => `<span><span class="dot" style="background:${t.c}"></span>${t.n}</span>`).join('');
}

function drawDonut() {
  const s = setupCanvas('donutChart', 220);
  if (!s) return;
  const { ctx, W, H } = s;
  const sel = document.getElementById('donutCat');
  if (sel && sel.appendChild) {
    const cats = [...new Set(products.map(p => p.category))];
    const cur = sel.value || '';
    sel.innerHTML = '<option value="">Todas</option>';
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    if (cats.includes(cur)) sel.value = cur;
  }
  const cat = sel ? sel.value : '';
  const metric = donutK === 'value' ? (p => Number(p.price) * Number(p.stock)) : (p => Number(p.stock));
  const items = products.filter(p => !cat || p.category === cat)
    .map(p => ({ n: p.name, v: metric(p) })).sort((a, b) => b.v - a.v);
  const top = items.slice(0, 5);
  const rest = items.slice(5).reduce((a, b) => a + b.v, 0);
  const parts = [...top];
  if (rest > 0) parts.push({ n: 'Otros', v: rest });
  const total = parts.reduce((a, b) => a + b.v, 0) || 1;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 20, ir = r * 0.62;
  let a = -Math.PI / 2;
  parts.forEach((pt, i) => {
    const a2 = a + (pt.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a, a2);
    ctx.arc(cx, cy, ir, a2, a, true);
    ctx.closePath();
    ctx.fillStyle = DONUT_SHADES[i % DONUT_SHADES.length];
    ctx.fill();
    a = a2;
  });
      ctx.fillStyle = '#2B2F33'; ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Inter", -apple-system, "Segoe UI", Arial';
  ctx.fillText(compact(total), cx, cy + 1);
  ctx.fillStyle = '#8A94A0'; ctx.font = '10px "Inter", -apple-system, "Segoe UI", Arial';
  ctx.fillText(donutK === 'value' ? 'valor' : 'unidades', cx, cy + 15);
  const lg = document.getElementById('donutLegend');
  if (lg) {
    lg.innerHTML = parts.map((pt, i) =>
      `<span><span class="dot" style="background:${DONUT_SHADES[i % DONUT_SHADES.length]}"></span>${pt.n.slice(0, 22)}: <b>${compact(pt.v)}</b></span>`
    ).join('');
  }
}

const _rs = document.getElementById('rangeSelect');
if (_rs) _rs.addEventListener('change', () => { lineRange = Number(_rs.value) || 6; drawLine(); });
const _tv = document.getElementById('toggleValor'), _tu = document.getElementById('toggleUnidades');
if (_tv && _tu) {
  _tv.addEventListener('click', () => { lineMode = 'valor'; _tv.classList.add('on'); _tu.classList.remove('on'); drawLine(); });
  _tu.addEventListener('click', () => { lineMode = 'unidades'; _tu.classList.add('on'); _tv.classList.remove('on'); drawLine(); });
}
function spinRefresh(id, fn) {
  const b = document.getElementById(id);
  if (!b) return;
  b.addEventListener('click', () => {
    b.classList.add('spin');
    setTimeout(() => b.classList.remove('spin'), 650);
    fn();
  });
}
spinRefresh('btnRefreshLine', drawLine);
spinRefresh('btnRefreshStack', drawStacked);
spinRefresh('btnRefreshDonut', drawDonut);
const _dt = document.getElementById('donutTabs');
if (_dt && _dt.querySelectorAll) _dt.querySelectorAll('button').forEach(b => {
  b.addEventListener('click', () => {
    donutK = (b.dataset && b.dataset.k) || 'value';
    _dt.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    drawDonut();
  });
});
const _dc = document.getElementById('donutCat');
if (_dc) _dc.addEventListener('change', drawDonut);

/* ---------- vistas: ingresos, reportes, POS, configuración ---------- */
function renderIngresos() {
  const body = document.getElementById('ingBody');
  if (!body) return;
  const months = lastMonths(12), agg = monthAgg();
  let tu = 0, tv = 0;
  body.innerHTML = months.map(({ y, m }) => {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    const u = agg[k] ? agg[k].unidades : 0;
    const v = agg[k] ? agg[k].valor : 0;
    tu += u; tv += v;
    return `<tr><td>${MESES[m - 1]} ${y}</td><td>${u}</td><td>${v}</td></tr>`;
  }).join('');
  const tuEl = document.getElementById('ingTotalU');
  const tvEl = document.getElementById('ingTotalV');
  if (tuEl) tuEl.innerHTML = `<b>${tu}</b>`;
  if (tvEl) tvEl.innerHTML = `<b>${tv}</b>`;
}

function buildCSV() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'id,name,category,stock,price,date';
  const lines = products.map(p => [p.id, q(p.name), q(p.category), p.stock, p.price, p.date].join(','));
  return '﻿' + head + '\n' + lines.join('\n');
}
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const _csv = document.getElementById('btnCSV');
if (_csv) _csv.addEventListener('click', () => {
  download('inventario.csv', buildCSV(), 'text/csv;charset=utf-8');
  toast('CSV descargado');
});
const _json = document.getElementById('btnJSON');
if (_json) _json.addEventListener('click', () => {
  download('inventario.json', JSON.stringify(products, null, 2), 'application/json');
  toast('JSON descargado');
});

function refreshPosOptions() {
  const sel = document.getElementById('posProduct');
  if (!sel) return;
  const cur = sel.value || '';
  sel.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (stock ${p.stock})</option>`).join('');
  if (products.some(p => String(p.id) === String(cur))) sel.value = cur;
  updatePosTotal();
}
function updatePosTotal() {
  const sel = document.getElementById('posProduct');
  const qtyEl = document.getElementById('posQty');
  const tot = document.getElementById('posTotal');
  if (!sel || !qtyEl || !tot) return;
  const p = products.find(x => String(x.id) === String(sel.value));
  const qty = Number(qtyEl.value) || 0;
  tot.textContent = p ? String(p.price * qty) : '-'; // float crudo, consistente con el lab
}
const _pq = document.getElementById('posQty');
if (_pq) _pq.addEventListener('input', updatePosTotal);
const _pp = document.getElementById('posProduct');
if (_pp) _pp.addEventListener('change', updatePosTotal);
// BUG-QA-ADV-04: el botón no se deshabilita; doble clic repite la venta (lost update en backend).
async function posSell() {
  const id = Number(document.getElementById('posProduct').value);
  const qty = Number(document.getElementById('posQty').value) || 1;
  const msg = document.getElementById('posMsg');
  const r = await fetch(`/api/products/${id}/sell`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qty })
  });
  if (!r.ok) { if (msg) msg.textContent = 'No se pudo completar la venta'; return; }
  const p = await r.json();
  if (msg) msg.textContent = `Venta registrada: ${p.name} × ${qty} (stock ${p.stock})`;
  await load();
}
const _sell = document.getElementById('btnSell');
if (_sell) _sell.addEventListener('click', posSell);

const _pps = document.getElementById('perPageSel');
if (_pps) _pps.addEventListener('change', () => { perPage = Number(_pps.value) || 10; page = 1; render(); });
const _br = document.getElementById('btnReset');
if (_br) _br.addEventListener('click', async () => {
  if (!confirm('¿Restablecer los datos del laboratorio al estado inicial?')) return;
  const r = await fetch('/api/reset', { method: 'POST' });
  const d = await r.json().catch(() => ({}));
  if (d.ok) { page = 1; await load(); toast('Datos restablecidos'); }
  else toast('No se pudo restablecer');
});

load();
