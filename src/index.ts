import mineflayer from 'mineflayer';
import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf-8'));

const { host, port, username } = config.client;
const { retryDelay } = config.action;
const logLevel = config.logLevel;

function log(level, ...args) {
  if (logLevel.includes(level)) console.log(`[${level.toUpperCase()}]`, ...args);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AterBot is running!');
});
server.listen(8080, '0.0.0.0', () => log('log', 'Web server started on port 8080'));

function createBot() {
  log('log', `Connecting to ${host}:${port} as ${username}...`);
  const bot = mineflayer.createBot({ host, port: parseInt(port), username, version: '1.21.11' });
  let reconnectScheduled = false;

  function scheduleReconnect() {
    if (reconnectScheduled) return;
    reconnectScheduled = true;
    log('log', `Reconnecting in ${retryDelay / 1000}s...`);
    setTimeout(createBot, retryDelay);
  }

  bot.on('spawn', () => { log('log', 'Bot spawned! Starting anti-AFK.'); startAntiAFK(bot); });
  bot.on('kicked', (r) => { log('error', 'Kicked:', r); scheduleReconnect(); });
  bot.on('error', (e) => { log('error', 'Error:', e.message); scheduleReconnect(); });
  bot.on('end', () => { log('log', 'Connection ended.'); scheduleReconnect(); });
}

function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function startAntiAFK(bot) {
  const moveKeys = ['forward', 'back', 'left', 'right'];
  function stopAll() { try { [...moveKeys, 'jump', 'sneak'].forEach(k => bot.setControlState(k, false)); } catch (_) {} }

  function next() {
    try {
      stopAll();
      const action = randomBetween(1, 5);
      if (action === 1) {
        const key = moveKeys[randomBetween(0, 3)];
        bot.setControlState(key, true);
        setTimeout(() => { bot.setControlState(key, false); setTimeout(next, randomBetween(1000, 4000)); }, randomBetween(500, 3000));
      } else if (action === 2) {
        bot.setControlState('jump', true);
        setTimeout(() => { bot.setControlState('jump', false); setTimeout(next, randomBetween(1000, 3000)); }, 400);
      } else if (action === 3) {
        bot.look((Math.random() * Math.PI * 2) - Math.PI, (Math.random() * 0.5) - 0.25, false);
        setTimeout(next, randomBetween(1000, 3000));
      } else if (action === 4) {
        bot.setControlState('sneak', true);
        setTimeout(() => { bot.setControlState('sneak', false); setTimeout(next, randomBetween(1000, 3000)); }, randomBetween(500, 2000));
      } else {
        setTimeout(next, randomBetween(1000, 3000));
      }
    } catch (_) { setTimeout(next, 5000); }
  }
  next();
}

createBot();
