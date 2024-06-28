const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./currency.sqlite', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the currency database.');
});

db.run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, balance INTEGER DEFAULT 0)');

// Функции для начисления валюты
function addCurrencyForMessage(userId, amount) {
    db.run('INSERT INTO users (id, balance) VALUES ($userId, $amount) ON CONFLICT(id) DO UPDATE SET balance = balance + $amount', {
        $amount: amount,
        $userId: userId
    }, (err) => {
        if (err) console.error(err.message);
    });
}

function addCurrencyForVoice(userId, amount) {
    db.run('INSERT INTO users (id, balance) VALUES ($userId, $amount) ON CONFLICT(id) DO UPDATE SET balance = balance + $amount', {
        $amount: amount,
        $userId: userId
    }, (err) => {
        if (err) console.error(err.message);
    });
}

// Функция для получения баланса пользователя
function getUserBalance(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT balance FROM users WHERE id = $userId', {
            $userId: userId
        }, (err, row) => {
            if (err) reject(err);
            resolve(row ? row.balance : 0);
        });
    });
}

// Экспорт функций
module.exports = {
    addCurrencyForMessage,
    addCurrencyForVoice,
    getUserBalance
};