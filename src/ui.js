const CNAE_DATA = [
  [6462000,"Holdings de instituições não-financeiras",89],
  [4781400,"Comércio varejista de artigos do vestuário e acessórios",68],
  [8630503,"Atividade médica ambulatorial restrita a consultas",49],
  [7112000,"Serviços de engenharia",47],
  [9430800,"Atividades de associações de defesa de direitos sociais",40],
  [4120400,"Construção de edifícios",39],
  [8299799,"Outras atividades de serviços prestados principalmente às empresas",38],
  [6463800,"Outras sociedades de participação, exceto holdings",35],
  [4754701,"Comércio varejista de móveis",34],
  [6810201,"Compra e venda de imóveis próprios",33],
  [4930202,"Transporte rodoviário de carga intermunicipal/interestadual",32],
  [5611203,"Lanchonetes, casas de chá, de sucos e similares",31],
  [5611201,"Restaurantes e similares",31],
  [6911701,"Serviços advocatícios",28],
  [6424704,"Cooperativas de crédito rural",27],
  [4619200,"Representantes comerciais — mercadorias em geral",26],
  [7020400,"Consultoria em gestão empresarial",24],
  [4774100,"Comércio varejista de artigos de óptica",24],
  [4712100,"Minimercados, mercearias e armazéns",24],
  [9491000,"Atividades de organizações religiosas ou filosóficas",23],
  [4110700,"Incorporação de empreendimentos imobiliários",22],
  [8211300,"Serviços combinados de escritório e apoio administrativo",21],
  [8599604,"Treinamento em desenvolvimento profissional e gerencial",21],
  [6612605,"Agentes de investimentos em aplicações financeiras",20],
  [4530703,"Comércio varejista de peças e acessórios para veículos",20],
  [6920601,"Atividades de contabilidade",20],
  [6424703,"Cooperativas de crédito mútuo",19],
  [4744099,"Comércio varejista de materiais de construção em geral",19],
  [4789099,"Comércio varejista de outros produtos não especificados",19],
  [6810202,"Aluguel de imóveis próprios",18],
  [4751201,"Comércio varejista de equipamentos e suprimentos de informática",18],
  [8630504,"Atividade odontológica",17],
  [4520001,"Manutenção e reparação mecânica de veículos automotores",17],
  [4753900,"Comércio varejista de eletrodomésticos e áudio e vídeo",17],
  [9499500,"Atividades associativas não especificadas anteriormente",16],
  [8610102,"Pronto-socorro e unidades de urgência",15],
  [4930201,"Transporte rodoviário de carga municipal",15],
  [1412601,"Confecção de peças de vestuário exceto roupas íntimas",14],
  [4729699,"Comércio varejista de produtos alimentícios em geral",14],
  [4618499,"Outros representantes comerciais especializados",13],
  [4771701,"Farmácias sem manipulação de fórmulas",13],
  [7319002,"Promoção de vendas",13],
  [4723700,"Comércio varejista de bebidas",13],
  [7490104,"Intermediação e agenciamento de serviços e negócios",12],
  [4722901,"Comércio varejista de carnes — açougues",12],
  [8610101,"Atividades de atendimento hospitalar",12],
  [9492800,"Atividades de organizações políticas",12],
  [6209100,"Suporte técnico e manutenção em TI",12],
  [4752100,"Comércio varejista de equipamentos de telefonia",11],
  [6821801,"Corretagem na compra e venda de imóveis",11],
  [4772500,"Comércio varejista de cosméticos e higiene pessoal",11],
  [8630502,"Atividade médica ambulatorial com exames complementares",11],
  [8640202,"Laboratórios clínicos",11],
  [8630599,"Atividades de atenção ambulatorial não especificadas",10],
  [9313100,"Atividades de condicionamento físico",10],
  [134200,"Cultivo de café",10],
  [8630501,"Atividade médica ambulatorial com procedimentos cirúrgicos",10],
  [4721102,"Padaria e confeitaria com predominância de revenda",10],
  [8599699,"Outras atividades de ensino não especificadas",9],
  [4744005,"Comércio varejista de materiais de construção",9],
  [4742300,"Comércio varejista de material elétrico",9],
  [8650003,"Atividades de psicologia e psicanálise",9],
  [7311400,"Agências de publicidade",9],
  [4759899,"Comércio varejista de outros artigos de uso pessoal",9],
  [4761003,"Comércio varejista de artigos de papelaria",9],
  [9511800,"Reparação e manutenção de computadores",9],
  [4773300,"Comércio varejista de artigos médicos e ortopédicos",9],
  [8888888,"Atividade econômica não informada",8],
  [4784900,"Comércio varejista de GLP",8],
  [6822600,"Gestão e administração da propriedade imobiliária",8],
  [9602502,"Atividades de estética e cuidados com a beleza",8],
  [9001999,"Artes cênicas e atividades complementares",8],
  [8640201,"Laboratórios de anatomia patológica e citológica",8],
  [4711302,"Supermercados",8],
  [5611204,"Bares e estabelecimentos especializados em bebidas",8],
  [4724500,"Comércio varejista de hortifrutigranjeiros",8],
  [4783101,"Comércio varejista de joalheria",8],
  [4789002,"Comércio varejista de plantas e flores naturais",8],
  [8219999,"Preparação de documentos e apoio administrativo",8],
  [8230001,"Organização de feiras, congressos e festas",8],
  [6201501,"Desenvolvimento de programas de computador sob encomenda",7],
  [8650099,"Atividades de profissionais da área de saúde",7],
  [7711000,"Locação de automóveis sem condutor",7],
  [7739099,"Aluguel de máquinas e equipamentos sem operador",7],
  [7911200,"Agências de viagens",7],
  [6622300,"Corretores e agentes de seguros e previdência",7],
  [3101200,"Fabricação de móveis com predominância de madeira",7],
  [4782201,"Comércio varejista de calçados",7],
  [4771702,"Farmácias com manipulação de fórmulas",7],
  [4755502,"Comércio varejista de artigos de armarinho",7],
  [4313400,"Obras de terraplenagem",7],
  [4530701,"Comércio atacadista de peças para veículos automotores",7],
  [9001902,"Produção musical",7],
  [4689399,"Comércio atacadista de outros produtos intermediários",7],
  [4639701,"Comércio atacadista de produtos alimentícios em geral",7],
  [7490101,"Serviços de tradução e interpretação",6],
  [4617600,"Representantes comerciais — produtos alimentícios e bebidas",6],
  [8640299,"Serviços de complementação diagnóstica e terapêutica",6],
  [4541206,"Comércio varejista de peças para motocicletas",6],
  [8650004,"Atividades de fisioterapia",6],
  [8512100,"Educação infantil — pré-escola",6],
  [230600,"Atividades de apoio à produção florestal",6],
  [6491300,"Sociedades de fomento mercantil — factoring",6],
  [5223100,"Estacionamento de veículos",6],
  [4511102,"Comércio varejista de automóveis e utilitários usados",6],
  [6421200,"Bancos comerciais",6],
  [4299599,"Outras obras de engenharia civil",6],
  [4744001,"Comércio varejista de ferragens e ferramentas",6],
  [151201,"Criação de bovinos para corte",6],
  [4789001,"Comércio varejista de suvenires, bijuterias e artesanatos",6],
  [6110803,"Serviços de comunicação multimídia — SCM",6],
];

let activeCnae = null;
const rowRefs = new Map();

function toggleCnae(code, desc, row) {
  if (activeCnae === code) {
    row.classList.remove('active');
    activeCnae = null;
    window.networkViz?.clearCnaeFilter();
    return;
  }
  if (activeCnae) {
    rowRefs.get(activeCnae)?.classList.remove('active');
  }
  activeCnae = code;
  row.classList.add('active');
  const labels = window.networkViz?.filterByCnae(code) ?? [];
  window.networkViz?.showCnaeInfo(code, desc, labels);
}

function initCnaePanel() {
  const list = document.getElementById('cnae-list');
  const frag = document.createDocumentFragment();

  CNAE_DATA.forEach(([code, desc, cnt]) => {
    const row = document.createElement('div');
    row.className = 'cnae-row';
    row.title = `CNAE ${code}`;
    row.innerHTML =
      `<span class="cnae-desc">${desc}</span>` +
      `<span class="connection-count">${cnt}</span>`;

    rowRefs.set(code, row);
    row.addEventListener('click', () => toggleCnae(code, desc, row));
    frag.appendChild(row);
  });

  list.appendChild(frag);
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

window.addEventListener('vorcaro-loaded', () => {
  const nodes = window.networkViz?.data?.nodes;
  if (nodes) {
    const cnaeCounts = new Map();
    const statusCounts = new Map();
    for (const n of nodes) {
      if (n.cnae != null) cnaeCounts.set(n.cnae, (cnaeCounts.get(n.cnae) ?? 0) + 1);
      if (n.status)       statusCounts.set(n.status, (statusCounts.get(n.status) ?? 0) + 1);
    }
    for (const [code, , ] of CNAE_DATA) {
      const row = rowRefs.get(code);
      if (!row) continue;
      const badge = row.querySelector('.connection-count');
      if (badge) badge.textContent = cnaeCounts.get(code) ?? 0;
    }
    document.querySelectorAll('.status-btn').forEach(btn => {
      const cnt = statusCounts.get(btn.dataset.status) ?? 0;
      btn.querySelector('.status-count').textContent = cnt;
    });
  }

  if (activeCnae === null) return;
  const row = rowRefs.get(activeCnae);
  if (!row) return;
  const desc = CNAE_DATA.find(([c]) => c === activeCnae)?.[1] ?? '';
  const labels = window.networkViz?.filterByCnae(activeCnae) ?? [];
  window.networkViz?.showCnaeInfo(activeCnae, desc, labels);
});

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
