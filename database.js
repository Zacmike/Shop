// ./database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the database.');
});

module.exports = db;