// AdLoot POC - Content Script
class AdLoot {
  constructor() {
    this.character = null;
    this.characterPos = { x: 100, y: 100 };
    this.targetPos = null;
    this.ads = [];
    this.health = 100;
    this.maxHealth = 100;
    this.loot = 0;
    this.isMoving = false;
    this.currentAd = null;
    this.minigameActive = false;
    this.enabled = true;
    
    // Equipment system
    this.equipment = {
      weapon: null,
      tool: null,
      armor: null
    };
    
    // Available equipment (unlockable with loot)
    this.availableEquipment = {
      weapons: [
        { id: 'rusty_knife', name: 'Rusty Knife', cost: 0, attackBonus: 0, sprite: '🔪' },
        { id: 'combat_knife', name: 'Combat Knife', cost: 50, attackBonus: 5, sprite: '🗡️' },
        { id: 'plasma_blade', name: 'Plasma Blade', cost: 200, attackBonus: 15, sprite: '⚔️' }
      ],
      tools: [
        { id: 'basic_lockpick', name: 'Basic Lockpick', cost: 0, hackBonus: 0, sprite: '🔧' },
        { id: 'advanced_pick', name: 'Advanced Pick', cost: 75, hackBonus: 10, sprite: '🛠️' },
        { id: 'quantum_decoder', name: 'Quantum Decoder', cost: 250, hackBonus: 20, sprite: '💎' }
      ],
      armor: [
        { id: 'cloth', name: 'Cloth Armor', cost: 0, hpBonus: 0, sprite: '👕' },
        { id: 'kevlar', name: 'Kevlar Vest', cost: 100, hpBonus: 25, sprite: '🦺' },
        { id: 'exosuit', name: 'Exosuit', cost: 300, hpBonus: 50, sprite: '🤖' }
      ]
    };
    
    // Start with basic equipment
    this.equipment.weapon = this.availableEquipment.weapons[0];
    this.equipment.tool = this.availableEquipment.tools[0];
    this.equipment.armor = this.availableEquipment.armor[0];
    
    this.init();
  }

  init() {
    this.setupMessageListener();
    // Check stored enabled state before initializing
    chrome.storage.local.get(['adlootEnabled'], (result) => {
      this.enabled = result.adlootEnabled !== false; // default true
      if (this.enabled) {
        this.startGame();
      }
    });
  }

  startGame() {
    this.createCharacter();
    this.detectAds();
    this.setupEventListeners();
    this.startGameLoop();
    this.showWelcomeMessage();
    this.initAudio();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    chrome.storage.local.set({ adlootEnabled: enabled });

    if (!enabled) {
      // Hide character and HUD
      if (this.character) this.character.style.display = 'none';
      const hud = document.getElementById('adloot-hud');
      if (hud) hud.style.display = 'none';
      // Remove ad overlays
      document.querySelectorAll('.adloot-ad-overlay').forEach(el => el.style.display = 'none');
      // Close any open minigame/welcome/death/loadout screens
      ['adloot-minigame', 'adloot-welcome', 'adloot-death', 'adloot-loadout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      this.isMoving = false;
      this.minigameActive = false;
    } else {
      // Show character and HUD, or create if first time
      if (this.character) {
        this.character.style.display = '';
      } else {
        this.startGame();
        return;
      }
      const hud = document.getElementById('adloot-hud');
      if (hud) hud.style.display = '';
      document.querySelectorAll('.adloot-ad-overlay').forEach(el => el.style.display = '');
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getStats':
          sendResponse({
            ads: this.ads.length,
            loot: this.loot,
            health: this.health,
            maxHealth: this.maxHealth,
            enabled: this.enabled,
            equipment: {
              weapon: this.equipment.weapon,
              tool: this.equipment.tool,
              armor: this.equipment.armor
            }
          });
          break;

        case 'toggleEnabled':
          this.setEnabled(message.enabled);
          sendResponse({ enabled: this.enabled });
          break;

        case 'getShopData':
          sendResponse({
            loot: this.loot,
            equipment: this.availableEquipment,
            equipped: {
              weapon: this.equipment.weapon?.id,
              tool: this.equipment.tool?.id,
              armor: this.equipment.armor?.id
            }
          });
          break;

        case 'buyItem': {
          const { type, itemId } = message;
          const items = this.availableEquipment[type];
          const item = items?.find(i => i.id === itemId);
          const typeToSlot = { weapons: 'weapon', tools: 'tool', armor: 'armor' };
          const equipSlot = typeToSlot[type];

          if (!item) {
            sendResponse({ success: false, error: 'Item not found' });
          } else if (this.equipment[equipSlot]?.id === itemId) {
            sendResponse({ success: false, error: 'Already equipped' });
          } else if (this.loot < item.cost) {
            sendResponse({ success: false, error: 'Not enough loot' });
          } else {
            this.loot -= item.cost;
            this.equipment[equipSlot] = item;
            this.updateEquipmentVisuals();
            this.updateHUD();
            sendResponse({
              success: true,
              loot: this.loot,
              equipped: {
                weapon: this.equipment.weapon?.id,
                tool: this.equipment.tool?.id,
                armor: this.equipment.armor?.id
              }
            });
          }
          break;
        }
      }
      return true; // Keep message channel open for async response
    });
  }

  initAudio() {
    // Create audio context for 8-bit sounds
    this.audioCtx = null;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  playSound(type) {
    if (!this.audioCtx) return;

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    gainNode.gain.value = 0.1; // Volume

    switch(type) {
      case 'walk':
        oscillator.frequency.value = 200;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.05);
        break;
      
      case 'attack':
        oscillator.frequency.value = 150;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.1);
        break;
      
      case 'loot':
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, this.audioCtx.currentTime + 0.1); // C6
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.15);
        break;
      
      case 'damage':
        oscillator.frequency.value = 100;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.2);
        break;
      
      case 'death':
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.5);
        break;
    }
  }

  createCharacter() {
    // Create character container
    this.character = document.createElement('div');
    this.character.id = 'adloot-character';
    this.character.className = 'adloot-char idle';
    this.character.style.left = this.characterPos.x + 'px';
    this.character.style.top = this.characterPos.y + 'px';
    
    // Add pixel art character (simple CSS-based for POC)
    this.character.innerHTML = `
      <div class="char-head"></div>
      <div class="char-body"></div>
      <div class="char-arm-left"></div>
      <div class="char-arm-right"></div>
      <div class="char-leg-left"></div>
      <div class="char-leg-right"></div>
      <div class="char-weapon"></div>
      <div class="char-armor-indicator"></div>
    `;
    
    document.body.appendChild(this.character);

    // Update visual equipment
    this.updateEquipmentVisuals();

    // Create HUD
    this.createHUD();
  }

  createHUD() {
    const hud = document.createElement('div');
    hud.id = 'adloot-hud';
    hud.innerHTML = `
      <div class="hud-item">
        <span class="hud-label">HP:</span>
        <div class="hud-bar">
          <div class="hud-bar-fill hp-bar" style="width: 100%"></div>
        </div>
        <span class="hud-value" id="hp-value">100</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">💰 Loot:</span>
        <span class="hud-value" id="loot-value">0</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">🎯 Ads:</span>
        <span class="hud-value" id="ads-value">0</span>
      </div>
      <div class="hud-divider"></div>
      <button class="hud-button" id="loadout-btn">⚔️ LOADOUT</button>
    `;
    document.body.appendChild(hud);
    
    // Add loadout button listener
    document.getElementById('loadout-btn').onclick = () => this.openLoadout();
    
    this.updateHUD();
  }

  updateEquipmentVisuals() {
    const weaponEl = this.character.querySelector('.char-weapon');
    const armorEl = this.character.querySelector('.char-armor-indicator');
    
    if (weaponEl && this.equipment.weapon) {
      weaponEl.textContent = this.equipment.weapon.sprite;
    }
    
    // Change body color based on armor
    const body = this.character.querySelector('.char-body');
    if (body && this.equipment.armor) {
      if (this.equipment.armor.id === 'kevlar') {
        body.style.background = '#555';
      } else if (this.equipment.armor.id === 'exosuit') {
        body.style.background = '#00ffff';
      } else {
        body.style.background = '#FF4444';
      }
    }
  }

  openLoadout() {
    const loadout = document.createElement('div');
    loadout.id = 'adloot-loadout';
    loadout.innerHTML = `
      <div class="loadout-container">
        <h2>⚔️ LOADOUT</h2>
        <div class="loadout-section">
          <h3>🗡️ Weapons</h3>
          <div class="equipment-grid" id="weapons-grid"></div>
        </div>
        <div class="loadout-section">
          <h3>🛠️ Tools</h3>
          <div class="equipment-grid" id="tools-grid"></div>
        </div>
        <div class="loadout-section">
          <h3>🦺 Armor</h3>
          <div class="equipment-grid" id="armor-grid"></div>
        </div>
        <button id="loadout-close">CLOSE</button>
      </div>
    `;
    document.body.appendChild(loadout);
    
    // Populate grids
    this.populateEquipmentGrid('weapons', document.getElementById('weapons-grid'));
    this.populateEquipmentGrid('tools', document.getElementById('tools-grid'));
    this.populateEquipmentGrid('armor', document.getElementById('armor-grid'));
    
    document.getElementById('loadout-close').onclick = () => loadout.remove();
  }

  populateEquipmentGrid(type, gridEl) {
    const items = this.availableEquipment[type];
    const equipSlot = type.slice(0, -1); // Remove 's' (weapons -> weapon)
    
    items.forEach(item => {
      const isEquipped = this.equipment[equipSlot]?.id === item.id;
      const canAfford = this.loot >= item.cost;
      
      const itemEl = document.createElement('div');
      itemEl.className = `equipment-item ${isEquipped ? 'equipped' : ''} ${!canAfford ? 'locked' : ''}`;
      itemEl.innerHTML = `
        <div class="item-sprite">${item.sprite}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-cost">${item.cost === 0 ? 'FREE' : item.cost + '💰'}</div>
        <div class="item-stats">${this.getItemStats(item, type)}</div>
      `;
      
      if (canAfford && !isEquipped) {
        itemEl.onclick = () => {
          this.loot -= item.cost;
          this.equipment[equipSlot] = item;
          this.updateEquipmentVisuals();
          this.updateHUD();
          this.openLoadout(); // Refresh display
          loadout.remove();
          this.openLoadout();
        };
      }
      
      gridEl.appendChild(itemEl);
    });
  }

  getItemStats(item, type) {
    if (type === 'weapons') return `+${item.attackBonus} ATK`;
    if (type === 'tools') return `+${item.hackBonus}% Success`;
    if (type === 'armor') return `+${item.hpBonus} HP`;
    return '';
  }

  updateHUD() {
    const hpBar = document.querySelector('.hp-bar');
    const hpValue = document.getElementById('hp-value');
    const lootValue = document.getElementById('loot-value');
    const adsValue = document.getElementById('ads-value');

    if (hpBar) hpBar.style.width = this.health + '%';
    if (hpValue) hpValue.textContent = this.health;
    if (lootValue) lootValue.textContent = this.loot;
    if (adsValue) adsValue.textContent = this.ads.length;
  }

  detectAds() {
    // Common ad selectors
    const adSelectors = [
      'iframe[src*="doubleclick"]',
      'iframe[src*="googlesyndication"]',
      'ins.adsbygoogle',
      '[id*="google_ads"]',
      '[class*="advertisement"]',
      '[class*="ad-container"]',
      '[id*="ad-"]',
      '[class*="banner"]'
    ];

    adSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!el.dataset.adlootProcessed) {
          this.markAsAd(el);
        }
      });
    });

    // Re-scan periodically for dynamic ads
    setInterval(() => this.detectAds(), 3000);
  }

  markAsAd(element) {
    element.dataset.adlootProcessed = 'true';
    
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // Classify ad tier based on size
    let tier = 'common';
    if (area > 200000) tier = 'legendary';
    else if (area > 100000) tier = 'epic';
    else if (area > 50000) tier = 'rare';

    element.dataset.adlootTier = tier;
    
    // Add visual indicator
    const overlay = document.createElement('div');
    overlay.className = `adloot-ad-overlay ${tier}`;
    overlay.innerHTML = `
      <div class="ad-tier-badge">${tier.toUpperCase()}</div>
      <div class="ad-hint">Click to loot</div>
    `;
    
    // Position overlay
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    element.style.position = 'relative';
    element.appendChild(overlay);

    // Add to ads array
    this.ads.push({
      element: element,
      tier: tier,
      looted: false
    });

    // Make clickable and block default behavior
    element.style.cursor = 'crosshair';
    element.style.pointerEvents = 'auto';
    
    // Block ALL clicks on the ad element and its children
    const blockAdClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.targetAd(element);
      return false;
    };
    
    element.addEventListener('click', blockAdClick, true); // Use capture phase
    element.addEventListener('mousedown', blockAdClick, true);
    element.addEventListener('mouseup', blockAdClick, true);
    
    // Also block clicks on iframes inside ads
    const iframes = element.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.style.pointerEvents = 'none';
    });

    this.updateHUD();
  }

  targetAd(adElement) {
    if (!this.enabled || this.minigameActive) return;

    const rect = adElement.getBoundingClientRect();
    // Store absolute position (independent of scroll)
    this.targetPos = {
      x: rect.left + rect.width / 2 - 15,
      y: rect.top + rect.height / 2 - 20 + window.scrollY
    };
    
    this.currentAd = adElement;
    this.isMoving = true;
  }

  moveCharacter() {
    if (!this.targetPos || !this.isMoving) {
      // Not moving - set to idle
      this.character.classList.remove('walking');
      this.character.classList.add('idle');
      return;
    }

    // Moving - set to walking
    this.character.classList.remove('idle');
    this.character.classList.add('walking');
    
    // Spawn dust clouds while walking
    this.spawnDustClouds();

    // Adjust target position for current scroll offset
    const targetX = this.targetPos.x;
    const targetY = this.targetPos.y - window.scrollY;

    let dx = targetX - this.characterPos.x;
    let dy = targetY - this.characterPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Reached target
      this.isMoving = false;
      this.character.classList.remove('walking');
      this.character.classList.add('idle');
      this.startMinigame();
      return;
    }

    // Check for obstacles in path
    const speed = 3;
    let angle = Math.atan2(dy, dx);
    
    // Simple obstacle avoidance - check if next position would collide
    const nextX = this.characterPos.x + Math.cos(angle) * speed;
    const nextY = this.characterPos.y + Math.sin(angle) * speed;
    
    if (this.wouldCollide(nextX, nextY)) {
      // Try to go around - adjust angle
      angle += Math.PI / 4; // Turn 45 degrees
      
      // If still blocked, try other direction
      const altNextX = this.characterPos.x + Math.cos(angle) * speed;
      const altNextY = this.characterPos.y + Math.sin(angle) * speed;
      
      if (this.wouldCollide(altNextX, altNextY)) {
        angle -= Math.PI / 2; // Try opposite direction
      }
    }
    
    this.characterPos.x += Math.cos(angle) * speed;
    this.characterPos.y += Math.sin(angle) * speed;

    // Flip character based on direction
    if (dx < 0) {
      this.character.style.transform = 'scaleX(-1)';
    } else {
      this.character.style.transform = 'scaleX(1)';
    }

    this.character.style.left = this.characterPos.x + 'px';
    this.character.style.top = this.characterPos.y + 'px';
  }

  wouldCollide(x, y) {
    // Check if position would be inside an element
    const elements = document.elementsFromPoint(x + 15, y + 20);
    
    // Filter out AdLoot elements and body/html
    const obstacles = elements.filter(el => 
      !el.id?.startsWith('adloot') && 
      el.tagName !== 'BODY' && 
      el.tagName !== 'HTML' &&
      !el.classList.contains('adloot-ad-overlay')
    );
    
    // Check if any obstacle is "solid" (has substantial size)
    for (const el of obstacles) {
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      
      // Consider it an obstacle if it's a decent size and not transparent
      const computed = window.getComputedStyle(el);
      const isVisible = computed.display !== 'none' && computed.visibility !== 'hidden';
      
      if (area > 1000 && isVisible) {
        return true;
      }
    }
    
    return false;
  }

  startMinigame() {
    if (!this.currentAd) return;
    
    // Play attack animation and sound
    this.character.classList.remove('idle', 'walking');
    this.character.classList.add('attacking');
    this.playSound('attack');
    
    // Wait for attack animation, then show minigame
    setTimeout(() => {
      this.character.classList.remove('attacking');
      this.character.classList.add('idle');
      this.showMinigameUI();
    }, 500);
  }

  showMinigameUI() {
    this.minigameActive = true;
    const tier = this.currentAd.dataset.adlootTier;
    
    // Choose minigame type based on tier
    const minigameTypes = {
      common: 'lockpick',
      rare: 'pattern',
      epic: 'wirecutting',
      legendary: 'lockpick' // Could be a harder variant
    };
    
    const gameType = minigameTypes[tier] || 'lockpick';
    
    if (gameType === 'lockpick') {
      this.showLockpickGame(tier);
    } else if (gameType === 'pattern') {
      this.showPatternGame(tier);
    } else if (gameType === 'wirecutting') {
      this.showWireCuttingGame(tier);
    }
  }

  showLockpickGame(tier) {
    // Create minigame overlay
    const minigame = document.createElement('div');
    minigame.id = 'adloot-minigame';
    minigame.innerHTML = `
      <div class="minigame-container">
        <h2>🔓 LOCKPICKING - ${tier.toUpperCase()} VAULT</h2>
        <p>Click when the bar is in the green zone!</p>
        <div class="lockpick-track">
          <div class="lockpick-zone"></div>
          <div class="lockpick-cursor"></div>
        </div>
        <div class="minigame-timer">Time: <span id="timer">5</span>s</div>
        <button id="lockpick-attempt">PICK LOCK</button>
        <button id="lockpick-cancel">FLEE</button>
      </div>
    `;
    document.body.appendChild(minigame);

    // Setup lockpick mechanic (with tool bonus)
    const cursor = minigame.querySelector('.lockpick-cursor');
    const zone = minigame.querySelector('.lockpick-zone');
    
    // Tool bonus makes zone bigger
    const baseZoneSize = 20;
    const toolBonus = this.equipment.tool?.hackBonus || 0;
    const zoneSize = baseZoneSize + (toolBonus / 5);
    
    // Random zone position
    const zonePos = Math.random() * (100 - zoneSize);
    zone.style.left = zonePos + '%';
    zone.style.width = zoneSize + '%';

    let cursorPos = 0;
    let direction = 1;
    const interval = setInterval(() => {
      cursorPos += direction * 2;
      if (cursorPos >= 100 || cursorPos <= 0) direction *= -1;
      cursor.style.left = cursorPos + '%';
    }, 20);

    // Timer
    let timeLeft = 5;
    const timerEl = minigame.querySelector('#timer');
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(interval);
        clearInterval(timerInterval);
        this.minigameFail();
        minigame.remove();
      }
    }, 1000);

    // Attempt button
    minigame.querySelector('#lockpick-attempt').onclick = () => {
      clearInterval(interval);
      clearInterval(timerInterval);
      
      // Check if cursor is in zone
      const zoneStart = zonePos;
      const zoneEnd = zonePos + zoneSize;
      
      if (cursorPos >= zoneStart && cursorPos <= zoneEnd) {
        this.minigameSuccess(tier);
      } else {
        this.minigameFail();
      }
      
      minigame.remove();
    };

    // Cancel button
    minigame.querySelector('#lockpick-cancel').onclick = () => {
      clearInterval(interval);
      clearInterval(timerInterval);
      minigame.remove();
      this.minigameActive = false;
      this.currentAd = null;
    };
  }

  showPatternGame(tier) {
    // Pattern matching minigame
    const minigame = document.createElement('div');
    minigame.id = 'adloot-minigame';
    
    // Generate random pattern
    const patternLength = 4;
    const symbols = ['◆', '●', '■', '▲'];
    const pattern = [];
    for (let i = 0; i < patternLength; i++) {
      pattern.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    
    minigame.innerHTML = `
      <div class="minigame-container">
        <h2>🧩 PATTERN MATCH - ${tier.toUpperCase()} VAULT</h2>
        <p>Memorize the pattern, then recreate it!</p>
        <div class="pattern-display" id="pattern-display"></div>
        <div class="pattern-input" id="pattern-input"></div>
        <div class="pattern-buttons" id="pattern-buttons"></div>
        <div class="minigame-timer">Time: <span id="timer">10</span>s</div>
        <button id="pattern-submit">SUBMIT</button>
        <button id="pattern-cancel">FLEE</button>
      </div>
    `;
    document.body.appendChild(minigame);
    
    const displayEl = minigame.querySelector('#pattern-display');
    const inputEl = minigame.querySelector('#pattern-input');
    const buttonsEl = minigame.querySelector('#pattern-buttons');
    
    // Show pattern briefly
    displayEl.textContent = pattern.join(' ');
    displayEl.style.fontSize = '32px';
    
    setTimeout(() => {
      displayEl.textContent = '???';
      displayEl.style.opacity = '0.3';
    }, 2000);
    
    // Create input buttons
    const userPattern = [];
    symbols.forEach(symbol => {
      const btn = document.createElement('button');
      btn.textContent = symbol;
      btn.className = 'pattern-btn';
      btn.onclick = () => {
        if (userPattern.length < patternLength) {
          userPattern.push(symbol);
          inputEl.textContent = userPattern.join(' ');
        }
      };
      buttonsEl.appendChild(btn);
    });
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '⌫ CLEAR';
    clearBtn.className = 'pattern-btn clear-btn';
    clearBtn.onclick = () => {
      userPattern.length = 0;
      inputEl.textContent = '';
    };
    buttonsEl.appendChild(clearBtn);
    
    // Timer
    let timeLeft = 10;
    const timerEl = minigame.querySelector('#timer');
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        this.minigameFail();
        minigame.remove();
      }
    }, 1000);
    
    // Submit
    minigame.querySelector('#pattern-submit').onclick = () => {
      clearInterval(timerInterval);
      
      const match = JSON.stringify(userPattern) === JSON.stringify(pattern);
      if (match) {
        this.minigameSuccess(tier);
      } else {
        this.minigameFail();
      }
      
      minigame.remove();
    };
    
    // Cancel
    minigame.querySelector('#pattern-cancel').onclick = () => {
      clearInterval(timerInterval);
      minigame.remove();
      this.minigameActive = false;
      this.currentAd = null;
    };
  }

  showWireCuttingGame(tier) {
    // Wire cutting minigame
    const minigame = document.createElement('div');
    minigame.id = 'adloot-minigame';
    
    // Generate wires (one correct, others wrong)
    const numWires = 4;
    const correctWire = Math.floor(Math.random() * numWires);
    const wireColors = ['red', 'blue', 'green', 'yellow'];
    
    minigame.innerHTML = `
      <div class="minigame-container">
        <h2>✂️ WIRE CUTTING - ${tier.toUpperCase()} VAULT</h2>
        <p>Cut the correct wire! Hints: Red = danger, Green = safe</p>
        <div class="wires-container" id="wires-container"></div>
        <div class="minigame-timer">Time: <span id="timer">8</span>s</div>
        <button id="wire-cancel">FLEE</button>
      </div>
    `;
    document.body.appendChild(minigame);
    
    const wiresEl = minigame.querySelector('#wires-container');
    
    // Create wires
    for (let i = 0; i < numWires; i++) {
      const wire = document.createElement('div');
      wire.className = 'wire ' + wireColors[i];
      wire.innerHTML = `
        <div class="wire-line"></div>
        <button class="wire-cut-btn">✂️ CUT</button>
      `;
      
      const isCorrect = (wireColors[i] === 'green' || (wireColors[correctWire] !== 'green' && i === correctWire));
      
      wire.querySelector('.wire-cut-btn').onclick = () => {
        clearInterval(timerInterval);
        
        if (isCorrect) {
          this.minigameSuccess(tier);
        } else {
          this.minigameFail();
        }
        
        minigame.remove();
      };
      
      wiresEl.appendChild(wire);
    }
    
    // Timer
    let timeLeft = 8;
    const timerEl = minigame.querySelector('#timer');
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        this.minigameFail();
        minigame.remove();
      }
    }, 1000);
    
    // Cancel
    minigame.querySelector('#wire-cancel').onclick = () => {
      clearInterval(timerInterval);
      minigame.remove();
      this.minigameActive = false;
      this.currentAd = null;
    };
  }

  minigameSuccess(tier) {
    const lootValues = {
      common: 10,
      rare: 25,
      epic: 50,
      legendary: 100
    };

    const lootGained = lootValues[tier] || 10;
    this.loot += lootGained;

    // Play loot sound
    this.playSound('loot');
    
    // Spawn loot particles
    this.spawnLootParticles(this.characterPos.x + 15, this.characterPos.y + 20);
    
    // Victory dance animation
    this.character.classList.add('victory');
    setTimeout(() => this.character.classList.remove('victory'), 1000);

    // Mark ad as looted and disable all interactions
    if (this.currentAd) {
      this.currentAd.style.opacity = '0.3';
      this.currentAd.style.filter = 'grayscale(100%)';
      this.currentAd.style.pointerEvents = 'none';
      this.currentAd.style.cursor = 'default';
      
      const overlay = this.currentAd.querySelector('.adloot-ad-overlay');
      if (overlay) {
        overlay.innerHTML = '<div class="ad-looted">✓ LOOTED</div>';
      }
    }

    this.showFloatingText(`+${lootGained} LOOT!`, 'success');
    this.updateHUD();
    this.minigameActive = false;
    this.currentAd = null;
  }

  minigameFail() {
    const damage = 20;
    this.health -= damage;

    // Play damage sound
    this.playSound('damage');
    
    // Damage shake animation
    this.character.classList.add('damage-shake');
    setTimeout(() => this.character.classList.remove('damage-shake'), 500);

    this.showFloatingText(`-${damage} HP!`, 'damage');
    
    if (this.health <= 0) {
      this.death();
    }

    this.updateHUD();
    this.minigameActive = false;
    this.currentAd = null;
  }

  death() {
    this.health = 0;
    this.updateHUD();
    
    // Play death sound
    this.playSound('death');

    const deathScreen = document.createElement('div');
    deathScreen.id = 'adloot-death';
    deathScreen.innerHTML = `
      <div class="death-container">
        <h1>💀 YOU DIED 💀</h1>
        <p>Loot collected: ${this.loot}</p>
        <p class="death-flavor">The ads claimed another victim...</p>
        <button id="respawn-btn">RESPAWN</button>
      </div>
    `;
    document.body.appendChild(deathScreen);

    deathScreen.querySelector('#respawn-btn').onclick = () => {
      this.health = 100;
      this.loot = 0;
      this.updateHUD();
      deathScreen.remove();
    };
  }

  showFloatingText(text, type) {
    const floater = document.createElement('div');
    floater.className = `floating-text ${type}`;
    floater.textContent = text;
    floater.style.left = this.characterPos.x + 'px';
    floater.style.top = this.characterPos.y + 'px';
    document.body.appendChild(floater);

    setTimeout(() => floater.remove(), 2000);
  }

  createParticle(x, y, type = 'dust') {
    const particle = document.createElement('div');
    particle.className = `adloot-particle ${type}`;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    // Random velocity
    const vx = (Math.random() - 0.5) * 4;
    const vy = (Math.random() - 0.5) * 4 - 2;
    
    particle.style.setProperty('--vx', vx + 'px');
    particle.style.setProperty('--vy', vy + 'px');
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 600);
  }

  spawnDustClouds() {
    // Create dust particles under feet while walking
    if (this.isMoving && Math.random() > 0.7) {
      this.createParticle(
        this.characterPos.x + 15,
        this.characterPos.y + 35,
        'dust'
      );
    }
  }

  spawnLootParticles(x, y) {
    // Create sparkle particles for loot
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.createParticle(x, y, 'sparkle');
      }, i * 30);
    }
  }

  showWelcomeMessage() {
    const welcome = document.createElement('div');
    welcome.id = 'adloot-welcome';
    welcome.innerHTML = `
      <div class="welcome-container">
        <h1>🎮 AdLoot Active</h1>
        <p>Click on ads to loot them!</p>
        <p class="welcome-tip">Your character will walk to the ad and start a lockpicking minigame.</p>
        <button id="welcome-close">START LOOTING</button>
      </div>
    `;
    document.body.appendChild(welcome);

    welcome.querySelector('#welcome-close').onclick = () => {
      welcome.remove();
    };
  }

  setupEventListeners() {
    // Optional: Follow mouse mode (toggle with key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        this.toggleFollowMode();
      }
    });
  }

  toggleFollowMode() {
    // TODO: Implement mouse following mode
    console.log('Follow mode toggle - to be implemented');
  }

  startGameLoop() {
    setInterval(() => {
      this.moveCharacter();
    }, 1000 / 60); // 60 FPS
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AdLoot();
  });
} else {
  new AdLoot();
}
