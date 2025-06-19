import './config/env.js';
import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from './config/env.js';

import { toggleCommand } from './bot/commands/toggleCommand.js';
import { startCommand } from './bot/commands/startCommand.js';
import { loadCommands } from './config/commandsLoader.js';
import { saveUserMiddleware } from './bot/middlewares/saveUser.js';
import { denunciaCommand } from './bot/commands/denunciarCommand.js';

const bot = new Telegraf(BOT_TOKEN);
loadCommands()

bot.use(saveUserMiddleware)

// Carregar comandos
toggleCommand(bot);
startCommand(bot)
denunciaCommand(bot);

bot.launch();
console.log('🤖 Bot de denúncias rodando...');