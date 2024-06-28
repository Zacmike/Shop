const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./currency.sqlite');

function buyItem(userId, itemId, itemCost) {
    return new Promise((resolve, reject) => {
        db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, row) => {
            if (err) return reject(err);
            if (row.balance < itemCost) {
                return reject(new Error('Недостаточно средств'));
            }

            db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [itemCost, userId], (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}

module.exports = { buyItem };