/**
 * File: index.js
 * Description: 1.21.3+ Compatible Main Entry Point with Strict Error Shield
 */

// ১.২১.৩ এর নতুন প্যাকেট বা চ্যাট ফরম্যাটের কারণে যেন প্রসেস না থামে
process.on('uncaughtException', (err) => {
  const msg = err.message || '';
  if (
    msg.includes('unknown chat format') ||
    msg.includes('PartialReadError') ||
    msg.includes('login codec') ||
    msg.includes('physicTick') ||
    msg.includes('SlotComponent')
  ) {
    console.warn('[Handled 1.21.3 Protocol Packet Notice]', msg);
    return;
  }
  console.error('[Uncaught Exception]', err);
});

const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const collectBlock = require('mineflayer-collectblock').plugin;
const autoEat = require('mineflayer-auto-eat').plugin;
const fs = require('fs');

let config = {};
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (err) {
  config = {
    server: { host: 'Smp2O.aternos.me', port: 26849, version: '1.21.3' },
    bot: { username: 'Steve', auth: 'offline' },
    master: { username: 'Rayhan', maxFollowDistance: 30, comfortDistance: 4 },
    features: { autoDefendMaster: true, autoSleepAtNight: true, autoEat: true, autoEquipArmor: true, autoMineOres: true, autoBuildShelter: true, autoFarm: true }
  };
}

const AutonomousBrain = require('./brain');

function createBot() {
  console.log(`[Status] Connecting ${config.bot.username} to ${config.server.host}:${config.server.port} (Version: ${config.server.version})...`);

  const bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    auth: config.bot.auth || 'offline',
    version: config.server.version || '1.21.3',
    checkTimeoutInterval: 60000,
    hideErrors: true
  });

  // প্লাগইনগুলো নিরাপদে লোড করা (১.২১.৩ এর সাথে ম্যাচ রেখে)
  try { bot.loadPlugin(pathfinder); } catch (e) {}
  try { bot.loadPlugin(pvp); } catch (e) {}
  try { bot.loadPlugin(collectBlock); } catch (e) {}
  try { bot.loadPlugin(autoEat); } catch (e) {}

  let brain = null;

  bot.once('spawn', () => {
    console.log(`[Success] ${bot.username} successfully spawned in 1.21.3 world!`);

    try {
      const defaultMove = new Movements(bot);
      defaultMove.canDig = true;
      defaultMove.allowParkour = true;
      defaultMove.allowSprinting = true;
      defaultMove.scafoldingBlocks = [];
      bot.pathfinder.setMovements(defaultMove);
    } catch (e) {}

    // Autonomous Decision Brain চালু
    brain = new AutonomousBrain(bot, config);
    brain.start();

    // ১.২১.৩ এ চ্যাট সম্পূর্ণ সেটেল হতে ৫ সেকেন্ড সময় দেওয়া
    setTimeout(() => {
      try {
        bot.chat(`Hello ${config.master.username}! I am ready to play.`);
      } catch (err) {}
    }, 5000);
  });

  bot.on('chat', (sender, message) => {
    if (sender === bot.username) return;
    const msg = message.toLowerCase().trim();

    if (sender.toLowerCase() === config.master.username.toLowerCase()) {
      if (msg === 'come' || msg === 'asho' || msg === 'follow') {
        bot.chat('I am coming!');
        if (brain) brain.setOverrideState('FOLLOW_MASTER');
      } else if (msg === 'mine') {
        bot.chat('Going to mine ores!');
        if (brain) brain.setOverrideState('MINING');
      } else if (msg === 'build' || msg === 'bari') {
        bot.chat('Building shelter!');
        if (brain) brain.setOverrideState('BUILDING');
      } else if (msg === 'wood' || msg === 'gach') {
        bot.chat('Chopping trees!');
        if (brain) brain.setOverrideState('GATHERING_WOOD');
      } else if (msg === 'resume' || msg === 'play') {
        bot.chat('Resuming autonomous play!');
        if (brain) brain.clearOverrideState();
      }
    }
  });

  bot.on('entityHurt', (entity) => {
    if (!brain) return;
    if (entity.username === config.master.username) {
      brain.onMasterAttacked();
    }
  });

  bot.on('death', () => {
    console.log('[Alert] Bot died! Respawning...');
    if (brain) brain.stop();
  });

  bot.on('respawn', () => {
    console.log('[Status] Bot respawned! Re-engaging brain...');
    setTimeout(() => {
      if (brain) brain.start();
    }, 3000);
  });

  bot.on('end', (reason) => {
    console.log(`[Disconnected] Reason: ${reason}. Reconnecting in 5 seconds...`);
    if (brain) brain.stop();
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.warn('[Handled Bot Error]', err.message);
  });
}

createBot();
