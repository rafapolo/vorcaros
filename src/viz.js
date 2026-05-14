import {
  zoom, zoomIdentity, select,
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide
} from 'd3';

const QUALIFICACAO_MAP = {
  0: "Não informada",
  5: "Administrador",
  8: "Conselheiro de Administração",
  9: "Curador",
  10: "Diretor",
  11: "Interventor",
  12: "Inventariante",
  13: "Liquidante",
  14: "Mãe",
  15: "Pai",
  16: "Presidente",
  17: "Procurador",
  18: "Secretário",
  19: "Síndico (Condomínio)",
  20: "Sociedade Consorciada",
  21: "Sociedade Filiada",
  22: "Sócio",
  23: "Sócio Capitalista",
  24: "Sócio Comanditado",
  25: "Sócio Comanditário",
  26: "Sócio de Indústria",
  28: "Sócio-Gerente",
  29: "Sócio Incapaz ou Relat.Incapaz (exceto menor)",
  30: "Sócio Menor (Assistido/Representado)",
  31: "Sócio Ostensivo",
  32: "Tabelião",
  33: "Tesoureiro",
  34: "Titular de Empresa Individual Imobiliária",
  35: "Tutor",
  37: "Sócio Pessoa Jurídica Domiciliado no Exterior",
  38: "Sócio Pessoa Física Residente no Exterior",
  39: "Diplomata",
  40: "Cônsul",
  41: "Representante de Organização Internacional",
  42: "Oficial de Registro",
  43: "Responsável",
  46: "Ministro de Estado das Relações Exteriores",
  47: "Sócio Pessoa Física Residente no Brasil",
  48: "Sócio Pessoa Jurídica Domiciliado no Brasil",
  49: "Sócio-Administrador",
  50: "Empresário",
  51: "Candidato a cargo Político Eletivo",
  52: "Sócio com Capital",
  53: "Sócio sem Capital",
  54: "Fundador",
  55: "Sócio Comanditado Residente no Exterior",
  56: "Sócio Comanditário Pessoa Física Residente no Exterior",
  57: "Sócio Comanditário Pessoa Jurídica Domiciliado no Exterior",
  58: "Sócio Comanditário Incapaz",
  59: "Produtor Rural",
  60: "Cônsul Honorário",
  61: "Responsável indígena",
  62: "Representante da Instituição Extraterritorial",
  63: "Cotas em Tesouraria",
  64: "Administrador Judicial",
  65: "Titular Pessoa Física Residente ou Domiciliado no Brasil",
  66: "Titular Pessoa Física Residente ou Domiciliado no Exterior",
  67: "Titular Pessoa Física Incapaz ou Relativamente Incapaz (exceto menor)",
  68: "Titular Pessoa Física Menor (Assistido/Representado)",
  69: "Beneficiário Final",
  70: "Administrador Residente ou Domiciliado no Exterior",
  71: "Conselheiro de Administração Residente ou Domiciliado no Exterior",
  72: "Diretor Residente ou Domiciliado no Exterior",
  73: "Presidente Residente ou Domiciliado no Exterior",
  74: "Sócio-Administrador Residente ou Domiciliado no Exterior",
  75: "Fundador Residente ou Domiciliado no Exterior",
  78: "Titular Pessoa Jurídica Domiciliada no Brasil",
  79: "Titular Pessoa Jurídica Domiciliada no Exterior"
};

class FastNetworkVisualization {
  constructor() {
    this.canvas = document.getElementById('network-canvas');
    this.context = this.canvas.getContext('2d');
    this.data = null;
    this.transform = zoomIdentity;
    this.simulation = null;
    this.zoom = null;
    this.selectedNode = null;
    this.selectedConnectedIds = new Set();
    this.labelPositions = [];
    this.showLabels = true;

    this.simulationParams = {
      linkDistance: 145,
      chargeStrength: -500,
      linkStrength: 0.1,
      alphaDecay: 0.02
    };

    this.visualParams = {
      linkOpacity: 0.6,
      linkWidth: 1.0
    };

    this.setupCanvas();
    this.setupEventListeners();
    this.loadNetwork();
  }

  setupCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);

    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.context.scale(ratio, ratio);

    this.width = width;
    this.height = height;
  }

  setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchNodes(e.target.value.toLowerCase());
    });

    document.getElementById('showLabelsToggle').addEventListener('change', (e) => {
      this.showLabels = e.target.checked;
      this.redraw();
    });

    this.zoom = zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this.redraw();
      });

    select(this.canvas).call(this.zoom);

    this.canvas.addEventListener('click', (event) => {
      if (!this.data) return;

      const rect = this.canvas.getBoundingClientRect();
      const canvasX = (event.clientX - rect.left - this.transform.x) / this.transform.k;
      const canvasY = (event.clientY - rect.top - this.transform.y) / this.transform.k;

      let clickedNode = null;
      let minDistance = Infinity;

      for (const node of this.data.nodes) {
        const dx = canvasX - node.x;
        const dy = canvasY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 30 && distance < minDistance) {
          clickedNode = node;
          minDistance = distance;
        }
      }

      if (clickedNode) {
        this.selectNode(clickedNode);
        this.showNodeInfo(clickedNode);
      } else {
        this.clearSelection();
        this.hideNodeInfo();
      }
    });

    select(this.canvas).call(
      this.zoom.transform,
      zoomIdentity.translate(this.width / 2, this.height / 2).scale(0.5)
    );

    window.addEventListener('resize', () => {
      this.setupCanvas();
      if (this.data) this.redraw();
    });

    document.getElementById('closeNodeInfo').addEventListener('click', () => {
      this.hideNodeInfo();
      this.clearSelection();
    });
  }

  getQualificacaoDescription(codigo) {
    return QUALIFICACAO_MAP[codigo] || "Não informada";
  }

  async loadNetwork() {
    this.showLoading(true);

    const paths = [
      'output/network_vorcano_cosmograph.json',
      './output/network_vorcano_cosmograph.json',
      'network_vorcano_cosmograph.json',
    ];

    let loaded = false;

    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        this.data = await response.json();
        console.log(`Loaded: ${this.data.nodes.length} nodes, ${this.data.links.length} links`);
        this.processData();
        this.initializeSimulation();
        this.updateStats();
        loaded = true;
        break;
      } catch (err) {
        console.log(`Error with ${path}:`, err.message);
      }
    }

    if (!loaded) {
      console.error('Failed to load network data');
      alert('Não foi possível carregar os dados da rede. Gere os dados primeiro com:\n\npython generate_network.py\npython convert_to_cosmograph.py');
    }

    this.showLoading(false);
  }

  processData() {
    for (const node of this.data.nodes) {
      if (!node.originalColor) {
        node.originalColor = node.color;
        node.originalSize = node.size;
      } else {
        node.color = node.originalColor;
        node.size = node.originalSize;
      }

      switch (node.color) {
        case '#ff0000': node.radius = 12; node.originalRadius = 12; break;
        case '#4488ff': node.radius = 9;  node.originalRadius = 9;  break;
        case '#800080': node.radius = 7;  node.originalRadius = 7;  break;
        default:        node.radius = 5;  node.originalRadius = 5;  break;
      }

      node.isHenrique = node.color === '#ff0000';
    }
  }

  initializeSimulation() {
    this.simulation = forceSimulation(this.data.nodes)
      .force('link', forceLink(this.data.links).id(d => d.id)
        .distance(this.simulationParams.linkDistance)
        .strength(this.simulationParams.linkStrength))
      .force('charge', forceManyBody().strength(this.simulationParams.chargeStrength))
      .force('center', forceCenter(0, 0))
      .force('collision', forceCollide().radius(d => d.radius + 2))
      .alphaDecay(this.simulationParams.alphaDecay)
      .on('tick', () => this.redraw());
  }

  redraw() {
    if (!this.data) return;

    const ctx = this.context;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.k, this.transform.k);

    this.drawLinks();
    this.drawNodes();

    if (this.showLabels || this.selectedNode) {
      this.drawLabels();
    }

    if (this.transform.k > 1.0) {
      this.drawEdgeLabels();
    }

    ctx.restore();
  }

  drawLinks() {
    const ctx = this.context;
    ctx.shadowBlur = 0;

    // Batch all non-highlighted links in one path
    ctx.globalAlpha = this.visualParams.linkOpacity;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = this.visualParams.linkWidth;
    ctx.beginPath();
    for (const link of this.data.links) {
      if (this.selectedNode && (link.source.id === this.selectedNode.id || link.target.id === this.selectedNode.id)) continue;
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
    }
    ctx.stroke();

    if (this.selectedNode) {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = Math.max(1.5, 2 / this.transform.k);
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (const link of this.data.links) {
        if (link.source.id !== this.selectedNode.id && link.target.id !== this.selectedNode.id) continue;
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawNodes() {
    const ctx = this.context;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (!this.selectedNode) {
      // Batch nodes by fill color
      const groups = new Map();
      for (const node of this.data.nodes) {
        let arr = groups.get(node.color);
        if (!arr) { arr = []; groups.set(node.color, arr); }
        arr.push(node);
      }
      for (const [color, nodes] of groups) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const node of nodes) {
          ctx.moveTo(node.x + node.radius, node.y);
          ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        }
        ctx.fill();
      }
      return;
    }

    const strokeWidth = Math.max(1, 2 / this.transform.k);

    // Batch unrelated nodes by color
    const groups = new Map();
    for (const node of this.data.nodes) {
      if (node.id === this.selectedNode.id || this.selectedConnectedIds.has(node.id)) continue;
      let arr = groups.get(node.color);
      if (!arr) { arr = []; groups.set(node.color, arr); }
      arr.push(node);
    }
    for (const [color, nodes] of groups) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const node of nodes) {
        ctx.moveTo(node.x + node.radius, node.y);
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      }
      ctx.fill();
    }

    // Connected nodes with glow
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff88';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = strokeWidth;
    for (const node of this.data.nodes) {
      if (node.id === this.selectedNode.id || !this.selectedConnectedIds.has(node.id)) continue;
      const r = node.radius * 1.4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Selected node
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2 / this.transform.k);
    ctx.beginPath();
    ctx.arc(this.selectedNode.x, this.selectedNode.y, this.selectedNode.radius * 1.8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawLabels() {
    this.labelPositions = [];
    const z = this.transform.k;

    const labelsToShow = this.data.nodes.filter(node => {
      if (this.showLabels) {
        if (z > 3.0) return node.radius >= 3;
        if (z > 1.5) return node.radius >= 5;
        return node.radius >= 7;
      }
      if (this.selectedNode) {
        return node.id === this.selectedNode.id || this.selectedConnectedIds.has(node.id);
      }
      if (z > 2.0) return node.radius >= 3;
      if (z > 1.0) return node.isHenrique || node.radius >= 5;
      return node.isHenrique || node.radius > 6;
    });

    labelsToShow.sort((a, b) => {
      if (a.isHenrique !== b.isHenrique) return b.isHenrique - a.isHenrique;
      if (this.selectedNode) {
        if (a.id === this.selectedNode.id) return -1;
        if (b.id === this.selectedNode.id) return 1;
      }
      return b.radius - a.radius;
    });

    let maxLabels;
    if (this.showLabels) {
      maxLabels = Math.max(20, Math.min(200, Math.round(30 * z)));
    } else if (z > 2.0) {
      maxLabels = Math.max(200, Math.min(800, z * 300));
    } else if (z > 1.0) {
      maxLabels = Math.max(100, Math.min(400, z * 200));
    } else {
      maxLabels = Math.max(50, Math.min(150, z * 100));
    }

    const ctx = this.context;
    ctx.textAlign = 'center';

    for (const node of labelsToShow.slice(0, maxLabels)) {
      let fontSize = Math.max(14, Math.min(24, 14 + z * 3));
      let maxLength = Math.max(15, Math.min(60, 15 + z * 15));

      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) {
          fontSize = Math.max(14, Math.min(24, fontSize * 1.5));
          maxLength = Math.min(80, maxLength * 1.5);
        } else if (this.selectedConnectedIds.has(node.id)) {
          fontSize = Math.max(12, Math.min(22, fontSize * 1.2));
          maxLength = Math.min(70, maxLength * 1.2);
        }
      }

      const text = node.label.length > maxLength ? node.label.substring(0, maxLength) + '...' : node.label;
      ctx.font = `${fontSize}px Monda`;
      const textWidth = ctx.measureText(text).width;
      const textHeight = fontSize + 2;
      const offset = node.radius + Math.max(8, 12 / z);
      const labelY = this.findBestLabelPosition(node.x, node.y - offset, textWidth, textHeight);

      let fillStyle = '#ffffff';
      let lineWidth = Math.max(2, 4 / z);

      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) {
          fillStyle = '#ffff00';
          lineWidth = Math.max(3, 5 / z);
        } else if (this.selectedConnectedIds.has(node.id)) {
          fillStyle = '#00ff88';
        }
      }

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = fillStyle;
      ctx.strokeText(text, node.x, labelY);
      ctx.fillText(text, node.x, labelY);

      this.labelPositions.push({
        x: node.x - textWidth / 2 - 2,
        y: labelY - textHeight - 2,
        width: textWidth + 4,
        height: textHeight + 4
      });
    }
  }

  findBestLabelPosition(x, preferredY, width, height) {
    const s = Math.max(15, 25 / this.transform.k);
    const positions = [
      preferredY, preferredY - s, preferredY + s,
      preferredY - s * 2, preferredY + s * 2,
      preferredY - s * 3, preferredY + s * 3
    ];
    for (const y of positions) {
      const r = { x: x - width / 2 - 2, y: y - height - 2, width: width + 4, height: height + 4 };
      if (!this.hasLabelCollision(r)) return y;
    }
    return preferredY;
  }

  hasLabelCollision(rect) {
    return this.labelPositions.some(pos =>
      rect.x < pos.x + pos.width &&
      rect.x + rect.width > pos.x &&
      rect.y < pos.y + pos.height &&
      rect.y + rect.height > pos.y
    );
  }

  drawEdgeLabels() {
    if (!this.selectedNode || !this.data.links) return;

    const ctx = this.context;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    const fontSize = Math.max(10, Math.min(14, 10 + this.transform.k * 1.5));
    ctx.font = `${fontSize}px Monda`;

    for (const link of this.data.links) {
      if (!link.qualificacao_socio && link.qualificacao_socio !== 0) continue;

      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sourceId !== this.selectedNode.id && targetId !== this.selectedNode.id) continue;

      const desc = this.getQualificacaoDescription(link.qualificacao_socio);
      if (!desc || desc === 'Não informada') continue;

      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
      const off = 15 / this.transform.k;
      const labelX = midX + Math.sin(angle) * off;
      const labelY = midY - Math.cos(angle) * off;

      const maxLen = Math.max(10, 20 - (2 - this.transform.k) * 5);
      const text = desc.length > maxLen ? desc.substring(0, maxLen) + '...' : desc;

      ctx.fillStyle = '#00ff88';
      ctx.strokeText(text, labelX, labelY);
      ctx.fillText(text, labelX, labelY);
    }
  }

  selectNode(node) {
    this.selectedNode = node;
    this.selectedConnectedIds = new Set();
    if (node) {
      for (const link of this.data.links) {
        const s = typeof link.source === 'object' ? link.source.id : link.source;
        const t = typeof link.target === 'object' ? link.target.id : link.target;
        if (s === node.id) this.selectedConnectedIds.add(t);
        else if (t === node.id) this.selectedConnectedIds.add(s);
      }
    }
    this.redraw();
  }

  clearSelection() {
    this.selectedNode = null;
    this.selectedConnectedIds = new Set();
    this.redraw();
  }

  showNodeInfo(node) {
    const connectedNodes = [];

    for (const link of this.data.links) {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === node.id) {
        const n = typeof link.target === 'object' ? link.target : this.data.nodes.find(x => x.id === link.target);
        if (n) connectedNodes.push(n);
      } else if (targetId === node.id) {
        const n = typeof link.source === 'object' ? link.source : this.data.nodes.find(x => x.id === link.source);
        if (n) connectedNodes.push(n);
      }
    }

    const uniqueConnected = connectedNodes
      .filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
      .sort((a, b) => a.label.localeCompare(b.label));

    const color = node.originalColor || node.color;
    let nodeType, nodeTypeText;
    if (color === '#ff0000')      { nodeType = 'henrique';      nodeTypeText = 'Pessoa central'; }
    else if (color === '#4488ff') { nodeType = 'empresa-direta'; nodeTypeText = 'Empresa direta'; }
    else if (color === '#800080') { nodeType = 'socio';          nodeTypeText = 'Sócio'; }
    else                          { nodeType = 'empresa-socio';  nodeTypeText = 'Empresa do sócio'; }

    let connectionsHtml = '';
    if (uniqueConnected.length > 0) {
      const items = uniqueConnected.map(cn => {
        const cnColor = cn.originalColor || cn.color;
        let cls = 'connection-item';
        if (cnColor === '#ff0000')      cls += ' henrique';
        else if (cnColor === '#4488ff') cls += ' empresa-direta';
        else if (cnColor === '#800080') cls += ' socio';
        else                            cls += ' empresa-socio';

        const linkBetween = this.data.links.find(link => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          return (s === node.id && t === cn.id) || (s === cn.id && t === node.id);
        });

        let qualText = '';
        if (linkBetween?.qualificacao_socio !== undefined) {
          const desc = this.getQualificacaoDescription(linkBetween.qualificacao_socio);
          qualText = ` — ${desc}`;
        }

        return `<li class="${cls}" data-node-id="${cn.id}">${cn.label}<span class="connection-meta">${qualText}</span></li>`;
      }).join('');

      connectionsHtml = `
        <div class="connections-section">
          <div class="connections-header">
            Conexões <span class="connection-count">${uniqueConnected.length}</span>
          </div>
          <ul class="connections-list">${items}</ul>
        </div>
      `;
    }

    document.getElementById('nodeInfo').style.display = 'flex';
    document.getElementById('nodeInfoContent').innerHTML = `
      <div class="node-details">
        <div class="node-name">${node.label}</div>
        <span class="node-type ${nodeType}">${nodeTypeText}</span>
      </div>
      ${connectionsHtml}
    `;

    document.querySelectorAll('.connection-item[data-node-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeId = item.getAttribute('data-node-id');
        const target = this.data.nodes.find(n => String(n.id) === nodeId);
        if (target) this.selectNodeById(target.id);
      });
    });
  }

  hideNodeInfo() {
    document.getElementById('nodeInfo').style.display = 'none';
  }

  selectNodeById(nodeId) {
    const node = this.data.nodes.find(n => n.id === nodeId);
    if (!node) return;
    this.selectNode(node);
    this.showNodeInfo(node);
    if (node.x !== undefined && node.y !== undefined) {
      const scale = Math.max(1, this.transform.k);
      select(this.canvas)
        .transition()
        .duration(500)
        .call(
          this.zoom.transform,
          zoomIdentity
            .translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale)
            .scale(scale)
        );
    }
  }

  searchNodes(searchTerm) {
    if (!this.data || !searchTerm.trim()) {
      this.processData();
      this.redraw();
      return;
    }

    const matches = this.data.nodes.filter(node => node.label.toLowerCase().includes(searchTerm));
    if (matches.length === 0) {
      this.processData();
      this.redraw();
      return;
    }

    const matchIds = new Set(matches.map(n => n.id));
    const connectedIds = new Set();
    for (const link of this.data.links) {
      if (matchIds.has(link.source.id)) connectedIds.add(link.target.id);
      if (matchIds.has(link.target.id)) connectedIds.add(link.source.id);
    }

    for (const node of this.data.nodes) {
      if (matchIds.has(node.id))        { node.color = '#ffff00'; node.radius = 10; }
      else if (connectedIds.has(node.id)) { node.color = '#00ffff'; node.radius = 6;  }
      else                              { node.color = '#333333'; node.radius = 3;  }
    }

    this.redraw();

    const node = matches[0];
    select(this.canvas)
      .transition()
      .duration(750)
      .call(
        this.zoom.transform,
        zoomIdentity
          .translate(this.width / 2 - node.x * 1.5, this.height / 2 - node.y * 1.5)
          .scale(1.5)
      );
  }

  updateStats() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toLocaleString(); };
    set('count-henrique', this.data.nodes.filter(n => (n.originalColor || n.color) === '#ff0000').length);
    set('count-blue',     this.data.nodes.filter(n => (n.originalColor || n.color) === '#4488ff').length);
    set('count-purple',   this.data.nodes.filter(n => (n.originalColor || n.color) === '#800080').length);
    set('count-orange',   this.data.nodes.filter(n => (n.originalColor || n.color) === '#ffa500').length);

    const total = document.getElementById('legend-total');
    if (total) total.textContent = `${this.data.nodes.length.toLocaleString()} nós · ${this.data.links.length.toLocaleString()} conexões`;
  }

  showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.networkViz = new FastNetworkVisualization();
});
