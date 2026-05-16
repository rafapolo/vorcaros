const CNAE_DATA = [
  [6462000,"Holdings de Instituições",89],
  [4781400,"Varejo de Vestuário",68],
  [8630503,"Consultas Médicas Ambulatoriais",49],
  [7112000,"Serviços de Engenharia",47],
  [9430800,"Associações de Direitos",40],
  [4120400,"Construção de Edifícios",39],
  [8299799,"Serviços Empresariais Diversos",38],
  [6463800,"Sociedades de Participações",35],
  [4754701,"Varejo de Móveis",34],
  [6810201,"Compra e Venda Imóveis",33],
  [4930202,"Transporte de Cargas",32],
  [5611203,"Lanchonetes e Sucos",31],
  [5611201,"Restaurantes e Similares",31],
  [6911701,"Serviços Advocatícios",28],
  [6424704,"Cooperativas de Crédito",27],
  [4619200,"Representação de Mercadorias",26],
  [7020400,"Consultoria em Gestão",24],
  [4774100,"Varejo de Óptica",24],
  [4712100,"Minimercados e Mercearias",24],
  [9491000,"Organizações Religiosas Filosóficas",23],
  [4110700,"Incorporação de Empreendimentos",22],
  [8211300,"Apoio Administrativo Escritório",21],
  [8599604,"Treinamento Profissional Gerencial",21],
  [6612605,"Agentes de Investimentos",20],
  [4530703,"Peças e Veículos",20],
  [6920601,"Atividades de Contabilidade",20],
  [6424703,"Cooperativas de Crédito",19],
  [4744099,"Varejo de Construção",19],
  [4789099,"Varejo de Diversos Produtos",19],
  [6810202,"Aluguel de Imóveis",18],
  [4751201,"Varejo de Informática",18],
  [8630504,"Atividade Odontológica Clínica",17],
  [4520001,"Manutenção de Veículos",17],
  [4753900,"Varejo de Eletrodomésticos",17],
  [9499500,"Atividades Associativas Diversas",16],
  [8610102,"Atendimento de Urgência",15],
  [4930201,"Transporte de Cargas",15],
  [1412601,"Confecção de Vestuário",14],
  [4729699,"Varejo de Alimentos",14],
  [4618499,"Representação de Negócios",13],
  [4771701,"Farmácias Sem Manipulação",13],
  [7319002,"Promoção de Vendas",13],
  [4723700,"Varejo de Bebidas",13],
  [7490104,"Intermediação de Serviços",12],
  [4722901,"Açougues Varejo Carnes",12],
  [8610101,"Atendimento Hospitalar Geral",12],
  [9492800,"Atividades Políticas Organizadas",12],
  [6209100,"Suporte de TI",12],
  [4752100,"Varejo de Telefonia",11],
  [6821801,"Corretagem de Imóveis",11],
  [4772500,"Varejo de Cosméticos",11],
  [8630502,"Exames Médicos Clínicos",11],
  [8640202,"Laboratórios Clínicos Gerais",11],
  [8630599,"Atenção Ambulatorial Geral",10],
  [9313100,"Condicionamento Físico Academias",10],
  [134200,"Cultivo de Café",10],
  [8630501,"Procedimentos Médicos Cirúrgicos",10],
  [4721102,"Padaria e Confeitaria",10],
  [8599699,"Atividades de Ensino",9],
  [4744005,"Varejo de Construção",9],
  [4742300,"Varejo de Material",9],
  [8650003,"Psicologia e Psicanálise",9],
  [7311400,"Agências de Publicidade",9],
  [4759899,"Varejo de Uso Pessoal",9],
  [4761003,"Varejo de Papelaria",9],
  [9511800,"Reparação de Computadores",9],
  [4773300,"Varejo de Produtos Médicos",9],
  [8888888,"Atividade Não Informada",8],
  [4784900,"Varejo de Gás GLP",8],
  [6822600,"Gestão de Imóveis",8],
  [9602502,"Estética e Beleza",8],
  [9001999,"Artes Cênicas Complementares",8],
  [8640201,"Laboratórios de Patologia",8],
  [4711302,"Supermercados Varejo",8],
  [5611204,"Bares de Bebidas",8],
  [4724500,"Hortifrúti Varejo",8],
  [4783101,"Joalheria Varejo",8],
  [4789002,"Flores Naturais Varejo",8],
  [8219999,"Apoio Administrativo Documentos",8],
  [8230001,"Organização de Eventos",8],
  [6201501,"Desenvolvimento de Software",7],
  [8650099,"Profissionais de Saúde",7],
  [7711000,"Aluguel de Automóveis",7],
  [7739099,"Aluguel de Máquinas",7],
  [7911200,"Agências de Viagens",7],
  [6622300,"Corretagem de Seguros",7],
  [3101200,"Fabricação de Móveis",7],
  [4782201,"Varejo de Calçados",7],
  [4771702,"Farmácias Com Manipulação",7],
  [4755502,"Varejo de Armarinho",7],
  [4313400,"Obras de Terraplenagem",7],
  [4530701,"Atacado de Peças",7],
  [9001902,"Produção Musical Eventos",7],
  [4689399,"Atacado de Intermediários",7],
  [4639701,"Atacado de Alimentos",7],
  [7490101,"Tradução e Interpretação",6],
  [4617600,"Representação de Alimentos",6],
  [8640299,"Diagnóstico e Terapias",6],
  [4541206,"Peças de Motocicletas",6],
  [8650004,"Fisioterapia Clínica",6],
  [8512100,"Educação Pré-Escola",6],
  [230600,"Apoio À Produção",6],
  [6491300,"Factoring e Fomento",6],
  [5223100,"Estacionamento de Veículos",6],
  [4511102,"Veículos Usados",6],
  [6421200,"Bancos Comerciais Gerais",6],
  [4299599,"Engenharia Civil Obras",6],
  [4744001,"Varejo de Ferragens",6],
  [151201,"Criação de Bovinos",6],
  [4789001,"Suvenires e Artesanato",6],
  [6110803,"Comunicação Multimídia",6],
];

let activeCnae = null;
const rowRefs = new Map();

window.syncCnaePanel = function(code) {
  if (activeCnae && activeCnae !== code) {
    rowRefs.get(activeCnae)?.classList.remove('active');
  }
  activeCnae = code;
  rowRefs.get(code)?.classList.add('active');
};

function toggleCnae(code, desc, row) {
  if (activeCnae === code) {
    row.classList.remove('active');
    activeCnae = null;
    window.networkViz?.clearCnaeFilter();
    return;
  }
  rowRefs.get(activeCnae)?.classList.remove('active');
  activeCnae = code;
  row.classList.add('active');
  const labels = window.networkViz?.filterByCnae(code) ?? [];
  window.networkViz?.showCnaeInfo(code, desc, labels);
}

let sortedData = CNAE_DATA.map(([code, desc, cnt]) => ({ code, desc, cnt }));
const ROW_H = 30;
const OVERSCAN = 4;

let listEl = null;
let spacerEl = null;
let viewportEl = null;
const renderedRows = new Map();

function renderVisible() {
  if (!listEl) return;
  const scrollTop = listEl.scrollTop;
  const viewH = listEl.clientHeight || 400;
  const startI = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endI = Math.min(sortedData.length - 1, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);

  for (const [i, { el, code }] of renderedRows) {
    if (i < startI || i > endI) {
      viewportEl.removeChild(el);
      renderedRows.delete(i);
      if (rowRefs.get(code) === el) rowRefs.delete(code);
    }
  }

  for (let i = startI; i <= endI; i++) {
    if (renderedRows.has(i)) continue;
    const { code, desc, cnt } = sortedData[i];
    const row = document.createElement('div');
    row.className = 'cnae-row' + (activeCnae === code ? ' active' : '');
    row.style.cssText = `position:absolute;top:${i * ROW_H}px;left:0;right:0`;
    row.title = `CNAE ${code}`;
    row.innerHTML = `<span class="cnae-desc">${desc}</span><span class="connection-count">${cnt}</span>`;
    rowRefs.set(code, row);
    row.addEventListener('click', () => toggleCnae(code, desc, row));
    viewportEl.appendChild(row);
    renderedRows.set(i, { el: row, code });
  }
}

function initCnaePanel() {
  listEl = document.getElementById('cnae-list');
  listEl.style.position = 'relative';

  spacerEl = document.createElement('div');
  spacerEl.style.cssText = `height:${sortedData.length * ROW_H}px;pointer-events:none`;
  listEl.appendChild(spacerEl);

  viewportEl = document.createElement('div');
  viewportEl.style.cssText = 'position:absolute;top:0;left:0;right:0';
  listEl.appendChild(viewportEl);

  listEl.addEventListener('scroll', renderVisible, { passive: true });
  renderVisible();
}

const STATUS_ORDER = ['Ativa', 'Baixada', 'Inapta', 'Suspensa'];

function initStatusPanel() {
  const container = document.getElementById('status-toggles');
  STATUS_ORDER.forEach(status => {
    const btn = document.createElement('button');
    btn.className = `status-btn status-${status.toLowerCase()}`;
    btn.dataset.status = status;
    btn.innerHTML = `<span class="status-label">${status}</span><span class="status-count">—</span>`;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      window.networkViz?.toggleStatusFilter(status);
    });
    container.appendChild(btn);
  });
}

function refreshCounts() {
  const nodes = window.networkViz?.data?.nodes;
  if (!nodes) return;
  const showOrange = window.networkViz?.showEmpresasSocios ?? true;

  const cnaeCounts = new Map();
  const statusCounts = new Map();
  for (const n of nodes) {
    if (n.isOrange && !showOrange) continue;
    if (n.cnae != null) cnaeCounts.set(n.cnae, (cnaeCounts.get(n.cnae) ?? 0) + 1);
    if (n.status)       statusCounts.set(n.status, (statusCounts.get(n.status) ?? 0) + 1);
  }

  for (const item of sortedData) item.cnt = cnaeCounts.get(item.code) ?? 0;
  sortedData.sort((a, b) => b.cnt - a.cnt);
  for (const { el } of renderedRows.values()) viewportEl.removeChild(el);
  renderedRows.clear();
  rowRefs.clear();
  renderVisible();

  document.querySelectorAll('.status-btn').forEach(btn => {
    const cnt = statusCounts.get(btn.dataset.status) ?? 0;
    btn.querySelector('.status-count').textContent = cnt;
  });
}

window.addEventListener('vorcaro-loaded', () => {
  spacerEl.style.height = (sortedData.length * ROW_H) + 'px';
  refreshCounts();

  if (activeCnae === null) return;
  const entry = sortedData.find(d => d.code === activeCnae);
  if (!entry) return;
  const labels = window.networkViz?.filterByCnae(activeCnae) ?? [];
  window.networkViz?.showCnaeInfo(activeCnae, entry.desc, labels);
});

window.addEventListener('vorcaro-socios-toggle', refreshCounts);

document.addEventListener('DOMContentLoaded', () => {
  initStatusPanel();
  initCnaePanel();

  document.getElementById('toggle-controls').addEventListener('click', () => {
    document.getElementById('left-panel').classList.toggle('open');
    document.getElementById('nodeInfo').classList.remove('open');
  });

  document.getElementById('network-canvas').addEventListener('click', () => {
    document.getElementById('left-panel').classList.remove('open');
  });
});
