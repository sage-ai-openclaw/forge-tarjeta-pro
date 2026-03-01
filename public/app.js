const API_URL = '';

// Generate or get user ID
function getUserId() {
  let userId = localStorage.getItem('tarjeta_pro_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tarjeta_pro_user_id', userId);
  }
  return userId;
}

// Load promotions
async function loadPromotions() {
  try {
    const response = await fetch(`${API_URL}/api/promotions/active`);
    const promotions = await response.json();
    renderPromotions(promotions);
  } catch (err) {
    document.getElementById('promotions-list').innerHTML = 
      '<p class="empty-state">Error al cargar promociones</p>';
  }
}

function renderPromotions(promotions) {
  const container = document.getElementById('promotions-list');
  if (promotions.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay promociones activas</p>';
    return;
  }
  
  container.innerHTML = promotions.map(p => `
    <div class="promo-card">
      <div class="promo-bank">${p.bank}</div>
      <div class="promo-info">
        <div class="promo-merchant">${p.merchant}</div>
        <div class="promo-desc">${p.description}</div>
        <div class="promo-valid">Válido hasta: ${p.valid_to || 'Sin fecha'}</div>
      </div>
      <div class="promo-discount">${p.discount_percent ? p.discount_percent + '%' : 'Oferta'}</div>
    </div>
  `).join('');
}

// Load user preferences
async function loadPreferences() {
  const userId = getUserId();
  try {
    const response = await fetch(`${API_URL}/api/preferences/${userId}`);
    if (response.ok) {
      const prefs = await response.json();
      document.getElementById('categories').value = prefs.categories.join(', ');
      document.getElementById('banks').value = prefs.banks.join(', ');
      document.getElementById('min-discount').value = prefs.min_discount;
    }
  } catch (err) {
    // No preferences saved yet
  }
}

// Save preferences
document.getElementById('prefs-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const categories = document.getElementById('categories').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const banks = document.getElementById('banks').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const minDiscount = parseFloat(document.getElementById('min-discount').value) || 0;
  
  const userId = getUserId();
  
  try {
    await fetch(`${API_URL}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        categories,
        banks,
        min_discount: minDiscount,
        notify_email: false,
        notify_push: false
      })
    });
    alert('Preferencias guardadas');
  } catch (err) {
    alert('Error al guardar preferencias');
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPromotions();
  loadPreferences();
});
