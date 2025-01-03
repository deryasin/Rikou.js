// basics/main.js
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
nunjucks.configure({ autoescape: true });


const readFile = (filePath, encoding = 'utf-8') => {
    try {
        return fs.readFileSync(filePath, encoding);
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error);
        return null;
    }
};

const sendFileMessage = async (message, filePath, content = null) => {
    const file = new AttachmentBuilder(filePath);
    const options = content ? { content, files: [file] } : { files: [file] };
    await message.channel.send(options);
};

const commands = {
    pb: {
        data: { name: 'pb', description: 'Sends link to GDrive Folder with Schwarzfuchs related profile pictures' },
        async execute(message) {
            const gdriveLink = readFile(path.join(__dirname, './files/txt/gdrive_link.txt'));
            if (gdriveLink) await message.channel.send(gdriveLink);
        },
    },
    code: {
        data: { name: 'code', description: 'Meme about my outstanding coding skills' },
        async execute(message) {
            await sendFileMessage(message, path.join(__dirname, './files/img/maevisss-meme.jpg'));
        },
    },
    happy: {
        data: { name: 'happy', description: 'Happy Sakamata Chloe gif' },
        async execute(message) {
            const content = `<@${message.author.id}> ist happy!`;
            await sendFileMessage(message, path.join(__dirname, './files/img/sakamata-chloe.gif'), content);
        },
    },
    info: {
        data: { name: 'info', description: 'Post info message with programming language and operating system details' },
        async execute(message) {
            const configPath = path.join(__dirname, './files/config.json');
            const programmingLanguagesPath = path.join(__dirname, './files/txt/programminglanguages.txt');
            const operatingSystemsPath = path.join(__dirname, './files/txt/operatingsystems.txt');
            const templatePath = path.join(__dirname, './files/templates/info.j2');
    
            // Load the configuration file
            const config = JSON.parse(readFile(configPath));
            if (!config || !config.name || !config.discord) {
                await message.channel.send('Error: Invalid or missing configuration.');
                return;
            }

            // Function to process a file (generic for programming languages or OS)
            const processFile = (filePath, linkKey) => {
                const fileContent = readFile(filePath);
                if (!fileContent) return null;

                return fileContent
                    .split('\n')
                    .map(line => {
                        // Remove leading `*` and trim whitespace
                        line = line.replace(/^\*\s*/, '').trim();
    
                        // Extract display text and Wikipedia link
                        const match = line.match(/\[\[([^\]|]+)\|([^\]]+)\]\]/) || line.match(/\[\[([^\]]+)\]\]/);
                        const article = match ? match[1] : null;
                        const displayText = match ? (match[2] || match[1]) : line;
    
                        // Construct the Wikipedia link
                        const link = article ? `https://en.wikipedia.org/wiki/${article.replace(/ /g, "_")}` : null;
    
                        return { [linkKey]: link, displayText };
                    })
                    .filter(item => item[linkKey]); // Filter out invalid entries
            };

            // Process programming languages and operating systems files
            const programmingLanguages = processFile(programmingLanguagesPath, 'programming_language_wikipedia_link');
            const operatingSystems = processFile(operatingSystemsPath, 'operating_system_wikipedia_link');
    
            if (!programmingLanguages || !operatingSystems) {
                await message.channel.send('Error: Could not load programming languages or operating systems files.');
                return;
            }

            // Randomly pick one from each list
            const selectedProgrammingLanguage = programmingLanguages[Math.floor(Math.random() * programmingLanguages.length)];
            const selectedOperatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];

            // Read the template
            const template = readFile(templatePath);
            if (!template) {
                await message.channel.send('Error: Could not load the info template.');
                return;
            }

            // Render the template with dynamic data
            const data = {
                bot_name: config.name,
                bot_discord: config.discord,
                programming_language: selectedProgrammingLanguage.displayText,
                programming_language_wikipedia_link: selectedProgrammingLanguage.programming_language_wikipedia_link,
                operating_system: selectedOperatingSystem.displayText,
                operating_system_wikipedia_link: selectedOperatingSystem.operating_system_wikipedia_link,
            };
            const renderedMessage = nunjucks.renderString(template, data);

            // Send the rendered message
            await message.channel.send(renderedMessage);
        },
    },
    com: {
        data: { name: 'com', description: 'Send a list of commands via DM' },
        async execute(message) {
            const commandsList = readFile(path.join(__dirname, './files/txt/commands.txt'));
            if (!commandsList) return;

            try {
                await message.author.send(commandsList);
                await message.channel.send('Du hast eine DM mit der Liste erhalten.');
            } catch (error) {
                console.error('Error sending DM:', error);
                await message.channel.send('Es gab einen Fehler beim Senden der DM.');
            }
        },
    },
    ip: {
        data: { name: 'ip', description: 'MC Project Server IP' },
        async execute(message) {
            await message.channel.send('v2202312213075249649.nicesrv.de');
        },
    },
    coin: {
        data: { name: 'coin', description: 'Toss a coin to your witcher~' },
        async execute(message) {
            const result = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
            await message.channel.send(result);
        },
    },
    randnum: {
        data: { name: 'randnum', description: 'Random number by user input' },
        async execute(message) {
            const args = message.content.split(' ');
            const max = parseInt(args[1], 10);

            if (isNaN(max)) {
                await message.channel.send('Bitte gebe die Obergrenze mit an');
                return;
            }

            const randomNum = Math.floor(Math.random() * (max + 1));
            await message.channel.send(randomNum.toString());
        },
    },
};

const loadCommands = client => {
    Object.entries(commands).forEach(([name, command]) => {
        client.commands.set(name, command);
    });
};

const setup = async client => {
    loadCommands(client);
    console.log('Basics was loaded');
};

// Export only the setup and loadCommands functions
module.exports = { setup, loadCommands };
