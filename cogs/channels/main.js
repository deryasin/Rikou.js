const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const channelsFilePath = path.join(__dirname, './files/channels.json');
const defaultCategoryId = '1061370141931212882'; // Your category ID

const ensureChannelsFile = () => {
    if (!fs.existsSync(channelsFilePath)) {
        fs.writeFileSync(channelsFilePath, JSON.stringify({ channels: [] }, null, 4));
    }
};

const loadChannels = () => {
    ensureChannelsFile();
    const data = fs.readFileSync(channelsFilePath, 'utf-8');
    return JSON.parse(data).channels;
};

const saveChannels = (channels) => {
    fs.writeFileSync(channelsFilePath, JSON.stringify({ channels }, null, 4));
};

const createdChannels = new Set(loadChannels());

module.exports = {
    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('channel')
                .setDescription('Manage voice channels')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a persistent voice channel')
                        .addStringOption(option =>
                            option
                                .setName('name')
                                .setDescription('The name of the voice channel')
                                .setRequired(true)
                        )
                ),
            async execute(interaction) {
                if (!interaction.guild) {
                    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
                }

                const channelName = interaction.options.getString('name');

                try {
                    const voiceChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: 2, // Voice channel type
                        parent: defaultCategoryId,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone role ID
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.Connect,
                                    PermissionsBitField.Flags.Speak,
                                ],
                            },
                        ],
                    });

                    // Mark channel as persistent
                    createdChannels.add(voiceChannel.id);
                    saveChannels([...createdChannels]);

                    console.log(`Persistent voice channel **${channelName}** created with ID: ${voiceChannel.id}`);
                    await interaction.reply({ content: `Voice channel **${channelName}** created successfully!`, ephemeral: true });
                } catch (error) {
                    console.error('Error creating voice channel:', error);
                    await interaction.reply({ content: 'Failed to create voice channel.', ephemeral: true });
                }
            }
        }
    ],

    setup(client) {
        client.on('voiceStateUpdate', async (oldState, newState) => {
            try {
                // User joined a channel
                if (newState.channel && createdChannels.has(newState.channel.id)) {
                    const originalChannel = newState.channel;
                    const channelName = originalChannel.name;

                    // Find existing channels and extract their numbers
                    const duplicateChannels = originalChannel.guild.channels.cache.filter(
                        (ch) => ch.name.startsWith(`${channelName} #`) &&
                            ch.parentId === defaultCategoryId
                    );

                    // Find the highest number currently in use
                    let highestNumber = 0;
                    duplicateChannels.forEach(channel => {
                        const match = channel.name.match(/\#(\d+)$/);
                        if (match) {
                            const num = parseInt(match[1]);
                            highestNumber = Math.max(highestNumber, num);
                        }
                    });

                    // Create new duplicate channel with next number
                    const duplicateChannelName = `${channelName} #${highestNumber + 1}`;

                    const duplicatedChannel = await originalChannel.guild.channels.create({
                        name: duplicateChannelName,
                        type: 2,
                        parent: defaultCategoryId,
                        permissionOverwrites: originalChannel.permissionOverwrites.cache.map(po => ({
                            id: po.id,
                            allow: po.allow.toArray(),
                            deny: po.deny.toArray(),
                        })),
                    });

                    // Move the user to the newly created duplicate channel
                    await newState.member.voice.setChannel(duplicatedChannel);
                }

                // User left a channel
                if (oldState.channel) {
                    // Check if it's a duplicate channel
                    if (oldState.channel.name.includes('#')) {
                        // Double-check channel exists and get fresh member count
                        const currentChannel = await oldState.channel.guild.channels.fetch(oldState.channel.id);
                        if (!currentChannel) {
                            console.log(`Channel no longer exists, skipping deletion`);
                            return;
                        }

                        const memberCount = currentChannel.members.size;

                        // Check if the channel is empty
                        if (memberCount === 0) {
                            try {
                                await currentChannel.delete();
                            } catch (deleteError) {
                                console.error(`Error deleting channel:`, {
                                    name: deleteError.name,
                                    message: deleteError.message,
                                    stack: deleteError.stack,
                                    channelId: currentChannel.id,
                                    channelName: currentChannel.name,
                                    guildId: currentChannel.guild.id
                                });
                            }
                        } else {
                            console.log(`Channel not empty (${memberCount} members), skipping deletion`);
                        }
                    } else {
                        console.log(`Channel is not a duplicate (no #), skipping deletion`);
                    }
                }
            } catch (error) {
                console.error('Voice State Update Error:', {
                    error: error,
                    oldState: {
                        channelId: oldState?.channel?.id,
                        channelName: oldState?.channel?.name,
                    },
                    newState: {
                        channelId: newState?.channel?.id,
                        channelName: newState?.channel?.name,
                    }
                });
            }
        });
        console.log('Channels module loaded');
    }
};