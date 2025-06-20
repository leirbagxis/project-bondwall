import dotenv from 'dotenv';
import { renderTemplate } from './utils.js';
import { getCommand } from '../config/commandsLoader.js';
dotenv.config();

export const sendLog = async (bot, denuncia) => {
  const chatId = process.env.LOG_CHANNEL_ID;
  if (!chatId) {
    console.error('❌ LOG_CHANNEL_ID não configurado no .env');
    return;
  }

  try {
    const targetUser = await bot.telegram.getChat(denuncia.denunciadoId);
    const denunciante = await bot.telegram.getChat(denuncia.denuncianteId);
    
    denuncia.denunciaId = denuncia.id;
    denuncia.dataHora = new Date(denuncia.createdAt).toLocaleString('pt-BR');
    denuncia.target_user = targetUser.first_name;
    denuncia.first_name = denunciante.first_name;

    const command = getCommand('logDenuncia');
    const logMessage = renderTemplate(command.text, denuncia)

    
    await bot.telegram.sendMessage(chatId, logMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

  } catch (err) {
    console.error('❌ Erro ao enviar log:', err);
  }
}