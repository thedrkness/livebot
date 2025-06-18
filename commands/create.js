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
    const channelName = interaction.options.get("channel");
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

      const checkRole = async (dbRoleId) => {
        const isRoleAvailable = interaction.guild.roles.cache.has(dbRoleId);
        if (dbRoleId === null || !isRoleAvailable) {
          return ["__**Not Set**__", false];
        } else {
          return [`<@&${dbRoleId}>`, true];
        }
      };

      // Initial response deferred for later
      await interaction.deferReply({ ephemeral: true });

      // Embed for [ Missing Permissions ]
      missingPermissionsEmbed = new EmbedBuilder()
        .setTitle("[Command Error] Missing Permissions")
        .setDescription(
          "Please make sure to give the bot all the permissions it needs. Please check the server and channel permissions to make sure I have the following permissions.",
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
      if (subcommand === "channel") {
        await interaction.guild.channels
          .create({
            name: `🔴-${channelName.value}`,
            type: ChannelType.GuildText,
            topic: "Channel for following xQc live updates",
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
            console.log(response);
            // Update Database with new channel id
            let { data, error } = await supabase
              .from("xqc_bot")
              .update({ channel_id: response.id })
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
              .setTitle(`Channel Created & Set it as Live Updates Channel | xQc Live Bot`)
              .addFields(
                {
                  name: "✧ Explanation:",
                  value:
                    "The bot will post all live updates to this channel. The @everyone role has no permissions to send messages in there, but can view it.",
                },
                { name: " ", value: "\u200B" },
                { name: "✧ Current Channel:", value: (await checkChannel(data[0].channel_id))[0], inline: true },
                { name: "✧ Current Role:", value: (await checkRole(data[0].role_id))[0], inline: true },
                { name: " ", value: "\u200B" },
                {
                  name: "Want to reset the channel & roles?",
                  value: "Use [/set channel or /set role], [/create channel or /create role]",
                },
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
            console.log(error);
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

      // Create Role Command
      if (subcommand === "role") {
        await interaction.guild.roles
          .create({
            name: roleName.value,
            mentionable: false,
            permissions: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.ChangeNickname,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.SendMessagesInThreads,
              PermissionsBitField.Flags.CreatePublicThreads,
              PermissionsBitField.Flags.CreatePrivateThreads,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.AddReactions,
              PermissionsBitField.Flags.UseExternalEmojis,
              PermissionsBitField.Flags.UseExternalStickers,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.UseApplicationCommands,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.Stream,
              PermissionsBitField.Flags.UseEmbeddedActivities,
              PermissionsBitField.Flags.UseVAD,
              PermissionsBitField.Flags.RequestToSpeak,
            ],
          })
          .then(async (response) => {
            let { data, error } = await supabase
              .from("xqc_bot")
              .update({ role_id: response.id })
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
            const roleCreateSuccess = new EmbedBuilder()
              .setTitle(`Role Created & Set it for Ping Role | xQc Live Bot`)
              .addFields(
                {
                  name: "✧ Explanation:",
                  value: "The bot will mention this role in the set xQc live updates channel when the streamer goes live.",
                },
                { name: " ", value: "\u200B" },
                { name: "✧ Current Role:", value: (await checkRole(data[0].role_id))[0], inline: true },
                { name: "✧ Current Channel:", value: (await checkChannel(data[0].channel_id))[0], inline: true },
                { name: " ", value: "\u200B" },
                {
                  name: "Want to reset the channel & roles?",
                  value: "Use [/set channel or /set role], [/create channel or /create role]",
                },
                { name: " ", value: " " },
              )
              .setColor(0x0de11b)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp();

            await interaction.editReply({
              embeds: [roleCreateSuccess],
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
    .setName("create")
    .setDescription("Create either a channel for the bot to post live updates in or a role to ping")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("role")
        .setDescription("The bot will create a role with the given name for pinging")
        .addStringOption((option) =>
          option
            .setName("role")
            .setDescription("Enter the name of the ping role for the bot to create (i.e. xQc Live Ping):")
            .setMaxLength(100)
            .setMinLength(1)
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("The bot will create a channel for posting live updates")
        .addStringOption((option) =>
          option
            .setName("channel")
            .setDescription("Enter the name of the ping role for the bot to create (i.e. xQc Live Ping):")
            .setMaxLength(100)
            .setMinLength(1)
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
