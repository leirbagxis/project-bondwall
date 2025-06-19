import { getCommand } from "../../config/commandsLoader.js";
import { renderTemplate } from "../../utils/utils.js";
import { checkCommands } from "../middlewares/checkCommands.js";

const buildKeyboard = (buttonsConfig) => {
  if (!Array.isArray(buttonsConfig)) return [];

  return buttonsConfig.map(row => {
    if (!Array.isArray(row)) return []; // Evita erro se algum row não for array
    return row.map(btn => ({
      text: btn.label,
      callback_data: btn.callback
    }));
  });
};



export const denunciaCommand = (bot) => {
    bot.command('denunciar', checkCommands("denunciar"), async (ctx) => {
        console.log(ctx.msg);
        const user = ctx.from;
        // && ctx.msg.reply_to_message.from.id !== user.id

        if(ctx.msg.reply_to_message) {
            const command = getCommand('denunciar_reply');
            if (!command) return ctx.reply('Comando não encontrado.');

            const renderedText = renderTemplate(command.text, {
                first_name: ctx.from.first_name,
                target_user: ctx.msg.reply_to_message.from.first_name
            });

            const keyboard = buildKeyboard(command.buttons);
            console.log(keyboard);
            

            ctx.reply(renderedText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
    })
}