import { saveUser } from "../../services/userService.js";

export const saveUserMiddleware = async (ctx, next) => {
    const user = ctx.from

    if(user && !user.is_bot) {
        await saveUser({
            userId: user.id,
            username: user.username ? `@${user.username}` : user.first_name
        })

        return next()
    }

    return next()
}