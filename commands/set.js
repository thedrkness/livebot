import {
  ChannelType,
  EmbedBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonInteraction,
  Message,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

export default {
  /**
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */
  run: async ({ interaction }) => {
    const subcommand = interaction.options.getSubcommand();
    const channelName = interaction.options.getChannel("channel");
    const roleName = interaction.options.getRole("role");
    const bot = interaction.guild.members.me;

    let missingPermissionsEmbed;

    try {
      const checkChannel = async (dbChannelId) => {
        const isChannelAvailable = interaction.guild.channels.cache.has(dbChannelId);
        if (dbChannelId === null || !isChannelAvailable) {
          return "__**Not Set**__";
        } else {
          return `<#${dbChannelId}>`;
        }
      };

      const checkRole = async (dbRoleId) => {
        const isRoleAvailable = interaction.guild.roles.cache.has(dbRoleId);
        if (dbRoleId === null || !isRoleAvailable) {
          return "__**Not Set**__";
        } else {
          return `<@&${dbRoleId}>`;
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

      // Channel Select has missing permissions needed for the bot...
      if (subcommand === "channel") {
        const permissions = interaction.guild.members.me.permissionsIn(channelName.id);
        const permissionsEveryone = interaction.guild.roles.everyone.permissionsIn(channelName.id);

        if (
          !permissions.has([
            "AddReactions",
            "ViewChannel",
            "SendMessages",
            "ReadMessageHistory",
            "MentionEveryone",
            "ManageMessages",
            "EmbedLinks",
          ]) ||
          !permissionsEveryone.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]) ||
          permissionsEveryone.has([PermissionsBitField.Flags.SendMessages])
        ) {
          const permissionsList = [
            { ViewChannel: "View Channel(s)" },
            { SendMessages: "Send Messages/Create Posts" },
            { AddReactions: "Add reactions to messages" },
            { ReadMessageHistory: "Read Message History" },
            { MentionEveryone: "Mention Everyone, Here, and All Roles" },
            { ManageMessages: "Allow bot to manage channel messages" },
            { EmbedLinks: "Allow bot to send links with embedded content" },
          ];
          const everyonePermissions = [
            { ViewChannel: "View Channel(s)" },
            { SendMessages: "Send Messages/Create Posts" },
            { ReadMessageHistory: "Read Message History" },
          ];

          const checkPermissionsForBot = async (permission) => {
            let check = true;
            permissionsList.forEach((i) => {
              Object.entries(i).forEach((item) => {
                if (item[0] === permission) {
                  if (permissions.has(permission)) {
                    check = `✅ ${item[1]}`;
                  } else {
                    check = `❌ ${item[1]}`;
                  }
                }
              });
            });
            return check;
          };

          const checkPermissionsForEveryone = async (permission) => {
            let checkPerm = true;
            everyonePermissions.forEach((i) => {
              Object.entries(i).forEach((item) => {
                if (item[0] === permission) {
                  if (permissionsEveryone.has(permission)) {
                    checkPerm = `✅ ${item[1]}`;
                  } else {
                    checkPerm = `❌ ${item[1]}`;
                  }
                }
              });
            });
            return checkPerm;
          };

          // Button for [ Missing Channel Permissions ]
          const missingChannelPermsBtn = new ButtonBuilder()
            .setCustomId("fix-perms")
            .setLabel("Give Bot & @everyone Required Permissions")
            .setStyle(ButtonStyle.Primary);

          const missingPermsRow = new ActionRowBuilder().addComponents(missingChannelPermsBtn);

          // Embed for [ Missing Channel Permissions ]
          const missingChannelPermissions = new EmbedBuilder()
            .setTitle(`Bot & @everyone Permissions for __#${channelName.name}__`)
            .setDescription(
              "Below are the permissions needed for the bot to work in the channel you want to set and the permissions we require for @everyone in the channel.\n\nClick **__[Give Bot & @everyone Required Permissions]__** button to fix this. ",
            )
            .setColor(0xff5e00)
            .addFields(
              { name: " ", value: "\n\n" },
              { name: "__BOT PERMISSIONS:__", value: "\n" },
              { name: " ", value: "**✧ Required for Sending Live Updates [All must be ✅]:**" },
              { name: " ", value: await checkPermissionsForBot("ViewChannel") },
              { name: " ", value: await checkPermissionsForBot("SendMessages") },
              { name: " ", value: await checkPermissionsForBot("ManageMessages") },
              { name: " ", value: await checkPermissionsForBot("EmbedLinks") },
              { name: " ", value: await checkPermissionsForBot("ReadMessageHistory") },
              { name: " ", value: "\n\n" },
              { name: " ", value: "**✧ Required for Sending Pings [All must be ✅]:**" },
              { name: " ", value: await checkPermissionsForBot("MentionEveryone") },
              { name: " ", value: await checkPermissionsForBot("SendMessages") },
              { name: " ", value: "\u200B" },
              { name: "__@everyone PERMISSIONS:__", value: "\n" },
              { name: " ", value: "**✧ Required for Receiving Live Updates:**" },
              {
                name: " ",
                value: `${await checkPermissionsForEveryone("ViewChannel")} **[Must be manually set by you. Should be ✅]**`,
              },
              { name: " ", value: `${await checkPermissionsForEveryone("SendMessages")} **[Should be ❌]**` },
              { name: " ", value: `${await checkPermissionsForEveryone("ReadMessageHistory")} : **[Should be ✅]**` },
            )
            .setFooter({
              text: "Made by Dark \n[Button to fix permissions expires in 3 minutes!]",
              iconURL: "https://i.imgur.com/pHxhkDb.png",
            })
            .setTimestamp();

          const missingPermsReply = await interaction.followUp({
            embeds: [missingChannelPermissions],
            components: [missingPermsRow],
            ephemeral: true,
          });

          // Collector for Button response
          const collectorFilter = (i) => i.user.id === interaction.user.id;
          const confirmation = await missingPermsReply.awaitMessageComponent({ filter: collectorFilter, time: 180_000 });

          if (confirmation.customId === "fix-perms") {
            if (channelName.permissionsFor(interaction.guild.id).has("ViewChannel")) {
              await channelName.permissionOverwrites.set([
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
              ]);

              // Permissions for bot in channel granted
              await confirmation.update({
                embeds: [
                  new EmbedBuilder()
                    .setTitle(`Bot & @everyone Permissions for __#${channelName.name}__ set!`)
                    .setDescription("Re-run the __[/reactionrole setup]__ command with this channel selected!")
                    .setColor(0x0de11b)
                    .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                    .setTimestamp(),
                ],
                components: [],
              });
              return;
            } else {
              confirmation.update({});

              // Private Channel, @everyone does not have view channel permission
              throw {
                reason: "private",
                type: "Private Channel",
                customMessage:
                  "Cannot fix permissions without the @everyone role being able to view the channel. You must manually add the [View Channel] to @everyone to un-private the channel. \n\n__Channel must not be private.__",
              };
            }
          }
        }
      }

      // Channel Selected has all permissions needed...
      // Bot has all permissions... continue
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

      // Guild in database, continue ...

      // Set Channel Command
      if (subcommand === "channel") {
        // Channel already set to requested change

        let { data, error } = await supabase
          .from("xqc_bot")
          .update({ channel_id: channelName.id })
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

        // Let user know channel was set [Create Embed, Send Message w/ Embed]
        const channelSetSuccess = new EmbedBuilder()
          .setTitle(`Channel Set | xQc Live Bot`)
          .addFields(
            { name: "✧ Explanation:", value: "The bot will post all live updates to that channel." },
            { name: " ", value: "\u200B" },
            { name: "✧ Current Channel:", value: await checkChannel(data[0].channel_id), inline: true },
            { name: "✧ Current Role:", value: await checkRole(data[0].role_id), inline: true },
            { name: " ", value: "\u200B" },
            {
              name: "Want to reset the channel & roles?",
              value: "Use [/set channel or /set role], [/create channel or /create role], [/setup]",
            },
            { name: " ", value: " " },
          )
          .setColor(0x0de11b)
          .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
          .setTimestamp();

        await interaction.editReply({
          embeds: [channelSetSuccess],
        });
      }

      // Set Role Command
      if (subcommand === "role") {
        let { data, error } = await supabase
          .from("xqc_bot")
          .update({ role_id: roleName.id })
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

        // If no channel id set in database, let the user know

        // Let user know channel was set [Create Embed, Send Message w/ Embed]
        const roleSetSuccess = new EmbedBuilder()
          .setTitle(`Role Set | xQc Live Bot`)
          .addFields(
            { name: "✧ Explanation:", value: "The bot will ping this role when a live stream update gets posted." },
            { name: " ", value: "\u200B" },
            { name: "✧ Current Role:", value: await checkRole(data[0].role_id), inline: true },
            { name: "✧ Current Channel:", value: await checkChannel(data[0].channel_id), inline: true },
            { name: " ", value: "\u200B" },
            {
              name: "Want to reset the channel & roles?",
              value: "Use [/set channel or /set role], [/create channel or /create role], [/setup]",
            },
            { name: " ", value: " " },
          )
          .setColor(0x0de11b)
          .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
          .setTimestamp();

        await interaction.editReply({
          embeds: [roleSetSuccess],
        });
      }
    } catch (error) {
      console.log({ Guild_ID: interaction.guild.id, Set_Error: error });

      const errorHandlerEmbed = new EmbedBuilder()
        .setTitle(`[${error.type} Error] ${error.customMessage}`)
        .setDescription(`[Join Support Discord ↗](https://discord.gg/arMuUmKv69)`)
        .setColor(0xff0000)
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      if (error.hint || error.customMessage) {
        if (error.customMessage === "channelPerms") {
          const permissions = interaction.guild.members.me.permissionsIn(channelName.id);

          const permissionsList = [
            { ViewChannel: "View Channel(s)" },
            { SendMessages: "Send Messages/Create Posts" },
            { AddReactions: "Add reactions to messages" },
            { ReadMessageHistory: "Read Message History" },
            { MentionEveryone: "Mention Everyone, Here, and All Roles" },
            { ManageMessages: "Allow bot to manage channel messages" },
            { EmbedLinks: "Allow bot to send links with embedded content" },
          ];

          const checkPermissionsForBot = async (permission) => {
            let check = true;
            permissionsList.forEach((i) => {
              Object.entries(i).forEach((item) => {
                if (item[0] === permission) {
                  if (permissions.has(permission)) {
                    check = `✅ ${item[1]}`;
                  } else {
                    check = `❌ ${item[1]}`;
                  }
                }
              });
            });
            return check;
          };

          // Embed for [ Missing Channel Permissions ]
          missingPermissionsEmbed = new EmbedBuilder()
            .setTitle(`Bot Permissions for __#${channelName.name}__`)
            .setDescription(
              "Below are the permissions needed for the bot to work in the channel you want to set.\n\nIf necessary you can adjust the bots permissions in the server and channel settings.",
            )
            .setColor(0xff5e00)
            .addFields(
              { name: " ", value: "\n" },
              { name: " ", value: "**✧ Required for Sending Live Updates:**" },
              { name: " ", value: await checkPermissionsForBot("ViewChannel") },
              { name: " ", value: await checkPermissionsForBot("SendMessages") },
              { name: " ", value: await checkPermissionsForBot("ManageMessages") },
              { name: " ", value: await checkPermissionsForBot("EmbedLinks") },
              { name: " ", value: await checkPermissionsForBot("ReadMessageHistory") },
              { name: " ", value: "\n\n" },
              { name: " ", value: "**✧ Required for Sending Pings:**" },
              { name: " ", value: await checkPermissionsForBot("MentionEveryone") },
              { name: " ", value: await checkPermissionsForBot("SendMessages") },
              { name: " ", value: "\u200B" },
              { name: " ", value: "Need Help? Use /info for info on server or join the discord by using /support" },
            )
            .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
            .setTimestamp();

          await interaction.followUp({
            embeds: [missingPermissionsEmbed],
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            embeds: [errorHandlerEmbed],
            ephemeral: true,
          });
        }
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
    .setName("set")
    .setDescription("Change role for users to get pinged updates")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("role")
        .setDescription("The bot will create a role with the given name for pinging")
        .addRoleOption((role) =>
          role
            .setName("role")
            .setDescription("Select or search for a role for the live bot to ping users when streamer is live")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Set channel for bot to post live updates for the streamer")
        .addChannelOption((channel) =>
          channel
            .setName("channel")
            .setDescription("Select role for the live bot to ping users when streamer is live")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
