// Tab switching
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
  
  if (tabId === 'promotions') loadPromotions();
  if (tabId === 'banks') loadBanks();
  if (tabId === 'scraper') loadScraperLogs();
}

// Load promotions
async function loadPromotions() {
  const response = await fetch('/api/promotions?status=active');
  const promotions = await response.json();
  renderPromotions(promotions);
}

function renderPromotions(promotions) {
  const container = document.getElementById('promotionsList');
  
  if (promotions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No hay promociones activas</h3>
        <p>Ejecuta el scraper para obtener las ultimas promociones</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = promotions.map(p => `
    <div class="promo-card">
      <div class="promo-header">
        <span class="promo-bank">${p.bank_name} • ${p.card_name}</span>
        ${p.discount_percentage ? `<span class="promo-discount">${p.discount_percentage}% OFF</span>` : ''}
      </div>
      <h3 class="promo-title">${p.title}</h3>
      <p class="promo-description">${p.description || ''}</p>
      <div class="promo-meta">
        <span>📁 ${p.category || 'General'}</span>
        ${p.days_of_week ? `<span>📅 ${p.days_of_week}</span>` : ''}
      </div>
      <div class="promo-merchant">
        <strong>${p.merchant_name || 'Comercio no especificado'}</strong>
        ${p.merchant_address ? `<p>${p.merchant_address}</p>` : ''}
        <p class="promo-dates">Vigente hasta: ${formatDate(p.valid_until)}</p>
      </div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Search and filter
document.getElementById('searchInput')?.addEventListener('input', debounce(async (e) => {
  const query = e.target.value;
  if (query.length < 2) {
    loadPromotions();
    return;
  }
  const response = await fetch(`/api/promotions/search?q=${encodeURIComponent(query)}`);
  const promotions = await response.json();
  renderPromotions(promotions);
}, 300));

document.getElementById('bankFilter')?.addEventListener('change', filterPromotions);
document.getElementById('categoryFilter')?.addEventListener('change', filterPromotions);

async function filterPromotions() {
  const bankId = document.getElementById('bankFilter').value;
  const category = document.getElementById('categoryFilter').value;
  
  let url = '/api/promotions?status=active';
  if (bankId) url += `&bank_id=${bankId}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  
  const response = await fetch(url);
  const promotions = await response.json();
  renderPromotions(promotions);
}

// Scraper
async function runScraper(bank) {
  const resultsDiv = document.getElementById('scraperResults');
  resultsDiv.className = 'loading';
  resultsDiv.innerHTML = `<p>⏳ Ejecutando scraper para ${bank === 'all' ? 'todos los bancos' : bank}...</p>`;
  
  try {
    const response = await fetch('/api/scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank })
    });
    
    const data = await response.json();
    resultsDiv.className = 'success';
    
    const results = data.results.map(r => `
      <p><strong>${r.bank}:</strong> ${r.status === 'success' ? '✅' : '❌'} 
      ${r.promotionsFound} encontradas, ${r.promotionsAdded} nuevas
      ${r.error ? `<br><small>Error: ${r.error}</small>` : ''}</p>
    `).join('');
    
    resultsDiv.innerHTML = `<h4>Resultados:</h4>${results}`;
    loadScraperLogs();
  } catch (err) {
    resultsDiv.className = 'error';
    resultsDiv.innerHTML = `<p>❌ Error: ${err.message}</p>`;
  }
}

async function loadScraperLogs() {
  const response = await fetch('/api/scraper/logs');
  const logs = await response.json();
  
  const container = document.getElementById('scraperLogs');
  container.innerHTML = logs.map(l => `
    <div class="log-entry ${l.status}">
      <span>${new Date(l.scraped_at).toLocaleString('es-PY')}</span>
      <span><strong>${l.bank_name}</strong> - ${l.status === 'success' ? '✅' : '❌'}</span>
      <span>${l.promotions_found} encontradas, ${l.promotions_added || 0} nuevas</span>
    </div>
  `).join('');
}

// Banks
async function loadBanks() {
  const response = await fetch('/api/banks');
  const banks = await response.json();
  
  const container = document.getElementById('banksList');
  container.innerHTML = banks.map(b => `
    <div class="bank-card">
      <div class="bank-logo">🏦</div>
      <div class="bank-info">
        <h3>${b.name}</h3>
        <a href="${b.website}" target="_blank">${b.website}</a>
      </div>
    </div>
  `).join('');
  
  // Update bank filter
  const filterSelect = document.getElementById('bankFilter');
  filterSelect.innerHTML = '<option value="">Todos los bancos</option>' + 
    banks.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
}

// Utility
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

// Initial load
loadPromotions();
loadBanks();
