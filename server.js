import express from "express";
import dotenv from "dotenv";
import { chatClient } from "./twitchApi/chatClient.js";
import cors from "cors";

dotenv.config();

// Bot imports
import { botMiddleware } from "./twitchApi/middleware.js";
import { xqcBot } from "./xqcBot.js";
import { streakBot } from "./streakBot.js";

const app = express();

// Rate limiters
botMiddleware.apply(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["localhost:5000", "kicktalk.app"],
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
  try {
    await botMiddleware.markAsReady();

    await xqcBot();
    await streakBot();

    chatClient.connect();
  } catch (error) {
    console.error("Error initializing bots:", error);
  }
});
