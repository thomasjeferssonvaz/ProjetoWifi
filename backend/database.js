const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Tabela de Usuários (Autenticação)
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT
    )`);

    // Tabela de Clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa TEXT,
      responsavel TEXT,
      endereco TEXT,
      usuario_id INTEGER,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )`);

    // Tabela de Imóveis
    db.run(`CREATE TABLE IF NOT EXISTS imoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      planta_url TEXT,
      local_ap_comodo TEXT,
      local_ap_x INTEGER,
      local_ap_y INTEGER,
      FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )`);

    // Tabela de Medições
    db.run(`CREATE TABLE IF NOT EXISTS medicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imovel_id INTEGER,
      semana TEXT,
      horario TEXT,
      comodo TEXT,
      coordenada_x INTEGER,
      coordenada_y INTEGER,
      velocidade_24ghz REAL,
      velocidade_5ghz REAL,
      FOREIGN KEY(imovel_id) REFERENCES imoveis(id)
    )`);
  });
}

module.exports = db;
