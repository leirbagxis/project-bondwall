import prisma from '../../prisma/client.js';
import { requireAccess } from '../middlewares/requireAccess.js';
import { AccessLevels } from '../../config/accessLevels.js';

export const toggleCommand = (bot) => {
  bot.command('toggleCommand', requireAccess(AccessLevels.ADMIN), async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const commandName = parts[1];
    if (!commandName) return ctx.reply('Uso: /toggleCommand nomeDoComando');

    const existing = await prisma.command.findUnique({ where: { name: commandName } });

    if (!existing) {
      await prisma.command.create({
        data: { name: commandName, enabled: false }
      });
      return ctx.reply(`✅ Comando /${commandName} foi criado e desativado.`);
    }

    const updated = await prisma.command.update({
      where: { name: commandName },
      data: { enabled: !existing.enabled },
    });

    ctx.reply(`✅ Comando /${commandName} agora está ${updated.enabled ? 'ativo' : 'desativado'}.`);
  });
};