const { Client, GatewayIntentBits } = require("discord.js");
const { addCurrencyForMessage, addCurrencyForVoice, getUserBalance } = require('./currency'); // Импорт функций работы с базой данных
const { token, prefix } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();

const bot = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ] 
});

const db = new sqlite3.Database('./currency.sqlite', (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the currency database.');

    db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, balance INTEGER)');
});

bot.once('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

const voiceTimers = new Map(); // Для отслеживания времени, проведенного в голосовых каналах
const messageCooldowns = new Map(); // Для отслеживания времени последних сообщений

bot.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.member.id;

    if (!newState.channelId || oldState.channelId === newState.channelId) {
        return;
    }

    if (newState.channelId && !oldState.channelId) {
        // Пользователь присоединился к голосовому каналу
        const timer = setInterval(() => {
            addCurrencyForVoice(userId, 2); // Начисление 2 монет каждые 40 минут
        }, 40 * 60 * 1000); // 40 минут в миллисекундах
        voiceTimers.set(userId, timer);
    } else if (!newState.channelId && oldState.channelId) {
        // Пользователь покинул голосовой канал
        clearInterval(voiceTimers.get(userId));
        voiceTimers.delete(userId);
    }
});

bot.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return; // Игнорировать сообщения от ботов и не из гильдий

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'баланс') {
            const balance = await getUserBalance(message.author.id);
            message.reply(`Ваш баланс: ${balance} монет.`);
        } else if (command === 'начислить') {
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('У вас нет прав на использование этой команды.');
            }

            if (args.length < 2) {
                return message.reply('Использование: !начислить <@пользователь> <количество>');
            }

            const userId = message.mentions.users.first()?.id;

            if (!userId) {
                return message.reply('Не удалось определить пользователя. Пожалуйста, укажите пользователя через упоминание (@).');
            }

            const amount = parseInt(args[1]);

            if (isNaN(amount) || amount <= 0) {
                return message.reply('Укажите корректное количество монет для начисления.');
            }

            addCurrencyForMessage(userId, amount);
            message.reply(`Успешно начислено ${amount} монет пользователю ${message.mentions.users.first()}.`);
        } else {
            message.reply('Неизвестная команда. Используйте !баланс для проверки баланса.');
        }
    } else {
        const lastMessageTime = messageCooldowns.get(message.author.id);
        const now = Date.now();

        if (!lastMessageTime || (now - lastMessageTime) >= 5 * 60 * 1000) { // 5 минут в миллисекундах
            addCurrencyForMessage(message.author.id, 1);
            messageCooldowns.set(message.author.id, now);
        }
    }
});

bot.login(token);
