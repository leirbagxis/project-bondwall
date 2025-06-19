import prisma from "../prisma/client.js"

export const findCommandService = async (commandName) => {
    return await prisma.command.findUnique({
        where: { name: commandName }
    })
} 