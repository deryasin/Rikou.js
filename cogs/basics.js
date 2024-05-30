// basics.js

const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    commands: {
        pb: {
            data: {
                name: 'pb',
                description: 'Sends link to GDrive Folder with Schwarzfuchs related profile pictures',
            },
            async execute(message) {
                const filePath = path.join(__dirname, '../files/txt/gdrive_link.txt');
                const gdriveLink = fs.readFileSync(filePath, 'utf-8');
                await message.channel.send(gdriveLink);
            },
        },

        code: {
            data: {
                name: 'code',
                description: 'Meme about my outstanding coding skills',
            },
            async execute(message) {
                const filePath = path.join(__dirname, '../files/img/maevisss-meme.jpg');
                const file = new AttachmentBuilder(filePath);
                await message.channel.send({ files: [file] });
            },
        },

        happy: {
            data: {
                name: 'happy',
                description: 'Happy Sakamata Chloe gif',
            },
            async execute(message) {
                const filePath = path.join(__dirname, '../files/img/sakamata-chloe.gif');
                const file = new AttachmentBuilder(filePath);
                await message.channel.send({
                    content: `<@${message.author.id}> ist happy!`,
                    files: [file],
                });
            },
        },

        info: {
            data: {
                name: 'info',
                description: 'Post info message',
            },
            async execute(message) {
                const filePath = path.join(__dirname, '../files/txt/info.txt');
                const info = fs.readFileSync(filePath, 'utf-8');
                await message.channel.send(info);
            },
        },

        com: {
            data: {
                name: 'com',
                description: 'Send a list of commands via DM',
            },
            async execute(message) {
                //check if user is the bot
                const user = message.author;

                const filePath = path.join(__dirname, '../files/txt/commands.txt');
                const commandsList = fs.readFileSync(filePath, 'utf-8');

                try {
                    await user.send(commandsList);
                    await message.channel.send('Du hast eine DM mit der Liste erhalten.');
                } catch (error) {
                    console.error(error);
                    await message.channel.send('Es gab einen Fehler beim Senden der DM.');
                }
            },
        },

        ip: {
            data: {
                name: 'ip',
                description: 'MC Project Server IP',
            },
            async execute(message) {
                await message.channel.send('v2202312213075249649.nicesrv.de');
            },
        },

        coin: {
            data: {
                name: 'coin',
                description: 'Toss a coin to your witcher~',
            },
            async execute(message) {
                const result = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
                await message.channel.send(result);
            },
        },

        randnum: {
            data: {
                name: 'randnum',
                description: 'Random number by user input',
            },
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
    },

    // Register all the commands
    loadCommands: client => {
        for (const [name, command] of Object.entries(module.exports.commands)) {
            client.commands.set(name, command);
        }
    },

    // basics.js setup
    setup: async client => {
        module.exports.loadCommands(client);
        console.log('Basics was loaded');
    },
};