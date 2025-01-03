const config = require('./files/config.json');

// Set to track users who are currently streaming to prevent duplicate announcements
const liveUsers = new Set();

// Function to announce that a user is live in a specific Discord channel
const announceStream = async (client, member, streamActivity) => {
    const guild = client.guilds.cache.get(config.GuildID);
    if (!guild) {
        console.error(`Guild with ID ${config.GuildID} not found.`);
        return;
    }

    const channel = guild.channels.cache.get(config.LiveChannelID);
    if (!channel) {
        console.error(`Channel with ID ${config.LiveChannelID} not found.`);
        return;
    }

    try {
        await channel.send(`🚨 **${member.displayName}** is now live on Twitch! 🎮\nCheck them out: ${streamActivity.url}`);
        console.log(`Announced stream for ${member.displayName}: ${streamActivity.url}`);
    } catch (error) {
        console.error(`Failed to announce stream for ${member.displayName}:`, error);
    }
};

// Function to monitor streaming status changes
const handlePresenceUpdate = async (client, oldPresence, newPresence) => {
    const member = newPresence.member;
    if (!member) return;

    // Check if the user started streaming on Twitch
    const newStreamActivity = newPresence.activities.find(
        activity => activity.type === 1 && activity.name === 'Twitch' && activity.url
    );
    const wasStreaming = oldPresence?.activities.some(
        activity => activity.type === 1 && activity.name === 'Twitch' && activity.url
    );

    // If user started streaming and was not previously streaming
    if (newStreamActivity && !wasStreaming) {
        if (!liveUsers.has(member.id)) {
            liveUsers.add(member.id);
            await announceStream(client, member, newStreamActivity);
        }
    }

    // If user stopped streaming, remove them from the live set
    if (!newStreamActivity && wasStreaming) {
        if (liveUsers.has(member.id)) {
            liveUsers.delete(member.id);
        }
    }
};

const setup = async (client) => {
    console.log('Twitch module loaded.');


    if (!client.options.intents.has('GuildPresences')) {
        console.warn('Warning: GuildPresences intent is not enabled.');
    }

    client.on('presenceUpdate', async (oldPresence, newPresence) => {
        try {
            await handlePresenceUpdate(client, oldPresence, newPresence);
        } catch (error) {
            console.error('Error handling presence update:', error);
        }
    });
};

module.exports = {
    setup,
};