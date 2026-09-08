# Proposta de Arquitetura: Sistema de Análise de Redes Wi-Fi

Este documento detalha a estruturação, as funcionalidades e a arquitetura sugerida para o desenvolvimento da aplicação web focada na análise de redes sem fio, atendendo aos requisitos do projeto de extensão universitária.

## 1. Visão Geral do Sistema
A aplicação web tem como objetivo centralizar o cadastro de informações de clientes (empresas), mapear o layout do imóvel (planta baixa) e registrar medições de velocidade de rede (2.4GHz e 5GHz). A partir desses dados, o sistema calculará médias e gerará insumos visuais críticos para o relatório final: gráficos comparativos de desempenho e mapas de calor de cobertura.

## 2. Módulos e Funcionalidades

### 2.1. Módulo de Cadastro (Dados do Cliente e Imóvel)
* **Formulário de Identificação:** Campos para inserção de dados corporativos (nome da empresa, responsável, endereço completo).
* **Mapeamento de Layout:** Definição estrutural do ambiente, especificando a quantidade de salas, quartos, corredores e outras áreas.
* **Upload e Demarcação da Planta:** Interface para upload da planta baixa em formato de imagem (JPEG/PNG) e uma ferramenta de marcação interativa (pin) para definir visualmente a localização exata do Ponto de Acesso (AP).

### 2.2. Módulo de Coleta e Lançamento de Medições
* **Organização Temporal:** Estruturação das medições separadas por semanas (ex: Semana 24/03, Semana 31/03) e por horários de pico ou horários predefinidos (ex: Segunda 13h, Quarta 18h, Domingo 20h).
* **Entrada de Velocidades:** Formulários dinâmicos para a inserção das taxas de download/upload (em Mbps) coletadas em cada cômodo. Haverá separação obrigatória entre as medições da rede de 2,4GHz e da rede de 5GHz.
* **Processamento de Médias:** O backend processará todas as 3 medições semanais de um cômodo e calculará automaticamente a média matemática de velocidade para cada frequência.

### 2.3. Módulo de Visualização Analítica (Dashboard)
* **Gráficos Comparativos:** Utilização de bibliotecas de renderização para gerar gráficos de barras emparelhadas. O eixo X representará os cômodos (Sala 1, Sala 2, Quarto, etc.) e o eixo Y representará a velocidade média (Mbps), exibindo lado a lado as barras de 2,4GHz e 5GHz.
* **Mapa de Calor (Heatmap):** O sistema sobreporá uma camada de renderização térmica sobre a imagem da planta baixa carregada no Módulo 2.1. Utilizando as coordenadas X/Y dos cômodos e as médias calculadas, o sistema exibirá zonas de alta velocidade (cores quentes/verdes) e zonas de degradação de sinal (cores frias/vermelhas).

### 2.4. Módulo de Exportação e Documentação
* Geração de relatórios contendo as métricas de rede consolidadas, prints dos gráficos e o mapa de calor renderizado, facilitando a extração dos dados para a montagem da documentação final.

## 3. Stack Tecnológico Sugerido

* **Linguagem Principal:** JavaScript / Node.js
* **Backend:** Express.js (para gerenciamento de rotas e APIs RESTful) e Multer (para o upload seguro e tratamento das imagens da planta baixa).
* **Autenticação:** JSON Web Tokens (JWT) para proteção das rotas de upload e lançamento de dados.
* **Frontend:** HTML5, CSS3, e JavaScript vanilla.
* **Bibliotecas Visuais:**
  * `Chart.js` ou `ApexCharts` para a construção dos gráficos de barras.
  * `heatmap.js` para a plotagem dos dados de intensidade de sinal sobre o elemento `<canvas>` contendo a planta baixa.

## 4. Estrutura de Dados (Modelo Base em JSON)

```json
{
  "cliente": {
    "empresa": "Nome da Empresa",
    "responsavel": "Nome do Responsavel",
    "endereco": "Rua Exemplo, 123"
  },
  "imovel": {
    "planta_url": "/uploads/planta_17012345.png",
    "local_ap": { "comodo": "Sala 1", "x": 350, "y": 200 }
  },
  "medicoes": [
    {
      "semana": "24/03",
      "horario": "Segunda 13h",
      "comodo": "Sala 1",
      "coordenadas": { "x": 350, "y": 200 },
      "velocidade_24ghz": 34.5,
      "velocidade_5ghz": 98.2
    }
  ]
}
```

## 5. Estratégia de Deploy e Hospedagem

Para garantir que a aplicação fique acessível externamente de forma segura e padronizada para apresentação:
* **Containerização:** Empacotar a aplicação Node.js utilizando **Docker**, garantindo isolamento do ambiente.
* **Orquestração:** Gerenciar o container da aplicação e o container do banco de dados utilizando **Portainer** ou `docker-compose`.
* **Acesso Externo e DNS:** será utilizado domínio customizado (como `wifi.mikrolabs.dev`).
