// Popup script for AdLoot extension
let currentTabId = null;

document.addEventListener('DOMContentLoaded', () => {
  const toggleEl = document.getElementById('toggle-enabled');
  const shopBtn = document.getElementById('shop-btn');
  const shopBack = document.getElementById('shop-back');
  const mainView = document.getElementById('main-view');
  const shopView = document.getElementById('shop-view');

  // Get current tab and load stats
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    currentTabId = tabs[0].id;
    loadStats();
  });

  // Load saved toggle state
  chrome.storage.local.get(['adlootEnabled'], (result) => {
    toggleEl.checked = result.adlootEnabled !== false;
    updateShopBtnState();
  });

  // Toggle handler
  toggleEl.addEventListener('change', () => {
    const enabled = toggleEl.checked;
    chrome.storage.local.set({ adlootEnabled: enabled });
    updateShopBtnState();

    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'toggleEnabled', enabled });
    }
  });

  // Shop button
  shopBtn.addEventListener('click', () => {
    mainView.classList.add('hidden');
    shopView.classList.add('active');
    loadShop();
  });

  // Back button
  shopBack.addEventListener('click', () => {
    shopView.classList.remove('active');
    mainView.classList.remove('hidden');
    loadStats();
  });

  function updateShopBtnState() {
    shopBtn.disabled = !toggleEl.checked;
  }
});

function loadStats() {
  if (!currentTabId) return;
  chrome.tabs.sendMessage(currentTabId, { action: 'getStats' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    document.getElementById('ads-count').textContent = response.ads || 0;
    document.getElementById('total-loot').textContent = response.loot || 0;
    document.getElementById('hp-value').textContent =
      response.health !== undefined ? response.health + '/' + response.maxHealth : '-';
  });
}

function loadShop() {
  if (!currentTabId) return;
  chrome.tabs.sendMessage(currentTabId, { action: 'getShopData' }, (response) => {
    if (chrome.runtime.lastError || !response) return;

    document.getElementById('shop-loot').textContent = response.loot + ' loot';
    renderShopSection('shop-weapons', response.equipment.weapons, 'weapons', response);
    renderShopSection('shop-tools', response.equipment.tools, 'tools', response);
    renderShopSection('shop-armor', response.equipment.armor, 'armor', response);
  });
}

function renderShopSection(containerId, items, type, shopData) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const equipSlot = type.slice(0, -1);
  const equippedId = shopData.equipped[equipSlot];

  items.forEach(item => {
    const isEquipped = item.id === equippedId;
    const canAfford = shopData.loot >= item.cost;
    const isFree = item.cost === 0;

    const el = document.createElement('div');
    el.className = 'shop-item' + (isEquipped ? ' equipped' : '') + (!canAfford && !isEquipped ? ' locked' : '');

    let statsText = '';
    if (type === 'weapons') statsText = '+' + item.attackBonus + ' ATK';
    else if (type === 'tools') statsText = '+' + item.hackBonus + '% Success';
    else if (type === 'armor') statsText = '+' + item.hpBonus + ' HP';

    let badgeHtml = '';
    if (isEquipped) {
      badgeHtml = '<span class="shop-item-badge badge-equipped">EQUIPPED</span>';
    } else if (!canAfford) {
      badgeHtml = '<span class="shop-item-badge badge-locked">LOCKED</span>';
    }

    el.innerHTML =
      '<span class="shop-item-sprite">' + item.sprite + '</span>' +
      '<div class="shop-item-info">' +
        '<div class="shop-item-name">' + item.name + '</div>' +
        '<div class="shop-item-stats">' + statsText + '</div>' +
      '</div>' +
      '<span class="shop-item-price' + (isFree ? ' free' : '') + '">' +
        (isFree ? 'FREE' : item.cost + ' loot') +
      '</span>' +
      badgeHtml;

    if (!isEquipped && canAfford) {
      el.addEventListener('click', () => {
        chrome.tabs.sendMessage(currentTabId, {
          action: 'buyItem',
          type: type,
          itemId: item.id
        }, (result) => {
          if (chrome.runtime.lastError || !result) return;
          if (result.success) {
            loadShop(); // Refresh shop view
          }
        });
      });
    }

    container.appendChild(el);
  });
}
