const {
    Events,
    ChannelType,
    ThreadAutoArchiveDuration,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    eventThreads: new Map(),

    listeners: {
        // Add a new listener for event create
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
        // Add a new listener for event update
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
        // Add a new listener for user add
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
        // Add a new listener for user removal
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
        // Add a new listener for thread members update
        onThreadMembersUpdate: {
            event: Events.ThreadMembersUpdate,
            async execute(addedMembers, removedMembers, thread) {
                console.log(`Thread members updated for thread: ${thread.name} (ID: ${thread.id})`);
                console.log(`Added members: ${addedMembers.size}, Removed members: ${removedMembers.size}`);
            }
        },
        // Add a new listener for scheduled event delete
        onGuildScheduledEventDelete: {
            event: Events.GuildScheduledEventDelete,
            async execute(guildScheduledEvent) {
                const threadId = this.eventThreads.get(guildScheduledEvent.id);
                if (!threadId) {
                    console.log(`No thread found for deleted event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                const thread = await guildScheduledEvent.guild.channels.fetch(threadId);
                if (!thread) {
                    console.log(`Thread not found for deleted event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                try {
                    // Lock the thread
                    await thread.setLocked(true, 'Event has ended');
                    await thread.send('This event has ended. The thread is now locked.');
                    console.log(`Locked thread for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);

                    // Remove the thread
                    this.eventThreads.delete(guildScheduledEvent.id);
                } catch (error) {
                    console.error(`Error locking thread for ended event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        // Add a new listener for scheduled event end
        onGuildScheduledEventEnd: {
            event: 'guildScheduledEventEnd',
            async execute(guildScheduledEvent) {

                const threadId = this.eventThreads.get(guildScheduledEvent.id);
                if (!threadId) {
                    console.log(`No thread found for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                const thread = await guildScheduledEvent.guild.channels.fetch(threadId);
                if (!thread) {
                    console.log(`Thread not found for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    return;
                }

                try {
                    // Lock the thread
                    await thread.setLocked(true, 'Event has ended');
                    await thread.send('This event has ended. The thread is now locked.');
                    console.log(`Locked thread for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);

                    // Remove the thread
                    this.eventThreads.delete(guildScheduledEvent.id);
                } catch (error) {
                    console.error(`Error locking thread for ended event ${guildScheduledEvent.name}:`, error);
                }
            }
        },
    },

    setup: async client => {
        for (const listener of Object.values(module.exports.listeners)) {
            client.on(listener.event, (...args) => listener.execute.apply(module.exports, args));
        }

        // Set up a check for ended events
        setInterval(() => {
            const now = new Date();
            client.guilds.cache.forEach(guild => {
                guild.scheduledEvents.cache.forEach(event => {
                    if (event.scheduledEndAt && event.scheduledEndAt <= now) {
                        client.emit('guildScheduledEventEnd', event);
                    }
                });
            });
        }, 60000); // Check every minute

        console.log('Events module loaded');
    }
};