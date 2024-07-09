const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    commands: {
        ping: {
            execute: async (message) => {
                await message.reply('Pong!');
            },
        },

    },

    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Replies with Pong!'),
            async execute(interaction) {
                await interaction.reply('Pong!');
            },
        },

    ],

    setup(client) {

    },
};