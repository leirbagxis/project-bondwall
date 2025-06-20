import { getCommand } from "../../config/commandsLoader.js";
import { TypeReport } from "../../config/typeReport.js";
import { buildKeyboard, renderTemplate } from "../../utils/utils.js";
import { checkCommands } from "../middlewares/checkCommands.js";

export const denunciaCommand = (bot) => {
  bot.command('denunciar', checkCommands("denunciar"), async (ctx) => {
    //console.log(ctx.msg);
    const whistleblower = ctx.from;
    // && ctx.msg.reply_to_message.from.id !== user.id

    if (ctx.msg.reply_to_message) {
      const command = getCommand('denunciar_reply');
      if (!command) return ctx.reply('Comando não encontrado.');

      const variables = {
        first_name: ctx.from.first_name,
        target_user: ctx.msg.reply_to_message.from.first_name,
        reportedId: ctx.msg.reply_to_message.from.id,
      }

      const renderedText = renderTemplate(command.text, variables);

      const keyboard = buildKeyboard(command.buttons, variables);

      await ctx.reply(renderedText, {
        reply_to_message_id: ctx.msg.message_id,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });

      bot.action(/^select:(.+)/, async (query) => { 
        var fields = query.match[1].split(':');
        const selectionUser = query.callbackQuery.from;

        if(selectionUser.id !== whistleblower.id) {
          return query.answerCbQuery('Você não é o denunciante.', { show_alert: true });
        }
        
        variables.reasonId = fields[0];
        variables.reason = fields[0] + ` - ${TypeReport[fields[0]].name}`;
        variables.reportDescription = TypeReport[fields[0]].description

        const confirmMessage = renderTemplate(command.confirm, variables)
        const confirmKeyboard = buildKeyboard(command.buttons_confirm, variables);


        await query.editMessageText(confirmMessage, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: confirmKeyboard }
        })
        
      });

      bot.action(/^confirmReport:(.+)/, async (query) => { 
        var fields = query.match[1].split(':');
        const selectionUser = query.callbackQuery.from;

        if(selectionUser.id !== whistleblower.id) {
          return query.answerCbQuery('Você não é o denunciante.', { show_alert: true });
        }
        
        variables.reasonId = fields[0];
        variables.reason = fields[0] + ` - ${TypeReport[fields[0]].name}`;
        variables.reportDescription = TypeReport[fields[0]].description

        const confirmMessage = renderTemplate(command.succes, variables)
        const confirmKeyboard = buildKeyboard(command.buttons_delete, variables);


        await query.editMessageText(confirmMessage, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: confirmKeyboard }
        })
        
      });

      bot.action(/^cancelar_denuncia/, async (query) => {
        const selectionUser = query.callbackQuery.from;

        if(selectionUser.id !== whistleblower.id) {
          return query.answerCbQuery('Você não é o denunciante.', { show_alert: true });
        }

        const confirmMessage = renderTemplate(command.cancel, variables)
        const confirmKeyboard = buildKeyboard(command.buttons_delete, variables);

        await query.editMessageText(confirmMessage, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: confirmKeyboard }
        })
        
      });

      bot.action(/^excluir/, async (query) => { 
        const selectionUser = query.callbackQuery.from;

        if(selectionUser.id !== whistleblower.id) {
          return query.answerCbQuery('Você não é o denunciante.', { show_alert: true });
        }

        await query.deleteMessage(query.msg.message_id);
        await query.answerCbQuery('Denúncia excluída.');
      });



    }

  })
}


