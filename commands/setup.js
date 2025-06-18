import {
  ChannelType,
  EmbedBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

export default {
  /**
   *
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */
  run: async ({ interaction, client }) => {
    const subcommand = interaction.options.getSubcommand();
    const roleName = interaction.options.get("role");

    let missingPermissionsEmbed;

    try {
      const checkChannel = async (dbChannelId) => {
        const isChannelAvailable = interaction.guild.channels.cache.has(dbChannelId);
        if (dbChannelId === null || !isChannelAvailable) {
          return ["__**Not Set**__", false];
        } else {
          return [`<#${dbChannelId}>`, true];
        }
      };

      // Initial response deferred for later
      await interaction.deferReply({ ephemeral: true });

      // Embed for [ Missing Permissions ]
      missingPermissionsEmbed = new EmbedBuilder()
        .setTitle("[Command Error] Missing Permissions")
        .setDescription(
          "Please make sure to give the bot all the permissions it needs. Please check the server permissions to make sure I have the following permissions.",
        )
        .setColor(0xff0000)
        .addFields(
          { name: " ", value: "\u200B" },
          {
            name: "✧ Required Permissions:",
            value:
              "**→ [ View Channel(s) ]\n→ [ Manage Roles / Permissions ]\n→ [ Manage Channel(s) ]\n→ [ Add Reactions ]\n→ [ Read Message History ]\n→ [ Send Messages ]\n→ [ Mention All Roles ]**",
          },
          { name: " ", value: "\u200B" },
          { name: " ", value: "Need Help? Use /help for help with the commands or support if errors" },
        )
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      // Checking if Bot has Permissions
      const requiredPermissions = interaction.guild.members.me.permissions.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
      ]);
      if (!requiredPermissions) {
        await interaction.followUp({
          embeds: [missingPermissionsEmbed],
          ephemeral: true,
        });
        return;
      }

      let { data, error } = await supabase.from("xqc_bot").select().eq("guild_id", interaction.guildId);

      if (error) {
        throw {
          type: "Database",
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
          customMessage: "Contact the creator of the bot for help with resolving this.",
        };
      } else if (data.length === 0) {
        throw {
          type: "Database",
          customMessage: "Guild was not found in our database. Try kicking the bot and re-adding it.",
        };
      }

      // Guild in database, continue...
      // Create Channel Command
      if (subcommand === "create") {
        await interaction.guild.channels
          .create({
            name: `💭-xQc Messages`,
            type: ChannelType.GuildText,
            topic: "Channel for following xQc messages in his Twitch and Kick chat",
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
              },
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.SendMessages],
              },
              {
                id: "1215774457394626640",
                allow: [
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ManageMessages,
                  PermissionsBitField.Flags.EmbedLinks,
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.AddReactions,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.MentionEveryone,
                ],
              },
            ],
          })
          .then(async (response) => {
            // Update Database with new channel id
            let { data, error } = await supabase
              .from("xqc_bot")
              .update({ messages_channel_id: response.id })
              .eq("guild_id", interaction.guild.id)
              .select();

            if (error) {
              throw {
                type: "Database",
                code: error.code,
                details: error.details,
                hint: error.hint,
                message: error.message,
                customMessage: "Contact the creator of the bot for help with resolving this.",
              };
            } else if (data.length === 0) {
              throw {
                type: "Database",
                customMessage: "Guild was not found in our database. Try kicking the bot and re-adding it.",
              };
            }

            // Let user know channel was created [Create Embed, Send Message w/ Embed]
            const channelCreateSuccess = new EmbedBuilder()
              .setTitle(`Messages Update Channel Created & Set it | xQc Live Bot`)
              .addFields(
                {
                  name: "✧ Explanation:",
                  value:
                    "The bot will post any chat messages xQc sends in his Twitch and Kick chatroom. The @everyone role has no permissions to send messages in there, but can view it.",
                },
                { name: " ", value: "\u200B" },
                { name: "✧ Current Channel:", value: (await checkChannel(data[0].messages_channel_id))[0], inline: true },
                { name: " ", value: "\u200B" },
                { name: "Need Support?", value: "Use [/support] command to join the support discord" },
                { name: " ", value: " " },
              )
              .setColor(0x0de11b)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp();

            await interaction.editReply({
              embeds: [channelCreateSuccess],
            });
          })
          .catch((error) => {
            if (error.type === "Database") {
              throw error;
            }
            throw {
              type: "Unexpected",
              code: error.code,
              details: error.details,
              hint: error.hint,
              message: error.message,
              customMessage: "Contact the creator of the bot for help with resolving this.",
            };
          });
      }
    } catch (error) {
      console.log({ Guild_ID: interaction.guild.id, Create_Error: error });

      const errorHandlerEmbed = new EmbedBuilder()
        .setTitle(`[${error.type} Error] ${error.customMessage}`)
        .setDescription(`[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`)
        .setColor(0xff0000)
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      if (error.hint || error.customMessage) {
        await interaction.followUp({
          embeds: [errorHandlerEmbed],
          ephemeral: true,
        });
        return;
      } else if (error.code === 50013) {
        await interaction.followUp({
          embeds: [missingPermissionsEmbed],
          ephemeral: true,
        });
        return;
      } else {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(`[Unknown Error] Contact the creator of the bot for help with resolving this. Join the Support Discord`)
              .setDescription(`[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`)
              .setColor(0xff0000)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
        return;
      }
    }
  },

  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Create a channel where the bot will post when the Streamer sends chats in their chatroom [BETA]")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("The bot will create a channel where it will post any messages the Streamer sends on their Twitch"),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
