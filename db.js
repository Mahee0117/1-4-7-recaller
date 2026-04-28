// db.js — Database initialization using sql.js (pure JavaScript SQLite)
// sql.js works without any native compilation, perfect for all environments.

const initSqlJs = require("sql.js");
const fs        = require("fs");
const path      = require("path");

const DB_PATH = path.join(__dirname, "topics.db");

// We export a promise that resolves to the db instance.
// In server.js we await this before starting the server.
async function createDb() {
  const SQL = await initSqlJs();

  let db;
  // If a database file already exists, load it; otherwise create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Helper: persist the in-memory state back to disk after every write.
  // sql.js works in-memory, so we call this after every INSERT/UPDATE/DELETE.
  db._persist = function () {
    const data = this.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // Thin wrapper so we can use db.all(sql, params) like better-sqlite3
  db.all = function (sql, params = []) {
    const stmt    = this.prepare(sql);
    const results = [];
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  };

  // Thin wrapper for INSERT/UPDATE/DELETE: returns { lastInsertRowid }
  db.exec_write = function (sql, params = []) {
    const stmt = this.prepare(sql);
    stmt.run(params);
    stmt.free();
    const rowid = this.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
    this._persist();
    return { lastInsertRowid: rowid };
  };

  // Create tables if they don't exist.
  // NOTE: revision dates are NEVER stored — only study_date
  db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_name  TEXT    NOT NULL,
      study_date  TEXT    NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS completions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id        INTEGER NOT NULL,
      revision_number INTEGER NOT NULL,
      completed_at    TEXT    NOT NULL,
      UNIQUE(topic_id, revision_number)
    );
  `);

  db._persist();
  return db;
}

module.exports = { createDb };
