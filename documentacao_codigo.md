# Elaboração das Principais Partes do Código

Este documento detalha o funcionamento dos principais componentes de código desenvolvidos para o sistema de Análise de Redes Wi-Fi. A arquitetura está dividida em **Backend** (Node.js/Express) e **Frontend** (Vanilla JS).

## 1. Banco de Dados e Modelagem (`backend/database.js`)

Foi utilizado o **SQLite** devido à sua portabilidade. O arquivo `database.js` inicializa a conexão e cria as tabelas de forma estruturada.

```javascript
// Exemplo da estrutura da tabela de Medições
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
```
**O que acontece aqui:** A tabela de medições mantém não apenas os valores das frequências (2.4GHz e 5GHz), mas também as coordenadas espaciais `X` e `Y`, cruciais para a plotagem posterior no mapa de calor. A amarração (`FOREIGN KEY`) garante integridade com o imóvel analisado.

## 2. Autenticação e Segurança (`backend/routes/auth.js`)

A proteção das rotas ocorre via **JSON Web Tokens (JWT)** em conjunto com o `bcrypt` para não armazenar senhas em texto puro.

```javascript
// Login e Geração de Token
const match = await bcrypt.compare(senha, user.senha);
if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '8h' });
```
**O que acontece aqui:** Se as credenciais forem válidas, o servidor gera um JWT com validade de 8 horas, embutindo o ID do usuário para que o middleware saiba a qual conta as requisições subsequentes pertencem.

## 3. Upload de Arquivos de Imagem (`backend/routes/api.js`)

O envio da planta baixa do imóvel (imagem) é manipulado utilizando a biblioteca **Multer**.

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/upload', authMiddleware, upload.single('planta'), (req, res) => {
    // A imagem fica salva fisicamente e o servidor retorna a URL estática
});
```
**O que acontece aqui:** O Multer intercepta o `multipart/form-data`, salva a imagem fisicamente na pasta `/uploads` com um nome único (timestamp) e disponibiliza o endereço relativo dessa imagem para ser salva no banco atrelada a um cliente.

## 4. Dinâmica de Frontend SPA (`frontend/main.js`)

Em vez de redirecionar o usuário entre várias páginas HTML, a interface opera como um SPA (Single Page Application), escondendo e exibindo seções baseadas no ID.

```javascript
window.navigate = (sectionId) => {
    // Esconde todas as seções
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    
    // Mostra apenas a seção solicitada
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    
    // Gatilhos de carregamento preguiçoso
    if (sectionId === 'dashboard') loadDashboardData();
};
```
**O que acontece aqui:** Quando o usuário clica no menu lateral/superior, as outras janelas recebem `.hidden` via CSS ( `display: none` ). Isso torna o aplicativo ultra-rápido do lado do cliente.

## 5. Renderização dos Gráficos Comparativos (Chart.js)

Os dados crus advindos da API são transformados em arrays segmentados antes de entrarem no Chart.js.

```javascript
// Agrupando dados da API em médias matemáticas por cômodo
const grupos = {};
medicoes.forEach(m => {
    if (!grupos[m.comodo]) grupos[m.comodo] = { v24: [], v50: [] };
    grupos[m.comodo].v24.push(m.velocidade_24ghz);
    grupos[m.comodo].v50.push(m.velocidade_5ghz);
});

// Passando para o Chart.js renderizar barras agrupadas
currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: Object.keys(grupos), // Nome dos cômodos
        datasets: [
            { label: '2.4GHz', data: data24 },
            { label: '5GHz', data: data50 }
        ]
    }
});
```

## 6. Plotagem Termográfica do Mapa de Calor (heatmap.js)

O Heatmap é gerado posicionando coordenadas absolutas (X, Y) sobre o container pai (que possui a planta do imóvel como `background-image`).

```javascript
const wrapper = document.getElementById('heatmap-wrapper');
// Definindo a imagem baixada como papel de parede
wrapper.style.backgroundImage = `url(http://localhost:3000${plantaUrl})`;

heatmapInstance = h337.create({ container: area, radius: 50 });

const points = medicoes.map(m => {
    return {
        x: m.coordenada_x,
        y: m.coordenada_y,
        value: m.velocidade_5ghz // Utilizado a 5GHz como referência térmica
    };
});

// A biblioteca cuida de cruzar os pontos e gerar gradientes de cor
heatmapInstance.setData({
    max: Math.max(...points.map(p => p.value), 100),
    data: points
});
```
**O que acontece aqui:** Através dos valores obtidos na medição, zonas com velocidades baixas assumem tons mais frios (ou fracos, a depender do valor máximo). O parâmetro `radius` dita o quão grande será a propagação "visual" daquele ponto de captura Wi-Fi no canvas.
