import { AppTokenAuthProvider } from "@twurple/auth";
import dotenv from "dotenv";

dotenv.config();
const clientId = process.env.BOT_CLIENT_ID;
const clientSecret = process.env.BOT_CLIENT_SECRET;

export const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
