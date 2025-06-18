import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Embed } from "discord.js";

export default {
  /**
   *
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */
  run: async ({ interaction, client }) => {
    const { options } = interaction;
    const avatar = options.getAttachment("avatar");

    const embed = new EmbedBuilder().setColor("Blurple").setDescription("Logo Setting");

    await interaction.deferReply({ embeds: [embed], ephemeral: true });

    if (avatar.contentType !== "image/gif") {
      return await interaction.followUp({ content: "Please use a gif format for animated avatars" });
    }

    let error;
    await client.user.setAvatar(avatar.url).catch(async (err) => {
      error = true;
      let errorMsg = "Error : " + err.toString();
      return await interaction.followUp({ content: errorMsg });
    });

    if (error) return;
    await interaction.followUp({ content: "Uploaded Logo" });
  },
  data: new SlashCommandBuilder()
    .setName("logo")
    .setDescription("Set bots avatar (gif only)")
    .addAttachmentOption((option) => option.setName("avatar").setDescription("The avatar to animate").setRequired(true)),
  options: {
    devOnly: true,
  },
};
