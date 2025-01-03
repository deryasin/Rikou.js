const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ActivityType } = require('discord.js');


async function invokeSlashCommand(client, commandName, options, channel) {
    const command = client.application.commands.cache.find(cmd => cmd.name === commandName);
    if (!command) {
        console.error(`Command ${commandName} not found.`);
        return;
    }

    try {
        const fakeInteraction = {
            commandName,
            options: {
                getString: (name) => options[name],
            },
            guildId: channel.guild.id,
            channel,
            reply: async (message) => {
                console.log("Bot response:", message);
                await channel.send(message.content || message);
            },
            member: {
                voice: {
                    channel: channel.guild.me.voice.channel,
                },
            },
            user: client.user,
            client,
        };

        await client.slashCommands.find(cmd => cmd.data.name === commandName).execute(fakeInteraction);
    } catch (error) {
        console.error(`Error invoking command ${commandName}:`, error);
    }
}
module.exports = {
    setup(client) {
        // Initialize discord-player
        const player = new Player(client);
        client.player = player;

        // Register the YoutubeiExtractor
        player.extractors.register(YoutubeiExtractor);

        console.log('Music module loaded with discord-player and YoutubeiExtractor.');

        // Set up player event to update activity
        player.events.on('playerStart', (queue, track) => {
            client.user.setActivity({
                name: track.title,
                type: ActivityType.Listening,
            });

            const coverImage = track.thumbnail || 'https://archive.org/download/placeholder-image/placeholder-image.jpg'; // Default cover if not provided
            const lyricsButton = new ButtonBuilder()
                .setLabel('View Lyrics')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://genius.com/search?q=${encodeURIComponent(track.title)}`);

            const openSongButton = new ButtonBuilder()
                .setLabel('Open Song')
                .setStyle(ButtonStyle.Link)
                .setURL(track.url);

            const actionRow = new ActionRowBuilder()
                .addComponents(lyricsButton, openSongButton);

            const message = queue.metadata.channel.send({
                content: `🎶 Now playing: **${track.title}**`,
                files: [coverImage],
                components: [actionRow],
            });

            const collector = queue.metadata.channel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000,
            });
        });

        player.events.on('playerStop', () => {
            client.user.setActivity(null);
        });
    },

    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('play')
                .setDescription('Plays a song, playlist, or radio stream')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('The YouTube URL, playlist URL, search query, or radio stream URL')
                        .setRequired(true)),
            async execute(interaction) {
                if (!interaction.client.player) {
                    return interaction.reply('Music player is not initialized. Please try again later.');
                }

                const query = interaction.options.getString('query');
                const voiceChannel = interaction.member.voice.channel;

                if (!voiceChannel) {
                    return interaction.reply('You need to be in a voice channel to play music.');
                }

                // Check if a queue already exists
                let queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue) {
                    // Create a new queue if it doesn't exist
                    queue = interaction.client.player.nodes.create(interaction.guild, {
                        metadata: {
                            channel: interaction.channel
                        }
                    });

                    try {
                        // Connect to the voice channel if not already connected
                        if (!queue.connection) await queue.connect(voiceChannel);
                    } catch {
                        queue.delete();
                        return interaction.reply('Could not join your voice channel.');
                    }
                }

                // Search for tracks or playlists
                const searchResult = await interaction.client.player.search(query, {
                    requestedBy: interaction.user
                });

                if (!searchResult || (!searchResult.tracks.length && !searchResult.playlist)) {
                    return interaction.reply('No results found.');
                }

                if (searchResult.playlist) {
                    // Add all tracks from the playlist to the queue
                    for (const track of searchResult.tracks) {
                        queue.addTrack(track);
                    }
                    if (!queue.node.isPlaying()) await queue.node.play();

                    return interaction.reply(`🎶 Added playlist **${searchResult.playlist.title}** with ${searchResult.tracks.length} tracks to the queue.`);
                }

                // Handle single track or radio stream
                const track = searchResult.tracks[0];
                queue.addTrack(track);

                if (!queue.node.isPlaying()) {
                    await queue.node.play();
                    return interaction.reply({
                        content: `🎶 Now playing: **${track.title}**`,
                    });
                } else {
                    return interaction.reply({
                        content: `🎶 Added to queue: **${track.title}**`,
                    });
                }
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName('stop')
                .setDescription('Stops the music and clears the queue'),
            async execute(interaction) {
                const queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue || !queue.node.isPlaying()) {
                    return interaction.reply('No music is currently playing.');
                }

                queue.delete();
                return interaction.reply('Music stopped and queue cleared.');
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName('skip')
                .setDescription('Skips the current song'),
            async execute(interaction) {
                const queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue || !queue.node.isPlaying()) {
                    return interaction.reply('No song is currently playing.');
                }

                queue.node.skip();
                return interaction.reply('Skipped the current song.');
            }
        },
        {
            data: new SlashCommandBuilder()
            .setName('queue')
            .setDescription('Displays the current music queue'),
        async execute(interaction) {
            const queue = interaction.client.player.nodes.get(interaction.guildId);
    
            if (!queue || (!queue.node.isPlaying() && queue.getSize() === 0)) {
                return interaction.reply('The queue is currently empty.');
            }
    
            const currentTrack = queue.currentTrack
                ? `**Now Playing:** ${queue.currentTrack.title}`
                : 'No track is currently playing.';

            const queueArray = queue.getSize() > 0 ? queue.tracks.toArray() : [];
            const pages = [];
            const itemsPerPage = 10;

            for (let i = 0; i < queueArray.length; i += itemsPerPage) {
                const pageTracks = queueArray.slice(i, i + itemsPerPage)
                    .map((track, index) => `${i + index + 1}. **${track.title}**`)
                    .join('\n');
                pages.push(pageTracks);
            }

            let currentPage = 0;

            const navigationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pages.length === 1),
                    new ButtonBuilder()
                        .setCustomId('shuffle_queue')
                        .setLabel('Shuffle')
                        .setStyle(ButtonStyle.Primary)
                );

            const message = await interaction.reply({
                content: `🎶 ${currentTrack}\n\n**Queue:**\n${typeof pages[currentPage] !== "undefined" ? pages[currentPage] : "Empty! You can add new songs with /play"}`,
                components: [navigationRow],
                fetchReply: true
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return buttonInteraction.reply({ content: 'You cannot interact with this button.', ephemeral: true });
                }

                if (buttonInteraction.customId === 'prev_page') {
                    currentPage--;
                } else if (buttonInteraction.customId === 'next_page') {
                    currentPage++;
                } else if (buttonInteraction.customId === 'shuffle_queue') {
                    const shuffledTracks = queue.tracks.toArray().sort(() => Math.random() - 0.5);
                    queue.tracks.clear();
                    for (const track of shuffledTracks) {
                        queue.addTrack(track);
                    }

                    const shuffledPages = [];
                    for (let i = 0; i < shuffledTracks.length; i += itemsPerPage) {
                        const pageTracks = shuffledTracks.slice(i, i + itemsPerPage)
                            .map((track, index) => `${i + index + 1}. **${track.title}**`)
                            .join('\n');
                        shuffledPages.push(pageTracks);
                    }
                    pages.length = 0;
                    pages.push(...shuffledPages);
                    currentPage = 0;
                }

                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === pages.length - 1),
                        new ButtonBuilder()
                            .setCustomId('shuffle_queue')
                            .setLabel('Shuffle')
                            .setStyle(ButtonStyle.Primary)
                    );

                await buttonInteraction.update({
                    content: `🎶 ${currentTrack}\n\n**Queue:**\n${pages[currentPage]}`,
                    components: [newRow]
                });
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_page')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('shuffle_queue')
                            .setLabel('Shuffle')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );

                await message.edit({ components: [disabledRow] });
            });
        }
        },
        {
            data: new SlashCommandBuilder()
                .setName('pause')
                .setDescription('Pauses the current song'),
            async execute(interaction) {
                const queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue || !queue.node.isPlaying()) {
                    return interaction.reply('No song is currently playing.');
                }

                queue.node.pause();
                return interaction.reply('The current song has been paused.');
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName('resume')
                .setDescription('Resumes the paused song'),
            async execute(interaction) {
                const queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue || !queue.node.isPaused()) {
                    return interaction.reply('No song is currently paused.');
                }

                queue.node.resume();
                return interaction.reply('The current song has been resumed.');
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName('promote')
                .setDescription('Promotes a track in the queue to the top')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('The position of the track to promote (starting from 1)')
                        .setRequired(true)),
            async execute(interaction) {
                const queue = interaction.client.player.nodes.get(interaction.guildId);

                if (!queue || queue.getSize() === 0) {
                    return interaction.reply('The queue is empty or no tracks are available to promote.');
                }

                const position = interaction.options.getInteger('position');

                if (position < 1 || position > queue.getSize()) {
                    return interaction.reply(`Invalid position. Please choose a value between 1 and ${queue.getSize()}.`);
                }

                const tracksArray = queue.tracks.toArray();
                const trackToPromote = tracksArray.splice(position - 1, 1)[0]; // Remove the track
                tracksArray.unshift(trackToPromote); // Add it to the top

                queue.tracks.clear();
                for (const track of tracksArray) {
                    queue.addTrack(track);
                }

                return interaction.reply(`🎶 Promoted **${trackToPromote.title}** to the top of the queue.`);
            }
        }
    ]
};
