const {
    Events,
    ChannelType,
    ThreadAutoArchiveDuration,
    PermissionFlagsBits
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const eventchannelid = '1121152075355652198';

const EVENT_THREADS_FILE = path.join(__dirname, '../files/event_threads.json');

const EventHandler = {
    eventThreads: new Map(),

    async loadEventThreads() {
        try {
            const data = await fs.readFile(EVENT_THREADS_FILE, 'utf8');
            const parsedData = JSON.parse(data);
            this.eventThreads = new Map(Object.entries(parsedData));
            console.log('Loaded event threads from file');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading event threads:', error);
            }
        }
    },

    async saveEventThreads() {
        try {
            const data = JSON.stringify(Object.fromEntries(this.eventThreads));
            await fs.writeFile(EVENT_THREADS_FILE, data, 'utf8');
            console.log('Saved event threads to file');
        } catch (error) {
            console.error('Error saving event threads:', error);
        }
    },

    listeners: {
        onGuildScheduledEventCreate: {
            event: Events.GuildScheduledEventCreate,
            async execute(guildScheduledEvent) {
                const guild = guildScheduledEvent.guild;
                const eventsChannel = guild.channels.cache.get(eventchannelid);

                if (!eventsChannel) {
                    console.log('Events channel not found');
                    return;
                }

                try {
                    console.log(`Creating thread for event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);
                    const thread = await eventsChannel.threads.create({
                        name: guildScheduledEvent.name,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        type: ChannelType.PrivateThread,
                        invitable: false,
                        reason: `Private thread for event: ${guildScheduledEvent.name}`
                    });

                    console.log(`Created private thread for event: ${guildScheduledEvent.name} (Thread ID: ${thread.id})`);

                    EventHandler.eventThreads.set(guildScheduledEvent.id, thread.id);
                    await EventHandler.saveEventThreads();

                    await thread.send(`This is a private thread for discussing the event: **${guildScheduledEvent.name}**. Only interested users will be added to this thread.`);

                    // Add event creator to the thread
                    console.log(`Attempting to add event creator (ID: ${guildScheduledEvent.creatorId}) to thread`);
                    const eventCreator = await guild.members.fetch(guildScheduledEvent.creatorId);
                    if (!eventCreator) {
                        console.log(`Failed to fetch event creator (ID: ${guildScheduledEvent.creatorId})`);
                        return;
                    }

                    await thread.members.add(eventCreator.id);
                    console.log(`Added event creator ${eventCreator.user.tag} (ID: ${eventCreator.id}) to private thread`);

                    await thread.send(`Welcome <@${eventCreator.id}>! You've created the event: **${guildScheduledEvent.name}**.`);
                    console.log(`Sent welcome message to event creator in thread`);

                } catch (error) {
                    console.error(`Error in onGuildScheduledEventCreate for event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        onGuildScheduledEventUpdate: {
            event: Events.GuildScheduledEventUpdate,
            async execute(oldEvent, newEvent) {
                console.log(`Event updated: ${newEvent.name} (ID: ${newEvent.id})`);
                console.log(`Old user count: ${oldEvent.userCount}, New user count: ${newEvent.userCount}`);

                const threadId = EventHandler.eventThreads.get(newEvent.id);
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
                    const subscribers = await newEvent.fetchSubscribers();
                    console.log(`Total subscribers for event ${newEvent.name}: ${subscribers.size}`);

                    for (const [userId, user] of subscribers) {
                        const threadMember = await thread.members.fetch(userId).catch(() => null);
                        if (!threadMember) {
                            await thread.members.add(userId);
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
                const threadId = EventHandler.eventThreads.get(guildScheduledEvent.id);
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
                const threadId = EventHandler.eventThreads.get(guildScheduledEvent.id);
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
        },

        onGuildScheduledEventDelete: {
            event: Events.GuildScheduledEventDelete,
            async execute(guildScheduledEvent) {
                const threadId = EventHandler.eventThreads.get(guildScheduledEvent.id);
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
                    await thread.setLocked(true, 'Event has ended');
                    await thread.send('This event has ended. The thread is now locked.');
                    console.log(`Locked thread for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);

                    EventHandler.eventThreads.delete(guildScheduledEvent.id);
                    await EventHandler.saveEventThreads();
                } catch (error) {
                    console.error(`Error locking thread for ended event ${guildScheduledEvent.name}:`, error);
                }
            }
        },

        onGuildScheduledEventEnd: {
            event: 'guildScheduledEventEnd',
            async execute(guildScheduledEvent) {
                const threadId = EventHandler.eventThreads.get(guildScheduledEvent.id);
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
                    await thread.setLocked(true, 'Event has ended');
                    await thread.send('This event has ended. The thread is now locked.');
                    console.log(`Locked thread for ended event: ${guildScheduledEvent.name} (ID: ${guildScheduledEvent.id})`);

                    EventHandler.eventThreads.delete(guildScheduledEvent.id);
                    await EventHandler.saveEventThreads();
                } catch (error) {
                    console.error(`Error locking thread for ended event ${guildScheduledEvent.name}:`, error);
                }
            }
        },
    },

    setup: async (client) => {
        await EventHandler.loadEventThreads();

        for (const listener of Object.values(EventHandler.listeners)) {
            client.on(listener.event, (...args) => listener.execute.apply(EventHandler, args));
        }

        setInterval(async () => {
            const now = new Date();
            for (const [guildId, guild] of client.guilds.cache) {
                for (const [eventId, event] of guild.scheduledEvents.cache) {
                    if (event.scheduledEndAt && event.scheduledEndAt <= now) {
                        client.emit('guildScheduledEventEnd', event);
                    }
                }
            }
        }, 60000);

        console.log('Events module loaded');
    }
};

module.exports = EventHandler;