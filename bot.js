const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

// Bot config
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Birthday data storage
const birthdayDataFile = path.join(__dirname, 'birthdays.json');

// Load birthday data
function loadBirthdayData() {
    try {
        if (fs.existsSync(birthdayDataFile)) {
            const data = fs.readFileSync(birthdayDataFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading birthday data:', error);
    }
    return {};
}

// Save birthday data
function saveBirthdayData(data) {
    try {
        fs.writeFileSync(birthdayDataFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving birthday data:', error);
    }
}

// Birthday data structure: { guildId: { users: { userId: { month, day, year? } }, channel: string } }
let birthdayData = loadBirthdayData();

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('setbirthday')
        .setDescription('Set your birthday')
        .addIntegerOption(option =>
            option.setName('month')
                .setDescription('Birth month (1-12)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(12))
        .addIntegerOption(option =>
            option.setName('day')
                .setDescription('Birth day (1-31)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(31))
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('Birth year (optional)')
                .setRequired(false)
                .setMinValue(1900)
                .setMaxValue(new Date().getFullYear())),

    new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Check someone\'s birthday')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check birthday for')
                .setRequired(false)),

    new SlashCommandBuilder()
        .setName('birthdays')
        .setDescription('List upcoming birthdays in this server'),

    new SlashCommandBuilder()
        .setName('removebirthday')
        .setDescription('Remove your birthday from the database'),

    new SlashCommandBuilder()
        .setName('birthdaychannel')
        .setDescription('Set the channel for birthday announcements (Admin only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel for birthday announcements')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

// Utility functions
function isValidDate(month, day, year = null) {
    const date = new Date(year || 2024, month - 1, day);
    return date.getMonth() === (month - 1) && date.getDate() === day;
}

function formatDate(month, day, year = null) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${day} ${months[month - 1]}`;
    return year ? `${dateStr}, ${year}` : dateStr;
}

function calculateAge(month, day, year) {
    if (!year) return null;
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getUpcomingBirthdays(guildId, limit = 10) {
    const guild = birthdayData[guildId];
    if (!guild) return [];
    const today = new Date();
    const birthdays = [];
    for (const [userId, birthday] of Object.entries(guild.users || {})) {
        const { month, day, year } = birthday;
        let birthdayDate = new Date(today.getFullYear(), month - 1, day);
        if (birthdayDate < today) birthdayDate.setFullYear(today.getFullYear() + 1);
        const daysUntil = Math.ceil((birthdayDate - today) / (1000 * 60 * 60 * 24));
        birthdays.push({ userId, month, day, year, daysUntil });
    }
    return birthdays.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, limit);
}

function getTodayBirthdays(guildId) {
    const guild = birthdayData[guildId];
    if (!guild) return [];
    
}



