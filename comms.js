const db = new sqlite3.Database('./currency.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the currency database.');
});

db.run(CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, balance INTEGER));

// Функции для начисления валюты
function addCurrencyForMessage(userId, amount) {
    db.run(UPDATE users SET balance = balance + ? WHERE id = ?, [amount, userId], (err) => {
        if (err) return console.error(err.message);
    });
}

function addCurrencyForVoice(userId, amount) {
    db.run(UPDATE users SET balance = balance + ? WHERE id = ?, [amount, userId], (err) => {
        if (err) return console.error(err.message);
    });
}

// Функция для получения баланса пользователя
function getUserBalance(userId) {
    return new Promise((resolve, reject) => {
        db.get(SELECT balance FROM users WHERE id = ?, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.balance : 0);
        });
    });
}

// Обработка событий голосового состояния
client.on('voiceStateUpdate', (oldState, newState) => {
    if (!newState.channelId || oldState.channelId === newState.channelId) return;

    const userId = newState.id;
    addCurrencyForVoice(userId, 1);
});

// Обработка сообщений
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Prevent spam by ignoring messages from the same user within a short time
    const userLastMessage = message.author.lastMessage;
    if (userLastMessage && userLastMessage.createdTimestamp + 30000 > message.createdTimestamp) {
        return;
    }

    addCurrencyForMessage(message.author.id, 1);
});

// Функция для отображения баланса пользователя
function showUserBalance(userId) {
    return new Promise((resolve, reject) => {
        getUserBalance(userId).then(balance => {
            resolve(`Ваш баланс: ${balance}`);
        }).catch(reject);
    });
}

// Экспорт функций
module.exports = {
    addCurrencyForMessage,
    addCurrencyForVoice,
    getUserBalance,
    showUserBalance
};