/* Gestium · protótipo de front-end (sem servidor). Dados salvos no navegador. */
(function () {
  'use strict';

  /* ---------- Dados de exemplo ---------- */
  const PRODUCTS = [
    { id: 'sal', key: ['sal'], name: 'Pão de sal', emoji: '🥖', recipes: [
      { id: 'sal1', name: 'Massa base', ing: 'Farinha, sal, reforçador e água.', min: 20 },
      { id: 'sal2', name: 'Descanso da massa', ing: 'Massa base coberta.', min: 30 },
      { id: 'sal3', name: 'Modelagem', ing: 'Massa descansada.', min: 15 },
      { id: 'sal4', name: 'Forno', ing: 'Bandejas modeladas.', min: 25 } ] },
    { id: 'doce', key: ['doce'], name: 'Pão doce', emoji: '🍞', recipes: [
      { id: 'doce1', name: 'Massa doce', ing: 'Farinha, açúcar, ovos, manteiga e fermento.', min: 25 },
      { id: 'doce2', name: 'Cobertura e forno', ing: 'Farinha de rosca e açúcar.', min: 20 } ] },
    { id: 'croissant', key: ['croissant', 'croassa'], name: 'Croissant', emoji: '🥐', recipes: [
      { id: 'cro1', name: 'Massa folhada base', ing: 'Farinha, manteiga e sal.', min: 40 },
      { id: 'cro2', name: 'Dobras e descanso', ing: 'Massa base.', min: 30 },
      { id: 'cro3', name: 'Modelagem e forno', ing: 'Massa dobrada.', min: 22 } ] },
    { id: 'queijo', key: ['queijo'], name: 'Pão de queijo', emoji: '🧀', recipes: [
      { id: 'que1', name: 'Massa', ing: 'Polvilho, queijo, leite, ovos e óleo.', min: 15 },
      { id: 'que2', name: 'Forno', ing: 'Bolinhas modeladas.', min: 25 } ] },
    { id: 'forma', key: ['forma'], name: 'Pão de forma', emoji: '🍞', recipes: [
      { id: 'for1', name: 'Massa e forno', ing: 'Farinha, açúcar, leite e fermento.', min: 45 } ] },
    { id: 'folhado', key: ['folhado'], name: 'Folhado', emoji: '🥧', recipes: [
      { id: 'fol1', name: 'Massa folhada', ing: 'Farinha, manteiga e água gelada.', min: 35 },
      { id: 'fol2', name: 'Recheio e forno', ing: 'Recheio do dia.', min: 20 } ] }
  ];
  const ALL_RECIPES = PRODUCTS.flatMap(p => p.recipes.map(r => Object.assign({ pid: p.id, pname: p.name }, r)));

  const STOCK = [
    { name: 'Farinha de trigo', qty: '38 kg', pct: 72 },
    { name: 'Açúcar', qty: '12 kg', pct: 48 },
    { name: 'Manteiga', qty: '4 kg', pct: 18 },
    { name: 'Fermento', qty: '1,5 kg', pct: 60 },
    { name: 'Polvilho', qty: '9 kg', pct: 35 },
    { name: 'Queijo', qty: '6 kg', pct: 25 }
  ];
  const WEEK = [['Seg', 42], ['Ter', 38], ['Qua', 51], ['Qui', 47], ['Sex', 60], ['Sáb', 74], ['Dom', 55]];

  const NAV = [
    { id: 'home', label: 'Visão geral', ico: '🏠' },
    { id: 'prod', label: 'Produção', ico: '👨‍🍳' },
    { id: 'stock', label: 'Estoque', ico: '📦' },
    { id: 'reports', label: 'Relatórios', ico: '📊' },
    { id: 'settings', label: 'Ajustes', ico: '⚙️', long: 'Configurações' }
  ];

  /* ---------- Estado ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('gestium.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('gestium.' + k, JSON.stringify(v)); } catch (e) { /* ignora */ } },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith('gestium.')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignora */ } }
  };
  const state = {
    view: 'home',
    profile: store.get('profile', null),
    role: store.get('role', 'worker'),
    theme: store.get('theme', 'dark'),
    fast: store.get('fast', true),
    status: store.get('status', {}),   // { recipeId: 'done' | 'skipped' }
    open: { sal: true },
    active: null                       // { id, remaining, total, running }
  };

  /* ---------- Utilidades ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fmt = sec => { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
  const isManager = () => state.role === 'manager';
  const find = id => ALL_RECIPES.find(r => r.id === id);
  const prodById = id => PRODUCTS.find(p => p.id === id);
  const doneCount = () => ALL_RECIPES.filter(r => state.status[r.id] === 'done').length;
  const pendingOf = p => p.recipes.filter(r => !state.status[r.id]);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function userName() { return (state.profile && state.profile.name) || 'Fulano'; }
  function saveStatus() { store.set('status', state.status); }

  /* ---------- Navegação ---------- */
  function renderNav() {
    const html = NAV.map(n => `<button class="nav-item ${state.view === n.id ? 'active' : ''}" data-go="${n.id}">
      <span class="ico">${n.ico}</span><span>${n.id === 'settings' ? 'Configurações' : n.label}</span></button>`).join('');
    $('#sidenav').innerHTML = html;
    $('#bottomnav').innerHTML = NAV.map(n => `<button class="nav-item ${state.view === n.id ? 'active' : ''}" data-go="${n.id}" style="flex:1">
      <span class="ico">${n.ico}</span><span>${n.label}</span></button>`).join('');
    $('#roleBtn').textContent = isManager() ? '👔 Gerente' : '👷 Equipe';
    const cur = NAV.find(n => n.id === state.view);
    $('#crumb').innerHTML = `${esc(storeName())} <span>/</span> <strong>${cur.id === 'settings' ? 'Configurações' : cur.label}</strong>`;
    $('#avatar').textContent = userName().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  function storeName() { return (state.profile && state.profile.store) || 'Padaria da Vila'; }
  function go(view) {
    state.view = view; renderNav(); render(); window.scrollTo(0, 0);
  }

  /* ---------- Views ---------- */
  function render() {
    const v = { home: viewOverview, prod: viewProd, stock: viewStock, reports: viewReports, settings: viewSettings }[state.view];
    $('#view').classList.toggle('wide', state.view === 'home');
    $('#view').innerHTML = v();
    if (state.view === 'settings') bindSettings();
    if (state.view === 'home' && isManager()) drawChart();
  }

  function recipeRow(r) {
    const st = state.status[r.id];
    const a = state.active && state.active.id === r.id ? state.active : null;
    let actions, extra = '';
    if (st === 'done') actions = `<span class="pill ok">✓ Feita</span><button class="btn small ghost" data-act="undo" data-id="${r.id}">Desfazer</button>`;
    else if (st === 'skipped') actions = `<span class="pill skip">Pulada</span><button class="btn small ghost" data-act="undo" data-id="${r.id}">Desfazer</button>`;
    else if (a) {
      actions = `<button class="btn small" data-act="pause" data-id="${r.id}">${a.running ? '⏸ Pausar' : '▶ Retomar'}</button>
                 <button class="btn small ok" data-act="finish" data-id="${r.id}">✓ Concluir</button>`;
      extra = `<div class="timer-wrap"><div style="display:flex;align-items:center;gap:14px">
        <div class="timer" data-timer>${fmt(a.remaining)}</div>
        <div class="bar" style="flex:1;margin:0"><i data-bar style="width:${100 - (a.remaining / a.total) * 100}%"></i></div></div></div>`;
    } else actions = `<button class="btn primary small" data-act="start" data-id="${r.id}">▶ Iniciar</button>
                      <button class="btn small" data-act="skip" data-id="${r.id}">⏭ Pular</button>`;
    return `<div class="recipe ${a ? 'active' : ''} ${st === 'done' ? 'done' : ''}">
      <div class="recipe-info"><b>Receita</b><span>🥣 ${esc(r.name)}</span><br><em>${esc(r.ing)} · ${r.min} min</em></div>
      <div class="recipe-actions">${actions}</div>${extra}</div>`;
  }

  /* ---------- Visão geral (página inicial) ---------- */
  const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const WEEK_SALES = { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], values: [2150, 2020, 2480, 2380, 2890, 3480, 3050], delta: '12,8%' };
  const MONTH_SALES = (function () {
    const values = Array.from({ length: 30 }, (_, i) => Math.round((2300 + 450 * Math.sin(i / 3) + (i % 7 >= 5 ? 700 : 0) + i * 12) / 10) * 10);
    return { labels: values.map((_, i) => String(i + 1)), values, delta: '9,4%' };
  })();
  const salesData = () => (state.range === 30 ? MONTH_SALES : WEEK_SALES);
  const TASKS_DEFAULT = [
    { id: 't1', title: 'Conferir estoque de farinha', who: 'Marina Pereira', st: 'pending' },
    { id: 't2', title: 'Preparar produção da tarde', who: 'João Santos', st: 'pending' },
    { id: 't3', title: 'Revisar pedidos de fornecedores', who: 'Pedro Lima', st: 'doing' },
    { id: 't4', title: 'Limpar vitrine e balcão', who: 'Ana Costa', st: 'done' },
    { id: 't5', title: 'Abrir caixa e conferir troco', who: 'Marina Pereira', st: 'done' }
  ];
  state.tasks = store.get('tasks', TASKS_DEFAULT);
  state.range = 7;
  const saveTasks = () => store.set('tasks', state.tasks);
  const TOP = [
    { n: 'Pão francês', e: '🥖', u: 1240, v: 1240 }, { n: 'Croissant', e: '🥐', u: 186, v: 1116 },
    { n: 'Pão de queijo', e: '🧀', u: 420, v: 840 }, { n: 'Pão doce', e: '🍞', u: 230, v: 690 }
  ];

  function taskRow(t) {
    const lbl = { pending: 'Pendente', doing: 'Em andamento', done: 'Concluída' }[t.st];
    return `<div class="task ${t.st === 'done' ? 'is-done' : ''}">
      <button class="check ${t.st === 'done' ? 'on' : ''}" data-act="task" data-id="${t.id}" aria-label="Marcar tarefa">✓</button>
      <div class="grow"><strong>${esc(t.title)}</strong><br><small>Responsável: ${esc(t.who)}</small></div>
      <span class="status ${t.st}">${lbl}</span></div>`;
  }

  function viewOverview() {
    const doneT = state.tasks.filter(t => t.st === 'done').length;
    const mgr = isManager();
    const hero = `<div class="hero"><div><div class="eyebrow">Gestão mais inteligente</div>
        <h2>O cuidado é seu. A gestão é Gestium.</h2>
        <p>Uma visão mais clara de toda a operação, para você decidir com confiança.</p></div>
        <div class="hero-art" aria-hidden="true">🥐</div></div>`;
    const tasks = `<div class="card"><div class="card-head"><div><h2>Tarefas do dia</h2><span class="pill" id="taskCount">${doneT} de ${state.tasks.length} concluídas</span></div>
        <button class="btn small" data-act="newTask">+ Nova tarefa</button></div>
        <div id="taskList">${state.tasks.map(taskRow).join('')}</div></div>`;

    let body;
    if (mgr) {
      const d = salesData(), total = d.values.reduce((a, b) => a + b, 0);
      body = `
      <div class="grid kpis">
        <div class="card kpi"><small>Faturamento</small><strong>R$ 18.450</strong><span class="trend">↗ 12,8% vs. semana passada</span></div>
        <div class="card kpi"><small>Pedidos realizados</small><strong>842</strong><span class="trend">↗ 8,2% vs. semana passada</span></div>
        <div class="card kpi"><small>Ticket médio</small><strong>R$ 21,91</strong><span class="trend">Dentro da meta</span></div>
        <div class="card kpi"><small>Desperdício</small><strong>3,2%</strong><span class="trend">↓ 1,4% este mês</span></div>
      </div>
      <div class="grid two-wide">
        <div class="card" id="salesCard">
          <div class="card-head"><div><h2>Vendas da semana</h2><small>Acompanhe o faturamento da sua padaria.</small></div>
            <select id="rangeSel" style="width:auto"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></div>
          <div class="big-num"><span id="salesTotal">${money(total)}</span><span class="trend">↗ ${d.delta}</span></div>
          <div class="legend"><i></i> Faturamento</div>
          <div class="chart-line" id="chartBox"><svg id="chartSvg" viewBox="0 0 700 200" preserveAspectRatio="none"></svg>
            <div class="cursor" id="chartCursor" hidden><i></i><b></b></div></div>
          <div class="x-labels" id="xLabels"></div>
        </div>
        <div class="card"><div class="card-head"><div><h2>Oportunidades com IA</h2><small>Sugestões para melhorar a operação.</small></div><span class="pill">3 sugestões</span></div>
          <div class="ai-item"><span class="ai-ico">✨</span><div><strong>Produza na medida certa</strong><p>Revise a produção de pão francês com base no movimento recente.</p><button class="link" data-go="prod">Ver oportunidade →</button></div></div>
          <div class="ai-item"><span class="ai-ico">📦</span><div><strong>Seu estoque, um passo à frente</strong><p>Dois ingredientes estão abaixo do estoque mínimo.</p><button class="link" data-go="stock">Ver estoque →</button></div></div>
          <div class="ai-item"><span class="ai-ico">⚡</span><div><strong>Menos planilhas, mais tempo</strong><p>Organize tarefas repetitivas em um só lugar.</p><button class="link" data-act="auto">Ver automações →</button></div></div>
        </div>
      </div>
      <div class="grid two">
        ${tasks}
        <div class="card"><div class="card-head"><div><h2>Mais vendidos</h2><small>Produtos com maior saída nesta semana.</small></div><button class="link" data-go="prod">Ver produção →</button></div>
          ${TOP.map(p => `<div class="list-row"><span class="prod-emoji" style="width:42px;height:42px;font-size:1.4rem">${p.e}</span>
            <div class="grow"><strong>${p.n}</strong><br><small>${p.u.toLocaleString('pt-BR')} unidades vendidas</small></div><strong>${money(p.v)}</strong></div>`).join('')}</div>
      </div>`;
    } else {
      const total = ALL_RECIPES.length, done = doneCount(), pct = Math.round(done / total * 100);
      body = `<div class="grid two">
        <div class="card"><div class="card-head"><div><h2>Produção de hoje</h2><small>${done} de ${total} receitas feitas.</small></div><span class="pill">${pct}%</span></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div style="margin-top:16px"><button class="btn primary" data-go="prod">Ir para a produção →</button></div></div>
        ${tasks}</div>`;
    }
    return `<div class="page-head"><div><h1>${greeting()}, ${esc(userName())} <span class="hl">✳</span></h1>
        <p class="sub" style="margin-bottom:0">Aqui está o resumo do que está acontecendo na sua padaria.</p></div>
        <div class="head-actions"><select id="periodSel" style="width:auto"><option>Hoje</option><option>Ontem</option><option>Esta semana</option></select>
        <button class="btn primary" data-act="newTask">+ Nova tarefa</button></div></div>
      ${hero}${body}`;
  }

  /* Gráfico de linha (verde) feito em SVG puro */
  function drawChart() {
    const d = salesData(), n = d.values.length, W = 700, H = 200, pad = 14;
    const min = Math.min.apply(null, d.values) * 0.85, max = Math.max.apply(null, d.values) * 1.05;
    const X = i => (i / (n - 1)) * W, Y = v => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    const pts = d.values.map((v, i) => [X(i), Y(v)]);
    let path = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n - 1; i++) {   // curva suave (Catmull-Rom → Bézier)
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      path += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    $('#chartSvg').innerHTML = `<defs><linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34d399" stop-opacity=".35"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${H * f}" y2="${H * f}" stroke="var(--line)" stroke-dasharray="4 6" vector-effect="non-scaling-stroke"/>`).join('')}
      <path d="${path} L${W},${H} L0,${H} Z" fill="url(#gfill)"/>
      <path d="${path}" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    const step = n > 10 ? Math.ceil(n / 6) : 1;
    $('#xLabels').innerHTML = d.labels.map((l, i) => `<span>${i % step === 0 || n <= 10 ? l : ''}</span>`).join('');
    $('#xLabels').style.justifyContent = n > 10 ? 'space-between' : 'space-between';

    const box = $('#chartBox'), cur = $('#chartCursor');
    const show = e => {
      const r = box.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const i = Math.max(0, Math.min(n - 1, Math.round(x / r.width * (n - 1))));
      cur.hidden = false; cur.style.left = (i / (n - 1) * 100) + '%';
      cur.querySelector('i').style.top = (Y(d.values[i]) / H * 100) + '%';
      const b = cur.querySelector('b'); b.textContent = `${d.labels[i]} · ${money(d.values[i])}`;
      b.style.top = Math.max(0, Y(d.values[i]) / H * 100 - 22) + '%';
      b.style.transform = i > n * 0.7 ? 'translateX(-105%)' : 'translateX(10px)';
    };
    box.onmousemove = show; box.ontouchmove = show; box.ontouchstart = show;
    box.onmouseleave = () => { cur.hidden = true; };
  }

  function viewProd() {
    const total = ALL_RECIPES.length, done = doneCount(), pct = Math.round(done / total * 100);
    const stats = isManager() ? `<div class="grid stats">
        <div class="card stat"><strong>${done}/${total}</strong><span>Receitas feitas</span></div>
        <div class="card stat"><strong>${pct}%</strong><span>Turno concluído</span></div>
        <div class="card stat"><strong>${(state.profile && state.profile.suppliers) || 0}</strong><span>Fornecedores</span></div>
      </div>` : `<div class="card" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between"><strong>Progresso do turno</strong><span class="pill">${done}/${total}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div></div>`;
    const list = PRODUCTS.map(p => {
      const n = p.recipes.length, d = p.recipes.filter(r => state.status[r.id] === 'done').length;
      const open = state.open[p.id];
      return `<div class="prod ${open ? 'open' : ''}">
        <button class="prod-head" data-act="toggle" data-id="${p.id}">
          <span class="prod-emoji">${p.emoji}</span>
          <span class="prod-info"><strong>${p.name}</strong><small>${n} ${n === 1 ? 'receita' : 'receitas'}</small></span>
          ${d === n ? '<span class="pill ok">✓ Completo</span>' : `<span class="pill">${d}/${n}</span>`}
          <span class="chev">⌄</span></button>
        ${open ? `<div class="recipes">${p.recipes.map(recipeRow).join('')}</div>` : ''}</div>`;
    }).join('');
    return `<div class="eyebrow">Painel de produção</div>
      <h1>Lista de <span class="hl">produção</span></h1>
      <p class="sub">Aqui está a lista de produção para o primeiro turno:</p>
      ${stats}<div class="prod-list">${list}</div>`;
  }

  function viewStock() {
    const p = state.profile || {};
    const tags = (arr, cls) => arr && arr.length ? arr.map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join('') : '<small>Nenhum informado.</small>';
    return `<div class="eyebrow">Estoque</div><h1>Seus insumos e produtos</h1>
      <p class="sub">${p.suppliers ? `${p.suppliers} fornecedor${p.suppliers > 1 ? 'es' : ''} cadastrado${p.suppliers > 1 ? 's' : ''}.` : 'Complete o primeiro acesso em Configurações.'}</p>
      <div class="cols" style="margin-bottom:14px">
        <div class="card"><h2>🥖 Que você fabrica</h2><div class="tags">${tags(p.made, '')}</div></div>
        <div class="card"><h2>🛒 Que você revende</h2><div class="tags">${tags(p.resold, 'alt')}</div></div>
      </div>
      <div class="card"><h2 style="margin-bottom:6px">Insumos</h2>${STOCK.map(s => `<div class="list-row">
        <div class="grow"><strong>${s.name}</strong><br><small>${s.qty}</small></div>
        <div class="level"><div class="bar" style="margin:0"><i style="width:${s.pct}%;${s.pct < 30 ? 'background:var(--danger)' : ''}"></i></div></div>
        ${s.pct < 30 ? '<span class="pill" style="color:var(--danger)">Baixo</span>' : ''}</div>`).join('')}</div>`;
  }

  function viewReports() {
    if (!isManager()) return `<div class="eyebrow">Área reservada</div><h1>Relatórios</h1>
      <div class="card lock"><div class="big">🔒</div><h2>Somente para gerentes</h2>
      <p>Números, gráficos e dados completos ficam aqui, longe da rotina simples da equipe.</p>
      <button class="btn primary" data-act="becomeManager">Entrar como gerente</button></div>`;
    const max = Math.max.apply(null, WEEK.map(w => w[1])), done = doneCount();
    return `<div class="eyebrow">Área reservada · Gerente</div><h1>Relatórios</h1>
      <p class="sub">Dados de exemplo para teste.</p>
      <div class="grid stats">
        <div class="card stat"><strong>${done}/${ALL_RECIPES.length}</strong><span>Receitas hoje</span></div>
        <div class="card stat"><strong>2,1%</strong><span>Desperdício</span></div>
        <div class="card stat"><strong>R$ 4.820</strong><span>Vendas ontem</span></div>
      </div>
      <div class="card"><h2>Produção na semana (unidades)</h2>
        <div class="chart">${WEEK.map(w => `<div class="col"><span>${w[1]}</span><i style="height:${w[1] / max * 78}%"></i>${w[0]}</div>`).join('')}</div></div>
      <div style="margin-top:14px"><button class="btn" data-act="export">⬇ Exportar relatório</button></div>`;
  }

  function viewSettings() {
    return `<div class="eyebrow">Configurações</div><h1>Ajustes</h1><p class="sub">Tudo salvo apenas neste aparelho.</p>
      <div class="card">
        <div class="switch-row"><div><strong>Perfil de uso</strong><br><small>Equipe vê o essencial. Gerente vê números.</small></div>
          <select id="roleSel" style="width:auto"><option value="worker">👷 Equipe</option><option value="manager">👔 Gerente</option></select></div>
        <div class="switch-row"><div><strong>Tema claro</strong></div><input type="checkbox" id="themeChk"></div>
        <div class="switch-row"><div><strong>Cronômetro acelerado (teste)</strong><br><small>1 segundo real = 30 segundos.</small></div><input type="checkbox" id="fastChk"></div>
        <div class="switch-row"><div><strong>Dados da loja</strong><br><small>Refazer o formulário de primeiro acesso.</small></div><button class="btn small" data-act="onboard">Editar</button></div>
        <div class="switch-row"><div><strong>Zerar tudo</strong><br><small>Apaga progresso e cadastro.</small></div><button class="btn small" data-act="reset" style="color:var(--danger)">Zerar</button></div>
      </div>`;
  }
  function bindSettings() {
    $('#roleSel').value = state.role; $('#themeChk').checked = state.theme === 'light'; $('#fastChk').checked = state.fast;
    $('#roleSel').onchange = e => setRole(e.target.value);
    $('#themeChk').onchange = e => setTheme(e.target.checked ? 'light' : 'dark');
    $('#fastChk').onchange = e => { state.fast = e.target.checked; store.set('fast', state.fast); };
  }

  function setRole(r) { state.role = r; store.set('role', r); renderNav(); render(); toast(r === 'manager' ? 'Modo gerente' : 'Modo equipe'); }
  function setTheme(t) { state.theme = t; store.set('theme', t); document.documentElement.dataset.theme = t; }

  /* ---------- Receitas e cronômetro ---------- */
  function startRecipe(id) {
    const r = find(id); if (!r) return;
    state.open[r.pid] = true;
    state.active = { id, total: r.min * 60, remaining: r.min * 60, running: true };
    delete state.status[id]; saveStatus(); render();
    toast('Cronômetro iniciado: ' + r.name);
  }
  function finishRecipe(id, silent) {
    state.status[id] = 'done'; saveStatus();
    if (state.active && state.active.id === id) state.active = null;
    render(); if (!silent) toast('Receita concluída ✓');
  }
  function tick() {
    const a = state.active; if (!a || !a.running) return;
    a.remaining -= state.fast ? 30 : 1;
    if (a.remaining <= 0) {
      const r = find(a.id); finishRecipe(a.id, true);
      toast('⏰ Pronto: ' + r.name);
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* ignora */ }
      return;
    }
    $$('[data-timer]').forEach(el => el.textContent = fmt(a.remaining));
    $$('[data-bar]').forEach(el => el.style.width = (100 - a.remaining / a.total * 100) + '%');
  }
  setInterval(tick, 1000);

  /* ---------- Cliques ---------- */
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    const el = e.target.closest('[data-act]'); if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'toggle': state.open[id] = !state.open[id]; render(); break;
      case 'start': startRecipe(id); break;
      case 'skip': state.status[id] = 'skipped'; saveStatus(); render(); break;
      case 'undo': delete state.status[id]; saveStatus(); render(); break;
      case 'pause': state.active.running = !state.active.running; render(); break;
      case 'finish': finishRecipe(id); break;
      case 'task': {
        const t = state.tasks.find(x => x.id === id);
        t.st = t.st === 'done' ? 'pending' : 'done'; saveTasks();
        $('#taskList').innerHTML = state.tasks.map(taskRow).join('');
        $('#taskCount').textContent = `${state.tasks.filter(x => x.st === 'done').length} de ${state.tasks.length} concluídas`;
        break;
      }
      case 'newTask': {
        const title = (prompt('Qual é a nova tarefa?') || '').trim();
        if (title) { state.tasks.unshift({ id: 't' + Date.now(), title, who: userName(), st: 'pending' }); saveTasks(); render(); toast('Tarefa adicionada'); }
        break;
      }
      case 'auto': toast('Automações com IA: em breve'); break;
      case 'becomeManager': setRole('manager'); break;
      case 'export': toast('Exportação: em breve'); break;
      case 'onboard': openOnboarding(); break;
      case 'reset': if (confirm('Apagar todos os dados deste protótipo?')) { store.clear(); location.reload(); } break;
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rangeSel') {
      state.range = +e.target.value; const d = salesData();
      $('#salesTotal').textContent = money(d.values.reduce((a, b) => a + b, 0));
      $('#salesTotal').nextElementSibling.textContent = '↗ ' + d.delta;
      drawChart();
    }
    if (e.target.id === 'periodSel') toast('Período: ' + e.target.value + ' (dados de demonstração)');
  });
  $('#roleBtn').onclick =() => setRole(isManager() ? 'worker' : 'manager');
  $('#themeBtn').onclick = () => { setTheme(state.theme === 'dark' ? 'light' : 'dark'); if (state.view === 'settings') bindSettings(); };
  $('#bellBtn').onclick = () => toast('Sem novas notificações');

  /* ---------- Primeiro acesso ---------- */
  function openOnboarding() {
    const p = state.profile || { name: '', store: '', suppliers: 3, made: [], resold: [], role: state.role };
    const draft = { made: p.made.slice(), resold: p.resold.slice() };
    const ov = $('#onboarding');
    ov.hidden = false;
    ov.innerHTML = `<form class="modal" id="obForm">
      <div class="eyebrow">Primeiro acesso</div><h2>Vamos conhecer sua loja</h2>
      <p class="sub">Leva menos de 1 minuto e deixa o Gestium com a sua cara.</p>
      <div class="field"><label>Seu nome</label><input type="text" name="name" required value="${esc(p.name || '')}" placeholder="Ex.: Gabriel"></div>
      <div class="field"><label>Nome da loja</label><input type="text" name="store" value="${esc(p.store || '')}" placeholder="Ex.: Padaria Pão Quente"></div>
      <div class="field"><label>Você usa o app como</label><div class="seg">
        <label><input type="radio" name="role" value="worker" ${p.role !== 'manager' ? 'checked' : ''}><span>👷 Equipe</span></label>
        <label><input type="radio" name="role" value="manager" ${p.role === 'manager' ? 'checked' : ''}><span>👔 Gerente</span></label></div></div>
      <div class="field"><label>Quantidade de fornecedores</label><div class="stepper">
        <button type="button" data-step="-1">−</button><input type="number" name="suppliers" min="0" max="99" value="${p.suppliers}"><button type="button" data-step="1">+</button></div></div>
      <div class="field"><label>Produtos que você fabrica</label><div class="chips-box" data-list="made"></div>
        <div class="suggest" data-sug="made"></div></div>
      <div class="field"><label>Produtos que você revende</label><div class="chips-box" data-list="resold"></div>
        <div class="suggest" data-sug="resold"></div></div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" id="obSkip">Pular por agora</button>
        <button class="btn primary" type="submit">Começar →</button></div></form>`;

    const SUG = { made: ['Pão de sal', 'Pão doce', 'Croissant', 'Pão de queijo', 'Bolo'], resold: ['Refrigerante', 'Café', 'Suco', 'Frios', 'Leite'] };
    function drawChips(key) {
      const box = $(`[data-list="${key}"]`, ov);
      box.innerHTML = draft[key].map((t, i) => `<span class="tag ${key === 'resold' ? 'alt' : ''}">${esc(t)}<button type="button" data-rm="${key}:${i}">×</button></span>`).join('')
        + `<input type="text" placeholder="Digite e tecle Enter" data-input="${key}">`;
      $(`[data-sug="${key}"]`, ov).innerHTML = SUG[key].filter(s => !draft[key].includes(s)).map(s => `<button type="button" data-add="${key}" data-v="${esc(s)}">+ ${esc(s)}</button>`).join('');
      const inp = $('input', box);
      inp.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(key, inp.value); }
        else if (e.key === 'Backspace' && !inp.value && draft[key].length) { draft[key].pop(); drawChips(key); $(`[data-input="${key}"]`, ov).focus(); }
      };
    }
    function add(key, v) {
      v = v.trim().replace(/,$/, ''); if (!v || draft[key].includes(v)) return;
      draft[key].push(v); drawChips(key); $(`[data-input="${key}"]`, ov).focus();
    }
    drawChips('made'); drawChips('resold');

    ov.onclick = e => {
      const rm = e.target.closest('[data-rm]'), ad = e.target.closest('[data-add]'), st = e.target.closest('[data-step]');
      if (rm) { const [k, i] = rm.dataset.rm.split(':'); draft[k].splice(+i, 1); drawChips(k); }
      if (ad) add(ad.dataset.add, ad.dataset.v);
      if (st) { const inp = $('[name=suppliers]', ov); inp.value = Math.max(0, +inp.value + +st.dataset.step); }
    };
    $('#obSkip').onclick = () => { ov.hidden = true; if (!state.profile) toast('Você pode preencher depois em Configurações'); };
    $('#obForm').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      // adiciona o que estiver digitado e ainda não virou etiqueta
      ['made', 'resold'].forEach(k => { const v = ($(`[data-input="${k}"]`, ov).value || '').trim(); if (v && !draft[k].includes(v)) draft[k].push(v); });
      state.profile = { name: f.get('name').trim(), store: f.get('store').trim(), suppliers: +f.get('suppliers') || 0, made: draft.made, resold: draft.resold, role: f.get('role') };
      store.set('profile', state.profile);
      state.role = state.profile.role; store.set('role', state.role);
      ov.hidden = true; renderNav(); render(); toast('Tudo pronto, ' + state.profile.name + '!');
    };
  }

  /* ---------- Conversa por voz ---------- */
  const panel = $('#voicePanel'), log = $('#voiceLog');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;

  function say(text, who) {
    const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
    if (who === 'bot') { try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) { /* ignora */ } }
  }
  function openVoice() {
    panel.hidden = false;
    if (!log.children.length) say(`${greeting()}, ${userName()}! Em que posso ajudar?`, 'bot');
    $('#voiceInput').focus();
  }
  $('#micFab').onclick = () => panel.hidden ? openVoice() : (panel.hidden = true);
  $('#voiceClose').onclick = () => { panel.hidden = true; try { speechSynthesis.cancel(); } catch (e) { /* ignora */ } };

  function findProduct(t) { return PRODUCTS.find(p => p.key.some(k => new RegExp('\\b' + k + '\\b').test(t))); }
  function command(raw) {
    const t = norm(raw); if (!t.trim()) return;
    say(raw, 'me');
    let ans;
    if (/(abrir|ir para|ver|mostrar)?\s*(estoque)/.test(t)) { go('stock'); ans = 'Abrindo o estoque.'; }
    else if (/relatorio/.test(t)) { go('reports'); ans = isManager() ? 'Abrindo os relatórios.' : 'Os relatórios são só para gerentes. Troque para o modo gerente.'; }
    else if (/(inicio|painel|lista)/.test(t)) { go('home'); ans = 'Voltando ao início.'; }
    else if (/configura/.test(t)) { go('settings'); ans = 'Abrindo as configurações.'; }
    else if (/(quantas|quanto|faltam|falta)/.test(t)) { const n = ALL_RECIPES.filter(r => !state.status[r.id]).length; ans = n ? `Faltam ${n} receitas para hoje.` : 'Tudo pronto por hoje!'; }
    else if (/(pausar|parar|pausa)/.test(t)) { if (state.active && state.active.running) { state.active.running = false; render(); ans = 'Cronômetro pausado.'; } else ans = 'Nenhum cronômetro rodando.'; }
    else if (/(retomar|continuar)/.test(t)) { if (state.active) { state.active.running = true; render(); ans = 'Retomando.'; } else ans = 'Nenhum cronômetro para retomar.'; }
    else if (/(concluir|terminei|pronto|finalizar)/.test(t)) { if (state.active) { const r = find(state.active.id); finishRecipe(state.active.id, true); ans = `Receita ${r.name} concluída.`; } else ans = 'Nenhuma receita em andamento.'; }
    else if (/pular/.test(t)) {
      const p = findProduct(t) || PRODUCTS.find(x => pendingOf(x).length);
      const r = p && pendingOf(p)[0];
      if (r) { state.status[r.id] = 'skipped'; saveStatus(); go('prod'); ans = `Pulei ${r.name} de ${p.name}.`; } else ans = 'Não há receita para pular.';
    }
    else if (/(iniciar|comecar|começar|start)/.test(t) || findProduct(t)) {
      const p = findProduct(t) || PRODUCTS.find(x => pendingOf(x).length);
      const r = p && pendingOf(p)[0];
      if (r) { go('prod'); startRecipe(r.id); ans = `Iniciando ${r.name} de ${p.name}. Cronômetro de ${r.min} minutos.`; } else ans = 'Nenhuma receita pendente aí.';
    }
    else ans = 'Não entendi. Tente “iniciar pão de sal” ou “abrir estoque”.';
    say(ans, 'bot');
  }
  $('#voiceForm').onsubmit = e => { e.preventDefault(); const i = $('#voiceInput'); command(i.value); i.value = ''; };
  $('#voiceMic').onclick = () => {
    if (!SR) return say('Seu navegador não tem reconhecimento de voz. Digite o comando.', 'bot');
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = false;
    const btns = [$('#voiceMic'), $('#micFab')];
    btns.forEach(b => b.classList.add('listening'));
    rec.onresult = ev => command(ev.results[0][0].transcript);
    rec.onerror = () => say('Não consegui ouvir. Verifique a permissão do microfone.', 'bot');
    rec.onend = () => { btns.forEach(b => b.classList.remove('listening')); rec = null; };
    try { rec.start(); } catch (e) { rec = null; }
  };

  /* ---------- Início ---------- */
  document.documentElement.dataset.theme = state.theme;
  renderNav(); render();
  if (!state.profile) openOnboarding();
})();