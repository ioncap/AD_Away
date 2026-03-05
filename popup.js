// Popup script for AdLoot extension
document.addEventListener('DOMContentLoaded', () => {
  // Query current tab for stats
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getStats' }, (response) => {
        if (response) {
          updateStats(response);
        }
      });
    }
  });
});

function updateStats(stats) {
  const adsCount = document.getElementById('ads-count');
  const totalLoot = document.getElementById('total-loot');
  
  if (adsCount) adsCount.textContent = stats.ads || 0;
  if (totalLoot) totalLoot.textContent = stats.loot || 0;
}
