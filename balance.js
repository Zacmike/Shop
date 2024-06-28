module.exports = {
    name: 'balance',
    description: 'Проверьте свой баланс',
    async execute(message, args, db) {
        const userId = message.author.id;

        db.get(`SELECT balance FROM users WHERE id = ?`, [userId], (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }

            if (row) {
                message.reply(`Ваш баланс: ${row.balance} монет`);
            } else {
                message.reply('У вас нет монет.');
            }
        });
    }
};
