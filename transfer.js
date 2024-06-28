module.exports = {
    name: 'transfer',
    description: 'Transfer currency to another user',
    async execute(message, args, db) {
        const senderId = message.author.id;
        const receiverId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Укажите действительное количество.');
        }

        try {
            const senderRow = await db.get('SELECT balance FROM users WHERE id = ?', [senderId]);

            if (!senderRow || senderRow.balance < amount) {
                return message.reply('У вас недостаточно средств.');
            }

            await db.run('UPDATE users SET balance = ? WHERE id = ?', [senderRow.balance - amount, senderId]);

            const receiverRow = await db.get('SELECT balance FROM users WHERE id = ?', [receiverId]);

            if (receiverRow) {
                await db.run('UPDATE users SET balance = ? WHERE id = ?', [receiverRow.balance + amount, receiverId]);
            } else {
                await db.run('INSERT INTO users (id, balance) VALUES (?, ?)', [receiverId, amount]);
            }

            message.reply(`Вы успешно перевели ${amount} монет пользователю <@${receiverId}>.`);
        } catch (err) {
            console.error(err.message);
            message.reply('Произошла ошибка при выполнении перевода.');
        }
    }
};
