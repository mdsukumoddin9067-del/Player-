/**
 * File: brain.js
 * Description: Autonomous State Machine & Decision Engine (Zero AI / Deterministic Rule-Engine)
 */

const CombatBehavior = require('./behaviors/combat');
const SurvivalBehavior = require('./behaviors/survival');
const GatheringBehavior = require('./behaviors/gathering');
const MiningBehavior = require('./behaviors/mining');
const BuildingBehavior = require('./behaviors/building');
const FarmingBehavior = require('./behaviors/farming');

class AutonomousBrain {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;

    // Sub-behavior controllers
    this.combat = new CombatBehavior(bot, config);
    this.survival = new SurvivalBehavior(bot, config);
    this.gathering = new GatheringBehavior(bot, config);
    this.mining = new MiningBehavior(bot, config);
    this.building = new BuildingBehavior(bot, config);
    this.farming = new FarmingBehavior(bot, config);

    this.currentState = 'IDLE';
    this.overrideState = null;
    this.loopInterval = null;
    this.isBusy = false;
  }

  start() {
    console.log('[Brain] Autonomous Decision Engine activated.');
    // Main decision cycle runs every 1.5 seconds
    this.loopInterval = setInterval(() => {
      this.evaluateAndAct();
    }, 1500);
  }

  stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.combat.stop();
    this.bot.pathfinder.stop();
  }

  setOverrideState(state) {
    this.overrideState = state;
    this.isBusy = false;
  }

  clearOverrideState() {
    this.overrideState = null;
    this.isBusy = false;
  }

  onMasterAttacked() {
    console.log('[Defense] Master was attacked! Intervening immediately!');
    this.combat.defendMaster();
  }

  async evaluateAndAct() {
    if (this.isBusy) return;

    const bot = this.bot;
    if (!bot.entity) return;

    // ----------------------------------------------------
    // PRIORITY 1: IMMEDIATE THREAT / DEFENSE
    // ----------------------------------------------------
    const hostileMob = this.combat.findHostileThreat();
    if (hostileMob) {
      this.currentState = 'COMBAT';
      this.isBusy = true;
      await this.combat.engageThreat(hostileMob);
      this.isBusy = false;
      return;
    }

    // ----------------------------------------------------
    // PRIORITY 2: SURVIVAL & NIGHTTIME SLEEP
    // ----------------------------------------------------
    const isNightOrThunder = (bot.time.time > 12540 && bot.time.time < 23458) || bot.isRaining;
    if (isNightOrThunder && this.config.features.autoSleepAtNight) {
      this.currentState = 'SLEEPING';
      this.isBusy = true;
      const slept = await this.survival.trySleep();
      this.isBusy = false;
      if (slept) return;
    }

    // ----------------------------------------------------
    // PRIORITY 3: MASTER LOYALTY & ACCOMPANIMENT
    // ----------------------------------------------------
    const masterEntity = bot.players[this.config.master.username]?.entity;
    if (masterEntity) {
      const distanceToMaster = bot.entity.position.distanceTo(masterEntity.position);
      if (distanceToMaster > this.config.master.maxFollowDistance) {
        this.currentState = 'FOLLOW_MASTER';
        this.isBusy = true;
        await this.survival.followPlayer(masterEntity, this.config.master.comfortDistance);
        this.isBusy = false;
        return;
      }
    }

    // ----------------------------------------------------
    // PRIORITY 4: MANUAL OVERRIDE (IF SET)
    // ----------------------------------------------------
    if (this.overrideState) {
      await this.executeState(this.overrideState);
      return;
    }

    // ----------------------------------------------------
    // PRIORITY 5: AUTONOMOUS PLAYER PROGRESSION
    // ----------------------------------------------------
    // A. Check Wood & Basic Tools
    const woodCount = this.gathering.getLogCount();
    const hasPickaxe = this.gathering.hasAnyPickaxe();
    const hasSword = this.gathering.hasAnySword();

    if (woodCount < 5 && !hasPickaxe) {
      this.currentState = 'GATHERING_WOOD';
      this.isBusy = true;
      await this.gathering.chopTrees(5);
      await this.gathering.craftBasicTools();
      this.isBusy = false;
      return;
    }

    // B. Check Shelter / Home
    if (this.config.features.autoBuildShelter && !this.building.hasShelterBuilt()) {
      if (woodCount >= 20 || this.building.hasBuildingMaterials()) {
        this.currentState = 'BUILDING_SHELTER';
        this.isBusy = true;
        await this.building.constructShelter();
        this.isBusy = false;
        return;
      } else {
        // Collect wood for house
        this.currentState = 'GATHERING_WOOD_FOR_HOUSE';
        this.isBusy = true;
        await this.gathering.chopTrees(24);
        this.isBusy = false;
        return;
      }
    }

    // C. Check Hunger & Food
    const foodCount = this.farming.getCookedFoodCount();
    if (foodCount < 3) {
      this.currentState = 'HUNTING_AND_COOKING';
      this.isBusy = true;
      await this.farming.huntNearbyAnimals();
      await this.farming.cookFoodInFurnace();
      this.isBusy = false;
      return;
    }

    // D. Mining Progression (Stone -> Iron -> Coal -> Diamonds)
    if (this.config.features.autoMineOres) {
      this.currentState = 'MINING';
      this.isBusy = true;
      await this.mining.mineOresAndStone();
      this.isBusy = false;
      return;
    }

    // E. Crop Farming & Replanting
    if (this.config.features.autoFarm && this.farming.hasNearbyCrops()) {
      this.currentState = 'FARMING';
      this.isBusy = true;
      await this.farming.harvestAndReplant();
      this.isBusy = false;
      return;
    }

    // If nothing urgent, patrol and stay close to master
    if (masterEntity) {
      this.currentState = 'COMPANION_ROAM';
      this.isBusy = true;
      await this.survival.roamNearPlayer(masterEntity);
      this.isBusy = false;
    }
  }

  async executeState(state) {
    this.isBusy = true;
    switch (state) {
      case 'FOLLOW_MASTER': {
        const p = this.bot.players[this.config.master.username]?.entity;
        if (p) await this.survival.followPlayer(p, 3);
        break;
      }
      case 'MINING':
        await this.mining.mineOresAndStone();
        break;
      case 'BUILDING':
        await this.building.constructShelter();
        break;
      case 'GATHERING_WOOD':
        await this.gathering.chopTrees(10);
        break;
    }
    this.isBusy = false;
  }
}

module.exports = AutonomousBrain;
