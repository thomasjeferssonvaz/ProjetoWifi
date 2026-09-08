const express = require('express');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const SECRET_KEY = 'minha_chave_secreta_super_segura';

// Middleware de Autenticação
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'Nenhum token fornecido' });
  
  jwt.verify(token.split(' ')[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    req.userId = decoded.id;
    next();
  });
};

// Configuração do Multer para Upload de Imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: Imóveis e Clientes
 *   description: Endpoints para gerenciar clientes e seus respectivos imóveis
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Faz o upload de uma planta baixa (imagem)
 *     tags: [Imóveis e Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               planta:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 */
router.post('/upload', authMiddleware, upload.single('planta'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ message: 'Upload de arquivo concluído', fileUrl: `/uploads/${req.file.filename}` });
});

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Cadastra um novo cliente e seu imóvel
 *     tags: [Imóveis e Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               empresa:
 *                 type: string
 *               responsavel:
 *                 type: string
 *               endereco:
 *                 type: string
 *               planta_url:
 *                 type: string
 *               local_ap:
 *                 type: object
 *                 properties:
 *                   comodo:
 *                     type: string
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *     responses:
 *       201:
 *         description: Cliente e imóvel cadastrados com sucesso
 */
router.post('/clientes', authMiddleware, (req, res) => {
  const { empresa, responsavel, endereco, planta_url, local_ap } = req.body;
  
  db.run(
    'INSERT INTO clientes (empresa, responsavel, endereco, usuario_id) VALUES (?, ?, ?, ?)',
    [empresa, responsavel, endereco, req.userId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao cadastrar cliente' });
      
      const clienteId = this.lastID;
      db.run(
        'INSERT INTO imoveis (cliente_id, planta_url, local_ap_comodo, local_ap_x, local_ap_y) VALUES (?, ?, ?, ?, ?)',
        [clienteId, planta_url, local_ap?.comodo, local_ap?.x, local_ap?.y],
        function(errImovel) {
          if (errImovel) return res.status(500).json({ error: 'Erro ao cadastrar imóvel' });
          res.status(201).json({ message: 'Cliente e imóvel cadastrados', cliente_id: clienteId, imovel_id: this.lastID });
        }
      );
    }
  );
});

/**
 * @swagger
 * tags:
 *   name: Medições
 *   description: Endpoints para registro de medições
 */

/**
 * @swagger
 * /api/medicoes:
 *   post:
 *     summary: Registra uma nova medição
 *     tags: [Medições]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imovel_id:
 *                 type: integer
 *               semana:
 *                 type: string
 *               horario:
 *                 type: string
 *               comodo:
 *                 type: string
 *               coordenadas:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                   y:
 *                     type: number
 *               velocidade_24ghz:
 *                 type: number
 *               velocidade_5ghz:
 *                 type: number
 *     responses:
 *       201:
 *         description: Medição registrada com sucesso
 */
router.post('/medicoes', authMiddleware, (req, res) => {
  const { imovel_id, semana, horario, comodo, coordenadas, velocidade_24ghz, velocidade_5ghz } = req.body;
  
  db.run(
    'INSERT INTO medicoes (imovel_id, semana, horario, comodo, coordenada_x, coordenada_y, velocidade_24ghz, velocidade_5ghz) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [imovel_id, semana, horario, comodo, coordenadas?.x, coordenadas?.y, velocidade_24ghz, velocidade_5ghz],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao registrar medição' });
      res.status(201).json({ message: 'Medição registrada', id: this.lastID });
    }
  );
});

/**
 * @swagger
 * /api/medicoes/{id}:
 *   delete:
 *     summary: Remove uma medição
 *     tags: [Medições]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Medição removida
 */
router.delete('/medicoes/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM medicoes WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao remover medição' });
    res.json({ message: 'Medição removida' });
  });
});

/**
 * @swagger
 * /api/medicoes/{id}:
 *   put:
 *     summary: Atualiza uma medição
 *     tags: [Medições]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               semana:
 *                 type: string
 *               horario:
 *                 type: string
 *               comodo:
 *                 type: string
 *               velocidade_24ghz:
 *                 type: number
 *               velocidade_5ghz:
 *                 type: number
 *     responses:
 *       200:
 *         description: Medição atualizada
 */
router.put('/medicoes/:id', authMiddleware, (req, res) => {
  const { semana, horario, comodo, velocidade_24ghz, velocidade_5ghz } = req.body;
  db.run(
    'UPDATE medicoes SET semana = ?, horario = ?, comodo = ?, velocidade_24ghz = ?, velocidade_5ghz = ? WHERE id = ?',
    [semana, horario, comodo, velocidade_24ghz, velocidade_5ghz, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar medição' });
      res.json({ message: 'Medição atualizada' });
    }
  );
});

/**
 * @swagger
 * /api/clientes/{id}:
 *   delete:
 *     summary: Remove um cliente e suas dependências
 *     tags: [Cadastros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cliente removido
 */
router.delete('/clientes/:id', authMiddleware, (req, res) => {
  const cid = req.params.id;
  db.serialize(() => {
    // Remove as dependências manualmente por segurança
    db.run('DELETE FROM medicoes WHERE imovel_id IN (SELECT id FROM imoveis WHERE cliente_id = ?)', [cid]);
    db.run('DELETE FROM imoveis WHERE cliente_id = ?', [cid]);
    db.run('DELETE FROM clientes WHERE id = ?', [cid], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao remover cliente' });
      res.json({ message: 'Cliente e dependências removidos' });
    });
  });
});

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     summary: Atualiza o nome de um cliente
 *     tags: [Cadastros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               empresa:
 *                 type: string
 *               planta:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cliente atualizado
 */
router.put('/clientes/:id', authMiddleware, upload.single('planta'), (req, res) => {
  const { empresa } = req.body;
  const clientId = req.params.id;

  db.run('UPDATE clientes SET empresa = ? WHERE id = ?', [empresa, clientId], (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar cliente' });
    
    if (req.file) {
      const plantaUrl = `/uploads/${req.file.filename}`;
      db.get('SELECT id FROM imoveis WHERE cliente_id = ?', [clientId], (err, row) => {
        if (err || !row) return res.json({ message: 'Cliente atualizado' });
        
        db.run('UPDATE imoveis SET planta_url = ? WHERE id = ?', [plantaUrl, row.id], (err) => {
          // Reseta as coordenadas das medições desse imóvel já que a planta mudou
          db.run('UPDATE medicoes SET coordenada_x = NULL, coordenada_y = NULL WHERE imovel_id = ?', [row.id], (err) => {
            res.json({ message: 'Cliente e planta atualizados. Coordenadas resetadas.' });
          });
        });
      });
    } else {
      res.json({ message: 'Cliente atualizado' });
    }
  });
});

/**
 * @swagger
 * /api/dados:
 *   get:
 *     summary: Recupera os dados do usuário, clientes, imóveis e medições consolidadas
 *     tags: [Imóveis e Clientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados recuperados
 */
router.get('/dados', authMiddleware, (req, res) => {
  // Retorna os dados agrupados (em um cenário real, usaríamos JOINs ou promises agrupadas)
  db.all('SELECT * FROM clientes WHERE usuario_id = ?', [req.userId], (err, clientes) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar clientes' });
    
    db.all('SELECT * FROM imoveis WHERE cliente_id IN (SELECT id FROM clientes WHERE usuario_id = ?)', [req.userId], (err, imoveis) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar imóveis' });

      db.all('SELECT * FROM medicoes WHERE imovel_id IN (SELECT id FROM imoveis WHERE cliente_id IN (SELECT id FROM clientes WHERE usuario_id = ?))', [req.userId], (err, medicoes) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar medições' });
        
        res.json({ clientes, imoveis, medicoes });
      });
    });
  });
});

module.exports = router;
