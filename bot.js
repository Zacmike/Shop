const { Client, GatewayIntentBits, PermissionsBitField, Partials } = require("discord.js");
const { addCurrencyForMessage, addCurrencyForVoice, getUserBalance, setUserBalance } = require('./currency');
const { token, prefix } = require('./config.json');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { buyItem } = require('./shop'); // Импорт функции покупки предметов

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User]
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

const voiceTimers = new Map();
const messageCooldowns = new Map();

bot.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.member.id;

    if (!newState.channelId || oldState.channelId === newState.channelId) {
        return;
    }

    if (newState.channelId && !oldState.channelId) {
        const timer = setInterval(() => {
            addCurrencyForVoice(userId, 2);
        }, 40 * 60 * 1000);
        voiceTimers.set(userId, timer);
    } else if (!newState.channelId && oldState.channelId) {
        clearInterval(voiceTimers.get(userId));
        voiceTimers.delete(userId);
    }
});

bot.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'баланс') {
            const balance = await getUserBalance(message.author.id);
            try {
                const member = await message.guild.members.fetch(message.author.id);
                const balanceImage = await generateBalanceImage(member, balance);
                await message.reply({ files: [{ attachment: balanceImage, name: 'balance.png' }] });
            } catch (error) {
                console.error('Error generating balance image:', error);
                message.reply(`Ваш баланс: ${balance} монет.`);
            }
        } else if (command === 'начислить') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('У вас нет прав на использование этой команды.');
            }

            if (args.length < 2) {
                return message.reply('Использование: !начислить <@пользователь> <количество>');
            }

            const user = message.mentions.users.first();
            if (!user) {
                return message.reply('Не удалось определить пользователя. Пожалуйста, укажите пользователя через упоминание (@).');
            }

            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                return message.reply('Укажите корректное количество монет для начисления.');
            }

            addCurrencyForMessage(user.id, amount);
            message.reply(`Успешно начислено ${amount} монет пользователю ${user.username}.`);
        } else if (command === 'списать') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply('У вас нет прав на использование этой команды.');
            }

            if (args.length < 2) {
                return message.reply('Использование: !списать <@пользователь> <количество>');
            }

            const user = message.mentions.users.first();
            if (!user) {
                return message.reply('Не удалось определить пользователя. Пожалуйста, укажите пользователя через упоминание (@).');
            }

            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
                return message.reply('Укажите корректное количество монет для списания.');
            }

            const balance = await getUserBalance(user.id);
            if (balance < amount) {
                return message.reply(`Недостаточно средств. Текущий баланс пользователя ${user.username}: ${balance} монет.`);
            }

            setUserBalance(user.id, balance - amount);
            message.reply(`Успешно списано ${amount} монет с пользователя ${user.username}.`);
        } else if (command === 'купить') {
            if (args.length < 1) {
                return message.reply('Использование: !купить <id_предмета>');
            }

            const itemId = args[0];
            const itemCost = 10; // This should be replaced with actual item cost logic

            try {
                await buyItem(message.author.id, itemId, itemCost);
                message.reply(`Вы успешно купили предмет с ID ${itemId} за ${itemCost} монет.`);
            } catch (error) {
                message.reply(`Ошибка при покупке: ${error.message}`);
            }
        } else if (command === 'магазин') {
            // This should be replaced with actual shop items logic
            const shopItems = [
                { id: '1', name: 'Item 1', cost: 10 },
                { id: '2', name: 'Item 2', cost: 20 },
                { id: '3', name: 'Item 3', cost: 30 },
            ];

            let shopMessage = 'Доступные предметы в магазине:\n';
            shopItems.forEach(item => {
                shopMessage += `ID: ${item.id}, Название: ${item.name}, Цена: ${item.cost} монет\n`;
            });

            message.reply(shopMessage);
        } else {
            message.reply('Неизвестная команда. Используйте !баланс для проверки баланса.');
        }
    } else {
        const lastMessageTime = messageCooldowns.get(message.author.id);
        const now = Date.now();
        const cooldown = 5 * 60 * 1000;

        if (!lastMessageTime || (now - lastMessageTime) >= cooldown) {
            addCurrencyForMessage(message.author.id, 1);
            messageCooldowns.set(message.author.id, now);
        }
    }
});

async function generateBalanceImage(member, balance) {
    try {
        const avatarUrl = member.user.displayAvatarURL({ format: 'png', size: 256 });
        const avatarResponse = await fetch(avatarUrl);
        const avatarBuffer = await avatarResponse.buffer();

        const avatar = await sharp(avatarBuffer)
            .resize(200, 200)
            .png()
            .toBuffer();

        const backgroundUrl = 'https://i.pinimg.com/564x/30/e5/ec/30e5ec8f1ec47882de36ee53e26fada9.jpg';
        const backgroundResponse = await fetch(backgroundUrl);
        const backgroundBuffer = await backgroundResponse.buffer();

        const background = await sharp(backgroundBuffer)
            .resize(700, 250)
            .toBuffer();

        const image = sharp(background);

        const fontPath = path.join(__dirname, 'assets/fonts/Feral.ttf');
        const textSvg = `
            <svg width="700" height="250">
                <style>
                    @font-face {
                        font-family: 'Feral';
                        src: url('file://${fontPath}');
                    }
                    .title { fill: white; font-size: 48px; font-family: 'Feral'; font-weight: bold; }
                    .balance { fill: white; font-size: 36px; font-family: 'Feral'; font-weight: bold; }
                </style>
                <text x="250" y="100" class="title">${member.displayName}</text>
                <text x="250" y="150" class="balance">Ваш баланс: ${balance} монет</text>
            </svg>
        `;

        const textBuffer = Buffer.from(textSvg);

        const compositeImage = await image
            .composite([{ input: avatar, top: 25, left: 25 }, { input: textBuffer, top: 0, left: 0 }])
            .png()
            .toBuffer();

        return compositeImage;
    } catch (error) {
        console.error('Failed to generate balance image:', error);
        throw new Error('Failed to generate balance image');
    }
}

bot.login(token);