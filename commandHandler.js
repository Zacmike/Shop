const fs = require('fs');
const path = require('path');

module.exports = (bot, prefix) => {
    bot.commands = new Map();
    bot.cooldowns = new Map();

    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const command = require(path.join(commandsPath, file));
            bot.commands.set(command.name, command);
            if (command.aliases) {
                command.aliases.forEach(alias => bot.commands.set(alias, command));
            }
        } catch (error) {
            console.error(`Error loading command ${file}:`, error);
        }
    }

    bot.on('messageCreate', async message => {
        if (message.author.bot || !message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = bot.commands.get(commandName);

        if (!command) return;

        // Check permissions
        if (command.permissions && !message.member.permissions.has(command.permissions)) {
            return message.reply('У вас нет прав для использования этой команды.');
        }

        // Check cooldowns
        if (!bot.cooldowns.has(command.name)) {
            bot.cooldowns.set(command.name, new Map());
        }
        const now = Date.now();
        const timestamps = bot.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`Пожалуйста, подождите ${timeLeft.toFixed(1)} секунд перед использованием команды \`${command.name}\`.`);
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        try {
            await command.execute(bot, message, args);
        } catch (error) {
            console.error(error);
            message.reply('Произошла ошибка при выполнении команды!');
        }
    });
};
