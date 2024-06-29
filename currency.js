const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./currency.sqlite');

// Функция для получения баланса пользователя
function getUserBalance(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.balance : 0);
        });
    });
}

// Функция для установки баланса пользователя
function setUserBalance(userId, balance) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO users (id, balance) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET balance = excluded.balance', [userId, balance], function(err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

// Функция для добавления валюты за сообщения
function addCurrencyForMessage(userId, amount) {
    getUserBalance(userId).then(balance => {
        setUserBalance(userId, balance + amount);
    }).catch(console.error);
}

// Функция для добавления валюты за нахождение в голосовом канале
function addCurrencyForVoice(userId, amount) {
    getUserBalance(userId).then(balance => {
        setUserBalance(userId, balance + amount);
    }).catch(console.error);
}

module.exports = { getUserBalance, setUserBalance, addCurrencyForMessage, addCurrencyForVoice };