const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../backend/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    db.all("SELECT * FROM medicoes;", (err, rows) => {
        if (err) {
            console.error('Error querying:', err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});
