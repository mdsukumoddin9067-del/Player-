/**
 * File: behaviors/survival.js
 * Description: Health, Sleep, Hunger & Movement Accompaniment
 */

const { goals } = require('mineflayer-pathfinder');

class SurvivalBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
  }

  async followPlayer(playerEntity, distance = 3) {
    if (!playerEntity || !playerEntity.position) return;
    try {
      const goal = new goals.GoalFollow(playerEntity, distance);
      await this.bot.pathfinder.goto(goal);
    } catch (e) {
      // Path recalculation error, silent catch
    }
  }

  async roamNearPlayer(playerEntity) {
    if (!playerEntity || !playerEntity.position) return;
    try {
      // Pick a random block 3-6 blocks away to look natural
      const dx = (Math.random() - 0.5) * 6;
      const dz = (Math.random() - 0.5) * 6;
      const targetPos = playerEntity.position.offset(dx, 0, dz);
      const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2);
      await this.bot.pathfinder.goto(goal);
    } catch (e) {}
  }

  async trySleep() {
    const bot = this.bot;
    // Find nearby bed block
    const bedBlock = bot.findBlock({
      matching: block => block && block.name.includes('bed'),
      maxDistance: 25
    });

    if (bedBlock) {
      try {
        await bot.pathfinder.goto(new goals.GoalGetToBlock(bedBlock.position.x, bedBlock.position.y, bedBlock.position.z));
        await bot.sleep(bedBlock);
        console.log('[Sleep] Sleeping in bed to skip the night...');
        return true;
      } catch (err) {
        // Can't sleep (monsters nearby or daytime)
        return false;
      }
    }

    // If bed is in inventory, place it down and sleep
    const bedItem = bot.inventory.items().find(i => i.name.includes('bed'));
    if (bedItem) {
      const ground = bot.findBlock({
        matching: b => b.name === 'dirt' || b.name === 'grass_block' || b.name === 'oak_planks',
        maxDistance: 4
      });
      if (ground) {
        try {
          await bot.equip(bedItem, 'hand');
          await bot.placeBlock(ground, { x: 0, y: 1, z: 0 });
          const placedBed = bot.findBlock({ matching: b => b.name.includes('bed'), maxDistance: 4 });
          if (placedBed) await bot.sleep(placedBed);
          return true;
        } catch (e) {}
      }
    }

    return false;
  }
}

module.exports = SurvivalBehavior;
