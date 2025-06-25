const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { GatewayIntentBits } = require('discord.js');
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
            const data = fs.readFileSync(birthdayFile, 'utf8')
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('Error loading birthdays')
    }
    return {}
}