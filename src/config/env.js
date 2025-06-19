import dotenv from 'dotenv';
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN;
export const OWNER_ID = process.env.BOT_OWNER_ID;
export const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];