# 🎮 AdLoot - Proof of Concept

**Roguelike Ad Extraction Browser Extension**

Turn annoying ads into loot vaults. Extract or die trying.

## 🎯 What is this?

AdLoot is a browser extension that gamifies web browsing by turning advertisements into interactive "loot vaults" that you can hack/lockpick for virtual rewards. Your pixel character walks across the page, attacks ads, and collects loot through timing-based minigames.

## ✨ POC Features

This proof-of-concept includes:

- ✅ **Automatic Ad Detection** - Scans pages for common ad types
- ✅ **Ad Tier System** - Common, Rare, Epic, Legendary (based on size)
- ✅ **Pixel Character** - CSS-based character that walks across the page
- ✅ **Pathfinding** - Character walks to targeted ads
- ✅ **Lockpicking Minigame** - Timing-based challenge
- ✅ **Loot System** - Earn points for successful extractions
- ✅ **Health/Damage** - Take damage on failed attempts
- ✅ **Permadeath** - Roguelike death/respawn mechanic
- ✅ **HUD** - Real-time stats display (HP, Loot, Ads)
- ✅ **Visual Feedback** - Floating damage/loot text, ad overlays

## 🚀 Installation

### Chrome/Edge

1. Download/clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `adloot-poc` folder
6. The extension is now active!

### Firefox

1. Download/clone this repository
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in the `adloot-poc` folder

## 🎮 How to Play

1. **Browse any website** with ads (news sites work great)
2. **Wait for ad detection** - Ads will be highlighted with colored borders:
   - Gray = Common
   - Blue = Rare
   - Purple = Epic
   - Gold = Legendary
3. **Click on an ad** - Your character will walk to it
4. **Complete the minigame** - Click "PICK LOCK" when the cursor is in the green zone
5. **Success** = +Loot, **Failure** = -HP
6. **Die at 0 HP** - Roguelike permadeath (but you can respawn)

### Controls

- **Left Click** on ads to target them
- **F key** - (WIP) Toggle mouse-follow mode

## 🔧 Technical Details

### Stack
- Vanilla JavaScript (no frameworks for POC)
- CSS3 for character/animations
- Chrome Extension Manifest V3

### Ad Detection
Currently detects:
- Google AdSense/DoubleClick
- Generic ad containers (class/id patterns)
- Banner ads, video ads, etc.

### Architecture
- `content.js` - Main game logic, character controller
- `character.css` - All styling and animations
- `popup.html/js` - Extension popup UI
- `manifest.json` - Extension configuration

## 🎯 Roadmap to Full Game

This POC validates the core concept. For the full game:

### Phase 1 (Current POC)
- [x] Basic ad detection
- [x] Character movement
- [x] Simple minigame
- [x] Loot/damage system

### Phase 2 - Enhanced Mechanics
- [ ] Multiple minigame types (hacking, wire-cutting, pattern matching)
- [ ] Character equipment/loadout system
- [ ] Skill tree/upgrades
- [ ] Better pathfinding (avoid obstacles, climb elements)
- [ ] Mouse-follow mode
- [ ] Animations (walking, attacking)

### Phase 3 - Persistence & Economy
- [ ] Local storage for progress
- [ ] Item inventory system
- [ ] "Safe hub" areas
- [ ] Permanent buffs/unlocks (roguelike meta-progression)

### Phase 4 - Multiplayer
- [ ] Backend server (Node.js + WebSocket)
- [ ] Player trading system
- [ ] PvP when targeting same ad
- [ ] Leaderboards
- [ ] Global economy

### Phase 5 - Polish
- [ ] Better pixel art sprites
- [ ] Sound effects & music
- [ ] Achievement system
- [ ] Stats dashboard
- [ ] Options/settings panel

## 🐛 Known Issues

- Ad detection may miss some ad types (especially dynamic/lazy-loaded)
- Character can clip through page elements
- No persistence yet (refresh = reset)
- Popup stats not connected yet

## 🤝 Contributing

This is a POC - feedback and ideas welcome!

## 📝 License

POC/Experimental - Not licensed for production use yet

---

**Created by**: Pim (Ioncap.io) & Marten  
**Version**: 0.1.0 POC  
**Status**: Experimental - Proof of Concept
