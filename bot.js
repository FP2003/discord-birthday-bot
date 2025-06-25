const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Config
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Storage
const birthdayFile = path.join(__dirname, 'birthdays.json');

// Load data
function loadBirthday() {
    try {
        if (fs.existsSync(birthdayFile)) {
            const data = fs.readFileSync(birthdayFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading birthday');
    }
    return {};
}

// Save birthday
function saveBirthday(data) {
    try {
        fs.writeFileSync(birthdayFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving birthday');
    }
}

// Structure of sav
let birthdayData = loadBirthday();

const commands = [
    new SlashCommandBuilder()
        .setName('setbirthday')
        .setDescription('Skizzo says set your birthday')
        .addIntegerOption(option => option.setName('month')
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
                .setMinValue(1990)
                .setMaxValue(new Date().getFullYear())),
    
    new SlashCommandBuilder()
            .setName('birthday')
            .setDescription('Skizzo says lets check someones birthday')
            .addUserOption(option => option.setName('user')
                .setDescription('Skizzo to check birthday for')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('birthdays')
        .setDescription('Skizzo says list the upcoming birthdays in this server'),

    new SlashCommandBuilder()
        .setName('removebirthday')
        .setDescription('Skizzo says remove your birthday from the database'),

    new SlashCommandBuilder()
        .setName('birthdaychannel')
        .setDescription('Skizzo says set the channel for birthday announcements (Admin only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel for birthday announcements')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

]