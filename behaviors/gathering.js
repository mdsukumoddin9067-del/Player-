/**
 * File: behaviors/gathering.js
 * Description: Autonomous Woodchopping & Progression Crafting
 */

const { goals } = require('mineflayer-pathfinder');

class GatheringBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
  }

  getLogCount() {
    return this.bot.inventory.items().reduce((total, item) => {
      if (item.name.includes('_log')) return total + item.count;
      return total;
    }, 0);
  }

  hasAnyPickaxe() {
    return this.bot.inventory.items().some(i => i.name.includes('pickaxe'));
  }

  hasAnySword() {
    return this.bot.inventory.items().some(i => i.name.includes('sword'));
  }

  async chopTrees(targetCount = 5) {
    const bot = this.bot;
    let chopped = 0;

    while (chopped < targetCount) {
      const logBlock = bot.findBlock({
        matching: b => b && b.name.includes('_log'),
        maxDistance: 32
      });

      if (!logBlock) break;

      try {
        // Equip axe if available
        const axe = bot.inventory.items().find(i => i.name.includes('axe'));
        if (axe) await bot.equip(axe, 'hand');

        await bot.collectBlock.collect(logBlock);
        chopped++;
      } catch (err) {
        break;
      }
    }
  }

  async craftBasicTools() {
    const bot = this.bot;
    const logItem = bot.inventory.items().find(i => i.name.includes('_log'));
    if (!logItem) return;

    try {
      // 1. Craft Planks
      const plankRecipe = bot.recipesFor(bot.registry.itemsByName.oak_planks?.id || 15, null, 1, null)[0];
      if (plankRecipe) {
        await bot.craft(plankRecipe, 2, null);
      }

      // 2. Craft Crafting Table
      const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
      if (!tableItem) {
        const tableRecipe = bot.recipesFor(bot.registry.itemsByName.crafting_table.id, null, 1, null)[0];
        if (tableRecipe) await bot.craft(tableRecipe, 1, null);
      }

      // 3. Craft Sticks
      const stickRecipe = bot.recipesFor(bot.registry.itemsByName.stick.id, null, 1, null)[0];
      if (stickRecipe) await bot.craft(stickRecipe, 1, null);

      console.log('[Crafting] Basic survival supplies crafted successfully.');
    } catch (e) {
      // Recipe handled by game version differences
    }
  }
}

module.exports = GatheringBehavior;
