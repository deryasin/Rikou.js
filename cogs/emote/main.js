// cogs/emote/main.js
const fs = require('fs');
const path = require('path');

const emoteFilePath = path.join(__dirname, 'files/emote.json');
let keywords = {};

try {
    keywords = JSON.parse(fs.readFileSync(emoteFilePath, 'utf-8'));
    console.log('Keywords loaded successfully from emote.json');
} catch (error) {
    console.error(`Failed to load emote.json: ${error.message}`);
}

module.exports = {
    setup: (client) => {
        client.on('messageCreate', async (message) => {
            // Ignore messages from bots
            if (message.author.bot) return;

            // Check for keywords in the message content
            for (const [keyword, response] of Object.entries(keywords)) {
                if (message.content.toLowerCase().includes(keyword.toLowerCase())) {
                    await message.channel.send(response);
                    return;
                }
            }
        });
        console.log('Emote module loaded and setup complete');
    }
};