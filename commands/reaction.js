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
  run: async ({ interaction, client, message, args }) => {
    const subcommand = interaction.options.getSubcommand();
    const channelName = interaction.options.get("channel");
    const roleName = interaction.options.get("role");

    try {
      let { data, error } = await supabase.from("xqc_bot").select().eq("guild_id", interaction.guild.id);

      if (error) {
        throw new Error(error);
      } else if (data.length === 0) {
        throw {
          reason: "database",
          title: "Database error getting data for this guild",
          customMessage: "Guild was not found in our database. Try kicking the bot and re-adding it.",
        };
      }

      await interaction.deferReply({ ephemeral: true });
      // Check Bot Permissions

      const bot = interaction.guild.members.me;
      const currentPermissions = bot.permissions.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.MentionEveryone,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
      ]);

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

      const checkMessage = async (dbMessageId) => {
        let isMessageAvailable = true;
        let channel = await data[0].reaction_channel;
        const channelCheck = await checkChannel(channel);

        if (channelCheck[1] === false) {
          isMessageAvailable = [dbMessageId, null];

          return;
        } else {
          await interaction.guild.channels.cache
            .get(channel)
            .messages.fetch(dbMessageId)
            .then((response) => {
              isMessageAvailable = [dbMessageId, true];
            })
            .catch((error) => {
              isMessageAvailable = ["__**Not Set**__", false];
            });
        }
        return isMessageAvailable;
      };

      // Function to check bot role(s) vs ping role
      let rolesHigherThanBot = [];
      const compareRoles = async (botRole, pingRole) => {
        bot.roles.cache.forEach((i) => {
          if (i.name !== "@everyone") {
            const comparePositions = interaction.guild.roles.comparePositions(i.id, pingRole);
            if (comparePositions >= 1) {
              rolesHigherThanBot.push(i.name);
            } else {
              return;
            }
          }
        });
      };

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

      if (!currentPermissions) {
        await interaction.followUp({
          embeds: [missingPermissionsEmbed],
          ephemeral: true,
        });
        return;
      }

      if (error) {
        throw {
          reason: "database",
          title: "Database Error",
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message,
          customMessage: "Contact the creator of the bot for help with resolving this.",
        };
      } else if (data.length === 0) {
        throw {
          reason: "database",
          title: "Database Error",
          customMessage: "Guild was not found in our database. Try kicking the bot and re-adding it.",
        };
      }
      // Guild in database, continue ...

      // Bot has all required permissions, continue ...
      if (subcommand === "setup") {
        const permissions = bot.permissionsIn(channelName.channel.id); // Current bot permissions in channel selected
        // If bot is missing any permissions in selected channel
        if (
          !permissions.has([
            "AddReactions",
            "ViewChannel",
            "SendMessages",
            "ReadMessageHistory",
            "MentionEveryone",
            "ManageMessages",
            "EmbedLinks",
          ])
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

          // Button for [ Missing Channel Permissions ]
          const missingChannelPermsBtn = new ButtonBuilder()
            .setCustomId("fix-perms")
            .setLabel("Give Bot Perms")
            .setStyle(ButtonStyle.Primary);

          const missingPermsRow = new ActionRowBuilder().addComponents(missingChannelPermsBtn);

          // Embed for [ Missing Channel Permissions ]
          const missingChannelPermissions = new EmbedBuilder()
            .setTitle(`Bot Permissions for __#${channelName.channel.name}__`)
            .setDescription(
              "Below are the permissions needed for the bot to work in the channel you want to set.\n\nClick **__[GIVE BOT PERMS]__** button to fix this. ",
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
              { name: "Need Support?", value: "If you need more help [Join Support Discord ↗](https://discord.gg/arMuUmKv69)" },
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
            if (channelName.channel.permissionsFor(interaction.guild.id).has("ViewChannel")) {
              await channelName.channel.permissionOverwrites.set([
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
                    .setTitle(`Bot Permissions for __#${channelName.channel.name}__ set!`)
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
                title: "Private Channel",
                customMessage:
                  "Cannot fix permissions without the @everyone role being able to view the channel. \n\n__Channel must not be private.__",
              };
            }
          }

          /////////////// Channel has all permissions, add to database /////////////////////////////////////
        } else {
          let { data, error } = await supabase
            .from("xqc_bot")
            .update({ reaction_channel: channelName.channel.id })
            .eq("guild_id", interaction.guild.id)
            .select();

          if (error) {
            throw new Error(error);
          } else if (data.length === 0) {
            throw {
              reason: "database",
              title: "Database error updating reaction channel",
              customMessage:
                "Guild not found in database. Contact us in the support discord for help. You can try kicking the bot and re-adding it.",
            };
          }

          // No Ping Role in server
          if (!(await checkRole(data[0].role_id))[1]) {
            throw {
              reason: "norole",
              title: "No Ping Role Set",
              customMessage:
                "There is no role setup or the role in our records is no longer available.\n\n✧ Use [/set or /create role] or go through the [/setup] process.",
            };
          }

          // Checking bot role(s) position compared to ping role
          await compareRoles(bot.id, data[0].role_id);
          // No Role bot has is higher than ping role
          if (rolesHigherThanBot.length <= 0) {
            const highestRole = bot.roles.highest;
            const currentPingRolePos = interaction.guild.roles.cache.get(data[0].role_id).position;
            await interaction.followUp({
              embeds: [
                new EmbedBuilder()
                  .setTitle("[Role Hierarchy Error] Bot role(s) are lower than Ping role")
                  .setDescription("You must drag the bots role(s) above the set ping role.")
                  .setColor(0xff9646)
                  .addFields(
                    { name: " ", value: "\u200B" },
                    {
                      name: "✧ Explanaition",
                      value: `Bot's highest role ${highestRole} **[Pos: ${highestRole.position}]** is lower than the Ping Role <@&${data[0].role_id}> which position is **[Pos: ${currentPingRolePos}]**.\n\n __Bot role needs to be higher than current ping role for the bot to assign the role to users.__`,
                    },
                    { name: " ", value: "\n\n\n" },
                    {
                      name: "✧ How to fix?",
                      value: `Drag one of the bot's roles above the ping role as demonstrated here: https://i.imgur.com/5jD4wPw.gif`,
                    },
                  )
                  .setImage("https://i.imgur.com/5jD4wPw.gif")
                  .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                  .setTimestamp(),
              ],
            });
            return;
          }

          // Added to database and Role is available, now reply to user that channel was created and tell them to make message to track...
          const reactionChannelCreated = new EmbedBuilder()
            .setTitle(`Reaction Channel Chosen as: ` + "```" + `${channelName.channel.name}` + "```" + ` | xQc Live Bot`)
            .addFields(
              {
                name: "✧ Whats next?:",
                value: "Click the button to create the message where users will be able to react for the role set below.",
              },
              { name: " ", value: "\u200B" },
              { name: "✧ Current Role:", value: (await checkRole(data[0].role_id))[0], inline: true },
              { name: "✧ React for this Role Channel:", value: (await checkChannel(data[0].reaction_channel))[0], inline: true },
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

          // Create React Message Button for [Create React Message]
          const createMessageButton = new ButtonBuilder()
            .setCustomId("create-message")
            .setLabel("Create React Message")
            .setStyle(ButtonStyle.Primary);

          // Message Reply for [Create React Message]
          const reactionCreatedReply = await interaction.followUp({
            embeds: [reactionChannelCreated],
            components: [new ActionRowBuilder().addComponents(createMessageButton)],
            ephemeral: true,
          });

          // Collection for [Create React Message]
          const collectFilter = (i) => i.user.id === interaction.user.id;
          const createReactConfirmation = await reactionCreatedReply.awaitMessageComponent({
            filter: collectFilter,
            time: 15_000,
          });

          if (createReactConfirmation.customId === "create-message") {
            if ((await checkChannel(data[0].reaction_channel))[1]) {
              const messageCheck = await checkMessage(data[0].reaction_messageid);
              const channel = interaction.guild.channels.cache.get(data[0].reaction_channel);

              let templateNewMessage = async () => {
                await channel
                  .send({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle("React for xQc Live Role")
                        .setDescription(
                          "React to the 🔴 reaction to receive the xQc Live Role where you will be pinged when xQc goes live",
                        )
                        .addFields(
                          { name: " ", value: "\u200B" },
                          { name: "✧ Add Role:", value: "React to add ping role and get pinged when xQc is live.", inline: true },
                          {
                            name: "✧ Remove Role:",
                            value: "Un-React to remove the ping role and receive no further live updates.",
                            inline: true,
                          },
                        )
                        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                        .setTimestamp(),
                    ],
                  })
                  .then(async (response) => {
                    const emoji = "🔴";
                    await response.react(emoji);

                    // Message created in channel, update database with message id
                    let { data, error } = await supabase
                      .from("xqc_bot")
                      .update({ reaction_messageid: response.id, reaction_emoji: emoji })
                      .eq("guild_id", interaction.guild.id)
                      .select();

                    if (error) {
                      await createReactConfirmation.update({
                        embeds: [
                          new EmbedBuilder()
                            .setTitle("[Error] Database Error creating react for role message | xQc Live Bot")
                            .setDescription(
                              "There was a database error creating react for role message, if there was one created, you can go ahead and delete it. Join support discord for help!",
                            )
                            .setColor(0xff0000)
                            .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                            .setTimestamp(),
                        ],
                        components: [],
                      });
                      throw {
                        reason: "Database",
                        title: "Unable to Create React Message",
                        customMessage:
                          "There was a database error when creating your react for role message. If a message was created, please delete it as it wont work. Join the support discord for help.",
                      };
                    } else if (data.length === 0) {
                      throw {
                        reason: "database",
                        title: "Database error updating reaction message & emoji",
                        customMessage:
                          "Guild not found in database. Contact us in the support discord for help. You can try kicking the bot and re-adding it.",
                      };
                    }

                    await createReactConfirmation.update({
                      embeds: [
                        new EmbedBuilder()
                          .setTitle("React for Role Message Created! | xQc Live Bot")
                          .setDescription(
                            "When a user reacts to the bots message they will receive the set ping role, to view the current set ping role and live updates channel use __**[/info]**__.",
                          )
                          .setColor(0x0de11b)
                          .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                          .setTimestamp(),
                      ],
                      components: [],
                    });
                  })
                  .catch((error) => {
                    throw {
                      reason: "messageerror",
                      title: "Unable to Create React Message",
                      customMessage:
                        "The bot was unable to create the reaction for role message in the channel selected, try again.",
                    };
                  });
              };

              // Checking Message Check response, then creating message
              if (messageCheck === undefined) {
                // No Old Message to Delete in set Channel
                // Delete old message from database by creating new message
                await templateNewMessage();
                return;
              } else if (messageCheck[0] !== null || messageCheck[0] !== undefined) {
                if (messageCheck[1] === true) {
                  await createReactConfirmation.update({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle("Delete Old React for Role message | xQc Live Bot")
                        .setDescription(
                          "You must delete the old react for role message before being able to setup a new react for role message.",
                        )
                        .setColor(0x0de11b)
                        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
                        .setTimestamp(),
                    ],
                    components: [],
                  });
                  return;
                } else if (messageCheck[1] === false) {
                  // No Old Message to Delete in set Channel
                  // Delete old message from database by creating new message
                  await templateNewMessage();
                  return;
                }
              }

              return;
            } else {
              createReactConfirmation.update({});
              throw {
                reason: "messageerror",
                title: "Unable to Create React Message",
                customMessage: "The bot was unable to create the reaction for role message in the channel selected, try again.",
              };
            }
          }
        }
      }
    } catch (error) {
      console.log({ Guild_ID: interaction.guild.id, Create_Error: error });

      const errorHandlerEmbed = new EmbedBuilder()
        .setTitle(`[Reaction Setup Error] ${error.title}`)
        .setDescription(
          `**${error.customMessage}**\n\n\nIf you need more help [Join Support Discord ↗](https://discord.gg/arMuUmKv69)`,
        )
        .setColor(0xff0000)
        .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
        .setTimestamp();

      if (
        error.reason === "private" ||
        error.reason === "norole" ||
        error.reason === "database" ||
        error.reason === "messageerror"
      ) {
        await interaction.followUp({
          embeds: [errorHandlerEmbed],
          ephemeral: true,
        });
        return;
      } else if (error.reason === "oldmessage") {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(`[React for Role Setup Error] Was not able to get the old react for role message`)
              .setDescription(
                `\n**I was not able to retrieve the old react for role message**\n\n\nIf you need more help [Join Support Discord ↗](https://discord.gg/arMuUmKv69)`,
              )
              .setColor(0xff0000)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      } else if (error.message.includes("time")) {
        await interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle(`[Reaction Setup Error] You did not click the button in the time limit`)
              .setDescription(
                `\n**You took too long to complete this request, manually add the permissions or try again with the same command.**\n\n\nIf you need more help [Join Support Discord ↗](https://discord.gg/arMuUmKv69)`,
              )
              .setColor(0xff0000)
              .setFooter({ text: "Made by Dark", iconURL: "https://i.imgur.com/pHxhkDb.png" })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
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
      }
      return;
    }
  },

  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription('Setup the "React for Role" channel and message')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Select a channel for the bot to post a react for ping role message")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription('Select the channel where you want the bot to add a "React for Role" message [NO PRIVATE CHANNEL]:')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageRoles,
    ),
};
