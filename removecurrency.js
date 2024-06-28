module.exports = {
    name: 'removecurrency',
    description: 'Remove currency from a user',
    async execute(message, args, db) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('У вас нет прав для использования этой команды.');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
            return message.reply('Укажите действительное количество.');
        }

        db.get(`SELECT balance FROM users WHERE id = ?`, [userId], (err, row) => {
            if (err) return console.error(err.message);

            if (row) {
                const newBalance = row.balance - amount;
                db.run(`UPDATE users SET balance = ? WHERE id = ?`, [newBalance, userId], (err) => {
                    if (err) return console.error(err.message);
                    message.reply(`Баланс пользователя <@${userId}> обновлен на ${-amount} монет.`);
                });
            } else {
                message.reply('Пользователь не найден.');
            }
        });
    }
};
