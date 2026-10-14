(() => {
  'use strict';

  const CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Housing', 'Bills & Utilities', 'Health', 'Entertainment', 'Education', 'Salary', 'Freelance', 'Other'];
  const EXPENSE_CATEGORIES = CATEGORIES.filter(category => !['Salary', 'Freelance'].includes(category));
  const COLORS = ['#67e8c3', '#7c8cff', '#ffc56b', '#ff7d92', '#5fd1ee', '#b28cff', '#f49bd6', '#8bd17c', '#e69b62', '#9fb0c7'];
  const KEYS = { transactions: 'spendwise.transactions.v1', budgets: 'spendwise.budgets.v1', theme: 'spendwise.theme.v1' };

  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const monthKey = date => {
    const parsed = date instanceof Date ? date : new Date(`${date}T00:00:00`);
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  };
  const formatDate = value => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
  const escapeText = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const cryptoId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const state = {
    transactions: [],
    budgets: [],
    theme: 'dark',
    budgetMonth: monthKey(new Date()),
    categoryChart: null,
    monthlyChart: null
  };

  function notify(message, error = false) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.toggle('danger-text', error);
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function safeLoad(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      notify('Saved data could not be read. Using a safe temporary session.', true);
      return fallback;
    }
  }

  function safeSave(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      notify('Your browser could not save this change.', true);
      return false;
    }
  }

  function seed() {
    const today = new Date();
    const iso = daysAgo => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().slice(0, 10);
    };
    return [
      { id: cryptoId(), type: 'income', amount: 4200, category: 'Salary', date: iso(3), description: 'Monthly salary' },
      { id: cryptoId(), type: 'expense', amount: 86.42, category: 'Food & Dining', date: iso(2), description: 'Dinner with friends' },
      { id: cryptoId(), type: 'expense', amount: 52.8, category: 'Transport', date: iso(5), description: 'Fuel and parking' },
      { id: cryptoId(), type: 'expense', amount: 129.99, category: 'Shopping', date: iso(8), description: 'Home essentials' },
      { id: cryptoId(), type: 'expense', amount: 74.2, category: 'Bills & Utilities', date: iso(12), description: 'Internet bill' },
      { id: cryptoId(), type: 'expense', amount: 38, category: 'Entertainment', date: iso(18), description: 'Cinema tickets' },
      { id: cryptoId(), type: 'income', amount: 650, category: 'Freelance', date: iso(22), description: 'Design project' }
    ];
  }

  function init() {
    const storedTransactions = safeLoad(KEYS.transactions, null);
    state.transactions = Array.isArray(storedTransactions) ? storedTransactions : seed();
    if (!storedTransactions) safeSave(KEYS.transactions, state.transactions);

    const storedBudgets = safeLoad(KEYS.budgets, null);
    state.budgets = Array.isArray(storedBudgets) ? storedBudgets : [
      { id: cryptoId(), month: state.budgetMonth, category: 'Food & Dining', amount: 450 },
      { id: cryptoId(), month: state.budgetMonth, category: 'Shopping', amount: 300 },
      { id: cryptoId(), month: state.budgetMonth, category: 'Transport', amount: 220 }
    ];
    if (!storedBudgets) safeSave(KEYS.budgets, state.budgets);

    const storedTheme = safeLoad(KEYS.theme, 'dark');
    state.theme = ['dark', 'light'].includes(storedTheme) ? storedTheme : 'dark';
    applyTheme();
    populateCategories();
    bindEvents();
    render();
  }

  function applyTheme() {
    const light = state.theme === 'light';
    document.body.classList.toggle('light', light);
    $('themeToggle').textContent = light ? '☾' : '☼';
    $('themeToggle').setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
  }

  function populateCategories() {
    $('transactionCategory').innerHTML = CATEGORIES.map(category => `<option value="${escapeText(category)}">${escapeText(category)}</option>`).join('');
    $('budgetCategory').innerHTML = EXPENSE_CATEGORIES.map(category => `<option value="${escapeText(category)}">${escapeText(category)}</option>`).join('');
    updateCategoryFilter();
  }

  function updateCategoryFilter() {
    const current = $('categoryFilter').value;
    const categories = [...new Set(state.transactions.map(transaction => transaction.category).filter(Boolean))].sort();
    $('categoryFilter').innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeText(category)}">${escapeText(category)}</option>`).join('');
    if (categories.includes(current)) $('categoryFilter').value = current;
  }

  function bindEvents() {
    $('addTransactionTop').addEventListener('click', () => openTransaction());
    $('addBudget').addEventListener('click', openBudget);
    $('themeToggle').addEventListener('click', toggleTheme);
    $('exportCsv').addEventListener('click', exportCSV);
    ['searchInput', 'typeFilter', 'categoryFilter', 'sortSelect'].forEach(id => $(id).addEventListener('input', renderTransactions));
    $('clearFilters').addEventListener('click', () => {
      $('searchInput').value = '';
      $('typeFilter').value = 'all';
      $('categoryFilter').value = 'all';
      $('sortSelect').value = 'newest';
      renderTransactions();
    });
    $('previousBudgetMonth').addEventListener('click', () => shiftBudgetMonth(-1));
    $('nextBudgetMonth').addEventListener('click', () => shiftBudgetMonth(1));
    $('transactionForm').addEventListener('submit', saveTransaction);
    $('budgetForm').addEventListener('submit', saveBudget);
    document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
    document.querySelectorAll('.modal-backdrop').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal.id); }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(modal => closeModal(modal.id));
    });
    $('transactionList').addEventListener('click', handleTransactionAction);
    $('budgetList').addEventListener('click', handleBudgetAction);
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    safeSave(KEYS.theme, state.theme);
    renderCharts();
  }

  function render() {
    const currentMonth = monthKey(new Date());
    const currentTransactions = state.transactions.filter(transaction => monthKey(transaction.date) === currentMonth);
    const income = currentTransactions.filter(transaction => transaction.type === 'income').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expenses = currentTransactions.filter(transaction => transaction.type === 'expense').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const balance = state.transactions.reduce((sum, transaction) => sum + (transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount)), 0);
    const savings = income - expenses;
    $('currentMonthLabel').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();
    $('todayLabel').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
    $('totalBalance').textContent = money(balance);
    $('monthlyIncome').textContent = money(income);
    $('monthlyExpenses').textContent = money(expenses);
    $('monthlySavings').textContent = money(savings);
    $('savingsNote').textContent = savings >= 0 ? 'Income minus expenses' : 'You spent more than you earned';
    $('expenseNote').textContent = `${currentTransactions.filter(transaction => transaction.type === 'expense').length} expense${currentTransactions.filter(transaction => transaction.type === 'expense').length === 1 ? '' : 's'} this month`;
    updateCategoryFilter();
    renderTransactions();
    renderBudgets();
    renderCharts();
  }

  function getFiltered() {
    const query = $('searchInput').value.trim().toLowerCase();
    const type = $('typeFilter').value;
    const category = $('categoryFilter').value;
    const sort = $('sortSelect').value;
    const list = state.transactions.filter(transaction =>
      (!query || `${transaction.description} ${transaction.category}`.toLowerCase().includes(query)) &&
      (type === 'all' || transaction.type === type) &&
      (category === 'all' || transaction.category === category)
    );
    list.sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : sort === 'oldest' ? a.date.localeCompare(b.date) : sort === 'highest' ? b.amount - a.amount : a.amount - b.amount);
    return list;
  }

  function renderTransactions() {
    const list = getFiltered();
    $('transactionCount').textContent = `${list.length} transaction${list.length === 1 ? '' : 's'}`;
    $('transactionList').innerHTML = list.length ? list.map(transaction => `<div class="transaction-row">
      <div class="transaction-avatar">${escapeText(transaction.category.slice(0, 1))}</div>
      <div><div class="transaction-title">${escapeText(transaction.description)}</div><div class="transaction-meta">${escapeText(transaction.category)} · ${formatDate(transaction.date)}</div></div>
      <div class="transaction-amount ${transaction.type === 'income' ? 'amount-income' : 'amount-expense'}">${transaction.type === 'income' ? '+' : '−'}${money(transaction.amount)}</div>
      <div class="row-actions"><button type="button" data-action="edit" data-id="${escapeText(transaction.id)}" aria-label="Edit ${escapeText(transaction.description)}">✎</button><button type="button" data-action="delete" data-id="${escapeText(transaction.id)}" aria-label="Delete ${escapeText(transaction.description)}">×</button></div>
    </div>`).join('') : `<div class="empty-state"><div><div style="font-size:32px;margin-bottom:10px">◌</div><strong>No transactions found</strong><span>Try changing your filters or add a new transaction.</span></div></div>`;
  }

  function renderBudgets() {
    const budgets = state.budgets.filter(budget => budget.month === state.budgetMonth);
    const expenses = state.transactions.filter(transaction => transaction.type === 'expense' && monthKey(transaction.date) === state.budgetMonth);
    $('budgetMonthLabel').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${state.budgetMonth}-01T00:00:00`));
    let total = 0;
    let spentTotal = 0;
    $('budgetList').innerHTML = budgets.length ? budgets.map(budget => {
      const spent = expenses.filter(transaction => transaction.category === budget.category).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      total += Number(budget.amount);
      spentTotal += spent;
      const percent = budget.amount > 0 ? Math.min(100, spent / budget.amount * 100) : 0;
      return `<div class="budget-item"><div class="budget-title"><span>${escapeText(budget.category)}</span><button class="row-actions" data-action="delete-budget" data-id="${escapeText(budget.id)}" aria-label="Delete ${escapeText(budget.category)} budget">×</button></div><div class="progress"><div class="progress-bar ${spent > budget.amount ? 'over' : ''}" style="width:${percent}%"></div></div><div class="budget-stats"><span>${money(spent)} spent</span><span>${spent > budget.amount ? `${money(spent - budget.amount)} over` : `${money(budget.amount - spent)} left`}</span></div></div>`;
    }).join('') : `<div class="empty-state"><div><strong>No budgets for this month</strong><span>Set a limit to stay on track.</span></div></div>`;
    $('totalBudget').textContent = money(total);
    $('totalBudgetSpent').textContent = money(spentTotal);
  }

  function renderCharts() {
    if (state.categoryChart) state.categoryChart.destroy();
    if (state.monthlyChart) state.monthlyChart.destroy();
    if (typeof Chart === 'undefined') {
      $('categoryEmpty').textContent = 'Charts unavailable offline';
      $('monthlyEmpty').textContent = 'Charts unavailable offline';
      $('categoryEmpty').style.display = 'grid';
      $('monthlyEmpty').style.display = 'grid';
      $('categoryLegend').innerHTML = '';
      return;
    }
    const currentMonth = monthKey(new Date());
    const expenses = state.transactions.filter(transaction => transaction.type === 'expense' && monthKey(transaction.date) === currentMonth);
    const grouped = {};
    expenses.forEach(transaction => { grouped[transaction.category] = (grouped[transaction.category] || 0) + Number(transaction.amount); });
    const labels = Object.keys(grouped);
    const values = Object.values(grouped);
    $('categoryEmpty').style.display = labels.length ? 'none' : 'grid';
    $('monthlyEmpty').style.display = state.transactions.some(transaction => transaction.type === 'expense') ? 'none' : 'grid';
    if (labels.length) state.categoryChart = new Chart($('categoryChart'), { type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: COLORS, borderWidth: 0, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } } });
    $('categoryLegend').innerHTML = labels.map((label, index) => `<span class="legend-item"><i class="legend-color" style="background:${COLORS[index % COLORS.length]}"></i>${escapeText(label)}</span>`).join('');
    if (state.transactions.some(transaction => transaction.type === 'expense')) {
      const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 5 + index); return monthKey(date); });
      const monthLabels = months.map(month => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${month}-01T00:00:00`)));
      const spent = months.map(month => state.transactions.filter(transaction => transaction.type === 'expense' && monthKey(transaction.date) === month).reduce((sum, transaction) => sum + Number(transaction.amount), 0));
      const muted = getComputedStyle(document.body).getPropertyValue('--muted');
      state.monthlyChart = new Chart($('monthlyChart'), { type: 'bar', data: { labels: monthLabels, datasets: [{ label: 'Expenses', data: spent, borderRadius: 8, backgroundColor: COLORS[1] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: muted } }, y: { beginAtZero: true, grid: { color: 'rgba(141,162,190,.12)' }, ticks: { color: muted, callback: value => `$${value}` } } } } });
    }
  }

  function openTransaction(transaction = null) {
    $('transactionModal').hidden = false;
    $('transactionModalTitle').textContent = transaction ? 'Edit transaction' : 'Add transaction';
    $('transactionId').value = transaction?.id || '';
    $('transactionType').value = transaction?.type || 'expense';
    $('transactionAmount').value = transaction?.amount || '';
    $('transactionCategory').value = transaction?.category || EXPENSE_CATEGORIES[0];
    $('transactionDate').value = transaction?.date || new Date().toISOString().slice(0, 10);
    $('transactionDescription').value = transaction?.description || '';
    $('transactionError').textContent = '';
    $('transactionAmount').focus();
  }

  function closeModal(id) { $(id).hidden = true; }

  function saveTransaction(event) {
    event.preventDefault();
    const id = $('transactionId').value;
    const amount = Number($('transactionAmount').value);
    const date = $('transactionDate').value;
    const description = $('transactionDescription').value.trim();
    const type = $('transactionType').value;
    const category = $('transactionCategory').value;
    let error = '';
    if (!Number.isFinite(amount) || amount <= 0) error = 'Enter an amount greater than zero.';
    else if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) error = 'Choose a valid date.';
    else if (!description) error = 'Add a short description.';
    if (error) { $('transactionError').textContent = error; return; }
    const transaction = { id: id || cryptoId(), amount: Math.round(amount * 100) / 100, date, description, type, category };
    if (id) { const index = state.transactions.findIndex(item => item.id === id); if (index >= 0) state.transactions[index] = transaction; } else state.transactions.push(transaction);
    safeSave(KEYS.transactions, state.transactions);
    closeModal('transactionModal');
    notify(id ? 'Transaction updated' : 'Transaction added');
    render();
  }

  function handleTransactionAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const transaction = state.transactions.find(item => item.id === button.dataset.id);
    if (button.dataset.action === 'edit' && transaction) openTransaction(transaction);
    if (button.dataset.action === 'delete' && transaction && confirm(`Delete “${transaction.description}”?`)) {
      state.transactions = state.transactions.filter(item => item.id !== transaction.id);
      safeSave(KEYS.transactions, state.transactions);
      notify('Transaction deleted');
      render();
    }
  }

  function openBudget() {
    $('budgetModal').hidden = false;
    $('budgetCategory').value = EXPENSE_CATEGORIES[0];
    $('budgetAmount').value = '';
    $('budgetError').textContent = '';
    $('budgetAmount').focus();
  }

  function saveBudget(event) {
    event.preventDefault();
    const category = $('budgetCategory').value;
    const amount = Number($('budgetAmount').value);
    if (!Number.isFinite(amount) || amount <= 0) { $('budgetError').textContent = 'Enter a budget greater than zero.'; return; }
    const existing = state.budgets.find(budget => budget.month === state.budgetMonth && budget.category === category);
    if (existing) existing.amount = Math.round(amount * 100) / 100;
    else state.budgets.push({ id: cryptoId(), month: state.budgetMonth, category, amount: Math.round(amount * 100) / 100 });
    safeSave(KEYS.budgets, state.budgets);
    closeModal('budgetModal');
    notify(existing ? 'Budget updated' : 'Budget added');
    renderBudgets();
  }

  function handleBudgetAction(event) {
    const button = event.target.closest('button[data-action="delete-budget"]');
    if (button && confirm('Delete this budget?')) {
      state.budgets = state.budgets.filter(budget => budget.id !== button.dataset.id);
      safeSave(KEYS.budgets, state.budgets);
      renderBudgets();
      notify('Budget deleted');
    }
  }

  function shiftBudgetMonth(delta) {
    const date = new Date(`${state.budgetMonth}-01T00:00:00`);
    date.setMonth(date.getMonth() + delta);
    state.budgetMonth = monthKey(date);
    renderBudgets();
  }

  function exportCSV() {
    if (!state.transactions.length) { notify('There are no transactions to export.', true); return; }
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = state.transactions.map(transaction => [transaction.date, transaction.type, transaction.category, transaction.description, transaction.amount]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spendwise-transactions-${monthKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('CSV export downloaded');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
