const { SlashCommandBuilder } = require('@discordjs/builders');
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

module.exports = {
    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('pb')
                .setDescription('Sends link to GDrive Folder with Schwarzfuchs related profile pictures'),
            async execute(interaction) {
                const gdriveLink = readFile(path.join(__dirname, './files/txt/gdrive_link.txt'));
                if (gdriveLink) await interaction.reply(gdriveLink);
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('code')
                .setDescription('Meme about my outstanding coding skills'),
            async execute(interaction) {
                const file = new AttachmentBuilder(path.join(__dirname, './files/img/maevisss-meme.jpg'));
                await interaction.reply({ files: [file] });
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('happy')
                .setDescription('Happy Sakamata Chloe gif'),
            async execute(interaction) {
                const content = `<@${interaction.user.id}> ist happy!`;
                const file = new AttachmentBuilder(path.join(__dirname, './files/img/sakamata-chloe.gif'));
                await interaction.reply({ content, files: [file] });
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('info')
                .setDescription('Post info message with programming language and operating system details'),
            async execute(interaction) {
                const configPath = path.join(__dirname, './files/config.json');
                const programmingLanguagesPath = path.join(__dirname, './files/txt/programminglanguages.txt');
                const operatingSystemsPath = path.join(__dirname, './files/txt/operatingsystems.txt');
                const templatePath = path.join(__dirname, './files/templates/info.j2');

                const config = JSON.parse(readFile(configPath));
                if (!config || !config.name || !config.discord) {
                    await interaction.reply('Error: Invalid or missing configuration.');
                    return;
                }

                const processFile = (filePath, linkKey) => {
                    const fileContent = readFile(filePath);
                    if (!fileContent) return null;

                    return fileContent
                        .split('\n')
                        .map(line => {
                            line = line.replace(/^\*\s*/, '').trim();
                            const match = line.match(/\[\[([^\]|]+)\|([^\]]+)\]\]/) || line.match(/\[\[([^\]]+)\]\]/);
                            const article = match ? match[1] : null;
                            const displayText = match ? (match[2] || match[1]) : line;
                            const link = article ? `https://en.wikipedia.org/wiki/${article.replace(/ /g, "_")}` : null;
                            return { [linkKey]: link, displayText };
                        })
                        .filter(item => item[linkKey]);
                };

                const programmingLanguages = processFile(programmingLanguagesPath, 'programming_language_wikipedia_link');
                const operatingSystems = processFile(operatingSystemsPath, 'operating_system_wikipedia_link');

                if (!programmingLanguages || !operatingSystems) {
                    await interaction.reply('Error: Could not load programming languages or operating systems files.');
                    return;
                }

                const selectedProgrammingLanguage = programmingLanguages[Math.floor(Math.random() * programmingLanguages.length)];
                const selectedOperatingSystem = operatingSystems[Math.floor(Math.random() * operatingSystems.length)];

                const template = readFile(templatePath);
                if (!template) {
                    await interaction.reply('Error: Could not load the info template.');
                    return;
                }

                const data = {
                    bot_name: config.name,
                    bot_discord: config.discord,
                    programming_language: selectedProgrammingLanguage.displayText,
                    programming_language_wikipedia_link: selectedProgrammingLanguage.programming_language_wikipedia_link,
                    operating_system: selectedOperatingSystem.displayText,
                    operating_system_wikipedia_link: selectedOperatingSystem.operating_system_wikipedia_link,
                };
                const renderedMessage = nunjucks.renderString(template, data);

                await interaction.reply(renderedMessage);
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('com')
                .setDescription('Send a list of commands via DM'),
            async execute(interaction) {
                const commandsList = readFile(path.join(__dirname, './files/txt/commands.txt'));
                if (!commandsList) return;

                try {
                    await interaction.user.send(commandsList);
                    await interaction.reply('Du hast eine DM mit der Liste erhalten.');
                } catch (error) {
                    console.error('Error sending DM:', error);
                    await interaction.reply('Es gab einen Fehler beim Senden der DM.');
                }
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('ip')
                .setDescription('MC Project Server IP'),
            async execute(interaction) {
                await interaction.reply('Currently not available.');
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('coin')
                .setDescription('Toss a coin to your witcher~'),
            async execute(interaction) {
                const result = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
                await interaction.reply(result);
            },
        },
        {
            data: new SlashCommandBuilder()
                .setName('randnum')
                .setDescription('Random number by user input')
                .addIntegerOption(option =>
                    option.setName('max')
                        .setDescription('The maximum number for the random range')
                        .setRequired(true)),
            async execute(interaction) {
                const max = interaction.options.getInteger('max');
                const randomNum = Math.floor(Math.random() * (max + 1));
                await interaction.reply(randomNum.toString());
            },
        },
    ],

    setup(client) {
        this.slashCommands.forEach(command => client.slashCommands.set(command.data.name, command));
    },
};