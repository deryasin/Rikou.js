const {
    Events,
    ChannelType,
    ThreadAutoArchiveDuration,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    eventThreads: new Map(),

    listeners: {
        onGuildScheduledEventCreate: {
            event: Events.GuildScheduledEventCreate,
            async execute(guildScheduledEvent) {
                const guild = guildScheduledEvent.guild;
                const eventsChannel = guild.channels.cache.find(channel => channel.name === 'event-general');

                if (!eventsChannel) {
                    console.log('Events channel not found');
                    return;
                }

                try {
                    const thread = await eventsChannel.threads.create({
                        name: guildScheduledEvent.name,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        type: ChannelType.PrivateThread,
                        invitable: false,
                        reason: `Private thread for event: ${guildScheduledEvent.name}`
                    });

                    console.log(`Created private thread for event: ${guildScheduledEvent.name}`);

                    // Store the thread ID with the event ID
                    this.eventThreads.set(guildScheduledEvent.id, thread.id);

                    // Post an initial message in the thread
                    await thread.send(`This is a private thread for discussing the event: **${guildScheduledEvent.name}**. Only interested users will be added to this thread.`);

                } catch (error) {
                    console.error(`Error creating private thread for event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        onGuildScheduledEventUpdate: {
            event: Events.GuildScheduledEventUpdate,
            async execute(oldEvent, newEvent) {
                console.log(`Event updated: ${newEvent.name} (ID: ${newEvent.id})`);
                console.log(`Old user count: ${oldEvent.userCount}, New user count: ${newEvent.userCount}`);

                const threadId = this.eventThreads.get(newEvent.id);
                if (!threadId) {
                    console.log(`No thread found for event: ${newEvent.name} (ID: ${newEvent.id})`);
                    return;
                }

                const thread = await newEvent.guild.channels.fetch(threadId);
                if (!thread) {
                    console.log(`Thread not found for event: ${newEvent.name} (ID: ${newEvent.id})`);
                    return;
                }

                try {
                    // Fetch all subscribers
                    const subscribers = await newEvent.fetchSubscribers();
                    console.log(`Total subscribers for event ${newEvent.name}: ${subscribers.size}`);

                    for (const [userId, user] of subscribers) {
                        // Check if the user is already in the thread
                        const threadMember = await thread.members.fetch(userId).catch(() => null);
                        if (!threadMember) {
                            // Add the user to the thread
                            await thread.members.add(userId);

                            // Send a welcome message
                            await thread.send(`Welcome <@${userId}>! You've shown interest in the event: **${newEvent.name}**.`);
                            console.log(`Added user ${user.tag} (ID: ${userId}) to private thread for event: ${newEvent.name}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error updating private thread for event ${newEvent.name}:`, error);
                }
            }
        },

        onGuildScheduledEventUserAdd: {
            event: Events.GuildScheduledEventUserAdd,
            async execute(guildScheduledEvent, user) {
                const threadId = this.eventThreads.get(guildScheduledEvent.id);
                if (!threadId) {
                    console.log(`No thread found for event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                const thread = await guildScheduledEvent.guild.channels.fetch(threadId);
                if (!thread) {
                    console.log(`Thread not found for event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                try {
                    await thread.members.add(user.id);
                    await thread.send(`Welcome <@${user.id}>! You've shown interest in the event: **${guildScheduledEvent.name}**.`);
                    console.log(`Added user ${user.tag} (ID: ${user.id}) to private thread for event: ${guildScheduledEvent.name}`);
                } catch (error) {
                    console.error(`Error adding user to private thread for event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        onGuildScheduledEventUserRemove: {
            event: Events.GuildScheduledEventUserRemove,
            async execute(guildScheduledEvent, user) {
                const threadId = this.eventThreads.get(guildScheduledEvent.id);
                if (!threadId) {
                    console.log(`No thread found for event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                const thread = await guildScheduledEvent.guild.channels.fetch(threadId);
                if (!thread) {
                    console.log(`Thread not found for event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                try {
                    await thread.members.remove(user.id);
                    console.log(`Removed user ${user.tag} (ID: ${user.id}) from private thread for event: ${guildScheduledEvent.name}`);
                } catch (error) {
                    console.error(`Error removing user from private thread for event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        onThreadMembersUpdate: {
            event: Events.ThreadMembersUpdate,
            async execute(addedMembers, removedMembers, thread) {
                console.log(`Thread members updated for thread: ${thread.name} (ID: ${thread.id})`);
                console.log(`Added members: ${addedMembers.size}, Removed members: ${removedMembers.size}`);
            }
        }
    },

    setup: async client => {
        for (const listener of Object.values(module.exports.listeners)) {
            client.on(listener.event, (...args) => listener.execute.apply(module.exports, args));
        }

        console.log('Events module loaded');
    }
};