module.exports = {
    name: 'addcurrency',
    description: 'Add currency to a user',
    async execute(message, args, db) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('У вас нет прав для использования этой команды.');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
            return message.reply('Укажите действительное количество.');
        }

        try {
            const row = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
            if (row) {
                await db.run('UPDATE users SET balance = ? WHERE id = ?', [row.balance + amount, userId]);
                message.reply(`Баланс пользователя <@${userId}> обновлен на ${amount} монет.`);
            } else {
                // ...
            }
        } catch (err) {
            console.error(err.message);
        }
    }
};