import prisma from "../prisma/client.js"

export const saveUser = async (data) => {
    return await prisma.user.upsert({
        where: { userId: String(data.userId) },
        update: { username: data.username },
        create: { userId: String(data.userId), username: data.username }
    })
}