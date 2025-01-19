const { SlashCommandBuilder, Events, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const rolesFilePath = path.join(__dirname, 'files/roles.json');
const messageIdPath = path.join(__dirname, 'files/msg_id_int.txt');

// Ensure roles.json exists
if (!fs.existsSync(rolesFilePath)) {
    fs.writeFileSync(rolesFilePath, JSON.stringify([]), 'utf-8');
}

const loadRoles = () => {
    if (!fs.existsSync(rolesFilePath)) {
        return [];
    }

    const data = fs.readFileSync(rolesFilePath, 'utf-8');
    if (data.trim() === '') {
        return [];
    }

    return JSON.parse(data);
};

const saveRoles = (roles) => {
    fs.writeFileSync(rolesFilePath, JSON.stringify(roles, null, 2), 'utf-8');
};

module.exports = {
    slashCommands: [
        {
            data: new SlashCommandBuilder()
                .setName('roles')
                .setDescription('Role management commands')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('Generate the role selection message'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('edit')
                        .setDescription('Edit an existing role emoji')
                        .addStringOption(option =>
                            option.setName('role')
                                .setDescription('The existing role name')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('emoji')
                                .setDescription('The new emoji for the role')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a new role and emoji')
                        .addStringOption(option =>
                            option.setName('role')
                                .setDescription('The new role name')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('emoji')
                                .setDescription('The emoji for the new role')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('del')
                        .setDescription('Delete an existing role')
                        .addStringOption(option =>
                            option.setName('role')
                                .setDescription('The role name to delete')
                                .setRequired(true)))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            async execute(interaction) {
                if (!interaction.isCommand()) return;

                const subcommand = interaction.options.getSubcommand();

                if (subcommand === 'setup') {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        await interaction.reply({
                            content: 'You need administrator permissions to use this command.',
                            ephemeral: true
                        });
                        return;
                    }

                    try {
                        const roles = loadRoles();
                        const roleMessageContent = roles.map(role => `${role.name}: ${role.emoji}`).join('\n');

                        await interaction.deferReply({ ephemeral: true });
                        const roleMessage = await interaction.channel.send(roleMessageContent);

                        for (const role of roles) {
                            await roleMessage.react(role.emoji);
                        }

                        // Ensure msg_id_int.txt exists
                        if (!fs.existsSync(messageIdPath)) {
                            fs.writeFileSync(messageIdPath, '', 'utf-8');
                        }

                        fs.writeFileSync(messageIdPath, roleMessage.id, 'utf-8');

                        await interaction.editReply({
                            content: 'Role message has been set up successfully!',
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error in roles setup:', error);
                        await interaction.editReply({
                            content: 'There was an error setting up the role message.',
                            ephemeral: true
                        });
                    }
                } else if (subcommand === 'edit') {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        await interaction.reply({
                            content: 'You need administrator permissions to use this command.',
                            ephemeral: true
                        });
                        return;
                    }

                    const roleName = interaction.options.getString('role');
                    const newEmoji = interaction.options.getString('emoji');

                    try {
                        const roles = loadRoles();
                        const roleIndex = roles.findIndex(role => role.name === roleName);

                        if (roleIndex === -1) {
                            await interaction.reply({
                                content: `Role ${roleName} not found.`,
                                ephemeral: true
                            });
                            return;
                        }

                        roles[roleIndex].emoji = newEmoji;
                        saveRoles(roles);

                        await interaction.reply({
                            content: `Role ${roleName} has been updated with new emoji ${newEmoji}.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error editing role:', error);
                        await interaction.reply({
                            content: 'There was an error editing the role.',
                            ephemeral: true
                        });
                    }
                } else if (subcommand === 'add') {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        await interaction.reply({
                            content: 'You need administrator permissions to use this command.',
                            ephemeral: true
                        });
                        return;
                    }

                    const roleName = interaction.options.getString('role');
                    const emoji = interaction.options.getString('emoji');

                    try {
                        const roles = loadRoles();
                        const roleExists = roles.some(role => role.name === roleName);

                        if (roleExists) {
                            await interaction.reply({
                                content: `Role ${roleName} already exists.`,
                                ephemeral: true
                            });
                            return;
                        }

                        const guildRole = interaction.guild.roles.cache.find(r => r.name === roleName);
                        if (!guildRole) {
                            await interaction.reply({
                                content: `Role ${roleName} does not exist in this guild.`,
                                ephemeral: true
                            });
                            return;
                        }

                        roles.push({ name: roleName, emoji: emoji });
                        saveRoles(roles);

                        await interaction.reply({
                            content: `Role ${roleName} with emoji ${emoji} has been added.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error adding role:', error);
                        await interaction.reply({
                            content: 'There was an error adding the role.',
                            ephemeral: true
                        });
                    }
                } else if (subcommand === 'del') {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                        await interaction.reply({
                            content: 'You need administrator permissions to use this command.',
                            ephemeral: true
                        });
                        return;
                    }

                    const roleName = interaction.options.getString('role');

                    try {
                        let roles = loadRoles();
                        const roleIndex = roles.findIndex(role => role.name === roleName);

                        if (roleIndex === -1) {
                            await interaction.reply({
                                content: `Role ${roleName} not found.`,
                                ephemeral: true
                            });
                            return;
                        }

                        roles = roles.filter(role => role.name !== roleName);
                        saveRoles(roles);

                        await interaction.reply({
                            content: `Role ${roleName} has been deleted.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error deleting role:', error);
                        await interaction.reply({
                            content: 'There was an error deleting the role.',
                            ephemeral: true
                        });
                    }
                }
            }
        }
    ],

    listeners: {
        messageReactionAdd: {
            event: Events.MessageReactionAdd,
            async execute(reaction, user) {
                try {
                    if (user.bot) return;

                    const messageId = fs.readFileSync(messageIdPath, 'utf-8');
                    console.log('Reaction added:', {
                        messageId: messageId,
                        reactionMessageId: reaction.message.id,
                        emoji: reaction.emoji.toString(),
                        user: user.tag
                    });

                    if (reaction.message.id === messageId) {
                        const guild = reaction.message.guild;
                        const member = await guild.members.fetch(user.id);
                        const roles = loadRoles();

                        for (const role of roles) {
                            if (reaction.emoji.toString() === role.emoji) {
                                const guildRole = guild.roles.cache.find(r => r.name === role.name);
                                if (guildRole) {
                                    if (!member.roles.cache.has(guildRole.id)) {
                                        await member.roles.add(guildRole);
                                        console.log(`Added role ${role.name} to user ${user.tag}`);
                                    } else {
                                        console.log(`User ${user.tag} already has role ${role.name}`);
                                    }
                                } else {
                                    console.log(`Role ${role.name} not found in guild`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in messageReactionAdd:', error);
                }
            }
        },
        messageReactionRemove: {
            event: Events.MessageReactionRemove,
            async execute(reaction, user) {
                try {
                    if (user.bot) return;

                    const messageId = fs.readFileSync(messageIdPath, 'utf-8');
                    console.log('Reaction removed:', {
                        messageId: messageId,
                        reactionMessageId: reaction.message.id,
                        emoji: reaction.emoji.toString(),
                        user: user.tag
                    });

                    if (reaction.message.id === messageId) {
                        const guild = reaction.message.guild;
                        const member = await guild.members.fetch(user.id);
                        const roles = loadRoles();

                        for (const role of roles) {
                            if (reaction.emoji.toString() === role.emoji) {
                                const guildRole = guild.roles.cache.find(r => r.name === role.name);
                                if (guildRole) {
                                    if (member.roles.cache.has(guildRole.id)) {
                                        await member.roles.remove(guildRole);
                                        console.log(`Removed role ${role.name} from user ${user.tag}`);
                                    } else {
                                        console.log(`User ${user.tag} does not have role ${role.name}`);
                                    }
                                } else {
                                    console.log(`Role ${role.name} not found in guild`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in messageReactionRemove:', error);
                }
            }
        }
    }
};