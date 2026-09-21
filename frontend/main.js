const API_URL = 'http://localhost:3000/api';

// Estado global
let token = localStorage.getItem('token');
let currentChart = null;
let heatmapInstance = null;
let imoveisCadastrados = [];

window.showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 translate-y-[-20px] opacity-0 ${type === 'success' ? 'bg-green-600' : 'bg-red-500'}`;
    toast.textContent = message;
    
    document.getElementById('toast-container').appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });
    
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

let confirmCallback = null;
window.showConfirm = (message, onConfirm) => {
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirm-modal').classList.remove('hidden');
};

document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmCallback = null;
});

document.getElementById('confirm-ok-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.add('hidden');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

// Função de Navegação
window.navigate = (sectionId) => {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');
    
    if (sectionId === 'dashboard') {
        loadDashboardData();
    } else if (sectionId === 'medicoes') {
        loadListaMedicoes();
    } else if (sectionId === 'clientes') {
        loadListaClientes();
    }
};

window.switchAuth = (type) => {
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    document.getElementById(`${type}-section`).classList.remove('hidden');
};

// Autenticação
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            token = data.token;
            showToast('Login realizado com sucesso!', 'success');
            checkAuth();
            navigate('dashboard');
        } else {
            showToast(data.error || 'Credenciais inválidas.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Erro ao fazer login', 'error');
    }
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-senha').value;
    
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Conta criada! Faça login.', 'success');
            switchAuth('login');
        } else {
            showToast(data.error || 'Erro ao registrar', 'error');
        }
    } catch (err) {
        console.error(err);
    }
});

window.logout = () => {
    token = null;
    localStorage.removeItem('token');
    checkAuth();
};

function checkAuth() {
    if (token) {
        document.getElementById('navbar').classList.remove('hidden');
        navigate('dashboard');
    } else {
        document.getElementById('navbar').classList.add('hidden');
        switchAuth('login');
    }
}

// Cadastro de Cliente
document.getElementById('cadastro-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const empresa = document.getElementById('cad-empresa').value;
    const plantaFile = document.getElementById('cad-planta').files[0];
    
    if (!plantaFile) return showToast('Selecione uma planta', 'error');

    try {
        const formData = new FormData();
        formData.append('planta', plantaFile);
        formData.append('empresa', empresa);
        
        const clienteRes = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (clienteRes.ok) {
            showToast('Cliente cadastrado com sucesso!', 'success');
            e.target.reset();
            fecharModalNovoCliente();
            loadListaClientes();
        } else {
            showToast('Erro ao cadastrar cliente', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Erro ao cadastrar cliente', 'error');
    }
});

// Medições
document.getElementById('medicao-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        imovel_id: parseInt(document.getElementById('med-imovel').value),
        semana: document.getElementById('med-semana').value,
        horario: document.getElementById('med-horario').value,
        comodo: document.getElementById('med-comodo').value,
        coordenadas: {
            x: parseFloat(document.getElementById('med-x').value),
            y: parseFloat(document.getElementById('med-y').value)
        },
        velocidade_24ghz: parseFloat(document.getElementById('med-24').value),
        velocidade_5ghz: parseFloat(document.getElementById('med-50').value)
    };
    
    if (isNaN(payload.coordenadas.x) || isNaN(payload.coordenadas.y)) {
        return showToast('Por favor, clique no mapa para definir as coordenadas do cômodo.', 'error');
    }
    
    try {
        const res = await fetch(`${API_URL}/medicoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast('Medição lançada!', 'success');
            document.getElementById('med-x').value = '';
            document.getElementById('med-y').value = '';
            document.getElementById('med-comodo').value = '';
            document.getElementById('med-pin').classList.add('hidden');
            
            fecharModalNovaMedicao();
            loadListaMedicoes();
        } else {
            showToast('Erro ao lançar medição', 'error');
        }
    } catch (err) {
        console.error(err);
    }
});

async function updateImoveisSelect() {
    const res = await fetch(`${API_URL}/dados`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
        const { imoveis, clientes } = await res.json();
        imoveisCadastrados = imoveis;
        const select = document.getElementById('med-imovel');
        select.innerHTML = '<option value="">Selecione um imóvel</option>';
        imoveis.forEach(im => {
            const cliente = clientes.find(c => c.id === im.cliente_id);
            const opt = document.createElement('option');
            opt.value = im.id;
            opt.textContent = `${cliente?.empresa} (Imóvel #${im.id})`;
            select.appendChild(opt);
        });
    }
}

document.getElementById('med-imovel')?.addEventListener('change', (e) => {
    const imovelId = parseInt(e.target.value);
    const container = document.getElementById('med-mapa-container');
    const instrucao = document.getElementById('med-mapa-instrucao');
    
    if (!imovelId) {
        container.classList.add('hidden');
        instrucao.classList.add('hidden');
        return;
    }
    
    const imovel = imoveisCadastrados.find(im => im.id === imovelId);
    if (imovel && imovel.planta_url) {
        container.classList.remove('hidden');
        instrucao.classList.remove('hidden');
        
        const img = document.getElementById('med-mapa-img');
        img.src = `http://localhost:3000${imovel.planta_url}`;
        
        document.getElementById('med-pin').classList.add('hidden');
        document.getElementById('med-x').value = '';
        document.getElementById('med-y').value = '';
    } else {
        container.classList.add('hidden');
    }
});

document.getElementById('med-mapa-container')?.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    
    document.getElementById('med-x').value = pctX.toFixed(2);
    document.getElementById('med-y').value = pctY.toFixed(2);
    
    const pin = document.getElementById('med-pin');
    pin.classList.remove('hidden');
    pin.style.left = `${pctX}%`;
    pin.style.top = `${pctY}%`;
});

window.loadDashboardData = async () => {
    try {
        // Cache-busting para garantir dados mais recentes
        const res = await fetch(`${API_URL}/dados?t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        const { medicoes, imoveis, clientes } = data;
        
        const selectDash = document.getElementById('dash-imovel');
        
        if (selectDash.options.length !== imoveis.length) {
            const currentValue = selectDash.value;
            selectDash.innerHTML = '';
            imoveis.forEach(im => {
                const cliente = clientes.find(c => c.id === im.cliente_id);
                const opt = document.createElement('option');
                opt.value = im.id;
                opt.textContent = `${cliente?.empresa} (Imóvel #${im.id})`;
                selectDash.appendChild(opt);
            });
            if (currentValue) selectDash.value = currentValue;
        }
        
        if (imoveis.length === 0) return;
        
        const imovelId = selectDash.value ? parseInt(selectDash.value) : imoveis[0].id;
        const medicoesFiltradas = medicoes.filter(m => m.imovel_id === imovelId);
        const imovelSelecionado = imoveis.find(i => i.id === imovelId);
        
        renderChart(medicoesFiltradas);
        renderHeatmap(medicoesFiltradas, imovelSelecionado?.planta_url);
        
    } catch (err) {
        console.error(err);
    }
}

function renderChart(medicoes) {
    const ctx = document.getElementById('barChart').getContext('2d');
    const grupos = {};
    medicoes.forEach(m => {
        if (!grupos[m.comodo]) grupos[m.comodo] = { v24: [], v50: [] };
        grupos[m.comodo].v24.push(m.velocidade_24ghz);
        grupos[m.comodo].v50.push(m.velocidade_5ghz);
    });
    
    const labels = Object.keys(grupos);
    const data24 = labels.map(l => grupos[l].v24.reduce((a,b)=>a+b,0)/grupos[l].v24.length);
    const data50 = labels.map(l => grupos[l].v50.reduce((a,b)=>a+b,0)/grupos[l].v50.length);
    
    if (currentChart) currentChart.destroy();
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: '2.4GHz (Mbps)', data: data24, backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                { label: '5GHz (Mbps)', data: data50, backgroundColor: 'rgba(16, 185, 129, 0.7)' }
            ]
        },
        options: { responsive: true }
    });
}

function renderHeatmap(medicoes, plantaUrl) {
    const wrapper = document.getElementById('heatmap-wrapper');
    const img = document.getElementById('heatmap-bg-img');

    const render = () => {
        requestAnimationFrame(() => {
            const w = wrapper.offsetWidth;
            const h = wrapper.offsetHeight;
            
            if (w === 0 || h === 0) {
                setTimeout(render, 100);
                return;
            }

            const area = document.getElementById('heatmap-area');
            // Remove canvas antigo, se houver
            area.innerHTML = '';
            
            // É fundamental forçar as dimensões na div para o heatmap.js ler corretamente
            area.style.width = w + 'px';
            area.style.height = h + 'px';
            
            const points = medicoes
                .filter(m => m.coordenada_x != null && !isNaN(parseFloat(m.coordenada_x)))
                .map(m => {
                    let px = parseFloat(m.coordenada_x);
                    let py = parseFloat(m.coordenada_y);
                    
                    if (px <= 100 && py <= 100) {
                        px = (px / 100) * w;
                        py = (py / 100) * h;
                    }
                    
                    return {
                        x: Math.round(px),
                        y: Math.round(py),
                        value: parseFloat(m.velocidade_5ghz) || 0
                    };
                });
            
            if (points.length === 0) return;

            try {
                heatmapInstance = h337.create({
                    container: area,
                    radius: w > 800 ? 250 : 180, // Raio expandido para simular propagação Wi-Fi
                    maxOpacity: 0.8,
                    minOpacity: 0.05, // Opacidade mínima menor para um "fade out" mais natural nas bordas
                    blur: 0.95 // Maior desfoque para suavizar bastante as bordas
                });
                
                // O heatmap.js injeta style="position: relative" forçadamente no container
                // Isso quebra o nosso layout e empurra ele pra baixo. 
                // Vamos restaurar para absolute logo após a criação:
                area.style.position = 'absolute';
                area.style.top = '0';
                area.style.left = '0';
                
                // Pegar o maior valor real para normalizar as cores corretamente
                const maxVal = Math.max(...points.map(p => p.value));
                
                heatmapInstance.setData({
                    min: 0, 
                    max: maxVal > 0 ? maxVal : 100,
                    data: points
                });
            } catch (err) {
                console.error("Erro ao gerar heatmap:", err);
            }
        });
    };

    if (plantaUrl) {
        const targetUrl = `http://localhost:3000${plantaUrl}`;
        if (img.src === targetUrl) {
            if (img.complete) render();
            else {
                img.onload = render;
                img.onerror = render;
            }
        } else {
            img.onload = render;
            img.onerror = render;
            img.src = targetUrl;
        }
    } else {
        img.src = '';
        render(); // Still attempt to render if there's no planta
        const old = document.getElementById('dynamic-heatmap-container');
        if (old) old.remove();
        heatmapInstance = null;
    }
}

let dadosMedicoesCarregados = [];

window.abrirModalNovaMedicao = () => { updateImoveisSelect(); document.getElementById('nova-medicao-modal').classList.remove('hidden'); };
window.fecharModalNovaMedicao = () => document.getElementById('nova-medicao-modal').classList.add('hidden');

async function loadListaMedicoes() {
    try {
        const res = await fetch(`${API_URL}/dados`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        dadosMedicoesCarregados = data.medicoes;
        const container = document.getElementById('lista-medicoes-container');
        container.innerHTML = '';
        data.medicoes.forEach((m, index) => {
            const card = document.createElement('div');
            card.className = 'flex justify-between items-center bg-slate-900/60 border p-5 rounded-2xl';
            card.innerHTML = `<div>${m.comodo} - ${m.velocidade_5ghz} Mbps</div>
                <div class="flex gap-2">
                    <button onclick="abrirModalEdicao(${m.id})">Editar</button>
                    <button onclick="deletarMedicao(${m.id})">Excluir</button>
                </div>`;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

window.abrirModalEdicao = (id) => {
    const m = dadosMedicoesCarregados.find(x => x.id === id);
    if (!m) return;
    document.getElementById('edit-id').value = m.id;
    document.getElementById('edit-semana').value = m.semana;
    document.getElementById('edit-horario').value = m.horario;
    document.getElementById('edit-comodo').value = m.comodo;
    document.getElementById('edit-24').value = m.velocidade_24ghz;
    document.getElementById('edit-50').value = m.velocidade_5ghz;
    document.getElementById('edit-modal').classList.remove('hidden');
};

window.fecharModalEdicao = () => document.getElementById('edit-modal').classList.add('hidden');

document.getElementById('edit-medicao-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const payload = {
        semana: document.getElementById('edit-semana').value,
        horario: document.getElementById('edit-horario').value,
        comodo: document.getElementById('edit-comodo').value,
        velocidade_24ghz: parseFloat(document.getElementById('edit-24').value),
        velocidade_5ghz: parseFloat(document.getElementById('edit-50').value)
    };
    
    try {
        const res = await fetch(`${API_URL}/medicoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            showToast('Medição atualizada!', 'success');
            fecharModalEdicao();
            loadListaMedicoes();
        } else {
            showToast('Erro ao atualizar', 'error');
        }
    } catch (err) { console.error(err); }
});

window.deletarMedicao = async (id) => {
    try {
        const res = await fetch(`${API_URL}/medicoes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            showToast('Excluído!', 'success');
            loadListaMedicoes();
        } else {
            showToast('Erro ao excluir', 'error');
        }
    } catch (err) { console.error(err); }
};

let dadosClientesCarregados = [];

window.abrirModalNovoCliente = () => document.getElementById('novo-cliente-modal').classList.remove('hidden');
window.fecharModalNovoCliente = () => document.getElementById('novo-cliente-modal').classList.add('hidden');

window.abrirModalEditCliente = (id) => {
    const c = dadosClientesCarregados.find(x => x.id === id);
    if (!c) return;
    document.getElementById('edit-cliente-id').value = c.id;
    document.getElementById('edit-cliente-empresa').value = c.empresa;
    document.getElementById('edit-cliente-modal').classList.remove('hidden');
};

window.fecharModalEditCliente = () => document.getElementById('edit-cliente-modal').classList.add('hidden');

async function loadListaClientes() {
    try {
        const res = await fetch(`${API_URL}/dados`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        dadosClientesCarregados = data.clientes;
        const container = document.getElementById('lista-clientes-container');
        container.innerHTML = '';
        
        if (data.clientes.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-500 py-8">Nenhum cliente cadastrado.</p>`;
            return;
        }

        data.clientes.forEach(c => {
            const numImoveis = data.imoveis.filter(i => i.cliente_id === c.id).length;
            const card = document.createElement('div');
            card.className = 'flex justify-between items-center bg-slate-900/60 border border-white/10 rounded-2xl p-5 hover:bg-slate-800/80 transition-colors shadow-sm';
            
            card.innerHTML = `
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-white">${c.empresa}</h4>
                    <p class="text-sm text-slate-400 mt-1">${numImoveis} imóvel(is) vinculado(s)</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="abrirModalEditCliente(${c.id})" class="text-slate-300 hover:text-brand transition-colors p-2 bg-white/5 rounded-lg border border-white/5" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onclick="deletarCliente(${c.id})" class="text-slate-300 hover:text-red-500 transition-colors p-2 bg-white/5 rounded-lg border border-white/5" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

document.getElementById('edit-cliente-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-cliente-id').value;
    const empresa = document.getElementById('edit-cliente-empresa').value;
    const plantaInput = document.getElementById('edit-cliente-planta');
    
    const formData = new FormData();
    formData.append('empresa', empresa);
    if (plantaInput.files.length > 0) {
        formData.append('planta', plantaInput.files[0]);
    }
    
    try {
        const res = await fetch(`${API_URL}/clientes/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (res.ok) {
            showToast('Cliente atualizado!', 'success');
            fecharModalEditCliente();
            loadListaClientes();
            plantaInput.value = '';
            
            if (plantaInput.files.length > 0) {
                loadDashboardData();
            }
        } else {
            showToast('Erro ao atualizar cliente', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar cliente', 'error');
    }
});

window.deletarCliente = (id) => {
    showConfirm('ATENÇÃO: Excluir o cliente removerá TODOS os imóveis e medições vinculadas a ele. Deseja continuar?', async () => {
        try {
            const res = await fetch(`${API_URL}/clientes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                showToast('Cliente excluído com sucesso!', 'success');
                loadListaClientes();
                document.getElementById('dash-imovel').innerHTML = ''; 
            } else {
                showToast('Erro ao excluir cliente', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });
};

// Init
checkAuth();
