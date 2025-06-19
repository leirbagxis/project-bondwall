import { getCommand } from '../../config/commandsLoader.js';

export const startCommand = (bot) => {
  bot.command('start', (ctx) => {
    const command = getCommand('start');
    
    if (!command) return ctx.reply('Comando não encontrado.');

    const buttons = command.buttons.map(btn => [{
      text: btn.label,
      callback_data: btn.callback
    }]);

    ctx.reply(command.text, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.msgId,
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  });
};