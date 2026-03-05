# 🎮 AdLoot - Changelog

## v0.3.0 - "Depth Update" (Latest) ⚔️

### 🎮 Multiple Minigame Types
- **🔓 Lockpicking** (Common/Legendary ads) - Timing-based cursor challenge
- **🧩 Pattern Matching** (Rare ads) - Memorize and recreate symbol patterns
- **✂️ Wire Cutting** (Epic ads) - Choose the correct wire (green = safe, red = danger)
- **Tool bonuses** - Better tools make minigames easier (larger zones, more time)

### ⚔️ Equipment System
- **Weapons** - Rusty Knife (free) → Combat Knife (50💰) → Plasma Blade (200💰)
- **Tools** - Basic Lockpick → Advanced Pick → Quantum Decoder
- **Armor** - Cloth → Kevlar Vest → Exosuit
- **Visual feedback** - See equipped weapon on character, armor changes body color
- **Stats bonuses** - Attack bonus, hack success rate, HP increase
- **Loadout menu** - Press "⚔️ LOADOUT" button in HUD to equip gear

### 🧭 Improved Pathfinding
- **Obstacle detection** - Character avoids large page elements
- **Dynamic routing** - Automatically pathfinds around blocked areas
- **Collision checks** - Uses `elementsFromPoint` to detect obstacles
- **Smarter movement** - Adjusts angle when blocked instead of getting stuck

### 🎨 Visual Improvements
- Equipment sprites visible on character (weapon emoji shows on right arm)
- Armor tiers change body color (red → gray → cyan)
- Better HUD with loadout button
- Enhanced minigame UIs with unique styling per type

---

## v0.2.0 - "Juice Update"

### 🐛 Critical Fixes
- **Fixed scroll bug** - Character now correctly tracks ads even when page scrolls
- **Improved pathfinding** - Character position now updates dynamically with scroll offset

### ✨ New Features

#### 🎵 Sound System
- **8-bit Audio Generation** - Web Audio API procedural sounds (no MP3 files needed!)
  - `walk` - Subtle footstep bleeps
  - `attack` - Sawtooth punch sound
  - `loot` - Ascending coin pickup chime (C5 → C6)
  - `damage` - Descending hurt sound
  - `death` - Dramatic game over tone

#### 💨 Particle Effects
- **Dust Clouds** - Spawn under character's feet while walking (randomized)
- **Loot Sparkles** - Golden particles burst on successful extraction (8 sparkles)
- **Physics-based** - Particles have random velocity and fade out

#### 🎭 Enhanced Animations
- **Victory Dance** - Character bounces and rotates when loot is scored
- **Damage Shake** - Screen shake + red flash on HP loss
- **Smoother Transitions** - Better state management (idle ↔ walking ↔ attacking)

#### 🎨 Visual Polish
- **Particle CSS** - Dust (gray) and sparkles (gold) with proper z-indexing
- **Transform Origins** - Limbs rotate from proper pivot points
- **Brightness Flashes** - Damage feedback more visible

### 🔧 Technical Improvements
- Audio Context initialization with fallback
- Particle cleanup (auto-remove after 600ms)
- State machine for character animations
- Better scroll offset calculation in movement logic

---

## v0.1.0 - Initial POC

### Core Features
- Ad detection (Google Ads, banners)
- Pixel character with CSS-based sprites
- Walking animation (legs, arms, head-bob)
- Idle breathing animation
- Attack animation
- Lockpicking minigame
- HP/Loot/Damage system
- Roguelike permadeath
- HUD with real-time stats
- Ad tier classification (Common → Legendary)

---

## 🔜 Roadmap

### v0.4.0 - "Persistence Update"
- [ ] LocalStorage progress saving
- [ ] Inventory system (collect items, manage stash)
- [ ] Safe hub between runs (deposit loot safely)
- [ ] Meta-progression (permanent unlocks that survive death)
- [ ] Achievement system

### v0.5.0 - "Multiplayer Update"
- [ ] Backend server (Node.js + WebSocket)
- [ ] Real-time PvP (fight other players on same ad)
- [ ] Trading system (player marketplace)
- [ ] Global leaderboards
- [ ] Guilds/clans

---

**Current Version**: v0.3.0  
**Last Updated**: 2026-03-04
