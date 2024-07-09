const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    commands: {
        ping: {
            execute: async (message) => {
                const sent = await message.reply('Pinging...');
                const latency = sent.createdTimestamp - message.createdTimestamp;
                const apiLatency = Math.round(message.client.ws.ping);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🏓 Pong!')
                    .addFields(
                        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                        { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
                    );

                await sent.edit({ content: null, embeds: [embed] });
            },
        },
    },

    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Check the bot\'s latency'),
            async execute(interaction) {
                await interaction.deferReply();
                const sent = await interaction.fetchReply();
                const latency = sent.createdTimestamp - interaction.createdTimestamp;
                const apiLatency = Math.round(interaction.client.ws.ping);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🏓 Pong!')
                    .addFields(
                        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
                        { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            },
        },
    ],

    setup(client) {
    },
};