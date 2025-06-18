import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { botMiddleware } from "./twitchApi/middleware.js";
import { CommandKit } from "commandkit";
import { createClient } from "@supabase/supabase-js";

import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ActivityType,
} from "discord.js";
import { fileURLToPath } from "url";
import { apiClient } from "./twitchApi/apiClient.js";
import { getRandomStreamId } from "./utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.DB_URL;
const supabaseKey = process.env.DB_KEY;

// const channelId = "71092938";
const channelId = "909497787";
const channelSlug = "zdini";
const channelUsername = "zDini";

export const xqcBot = async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    });

    new CommandKit({
      client,
      commandsPath: path.join(__dirname, "commands"),
      devGuildIds: ["907411994741731348"],
      devUserIds: ["667619257168691200"],
      bulkRegister: true,
    });

    client.on("error", (e) => {
      console.log({ General_Error: e });
    });

    // Guild Unavailable
    client.on("guildUnavailable", (guild) => {
      console.log(`Guild unavailable, likely due to a server outage: ${guild}`);
    });

    // Handle Channel Update
    botMiddleware.onChannelUpdate(channelId, (e) => {
      try {
        client.user.setActivity({ name: e.categoryName, type: ActivityType.Streaming });
      } catch (error) {
        console.log("Error on Channel Update Subscription: ", error);
      }
    });

    // Live Update Handler
    let msgIds = [];

    // Twitch Stream is Live
    const streamonline = botMiddleware.onStreamOnline(channelId, async (e) => {
      try {
        let streamResponse;
        msgIds = [];

        let { error } = await supabase.from("streams").update({ twitchStatus: true }).eq("streamer", channelSlug).select();
        if (error) {
          console.log(error);
        }

        const checkingForStream = setInterval(async () => {
          console.log("[Twitch Stream] Checking...");

          const stream = await e.getStream();
          const broadcaster = await e.getBroadcaster();

          if (stream !== null && broadcaster?.id !== "") {
            clearTimeout(checkingStreamTimeout);

            const startTime = Math.floor(Date.now() / 1000);

            streamResponse = {
              streamId: stream?.id || getRandomStreamId(),
              title: stream?.title || `${channelUsername} is Live, no title found.`,
              thumbnail: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${channelSlug}-1920x1080.jpg?cb=175018670`,
              category: stream?.gameName || "N/A",
              profile:
                broadcaster?.profilePictureUrl ||
                "https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-70x70.png",
              username: broadcaster?.displayName || channelSlug,
            };

            let { data: initialData, error: initialError } = await supabase
              .from("streams")
              .select()
              .eq("streamer", channelSlug)
              .single();

            if (initialError) {
              console.log(initialError);
            }

            // Checking if already in database, probably already sent message
            if (initialData.stream_id === streamResponse.id) return;

            // Not in database, update, continue...
            let { error: updateError } = await supabase
              .from("streams")
              .update({ status: "online", stream_id: streamResponse.streamId, start_time: startTime })
              .eq("streamer", channelSlug);

            if (updateError) {
              console.log("Error updating stream information: ", updateError);
            }

            // Update current Category
            client.user.setActivity({ name: stream.gameName || "No Category Found", type: ActivityType.Streaming });

            // Get Guild
            client.guilds.cache.forEach(async (guild) => {
              try {
                let { data, error } = await supabase.from("xqc_bot").select().eq("guild_id", guild.id).not("role_id", "is", null);

                if (error) {
                  throw { type: "database", code: error.code, message: error.message, details: error.details, hint: error.hint };
                }

                if (data.length === 0 || data[0].channel_ids.length === 0) {
                  console.log("Guild Missing Channel or Role: " + guild?.id || "N/A");
                  return;
                }

                // Check Channel Validity
                const checkChannel = async (dbChannelId) => {
                  const isChannelAvailable = guild.channels.cache.has(dbChannelId);
                  if (dbChannelId === null || !isChannelAvailable) {
                    return ["__**Not Set**__", false];
                  } else {
                    return [`<#${dbChannelId}>`, true];
                  }
                };

                // Check Role Validity
                const checkRole = async (dbRoleId) => {
                  const isRoleAvailable = guild.roles.cache.has(dbRoleId);
                  if (dbRoleId === null || !isRoleAvailable) {
                    return ["__**Not Set**__", false];
                  } else {
                    return [`<@&${dbRoleId}>`, true];
                  }
                };

                // Handle Each Channel
                data[0].channel_ids.forEach(async (c) => {
                  // If no role or channel return
                  if ((await checkRole(data[0].role_id)[1]) === false || (await checkChannel(c.id)[1]) === false) {
                    const errResponse = {
                      type: "roleOrChannelMissingInDisc",
                      role: `${data[0].role_id}`,
                      channel: `${c.id}`,
                      message: "Discord no longer has channel or role available, set or create.",
                    };

                    console.log("Error finding valid channel: ", errResponse);

                    return errResponse;
                  }

                  // Check Bots Permissions
                  const bot = guild.members.cache.get("1215774457394626640");
                  if (!bot.permissionsIn(c.id).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])) {
                    throw {
                      type: "botPermissionsInChannel",
                      channel: `${c.id}`,
                      message: "Bot missing permissions Send and View in discord",
                    };
                  }

                  // Checking if Live Role, else continue
                  const liveRole = guild.roles.cache.find((r) => r.name === "Streaming");
                  const liveRoleDBCheck = guild.roles.cache.has(data[0].streamislive_id);

                  if (liveRole !== undefined || liveRoleDBCheck) {
                    if (bot.permissions.has([PermissionFlagsBits.ManageRoles])) {
                      if (liveRole.id && bot.roles.highest.comparePositionTo(liveRole.id) >= 1) {
                        await bot.roles.add(liveRole.id);
                      } else if (liveRoleDBCheck && bot.roles.highest.comparePositionTo(data[0].streamislive_id) >= 1) {
                        await bot.roles.add(data[0].streamislive_id);
                      }
                    }
                  }

                  // Send Message & Ping Role
                  const channel = guild.channels.cache.get(c.id);
                  const onlineMessage = new EmbedBuilder()
                    .setTitle(`${channelUsername} is now Live!`)
                    .addFields(
                      { name: "✧ Title:", value: `[${streamResponse.title}](https://twitch.tv/${channelSlug})` },
                      { name: " ", value: "\n\n" },
                      { name: "✧ Currently Playing:", value: `${streamResponse.category}`, inline: true },
                      { name: "✧ Started:", value: `<t:${startTime}:R>`, inline: true },
                    )
                    .setImage(`${streamResponse.thumbnail}`)
                    .setThumbnail(`${streamResponse.profile}`)
                    .setColor("#fe2a2a")
                    .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/lYCeMCo.jpeg" })
                    .setTimestamp();

                  const onlineButton = new ButtonBuilder()
                    .setLabel("Watch Live Now")
                    .setURL(`https://twitch.tv/${channelSlug}`)
                    .setEmoji("🔴")
                    .setStyle(ButtonStyle.Link);

                  const row = new ActionRowBuilder().addComponents([onlineButton]);
                  const msg = await channel.send({
                    content: `**${
                      c.should_alert ? `<@&${data[0].role_id}> ` : " "
                    }${channelUsername} went live on Twitch** <a:FlightCheer:1384756954848821330>`,
                    embeds: [onlineMessage],
                    components: [row],
                  });

                  msgIds.push({
                    channel_id: c.id,
                    message: msg,
                  });
                });
              } catch (error) {
                console.log({ guild_id: guild.id || "N/A", online_error: error });
              }
            });

            clearInterval(checkingForStream);
          }
        }, 5000);

        // Not Found, send regular live update
        const checkingStreamTimeout = setTimeout(() => {
          console.log("Stream not found in time...");

          clearInterval(checkingForStream);
        }, 60000);
      } catch (error) {
        console.log({ online_error: error, reason: error?.reason ?? "N/A" });
      }
    });

    console.log(await streamonline.getCliTestCommand());

    // Twitch Stream is Offline
    botMiddleware.onStreamOffline(channelId, async (e) => {
      console.log(`${channelUsername} went offline...`);

      try {
        const endTime = Math.floor(Date.now() / 1000);
        let { data: initialData, error: initialError } = await supabase
          .from("streams")
          .select()
          .eq("streamer", channelSlug)
          .single();

        if (initialError) {
          console.log("Error fetching initial data:", initialError);
        }

        console.log("Initial stream data:", initialData);

        // Set activity to null
        client.user.setActivity();

        let response;
        const vodHandler = async (vodData, status) => {
          clearTimeout(checkingForVodTimeout);

          // Stream is Offline : Data Object
          let videoInfo = {
            id: vodData?.id || channelId,
            streamId: vodData?.streamId || getRandomStreamId(),
            title: vodData?.title || "No VOD found, but stream is Offline.",
            url: vodData?.url || `https://twitch.tv/${channelSlug}`,
            duration: vodData?.durationInSeconds || "N/A",
            thumbnail: vodData?.thumbnail || "https://static-cdn.jtvnw.net/ttv-static/404_preview-1920x1080.jpg",
            profile: vodData?.profile || "https://i.imgur.com/vyP6iPP.jpeg",
          };

          // Update Streams
          let { error: updateError } = await supabase
            .from("streams")
            .update({ status: "offline", stream_id: videoInfo.streamId })
            .eq("streamer", channelSlug)
            .select();

          if (updateError) console.log(updateError);

          client.guilds.cache.forEach(async (guild) => {
            try {
              let { data, error } = await supabase.from("xqc_bot").select().eq("guild_id", guild.id).not("role_id", "is", null);

              if (error) {
                throw { type: "database", code: error.code, message: error.message, details: error.details, hint: error.hint };
              }

              if (data.length === 0 || data[0].channel_ids.length === 0) {
                console.log("Guild Missing Channel or Role: " + guild?.id || "N/A");
                return;
              }

              // Check Role & Channel if Valid
              const checkChannel = async (dbChannelId) => {
                const isChannelAvailable = guild.channels.cache.has(dbChannelId);
                if (dbChannelId === null || !isChannelAvailable) {
                  return ["__**Not Set**__", false];
                } else {
                  return [`<#${dbChannelId}>`, true];
                }
              };

              const checkRole = async (dbRoleId) => {
                const isRoleAvailable = guild.roles.cache.has(dbRoleId);
                if (dbRoleId === null || !isRoleAvailable) {
                  return ["__**Not Set**__", false];
                } else {
                  return [`<@&${dbRoleId}>`, true];
                }
              };

              // Handle All Channels
              data[0].channel_ids.forEach(async (c) => {
                if ((await checkRole(data[0].role_id)[1]) === false || (await checkChannel(c.id)[1]) === false) {
                  throw {
                    type: "roleOrChannelMissingInDisc",
                    role: `${data[0].role_id}`,
                    channel: `${c.id}`,
                    message: "Discord no longer has channel or role available, set or create.",
                  };
                }

                // Check if bot has permissions to send in channel
                const bot = guild.members.cache.get("1215774457394626640");
                if (!bot.permissionsIn(c.id).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])) {
                  throw {
                    type: "botPermissionsInChannel",
                    channel: `${c.id}`,
                    message: "Bot missing permissions Send and View in discord",
                  };
                }

                // Checking if Live Role, else continue
                const liveRole = guild.roles.cache.find((r) => r.name === "Streaming");
                const liveRoleDBCheck = guild.roles.cache.has(data[0].streamislive_id);

                if (liveRole !== undefined || liveRoleDBCheck) {
                  if (bot.permissions.has([PermissionFlagsBits.ManageRoles])) {
                    if (liveRole.id && bot.roles.highest.comparePositionTo(liveRole.id) >= 1) {
                      await bot.roles.remove(liveRole.id);
                    } else if (liveRoleDBCheck && bot.roles.highest.comparePositionTo(data[0].streamislive_id) >= 1) {
                      await bot.roles.remove(data[0].streamislive_id);
                    }
                  }
                }

                // Send Message and Ping Role
                const channel = guild.channels.cache.get(c.id);

                const offlineMessage = new EmbedBuilder()
                  .setTitle(`${channelUsername} is now Offline`)
                  .addFields(
                    { name: "✧ VOD Title:", value: `[${videoInfo.title}](${videoInfo.url})` },
                    { name: " ", value: "\n\n" },
                    { name: "✧ Stream Length:", value: `${videoInfo.duration}`, inline: true },
                    {
                      name: "✧ Stream Ended:",
                      value: `<t:${endTime}:R>`,
                      inline: true,
                    },
                  )
                  .setImage(`${videoInfo.thumbnail}`)
                  .setThumbnail(`${videoInfo.profile}`)
                  .setColor("#acb3c1")
                  .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/lYCeMCo.jpeg" })
                  .setTimestamp();

                const offlineButton = new ButtonBuilder()
                  .setLabel("Watch Past VOD")
                  .setURL(`${videoInfo.url}`)
                  .setEmoji("📺")
                  .setStyle(ButtonStyle.Link);

                // Light Offline Embed [No Vod]
                const offlineMessageLight = new EmbedBuilder()
                  .setTitle(`${channelUsername} is now Offline`)
                  .addFields(
                    { name: "✧ VOD Title:", value: `[${videoInfo.title}](${videoInfo.url})` },
                    { name: " ", value: "\n\n" },
                    {
                      name: "✧ Stream Ended:",
                      value: `<t:${endTime}:R>`,
                      inline: true,
                    },
                  )
                  .setImage(`${videoInfo.thumbnail}`)
                  .setThumbnail(`${videoInfo.profile}`)
                  .setColor("#acb3c1")
                  .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/lYCeMCo.jpeg" })
                  .setTimestamp();

                // Light Offline Button [No Vod]
                const offlineButtonLight = new ButtonBuilder()
                  .setLabel("No Vod: Visit Channel")
                  .setURL(`${videoInfo.url}`)
                  .setEmoji("📺")
                  .setStyle(ButtonStyle.Link);

                const row = new ActionRowBuilder().addComponents([offlineButton]);
                const rowLight = new ActionRowBuilder().addComponents([offlineButtonLight]);

                // Send Offline Message
                console.log(msgIds);
                const msg = msgIds.filter((m) => m.channel_id === c.id)[0]; // Get the first matching message

                let seconds;
                if (msg && msg.message) {
                  const dateNow = Math.floor(new Date().getTime() / 1000);
                  seconds = Math.floor(dateNow - new Date(msg.message.createdTimestamp) / 1000);
                }

                if (seconds > 90 || !msg || !msg.message) {
                  if (status) {
                    if (!msg || !msg.message) {
                      await channel.send({
                        content: `**${channelUsername} is now offline** <a:heSleep:1384759674133418075>`,
                        embeds: [offlineMessage],
                        components: [row],
                      });
                    } else {
                      await msg.message.edit({
                        content: `**${channelUsername} is now offline** <a:heSleep:1384759674133418075>`,
                        embeds: [offlineMessage],
                        components: [row],
                      });

                      // Remove msg from array after sending msg
                      msgIds = msgIds.filter((m) => m.channel_id !== c.id);
                    }
                  } else {
                    if (!msg || !msg.message) {
                      await channel.send({
                        content: `**${channelUsername} is now offline** <a:heSleep:1384759674133418075>`,
                        embeds: [offlineMessageLight],
                        components: [rowLight],
                      });
                    } else {
                      await msg.message.edit({
                        content: `**${channelUsername} is now offline** <a:heSleep:1384759674133418075>`,
                        embeds: [offlineMessageLight],
                        components: [rowLight],
                      });

                      // Remove msg from array after sending msg
                      msgIds = msgIds.filter((m) => m.channel_id !== c.id);
                    }
                  }
                }
              });
            } catch (error) {
              console.log({ Guild_ID: guild.id || "N/A", Offline_Error: error });
            }
          });
        };

        const checkingForVodInterval = setInterval(async () => {
          console.log("Checking for VOD...");

          const broadcaster = await e.getBroadcaster();

          // Get All Videos for Channel
          await apiClient.videos
            .getVideosByUser(channelId, {
              period: "day",
              orderBy: "time",
            })
            .then((videos) => {
              videos.data.forEach((video) => {
                if (video.streamId === initialData.stream_id) {
                  console.log("Found video: ", video.streamId);

                  response = {
                    id: broadcaster?.id,
                    streamId: video?.streamId,
                    title: video?.title,
                    url: video?.url,
                    durationInSeconds: new Date((video?.durationInSeconds ?? 0) * 1000).toISOString().slice(11, 19),
                    thumbnail: video?.getThumbnailUrl(1920, 1080),
                    profile: broadcaster?.profilePictureUrl || "https://i.imgur.com/vyP6iPP.jpeg",
                  };

                  vodHandler(response, true);
                  clearInterval(checkingForVodInterval);
                }
              });
            });
        }, 5000);

        // No video found, send regular offline update
        const checkingForVodTimeout = setTimeout(() => {
          console.log("No VOD Found...");
          vodHandler({}, false);
          clearInterval(checkingForVodInterval);
        }, 50000);
      } catch (error) {
        console.log({ Offline_Error: error, reason: error?.reason ?? "N/A" });
      }
    });

    client.on("ready", async () => {
      console.log(`Logged in as ${client.user.id}`);
    });

    client.login(process.env.XQC_BOT_TOKEN);
  } catch (error) {
    console.log("Error in live function:", error);
  }
};
