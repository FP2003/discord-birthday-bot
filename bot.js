const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const birthdayDataFile = path.join(__dirname, 'birthdays.json');

const loadBirthdayData = () => {
    try {
        if (fs.existsSync(birthdayDataFile)) {
            return JSON.parse(fs.readFileSync(birthdayDataFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading birthday data:', error);
    }
    return {};
};

const saveBirthdayData = (data) => {
    try {
        fs.writeFileSync(birthdayDataFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving birthday data:', error);
    }
};

let birthdayData = loadBirthdayData();

const commands = [
    new SlashCommandBuilder()
        .setName('setbirthday')
        .setDescription('Set your birthday')
        .addIntegerOption(o => o.setName('month').setDescription('Birth month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
        .addIntegerOption(o => o.setName('day').setDescription('Birth day (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption(o => o.setName('year').setDescription('Birth year (optional)').setRequired(false).setMinValue(1900).setMaxValue(new Date().getFullYear())),
    new SlashCommandBuilder()
        .setName('birthday')
        .setDescription("Check someone's birthday")
        .addUserOption(o => o.setName('user').setDescription("User to check birthday for").setRequired(false)),
    new SlashCommandBuilder()
        .setName('birthdays')
        .setDescription('List upcoming birthdays in this server'),
    new SlashCommandBuilder()
        .setName('removebirthday')
        .setDescription('Remove your birthday from the database'),
    new SlashCommandBuilder()
        .setName('birthdaychannel')
        .setDescription('Set the channel for birthday announcements (Admin only)')
        .addChannelOption(o => o.setName('channel').setDescription('Channel for birthday announcements').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const isValidDate = (month, day, year) => {
    const date = new Date(year || new Date().getFullYear(), month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day;
};

const formatDate = (month, day, year) => {
    const date = new Date(2000, month - 1, day); // Year doesn't matter for month/day format
    const dateStr = date.toLocaleString('en-US', { month: 'long', day: 'numeric' });
    return year ? `${dateStr}, ${year}` : dateStr;
};

const calculateAge = (month, day, year) => {
    if (!year) return null;
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const getUpcomingBirthdays = (guildId, limit = 10) => {
    const users = birthdayData[guildId]?.users || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdays = Object.entries(users).map(([userId, b]) => {
        let nextBirthday = new Date(today.getFullYear(), b.month - 1, b.day);
        if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        return { userId, ...b, daysUntil };
    });

    return birthdays.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, limit);
};

const getTodaysBirthdays = (guildId) => {
    const users = birthdayData[guildId]?.users || {};
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return Object.entries(users)
        .filter(([_, b]) => b.month === month && b.day === day)
        .map(([userId, b]) => ({ userId, ...b }));
};

const announceBirthday = async (guild, channel, birthday) => {
    const user = await client.users.fetch(birthday.userId).catch(() => null);
    if (!user) return;

    const age = calculateAge(birthday.month, birthday.day, birthday.year);
    const embed = new EmbedBuilder()
        .setTitle('🎉 Happy Birthday! 🎂')
        .setDescription(`It’s **${user.username}**’s birthday!${age !== null ? ` They turn ${age + 1} today.` : ''}`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

    channel.send({ content: `<@${birthday.userId}>`, embeds: [embed] });
};

const checkAndAnnounceBirthdays = async () => {
    for (const guildId in birthdayData) {
        const guildConfig = birthdayData[guildId];
        const todaysBirthdays = getTodaysBirthdays(guildId);
        if (!todaysBirthdays.length || !guildConfig.channel) continue;

        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(guildConfig.channel);
        if (!channel) continue;

        todaysBirthdays.forEach(b => announceBirthday(guild, channel, b));
    }
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await client.application.commands.set(commands);
    cron.schedule('0 9 * * *', checkAndAnnounceBirthdays, { timezone: "America/New_York" });
});

const commandHandlers = {
    setbirthday: async (interaction) => {
        const { guild, user, options } = interaction;
        const month = options.getInteger('month');
        const day = options.getInteger('day');
        const year = options.getInteger('year');

        if (!isValidDate(month, day, year)) {
            return interaction.reply({ content: '❌ Invalid date!', ephemeral: true });
        }

        const guildId = guild.id;
        birthdayData[guildId] ||= { users: {}, channel: null };
        birthdayData[guildId].users[user.id] = { month, day, ...(year && { year }) };
        saveBirthdayData(birthdayData);

        const age = calculateAge(month, day, year);
        const ageString = age !== null ? ` (turning **${age + 1}**)` : '';
        return interaction.reply(`✅ Birthday set to **${formatDate(month, day, year)}**${ageString}!`);
    },
    birthday: async (interaction) => {
        const { guild, user, options } = interaction;
        const target = options.getUser('user') || user;
        const b = birthdayData[guild.id]?.users[target.id];

        if (!b) {
            const message = target.id === user.id
                ? "You haven't set a birthday yet!"
                : `${target.username} hasn't set a birthday yet!`;
            return interaction.reply(message);
        }

        const age = calculateAge(b.month, b.day, b.year);
        const ageString = age !== null ? ` (age **${age}**)` : '';
        return interaction.reply(`🎂 **${target.username}**’s birthday is **${formatDate(b.month, b.day, b.year)}**${ageString}`);
    },
    birthdays: async (interaction) => {
        const list = getUpcomingBirthdays(interaction.guild.id);
        if (!list.length) {
            return interaction.reply('No upcoming birthdays found.');
        }

        const descriptions = await Promise.all(list.map(async (b) => {
            const u = await client.users.fetch(b.userId).catch(() => ({ username: 'Unknown User' }));
            const age = calculateAge(b.month, b.day, b.year);
            const when = b.daysUntil === 0 ? 'Today' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`;
            const ageString = age !== null ? ` (turning ${age + 1})` : '';
            return `**${u.username}** — ${formatDate(b.month, b.day)}${ageString} — *${when}*`;
        }));

        const embed = new EmbedBuilder()
            .setTitle('🎉 Upcoming Birthdays')
            .setColor(0x00AE86)
            .setDescription(descriptions.join('\n'));
        return interaction.reply({ embeds: [embed] });
    },
    removebirthday: async (interaction) => {
        const { guild, user } = interaction;
        if (!birthdayData[guild.id]?.users[user.id]) {
            return interaction.reply({ content: "You don't have a birthday to remove.", ephemeral: true });
        }
        delete birthdayData[guild.id].users[user.id];
        saveBirthdayData(birthdayData);
        return interaction.reply('Your birthday has been removed.');
    },
    birthdaychannel: async (interaction) => {
        const { guild, options } = interaction;
        const channel = options.getChannel('channel');
        birthdayData[guild.id] ||= { users: {}, channel: null };
        birthdayData[guild.id].channel = channel.id;
        saveBirthdayData(birthdayData);
        return interaction.reply(`I will post birthdays in <#${channel.id}>.`);
    }
};

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const handler = commandHandlers[interaction.commandName];
    if (handler) {
        try {
            await handler(interaction);
        } catch (err) {
            console.error(err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);