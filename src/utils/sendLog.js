import dotenv from 'dotenv';
dotenv.config();

export const sendLog = async (bot, denuncia) => {
  const chatId = process.env.LOG_CHANNEL_ID;
  if (!chatId) {
    console.error('❌ LOG_CHANNEL_ID não configurado no .env');
    return;
  }

  try {
    await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      
    });
  } catch (err) {
    console.error('❌ Erro ao enviar log:', err);
  }
}