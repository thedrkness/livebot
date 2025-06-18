import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.DB_URL, process.env.DB_KEY);

export default {
  /**
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */

  run: async ({ interaction }) => {
    try {
      const guildId = interaction.options.get("guild_id").value;
      const guild = interaction.client.guilds.cache.get(guildId);
      await interaction.deferReply({ ephemeral: true });

      // Check if Guild is Available
      if (!guild) {
        interaction.editReply({ content: "Error: Guild is not in available guilds" });
        return;
      }

      // Check if Bot is in Guild

      if (!guild.members.me) {
        interaction.editReply({ content: "Error: Bot not in guild provided" });
        return;
      }

      // Connect to Database
      // Leave Discord, remove from database

      await guild
        .leave()
        .then(async (response) => {
          let { error } = await supabase.from("xqc_bot").delete().eq("guild_id", guild.id);

          if (error) {
            throw { type: "databaseLeave", message: error.message };
          }

          await interaction.editReply({ content: "Success: Guild deleted and removed from database!" });
        })
        .catch((error) => {
          console.log(error);
        });
    } catch (error) {
      console.log({ Location: "Developer Server", Error: error });
    }
  },
  data: new SlashCommandBuilder()
    .setName("leaveserver")
    .setDescription("Leave the server with given guild ID")
    .addStringOption((option) => option.setName("guild_id").setDescription("Enter the guild id of the server to leave")),
  options: {
    devOnly: true,
  },
};
