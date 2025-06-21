import { getCommand } from "../../config/commandsLoader.js";
import { TypeReport } from "../../config/typeReport.js";
import { saveReportService } from "../../services/reportService.js";
import { sendLog } from "../../utils/sendLog.js";
import { buildKeyboard, renderTemplate } from "../../utils/utils.js";
import { checkCommands } from "../middlewares/checkCommands.js";
import crypto from 'crypto';

// Cache para armazenar dados temporários das denúncias
const reportCache = new Map();
const oneHour = 60 * 60 * 1000;

// Constantes para melhor manutenção
const ACTIONS = {
  SELECT: 'select',
  CONFIRM: 'confirmReport',
  CANCEL: 'cancelar_denuncia',
  DELETE: 'excluir'
};

const ERRORS = {
  COMMAND_NOT_FOUND: 'Comando não encontrado.',
  SAVE_ERROR: 'Erro ao salvar a denúncia.',
  NOT_WHISTLEBLOWER: 'Você não é o denunciante.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  INVALID_USER_ID: 'ID de usuário inválido.',
  REPLY_OR_ID_REQUIRED: 'Responda a uma mensagem ou forneça um ID de usuário válido.',
  EXPIRED_SESSION: 'Sessão de denúncia expirada. Inicie novamente.'
};

export const denunciaCommand = (bot) => {
  // Registrar o comando principal
  bot.command('denunciar', checkCommands("denunciar"), handleDenunciaCommand);
  
  // Registrar handlers de ações uma única vez
  registerActionHandlers(bot);
};

async function handleDenunciaCommand(ctx) {
  try {
    const chat = ctx.chat;
    const whistleblower = ctx.from;
    const targetUser = await getTargetUser(ctx);

    console.log('=== DEBUG handleDenunciaCommand ===');
    console.log('Whistleblower:', whistleblower.id, whistleblower.first_name);
    console.log('Target user:', targetUser?.id, targetUser?.first_name);

    if (!targetUser) {
      return ctx.reply(ERRORS.REPLY_OR_ID_REQUIRED);
    }

    if (targetUser.id === whistleblower.id) {
      return ctx.reply('Você não pode denunciar a si mesmo.');
    }

    const command = getCommand('denunciar_reply');
    if (!command) {
      return ctx.reply(ERRORS.COMMAND_NOT_FOUND);
    }

    // ✅ CORREÇÃO: Usar UUID curto em vez de IDs longos
    const reportId = generateShortUUID();
    const variables = createVariables(whistleblower, targetUser, chat);

    console.log('Report ID gerado (curto):', reportId);

    // Armazenar dados no cache
    reportCache.set(reportId, {
      whistleblower,
      targetUser,
      chat,
      variables,
      timestamp: Date.now()
    });

    console.log('Cache após set:', Array.from(reportCache.keys()));

    // Limpar cache após 10 minutos
    setTimeout(() => reportCache.delete(reportId), 10 * 60 * 1000);

    const renderedText = renderTemplate(command.text, variables);
    
    // ✅ CORREÇÃO: Modificar os botões para incluir reportId curto
    const buttonsWithReportId = command.buttons.map(row => {
      return row.map(button => {
        const newCallbackData = `${button.callback}:${reportId}`;
        console.log('Callback data length:', newCallbackData.length, 'bytes');
        return {
          ...button,
          callback: newCallbackData
        };
      });
    });
    
    const keyboard = buildKeyboard(buttonsWithReportId, variables);

    await ctx.reply(renderedText, {
      reply_to_message_id: ctx.msg.message_id,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });

  } catch (error) {
    console.error('Erro no comando denunciar:', error);
    await ctx.reply('Ocorreu um erro interno. Tente novamente.');
  }
}

async function getTargetUser(ctx) {
  // Caso 1: Resposta a uma mensagem
  if (ctx.msg.reply_to_message?.from) {
    return ctx.msg.reply_to_message.from;
  }

  // Caso 2: ID fornecido como argumento
  const args = ctx.msg.text.split(' ');
  if (args.length > 1) {
    const userId = args[1];
    
    // Verificar se é um ID numérico válido
    if (!/^\d+$/.test(userId)) {
      return null;
    }

    try {
      // Tentar obter informações do usuário
      const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      return chatMember.user;
    } catch (error) {
      // Se não conseguir obter do chat, tentar método alternativo
      try {
        const userInfo = await ctx.telegram.getChat(userId);
        return userInfo;
      } catch (innerError) {
        console.error('Erro ao obter usuário:', innerError);
        return null;
      }
    }
  }

  return null;
}

function registerActionHandlers(bot) {
  // Handler para seleção de tipo de denúncia
  bot.action(new RegExp(`^${ACTIONS.SELECT}:(.+)`), handleSelectAction);
  
  // Handler para confirmação de denúncia
  bot.action(new RegExp(`^${ACTIONS.CONFIRM}:(.+)`), handleConfirmAction);
  
  // Handler para cancelamento
  bot.action(new RegExp(`^${ACTIONS.CANCEL}:(.+)`), handleCancelAction);
  
  // Handler para exclusão
  bot.action(new RegExp(`^${ACTIONS.DELETE}:(.+)`), handleDeleteAction);
}

async function handleSelectAction(query) {
  try {
    console.log('=== DEBUG handleSelectAction ===');
    console.log('Callback data completo:', query.callbackQuery.data);
    
    const fields = query.match[1].split(':');
    console.log('Fields após split:', fields);
    
    const reasonId = fields[0]; // Primeiro campo é o tipo
    const reportId = fields[fields.length - 1]; // Último campo é o reportId
    
    console.log('ReasonId extraído:', reasonId);
    console.log('ReportId extraído:', reportId);
    
    const reportData = reportCache.get(reportId);
    console.log('Report data encontrado:', !!reportData);

    if (!reportData) {
      console.log('❌ Report data não encontrado no cache');
      return query.answerCbQuery(ERRORS.EXPIRED_SESSION, { show_alert: true });
    }

    if (!isAuthorized(query.callbackQuery.from, reportData.whistleblower)) {
      console.log('❌ Usuário não autorizado');
      return query.answerCbQuery(ERRORS.NOT_WHISTLEBLOWER, { show_alert: true });
    }

    const command = getCommand('denunciar_reply');
    const { variables } = reportData;
    
    variables.reasonId = reasonId;
    variables.reason = `${reasonId} - ${TypeReport[reasonId].name}`;
    variables.reportDescription = TypeReport[reasonId].description;

    const confirmMessage = renderTemplate(command.confirm, variables);
    
    // ✅ CORREÇÃO: Modificar botões de confirmação com reportId curto
    const confirmButtonsWithReportId = command.buttons_confirm.map(row => {
      return row.map(button => {
        const newCallbackData = `${button.callback}:${reasonId}:${reportId}`;
        console.log('Confirm callback data length:', newCallbackData.length, 'bytes');
        return {
          ...button,
          callback: newCallbackData
        };
      });
    });
    
    const confirmKeyboard = buildKeyboard(confirmButtonsWithReportId, variables);

    await query.editMessageText(confirmMessage, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: confirmKeyboard }
    });

  } catch (error) {
    console.error('Erro na seleção:', error);
    await query.answerCbQuery('Erro interno. Tente novamente.');
  }
}

async function handleConfirmAction(query) {
  try {
    console.log('=== DEBUG handleConfirmAction ===');
    console.log('Callback data:', query.callbackQuery.data);
    
    const fields = query.match[1].split(':');
    console.log('Fields:', fields);
    
    const reasonId = fields[0];
    const reportId = fields[fields.length - 1];
    
    console.log('ReasonId:', reasonId);
    console.log('ReportId:', reportId);
    
    const reportData = reportCache.get(reportId);

    if (!reportData) {
      console.log('❌ Report data não encontrado para confirmação');
      return query.answerCbQuery(ERRORS.EXPIRED_SESSION, { show_alert: true });
    }

    if (!isAuthorized(query.callbackQuery.from, reportData.whistleblower)) {
      return query.answerCbQuery(ERRORS.NOT_WHISTLEBLOWER, { show_alert: true });
    }

    const { whistleblower, targetUser, chat, variables } = reportData;
    const groupName = getGroupName(chat);

    const reportPayload = {
      id: reportId, // Usar UUID curto
      denuncianteId: whistleblower.id,
      denunciadoId: targetUser.id,
      tipo: reasonId,
      descricao: TypeReport[reasonId].description,
      grupo: groupName
    };

    const newReport = await saveReportService(reportPayload);

    if (!newReport) {
      return query.answerCbQuery(ERRORS.SAVE_ERROR, { show_alert: true });
    }

    const command = getCommand('denunciar_reply');
    variables.reasonId = reasonId;
    variables.reason = `${reasonId} - ${TypeReport[reasonId].name}`;
    variables.reportDescription = TypeReport[reasonId].description;

    const successMessage = renderTemplate(command.succes, variables);
    
    // ✅ CORREÇÃO: Modificar botões de delete com reportId curto
    const deleteButtonsWithReportId = command.buttons_delete.map(row => {
      return row.map(button => {
        const newCallbackData = `${button.callback}:${reportId}`;
        console.log('Delete callback data length:', newCallbackData.length, 'bytes');
        return {
          ...button,
          callback: newCallbackData
        };
      });
    });
    
    const successKeyboard = buildKeyboard(deleteButtonsWithReportId, variables);

    // Enviar log de forma assíncrona
    sendLog(query, newReport).catch(error => 
      console.error('Erro ao enviar log:', error)
    );

    await query.editMessageText(successMessage, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: successKeyboard }
    });

    // Limpar cache após sucesso
    reportCache.delete(reportId);

  } catch (error) {
    console.error('Erro na confirmação:', error);
    await query.answerCbQuery('Erro ao processar denúncia. Tente novamente.');
  }
}

async function handleCancelAction(query) {
  try {
    console.log('=== DEBUG handleCancelAction ===');
    console.log('Callback data:', query.callbackQuery.data);
    
    const reportId = extractReportIdFromCallback(query);
    const reportData = reportCache.get(reportId);

    if (!reportData) {
      return query.answerCbQuery(ERRORS.EXPIRED_SESSION, { show_alert: true });
    }

    if (!isAuthorized(query.callbackQuery.from, reportData.whistleblower)) {
      return query.answerCbQuery(ERRORS.NOT_WHISTLEBLOWER, { show_alert: true });
    }

    const command = getCommand('denunciar_reply');
    const { variables } = reportData;
    
    const cancelMessage = renderTemplate(command.cancel, variables);
    
    // ✅ CORREÇÃO: Modificar botões de delete com reportId curto
    const deleteButtonsWithReportId = command.buttons_delete.map(row => {
      return row.map(button => {
        const newCallbackData = `${button.callback}:${reportId}`;
        console.log('Cancel delete callback data length:', newCallbackData.length, 'bytes');
        return {
          ...button,
          callback: newCallbackData
        };
      });
    });
    
    const cancelKeyboard = buildKeyboard(deleteButtonsWithReportId, variables);

    await query.editMessageText(cancelMessage, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: cancelKeyboard }
    });

  } catch (error) {
    console.error('Erro no cancelamento:', error);
    await query.answerCbQuery('Erro interno. Tente novamente.');
  }
}

async function handleDeleteAction(query) {
  try {
    console.log('=== DEBUG handleDeleteAction ===');
    console.log('Callback data:', query.callbackQuery.data);
    
    const reportId = extractReportIdFromCallback(query);
    const reportData = reportCache.get(reportId);

    if (!reportData) {
      return query.answerCbQuery(ERRORS.EXPIRED_SESSION, { show_alert: true });
    }

    if (!isAuthorized(query.callbackQuery.from, reportData.whistleblower)) {
      return query.answerCbQuery(ERRORS.NOT_WHISTLEBLOWER, { show_alert: true });
    }

    await query.deleteMessage();
    await query.answerCbQuery('Denúncia excluída.');
    
    // Limpar cache
    reportCache.delete(reportId);

  } catch (error) {
    console.error('Erro na exclusão:', error);
    await query.answerCbQuery('Erro ao excluir mensagem.');
  }
}

// ✅ NOVA FUNÇÃO: Gerar UUID curto
function generateShortUUID() {
  return crypto.randomBytes(4).toString('hex'); // 8 caracteres hexadecimais
}

// Funções utilitárias
function createVariables(whistleblower, targetUser, chat) {
  return {
    first_name: whistleblower.first_name,
    target_user: targetUser.first_name,
    reportedId: targetUser.id,
  };
}

function isAuthorized(currentUser, whistleblower) {
  const authorized = currentUser.id === whistleblower.id;
  console.log('Debug - isAuthorized:', {
    currentUserId: currentUser.id,
    whistleblowerId: whistleblower.id,
    authorized
  });
  return authorized;
}

function getGroupName(chat) {
  return chat.type === 'group' || chat.type === 'supergroup' 
    ? chat.title 
    : chat.first_name;
}

function extractReportIdFromCallback(query) {
  const parts = query.callbackQuery.data.split(':');
  return parts[parts.length - 1];
}

// Limpeza periódica do cache
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, value] of reportCache.entries()) {
    if (now - value.timestamp > oneHour) {
      reportCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Debug - Limpeza periódica: ${cleanedCount} itens removidos do cache`);
  }
}, oneHour);
