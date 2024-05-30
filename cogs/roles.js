// roles.js

const { Events, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const roleList = [
    ['XBOX', 'XBOX'],
    ['PlayStation', 'PlayStation'],
    ['Nintendo', 'Nintendo'],
    ['PC', 'Computer'],
    ['GamePass', 'GamePass'],
    ['AirSoft', 'CatGun'],
    ['YouTube', 'YouTube'],
    ['Twitch', 'Twitch'],
    ['Anime', 'RemPout'],
    ['IT', 'Server'],
    ['Developer', 'Terminal'],
    ['VR', 'VR'],
    ['Schwarzfuchs', 'SFD'],
    ['GameCentral', 'GC'],
    ['Minecraft', 'FoxSpin']
];

module.exports = {
    data: {
        name: 'roles',
        description: 'Role management commands',
    },
    async execute(interaction) {
        // Define command logic here
    },
};

module.exports.commands = {
    rolemsg: {
        data: {
            name: 'rolemsg',
            description: 'Generate message for roles',
        },
        async execute(interaction) {
            const role = '1063530524259405875'; // For developer use only
            const user = interaction.member;

            if (!user.roles.cache.some(role => role.name === 'Developer')) {
                await interaction.reply('Du hast keine Berechtigung diesen Befehl zu nutzen.');
                return;
            }

            const filePath = path.join(__dirname, '../files/txt/role_message.txt');
            const roleMessageContent = fs.readFileSync(filePath, 'utf-8');
            const roleMessage = await interaction.channel.send(roleMessageContent);

            const reactions = [
                'XBOX:1061629245559935017',
                'PlayStation:1061629107202437151',
                'Nintendo:1061629069764075601',
                'Computer:1061629050281541712',
                'GamePass:1061629205516927027',
                'CatGun:1061633180328787988',
                'YouTube:1063541188071796777',
                'Twitch:1063541229138223164',
                'RemPout:1063551455899951145',
                'Server:1063554322891284570',
                'VR:1166353764563816489',
                'Terminal:1063541718370242572',
                'SFD:1225571944355856495',
                'GC:1063542584749871225',
                'FoxSpin:1061632987944468592'
            ];

            for (const reaction of reactions) {
                await roleMessage.react(`<:${reaction}>`);
            }

            const messageIdPath = path.join(__dirname, '../files/txt/msg_id_int.txt');
            fs.writeFileSync(messageIdPath, roleMessage.id, 'utf-8');
        },
    },
};

module.exports.listeners = {
    onRawReactionAdd: {
        event: Events.RawReactionAdd,
        async execute(client, payload) {
            const messageIdPath = path.join(__dirname, '../files/txt/msg_id_int.txt');
            const messageId = fs.readFileSync(messageIdPath, 'utf-8');

            if (payload.messageId.toString() === messageId) {
                const guild = await client.guilds.fetch(payload.guildId);
                const member = await guild.members.fetch(payload.userId);

                for (const [roleName, emoteName] of roleList) {
                    if (payload.emoji.name === emoteName) {
                        const role = guild.roles.cache.find(role => role.name === roleName);
                        if (role) {
                            await member.roles.add(role);
                        }
                    }
                }
            }
        },
    },


    onRawReactionRemove: {
        event: Events.RawReactionRemove,
        async execute(client, payload) {
            const messageIdPath = path.join(__dirname, '../files/txt/msg_id_int.txt');
            const messageId = fs.readFileSync(messageIdPath, 'utf-8');

            if (payload.messageId.toString() === messageId) {
                const guild = await client.guilds.fetch(payload.guildId);
                const member = await guild.members.fetch(payload.userId);

                for (const [roleName, emoteName] of roleList) {
                    if (payload.emoji.name === emoteName) {
                        const role = guild.roles.cache.find(role => role.name === roleName);
                        if (role) {
                            await member.roles.remove(role);
                        }
                    }
                }
            }
        },
    },
};

module.exports.setup = async client => {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isCommand()) return;
        const command = module.exports.commands[interaction.commandName];
        if (command) {
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error executing that command!', ephemeral: true });
            }
        }
    });

    for (const listener of Object.values(module.exports.listeners)) {
        client.on(listener.event, (...args) => listener.execute(client, ...args));
    }

    console.log('Roles module loaded');
};