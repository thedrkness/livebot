import {
  PermissionsBitField,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

export default {
  /**
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */

  run: async ({ interaction }) => {
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

      // DB Connection
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

      // Guild is in database, continue ...

      // All Permissions for Role to check
      const permissionsForRole = [
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
      ];

      let roleCheck;
      let channelCheck;
      let currentMembersOnRole;
      let channelAllPerms;
      let roleAllPerms;

      // Ping Role Perms Check
      if (data[0].role_id !== null && (await checkRole(data[0].role_id))[1]) {
        roleCheck = interaction.guild.roles.cache.get(data[0].role_id).permissions.has(permissionsForRole);
        currentMembersOnRole = `${interaction.guild.roles.cache.get(data[0].role_id).members.size}`;
        if (roleCheck) {
          roleAllPerms = "```✅ Have all Permissions```";
        } else {
          roleAllPerms = "```❌ Missing Permissions```";
        }
      } else {
        roleCheck = null;
        roleAllPerms = "**__No Role Set__**\nUse [/setup], [/create role], [/set role]";
        currentMembersOnRole = "**__N/A (No Role Set)__**\nUse [/setup], [/create role], [/set role]";
      }

      // Channel Perms Check
      if (data[0].channel_id !== null && (await checkChannel(data[0].channel_id))[1]) {
        const permissionsForChannel = interaction.guild.channels.cache
          .get(data[0].channel_id)
          .permissionsFor(interaction.guild.id);
        channelCheck =
          permissionsForChannel.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]) &&
          !permissionsForChannel.has(PermissionsBitField.Flags.SendMessages);
        if (channelCheck) {
          channelAllPerms = "```✅ Have all Permissions```";
        } else {
          channelAllPerms = "```❌ Missing Permissions```";
        }
      } else {
        channelCheck = null;
        channelAllPerms = "**__No Channel Set__**\nUse [/setup], [/create channel], [/set channel]";
      }

      // React for Role Channel
      let reactForRoleChannel;
      if (data[0].reaction_channel !== null) {
        await checkChannel(data[0].reaction_channel).then((response) => {
          if (response[1] === false) {
            reactForRoleChannel = "**__No React for Role Channel Set__**\nUse [/reactionrole setup]";
          } else {
            reactForRoleChannel = `<#${data[0].reaction_channel}>`;
          }
        });
      } else {
        reactForRoleChannel = "**__No React for Role Channel Set__**\nUse [/reactionrole setup]";
      }

      // Message Updates Channel
      let messageUpdateChannel;
      if (data[0].messages_channel_id !== null) {
        await checkChannel(data[0].messages_channel_id).then((response) => {
          if (response[1] === false) {
            messageUpdateChannel = "**__No React for Message Updates Set__**\nUse [/messageupdates create]";
          } else {
            messageUpdateChannel = `<#${data[0].messages_channel_id}>`;
          }
        });
      } else {
        messageUpdateChannel = "**__No React for Message Updates Set__**\nUse [/messageupdates create]";
      }

      const infoEmbed = new EmbedBuilder()
        .setTitle("Server Information | xQc Live Bot")
        .setDescription("All the information about this live bot.")
        .setColor(0x3940ff)
        .addFields(
          { name: " ", value: "\u200B" },
          { name: "✧ Live Ping Role:", value: (await checkRole(data[0].role_id))[0], inline: true },
          { name: "✧ Ping Role Permissions?:", value: roleAllPerms, inline: true },
          { name: " ", value: "\u200B" },
          { name: "✧ Live Updates Channel:", value: (await checkChannel(data[0].channel_id))[0], inline: true },
          { name: "✧ Channel Permissions?:", value: channelAllPerms, inline: true },
          { name: " ", value: "\u200B" },
          { name: "✧ Reaction for Role Channel:", value: reactForRoleChannel, inline: true },
          { name: "✧ Message Update Channel:", value: messageUpdateChannel, inline: true },
          { name: " ", value: "\u200B" },
          { name: "✧ Guild Id:", value: data[0].guild_id || "N/A", inline: true },
          { name: "✧ Members in Role:", value: currentMembersOnRole, inline: true },
          { name: " ", value: "\u200B" },
          { name: "✧ Support Discord:", value: `[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`, inline: true },
          { name: " ", value: "\u200B" },
          { name: " ", value: "Missing Permissions? Use /permissions to see required permissions." },
        )
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      await interaction.editReply({
        embeds: [infoEmbed],
      });
    } catch (error) {
      console.log({ Guild_ID: interaction.guild.id, Create_Error: error });
      const errorHandlerEmbed = new EmbedBuilder()
        .setTitle(`[Info Command Error] Join the discord for support with this error`)
        .setDescription(`[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`)
        .setColor(0xff0000)
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      if (error.type === "Database") {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(`[Info Command Error] ${error.type} Error`)
              .setDescription(
                `${error.customMessage}\n\nStill need help? [Join Support Discord ↗](https://discord.gg/arMuUmKv69)`,
              )
              .setColor(0xff0000)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
        return;
      }
      await interaction.followUp({
        embeds: [errorHandlerEmbed],
        ephemeral: true,
      });

      return;
    }
  },
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Current channels and roles set for this discord along with other information about this bot.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
