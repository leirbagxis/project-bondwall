import { OWNER_ID, ADMIN_IDS } from '../../config/env.js';
import { AccessLevels } from '../../config/accessLevels.js';

export function requireAccess(minLevel) {
  return async (ctx, next) => {
    const userId = String(ctx.from.id);
    let userLevel = AccessLevels.MEMBER;

    if (userId === OWNER_ID) {
      userLevel = AccessLevels.OWNER;
    } else if (ADMIN_IDS.includes(userId)) {
      userLevel = AccessLevels.ADMIN;
    }

    if (userLevel >= minLevel) {
      return next();
    } else {
      return ctx.reply('❌ Permissão insuficiente.');
    }
  };
}