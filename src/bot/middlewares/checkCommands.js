import { findCommandService } from "../../services/commandService.js"

export const checkCommands = (commandName) => {
    return async (ctx, next) => {
        const command = await findCommandService(commandName)
        if(!command || command.enabled) return next()

        return ctx.reply('❌ Este comando está desativado.', {
            reply_to_messag_id: ctx.msgId,
        })
    }
}