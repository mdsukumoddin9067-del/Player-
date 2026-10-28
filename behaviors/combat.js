/**
 * File: behaviors/combat.js
 * Description: Autonomous Combat & Loyalty Defense System
 */

const { goals } = require('mineflayer-pathfinder');

class CombatBehavior {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.hostileList = [
      'zombie', 'skeleton', 'spider', 'creeper', 'drowned',
      'husk', 'enderman', 'witch', 'pillager', 'vindicator'
    ];
  }

  stop() {
    this.bot.pvp.stop();
  }

  findHostileThreat() {
    const bot = this.bot;
    const filter = (entity) => {
      if (!entity || !entity.position) return false;
      const isHostile = this.hostileList.includes(entity.name?.toLowerCase());
      if (!isHostile) return false;
      
      const distToBot = bot.entity.position.distanceTo(entity.position);
      const master = bot.players[this.config.master.username]?.entity;
      const distToMaster = master ? master.position.distanceTo(entity.position) : 999;

      // Aggro if monster is within 14 blocks of bot OR within 16 blocks of Master
      return distToBot < 14 || distToMaster < 16;
    };

    return bot.nearestEntity(filter);
  }

  equipBestWeaponAndShield() {
    const bot = this.bot;
    // Weapon priority: Netherite > Diamond > Iron > Stone > Wood Sword > Axe
    const weapons = bot.inventory.items().filter(item => 
      item.name.includes('sword') || item.name.includes('axe')
    );

    const weaponRanking = ['diamond_sword', 'iron_sword', 'diamond_axe', 'iron_axe', 'stone_sword', 'wooden_sword'];
    weapons.sort((a, b) => {
      const rankA = weaponRanking.indexOf(a.name);
      const rankB = weaponRanking.indexOf(b.name);
      return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    });

    if (weapons.length > 0) {
      bot.equip(weapons[0], 'hand').catch(() => {});
    }

    // Equip Shield in off-hand
    const shield = bot.inventory.items().find(i => i.name === 'shield');
    if (shield) {
      bot.equip(shield, 'off-hand').catch(() => {});
    }
  }

  async engageThreat(target) {
    const bot = this.bot;
    if (!target || !target.isValid) return;

    this.equipBestWeaponAndShield();

    // Special logic for Creeper: Hit and Back-up (Kiting)
    if (target.name === 'creeper') {
      const dist = bot.entity.position.distanceTo(target.position);
      if (dist < 4) {
        // Back up before it explodes
        bot.pvp.stop();
        bot.setControlState('back', true);
        bot.setControlState('sprint', true);
        await new Promise(r => setTimeout(r, 600));
        bot.setControlState('back', false);
        bot.setControlState('sprint', false);
      }
    }

    return new Promise((resolve) => {
      bot.pvp.attack(target);

      const checkInterval = setInterval(() => {
        if (!target || !target.isValid || target.health <= 0) {
          clearInterval(checkInterval);
          bot.pvp.stop();
          resolve();
        }
      }, 500);

      // Max fight timeout of 10s per single mob loop
      setTimeout(() => {
        clearInterval(checkInterval);
        bot.pvp.stop();
        resolve();
      }, 10000);
    });
  }

  defendMaster() {
    const bot = this.bot;
    const master = bot.players[this.config.master.username]?.entity;
    if (!master) return;

    // Find who attacked master
    const attacker = bot.nearestEntity(e => {
      if (!e || e.username === this.config.master.username || e.username === bot.username) return false;
      return e.position.distanceTo(master.position) < 8;
    });

    if (attacker) {
      bot.chat(`সাবধান ${this.config.master.username}! আমি ওকে মারছি!`);
      this.engageThreat(attacker);
    }
  }
}

module.exports = CombatBehavior;
