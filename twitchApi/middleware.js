import dotenv from "dotenv";
import { EventSubMiddleware } from "@twurple/eventsub-http";
import { apiClient } from "./apiClient.js";

dotenv.config();

const botMiddleware = new EventSubMiddleware({
  apiClient,
  hostName: process.env.HOSTNAME,
  pathPrefix: "/twitch/events/live",
  secret: process.env.EVENT_SECRET,
});

export { botMiddleware };
