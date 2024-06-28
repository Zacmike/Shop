const { Client, GatewayIntentBits, MessageMentions } = require("discord.js");
const { addCurrencyForMessage, addCurrencyForVoice, getUserBalance } = require('./currency'); // Импорт функций работы с базой данных
const { token, prefix } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();

// Инициализация клиента Discord
const bot = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // добавлено для отслеживания голосовых каналов
    ] 
});

// Подключение к базе данных SQLite
const db = new sqlite3.Database('./currency.sqlite', (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the currency database.');

    // Инициализация таблицы users, если она не существует
    db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, balance INTEGER)');
});

// Событие ready, когда бот готов к работе
bot.once('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

// Обработка событий голосового состояния
bot.on('voiceStateUpdate', (oldState, newState) => {
    if (!newState.channelId || oldState.channelId === newState.channelId) return;

    const userId = newState.member.id;
    addCurrencyForVoice(userId, 1); // Использование функции для начисления валюты за голосовой канал
});

// Обработка сообщений
bot.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return; // Игнорировать сообщения от ботов и не из гильдий

    if (message.content.startsWith(prefix)) {
        // Обработка команд
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'баланс') {
            // Команда для отображения баланса пользователя
            const balance = await getUserBalance(message.author.id);
            message.reply(`Ваш баланс: ${balance} монет.`);
        }
        // Команда для начисления монет
        else if (command === 'начислить') {
            // Проверка прав администратора
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply('У вас нет прав на использование этой команды.');
            }

            // Проверка аргументов команды
            if (args.length < 2) {
                return message.reply('Использование: !начислить <@пользователь> <количество>');
            }

            // Извлечение ID пользователя из упоминания
            const userId = message.mentions.users.first()?.id;

            // Проверка наличия упомянутого пользователя
            if (!userId) {
                return message.reply('Не удалось определить пользователя. Пожалуйста, укажите пользователя через упоминание (@).');
            }

            const amount = parseInt(args[1]);

            // Проверка корректности указанного количества
            if (isNaN(amount) || amount <= 0) {
                return message.reply('Укажите корректное количество монет для начисления.');
            }

            // Выполнение начисления монет
            addCurrencyForMessage(userId, amount);
            message.reply(`Успешно начислено ${amount} монет пользователю ${message.mentions.users.first()}.`);
        }
        // Другие команды можно добавить здесь
        else {
            message.reply('Неизвестная команда. Используйте !баланс для проверки баланса.');
        }
    } else {
        // Предотвращение спама путем начисления валюты за сообщения
        addCurrencyForMessage(message.author.id, 1);
    }
});

// Вход в Discord с использованием токена
bot.login(token);