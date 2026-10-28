/**
 * File: behaviors/farming.js
 * Description: Autonomous Hunting, Smelting & Agriculture
 */

const { goals } = require('mineflayer-pathfinder');

class FarmingBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
  }

  getCookedFoodCount() {
    const foods = ['cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken', 'bread', 'baked_potato'];
    return this.bot.inventory.items().reduce((acc, i) => {
      if (foods.includes(i.name)) return acc + i.count;
      return acc;
    }, 0);
  }

  hasNearbyCrops() {
    const crop = this.bot.findBlock({
      matching: b => b && (b.name === 'wheat' || b.name === 'carrots' || b.name === 'potatoes'),
      maxDistance: 16
    });
    return !!crop;
  }

  async huntNearbyAnimals() {
    const bot = this.bot;
    const animal = bot.nearestEntity(e => {
      if (!e || !e.position) return false;
      const isTarget = ['cow', 'pig', 'sheep', 'chicken'].includes(e.name);
      return isTarget && bot.entity.position.distanceTo(e.position) < 20;
    });

    if (animal) {
      const sword = bot.inventory.items().find(i => i.name.includes('sword'));
      if (sword) await bot.equip(sword, 'hand').catch(() => {});
      bot.pvp.attack(animal);
      await new Promise(r => setTimeout(r, 4000));
      bot.pvp.stop();
    }
  }

  async cookFoodInFurnace() {
    const bot = this.bot;
    const rawFood = bot.inventory.items().find(i => 
      i.name.includes('raw_') || i.name === 'beef' || i.name === 'porkchop' || i.name === 'mutton'
    );
    const furnaceBlock = bot.findBlock({ matching: b => b.name === 'furnace', maxDistance: 8 });

    if (rawFood && furnaceBlock) {
      try {
        const furnace = await bot.openFurnace(furnaceBlock);
        const fuel = bot.inventory.items().find(i => i.name === 'coal' || i.name.includes('planks'));
        if (fuel) await furnace.putFuel(fuel.type, null, 1);
        await furnace.putInput(rawFood.type, null, rawFood.count);
        furnace.close();
      } catch (e) {}
    }
  }

  async harvestAndReplant() {
    const bot = this.bot;
    const cropBlock = bot.findBlock({
      matching: b => b && (b.name === 'wheat' || b.name === 'carrots' || b.name === 'potatoes'),
      maxDistance: 16
    });

    if (cropBlock) {
      try {
        await bot.collectBlock.collect(cropBlock);
        // Replant seed
        const seedItem = bot.inventory.items().find(i => i.name.includes('seed') || i.name === 'carrot' || i.name === 'potato');
        const farmland = bot.blockAt(cropBlock.position.offset(0, -1, 0));
        if (seedItem && farmland && farmland.name === 'farmland') {
          await bot.equip(seedItem, 'hand');
          await bot.placeBlock(farmland, { x: 0, y: 1, z: 0 });
        }
      } catch (e) {}
    }
  }
}

module.exports = FarmingBehavior;
