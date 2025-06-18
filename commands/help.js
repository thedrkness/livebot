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
      // Initial response deferred for later
      await interaction.deferReply({ ephemeral: true });

      // Permissions recommended
      const checkEmbed = new EmbedBuilder()
        .setTitle("Help | xQc Live Bot")
        .setDescription("All the commands and help you could need in one place.")
        .setColor(0x3940ff)
        .addFields(
          { name: " ", value: "\n\n" },
          {
            name: "/setup",
            value:
              "Setup the channel that the bot will post live updates in. This command also takes you through the Ping Role creation steps. The bot handles all permissions for both the channel and ping role.",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/reactionrole setup",
            value:
              'Select the channel you want the "react for role" message to be posted, where users can react to the message posted by the bot to receive the Ping Role.',
          },
          {
            name: "✧ __Example React for Role Message:__",
            value: "[Example React for Role Message ↗](https://i.imgur.com/VK2hZRy.png)",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/create [channel or role]",
            value:
              "The bot will create the Ping Role, where users will get pinged when a live update is posted, with the correct permissions with this command. This command can also create a live updates channel where the bot will post live updates when the streamer goes live.",
          },
          {
            name: "✧ __Example Live Updates Channel & Ping Role:__",
            value: "[Example Live Update & Ping Role Message ↗](https://i.imgur.com/UPK14o9.png)",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/set [channel or role]",
            value:
              "Allows you to set the Ping Role if you already have one setup with the correct permissions. Also allows you to select a live updates channel if you dont want the bot to create one.",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/messageupdates [create]",
            value:
              "The bot will create a channel where it will post any chat messages the Streamer sends in their chatroom on Twitch",
          },
          {
            name: "✧ __Example Message Update Channel Post:__",
            value: "[Example Message from Streamer ↗](https://i.imgur.com/JdkVbHQ.png)",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/info",
            value:
              "Lets you know about all the information related to this server. It will also tell you if you are missing any permissions, etc.",
          },
          { name: " ", value: "\n\n" },
          {
            name: "/permissions",
            value: "Permissions we recommend for the reaction role channel, the live updates channel, and the ping role.",
          },
          { name: " ", value: "\n\n" },
          { name: "/support", value: "Directs you to the support discord" },
          { name: " ", value: "\n\n" },
          { name: "✧ Support Discord:", value: `[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`, inline: true },
          { name: " ", value: "\n" },
        )
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      await interaction.editReply({
        embeds: [checkEmbed],
      });
    } catch (error) {
      console.log({ Guild_ID: interaction.guild.id, Create_Error: error });
      const errorHandlerEmbed = new EmbedBuilder()
        .setTitle(`[Info Command Error] Join the discord for support with this error`)
        .setDescription(`[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`)
        .setColor(0xff0000)
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      await interaction.followUp({
        embeds: [errorHandlerEmbed],
        ephemeral: true,
      });

      return;
    }
  },
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("This bots command list and help options")
    .setDMPermission(false)
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
