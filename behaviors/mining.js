/**
 * File: behaviors/mining.js
 * Description: Smart Mining & Ore Extraction (Stone, Coal, Iron, Diamond)
 */

const { goals } = require('mineflayer-pathfinder');

class MiningBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
  }

  async mineOresAndStone() {
    const bot = this.bot;

    // Equip best pickaxe
    const pickaxe = bot.inventory.items().find(i => i.name.includes('pickaxe'));
    if (!pickaxe) return;
    await bot.equip(pickaxe, 'hand').catch(() => {});

    // Search for high-value ores first: Diamond > Iron > Coal > Cobblestone
    const targetOres = [
      'diamond_ore', 'deepslate_diamond_ore',
      'iron_ore', 'deepslate_iron_ore',
      'coal_ore', 'deepslate_coal_ore',
      'copper_ore', 'stone', 'cobblestone'
    ];

    const targetBlock = bot.findBlock({
      matching: b => targetOres.includes(b?.name),
      maxDistance: 16
    });

    if (targetBlock) {
      try {
        await bot.collectBlock.collect(targetBlock);
        
        // Ensure lighting: If light level drops below 6, place torch
        if (bot.blockAt(bot.entity.position)?.light < 6) {
          const torch = bot.inventory.items().find(i => i.name === 'torch');
          if (torch) {
            const floor = bot.blockAt(bot.entity.position.offset(0, -1, 0));
            if (floor) {
              await bot.equip(torch, 'hand');
              await bot.placeBlock(floor, { x: 0, y: 1, z: 0 }).catch(() => {});
            }
          }
        }
      } catch (err) {}
    }
  }
}

module.exports = MiningBehavior;
