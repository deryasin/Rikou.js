const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

const fs = require('fs');
const path = require('path');

const config = require('./config.json');

const Mode = config.Mode;
const Token = Mode === 1 ? config.TokenLive : config.TokenDev;
const prefix = Mode === 1 ? '!' : '^';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

client.commands = new Collection();
client.slashCommands = new Collection();

//---------- Core ----------
const loadCogs = () => {
    const cogsPath = path.resolve(__dirname, './cogs'); 
    const cogFolders = fs.readdirSync(cogsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    for (const folder of cogFolders) {
        const cogPath = path.resolve(__dirname, 'cogs', folder, 'main.js');

        if (fs.existsSync(cogPath)) {
            const cog = require(cogPath);
            
            if (cog.setup) {
                cog.setup(client);
            }
            
            if (cog.commands) {
                for (const [name, command] of Object.entries(cog.commands)) {
                    client.commands.set(name, command);
                }
            }

            if (cog.slashCommands) {
                for (const slashCommand of cog.slashCommands) {
                    client.slashCommands.set(slashCommand.data.name, slashCommand);
                }
            }
        } else {
            console.warn(`No main.js found in folder: ${folder}`);
        }
    }
};


const registerSlashCommands = async () => {
    const rest = new REST({ version: '10' }).setToken(Token);
    const commandsData = Array.from(client.slashCommands.values()).map(command => command.data.toJSON());

    try {
        console.log('Commands to register:', commandsData.map(command => command.name));
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};

const main = async () => {
    loadCogs();
    await client.login(Token);
};
//---------- Event Listeners ----------
client.once('ready', async () => {
    console.log('Client is ready!');
    await registerSlashCommands();
    try {
        if (Mode === 1) {
            await client.user.setActivity({
                name: '!info',
                type: ActivityType.Playing
            });
            console.log('Set activity to !info');
        } else {
            await client.user.setActivity({
                name: 'world.execute(me);',
                type: ActivityType.Playing
            });
            console.log('Set activity to world.execute(me);');
        }
    } catch (error) {
        console.error('Error setting activity:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const keywords = {
        loli: '<:MatsuLewd:1061639068645068842>',
        fuchs: '<a:FoxSpin:1061632987944468592>'
    }
    for (const [keyword, response] of Object.entries(keywords)) {
        if (message.content.toLowerCase().includes(keyword)) {
            await message.channel.send(response);
            return;
        }
    }
    
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) {
        await message.channel.send('Dieser Befehl ist nicht bekannt. Überprüfe ob du ihn richtig geschrieben hast oder schaue bei !info nach.');
        return;
    }
    try {
        await command.execute(message);
    } catch (error) {
        console.error(error);
        await message.reply('There was an error executing that command.');
    }
});

main();
