/**
 * File: index.js
 * Description: Main entry point for the Autonomous Minecraft Companion Bot
 */

const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const collectBlock = require('mineflayer-collectblock').plugin;
const armorManager = require('mineflayer-armor-manager');
const autoEat = require('mineflayer-auto-eat').plugin;
const fs = require('fs');

// Load configurations
let config = {};
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (err) {
  console.error('[Config Error] Could not load config.json. Using defaults.');
  config = {
    server: { host: 'localhost', port: 25565 },
    bot: { username: 'Bondhu_Steve', auth: 'offline' },
    master: { username: 'Rayhan', maxFollowDistance: 30, comfortDistance: 4 }
  };
}

const AutonomousBrain = require('./brain');

function createBot() {
  console.log(`[Status] Connecting ${config.bot.username} to ${config.server.host}:${config.server.port}...`);

  const bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    version: config.server.version || false,
    auth: config.bot.auth || 'offline'
  });

  // Load plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(autoEat);

  let brain = null;

  bot.once('spawn', () => {
    console.log(`[Success] ${bot.username} has joined the world!`);
    
    // Setup movement physics
    const defaultMove = new Movements(bot);
    defaultMove.canDig = true;
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.scafoldingBlocks = []; // Don't waste precious building blocks for scaffolding
    bot.pathfinder.setMovements(defaultMove);

    // Setup auto-eat
    if (bot.autoEat) {
      bot.autoEat.options = {
        priority: 'foodPoints',
        startAt: 14,
        bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
      };
    }

    // Initialize Autonomous Brain (Zero-AI State Machine)
    brain = new AutonomousBrain(bot, config);
    brain.start();

    bot.chat(`হ্যালো ${config.master.username}! আমি তোমার বন্ধু হিসেবে জয়েন করেছি। আমি কাজ শুরু করছি!`);
  });

  // If Master talks in chat, bot listens, but doesn't wait for chat to act
  bot.on('chat', (sender, message) => {
    if (sender === bot.username) return;
    const msg = message.toLowerCase().trim();

    // Check if message is from the Master
    if (sender.toLowerCase() === config.master.username.toLowerCase()) {
      if (msg === 'come' || msg === 'asho' || msg === 'follow') {
        bot.chat('আমি তোমার কাছে আসছি!');
        brain.setOverrideState('FOLLOW_MASTER');
      } else if (msg === 'mine' || msg === 'mining') {
        bot.chat('আমি খনিতে কয়লা ও লোহা খুঁজতে যাচ্ছি!');
        brain.setOverrideState('MINING');
      } else if (msg === 'build' || msg === 'bari' || msg === 'house') {
        bot.chat('আমি আমাদের জন্য একটি নিরাপদ কাঠের ঘর বানাচ্ছি!');
        brain.setOverrideState('BUILDING');
      } else if (msg === 'wood' || msg === 'gach') {
        bot.chat('আমি কাঠ কাটতে যাচ্ছি!');
        brain.setOverrideState('GATHERING_WOOD');
      } else if (msg === 'resume' || msg === 'play') {
        bot.chat('ঠিক আছে, আমি স্বাভাবিক স্বয়ংক্রিয় খেলা চালিয়ে যাচ্ছি!');
        brain.clearOverrideState();
      }
    }
  });

  // When bot takes damage or master takes damage
  bot.on('entityHurt', (entity) => {
    if (!brain) return;
    if (entity.username === config.master.username) {
      brain.onMasterAttacked();
    }
  });

  // Death and respawn handler
  bot.on('death', () => {
    console.log('[Alert] Bot died! Respawning...');
    if (brain) brain.stop();
  });

  bot.on('respawn', () => {
    console.log('[Status] Bot respawned! Re-engaging brain...');
    setTimeout(() => {
      if (brain) brain.start();
    }, 2000);
  });

  // Auto-reconnect on kick / disconnect
  bot.on('end', (reason) => {
    console.log(`[Disconnected] Reason: ${reason}. Reconnecting in 5 seconds...`);
    if (brain) brain.stop();
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.error('[Bot Error]', err.message);
  });
}

createBot();
