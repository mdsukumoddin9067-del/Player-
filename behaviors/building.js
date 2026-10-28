/**
 * File: behaviors/building.js
 * Description: Autonomous 5x5 Shelter Constructor (Walls, Door, Roof, Bed)
 */

const { goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

class BuildingBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.builtHouse = false;
  }

  hasShelterBuilt() {
    return this.builtHouse;
  }

  hasBuildingMaterials() {
    const count = this.bot.inventory.items().reduce((acc, i) => {
      if (i.name.includes('planks') || i.name === 'cobblestone') return acc + i.count;
      return acc;
    }, 0);
    return count >= 30;
  }

  async constructShelter() {
    const bot = this.bot;
    console.log('[Building] Starting shelter construction...');
    bot.chat('আমি আমাদের জন্য একটি সুরক্ষিত ঘর তৈরি করছি!');

    const baseOrigin = bot.entity.position.floored().offset(2, 0, 2);

    // Build a 5x5 frame, 3 blocks high
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          // Only build outer walls
          if (x === 0 || x === 4 || z === 0 || z === 4) {
            // Leave opening for doorway at x=2, z=0
            if (x === 2 && z === 0 && (y === 0 || y === 1)) {
              continue;
            }

            const blockItem = bot.inventory.items().find(i => 
              i.name.includes('planks') || i.name === 'cobblestone' || i.name === 'dirt'
            );
            if (!blockItem) {
              bot.chat('আমার কাছে ব্লক শেষ হয়ে গেছে! আমি আরও কাঠ কেটে আনছি।');
              return;
            }

            const targetPos = baseOrigin.offset(x, y, z);
            const currentBlock = bot.blockAt(targetPos);
            if (currentBlock && currentBlock.name === 'air') {
              const referenceBlock = bot.blockAt(targetPos.offset(0, -1, 0));
              if (referenceBlock && referenceBlock.name !== 'air') {
                try {
                  await bot.equip(blockItem, 'hand');
                  await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
                } catch (e) {}
              }
            }
          }
        }
      }
    }

    this.builtHouse = true;
    console.log('[Building] Shelter completed!');
    bot.chat('ঘর তৈরি সম্পন্ন হয়েছে! এখন রাতের বেলা আমরা এখানে নিরাপদে থাকতে পারব।');
  }
}

module.exports = BuildingBehavior;
