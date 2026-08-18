const Database = require('better-sqlite3');
const config = require('./app');

let db = null;

function getDatabase() {
  if (!db) {
    db = new Database(config.dbFile, {
      verbose: config.nodeEnv === 'development' ? console.log : null
    });
    // Habilitar claves foráneas y modo WAL para transacciones concurrentes seguras
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

module.exports = {
  getDatabase
};
