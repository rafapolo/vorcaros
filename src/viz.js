import {
  zoom, zoomIdentity, select
} from 'd3';
import { CNAE_LABELS } from './cnae-labels.js';

const _hslCache = new Map();
function cnaeDescToHsl(str) {
  if (_hslCache.has(str)) return _hslCache.get(str);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  const v = `hsla(${Math.abs(h) % 360}, 55%, 55%, 0.15)`;
  _hslCache.set(str, v);
  return v;
}

const QUALIFICACAO_MAP = {
  0: "Não informada", 5: "Administrador", 8: "Conselheiro de Administração",
  9: "Curador", 10: "Diretor", 11: "Interventor", 12: "Inventariante",
  13: "Liquidante", 14: "Mãe", 15: "Pai", 16: "Presidente", 17: "Procurador",
  18: "Secretário", 19: "Síndico (Condomínio)", 20: "Sociedade Consorciada",
  21: "Sociedade Filiada", 22: "Sócio", 23: "Sócio Capitalista",
  24: "Sócio Comanditado", 25: "Sócio Comanditário", 26: "Sócio de Indústria",
  28: "Sócio-Gerente", 29: "Sócio Incapaz ou Relat.Incapaz (exceto menor)",
  30: "Sócio Menor (Assistido/Representado)", 31: "Sócio Ostensivo",
  32: "Tabelião", 33: "Tesoureiro", 34: "Titular de Empresa Individual Imobiliária",
  35: "Tutor", 37: "Sócio Pessoa Jurídica Domiciliado no Exterior",
  38: "Sócio Pessoa Física Residente no Exterior", 39: "Diplomata", 40: "Cônsul",
  41: "Representante de Organização Internacional", 42: "Oficial de Registro",
  43: "Responsável", 46: "Ministro de Estado das Relações Exteriores",
  47: "Sócio Pessoa Física Residente no Brasil",
  48: "Sócio Pessoa Jurídica Domiciliado no Brasil", 49: "Sócio-Administrador",
  50: "Empresário", 51: "Candidato a cargo Político Eletivo",
  52: "Sócio com Capital", 53: "Sócio sem Capital", 54: "Fundador",
  55: "Sócio Comanditado Residente no Exterior",
  56: "Sócio Comanditário Pessoa Física Residente no Exterior",
  57: "Sócio Comanditário Pessoa Jurídica Domiciliado no Exterior",
  58: "Sócio Comanditário Incapaz", 59: "Produtor Rural", 60: "Cônsul Honorário",
  61: "Responsável indígena", 62: "Representante da Instituição Extraterritorial",
  63: "Cotas em Tesouraria", 64: "Administrador Judicial",
  65: "Titular Pessoa Física Residente ou Domiciliado no Brasil",
  66: "Titular Pessoa Física Residente ou Domiciliado no Exterior",
  67: "Titular Pessoa Física Incapaz ou Relativamente Incapaz (exceto menor)",
  68: "Titular Pessoa Física Menor (Assistido/Representado)",
  69: "Beneficiário Final", 70: "Administrador Residente ou Domiciliado no Exterior",
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
    this.linksCanvas = document.getElementById('links-canvas');
    this.linksCtx = this.linksCanvas.getContext('2d');
    this.data = null;
    this.transform = zoomIdentity;
    this.worker = null;
    this.zoom = null;
    this.selectedNode = null;
    this.selectedConnectedIds = new Set();
    this.cnaeFilter = null;
    this.statusFilters = new Set();
    this.labelPositions = [];
    this.navHistory = [];
    this.navIndex = -1;
    this._skipNextPopstate = false;
    this.showLabels = true;
    this.showEmpresasSocios = false;
    this.adjacency = null;
    this._dirty = false;
    this._linksDirty = false;
    this.lightMode = false;
    this.simulationParams = { linkDistance: 145, chargeStrength: -500, linkStrength: 0.1, alphaDecay: 0.02 };
    this.visualParams = { linkOpacity: 0.8, linkWidth: 1.0 };
    this.setupCanvas();
    this.setupEventListeners();
    this.loadNetwork();
  }

  setupCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio, 2);
    for (const [canvas, ctx] of [[this.canvas, this.context], [this.linksCanvas, this.linksCtx]]) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(ratio, ratio);
    }
    this.width = width;
    this.height = height;
  }

  _computeViewport(margin = 100) {
    const { x, y, k } = this.transform;
    return {
      minX: (-x - margin) / k, minY: (-y - margin) / k,
      maxX: (this.width - x + margin) / k, maxY: (this.height - y + margin) / k,
    };
  }

  _nodeInViewport(node, vp) {
    return node.x >= vp.minX && node.x <= vp.maxX && node.y >= vp.minY && node.y <= vp.maxY;
  }

  _linkInViewport(link, vp) {
    return this._nodeInViewport(link.source, vp) || this._nodeInViewport(link.target, vp);
  }

  _startRenderLoop() {
    const loop = () => {
      if (this._linksDirty) { this._redrawLinks(); this._linksDirty = false; }
      if (this._dirty)      { this._redrawTop();   this._dirty = false; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _redrawLinks() {
    if (!this.data) return;
    const lctx = this.linksCtx;
    const vp = this._computeViewport(200);
    const linkHidden = l => !this.showEmpresasSocios && (l.source.isOrange || l.target.isOrange);
    lctx.save();
    lctx.clearRect(0, 0, this.width, this.height);
    lctx.translate(this.transform.x, this.transform.y);
    lctx.scale(this.transform.k, this.transform.k);
    lctx.globalAlpha = this.lightMode ? 0.85 : this.visualParams.linkOpacity;
    lctx.strokeStyle = this.lightMode ? '#cce0ff' : '#666';
    lctx.lineWidth = this.visualParams.linkWidth;
    lctx.shadowBlur = this.lightMode ? 6 : 0;
    lctx.shadowColor = this.lightMode ? '#aaccff' : 'transparent';
    lctx.beginPath();
    for (const link of this.data.links) {
      if (linkHidden(link) || !this._linkInViewport(link, vp)) continue;
      lctx.moveTo(link.source.x, link.source.y);
      lctx.lineTo(link.target.x, link.target.y);
    }
    lctx.stroke();
    lctx.restore();
  }

  _redrawTop() {
    if (!this.data) return;
    const ctx = this.context;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.k, this.transform.k);
    if (this.selectedNode) this._drawHighlightedLinks(ctx);
    this.drawNodes();
    if (this.showLabels || this.selectedNode) this.drawLabels();
    if (this.transform.k > 1.0) this.drawEdgeLabels();
    ctx.restore();
  }

  _drawHighlightedLinks(ctx) {
    const vp = this._computeViewport(200);
    const linkHidden = l => !this.showEmpresasSocios && (l.source.isOrange || l.target.isOrange);
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = Math.max(1.5, 2 / this.transform.k);
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (const link of this.data.links) {
      if (linkHidden(link)) continue;
      if (link.source.id !== this.selectedNode.id && link.target.id !== this.selectedNode.id) continue;
      if (!this._linkInViewport(link, vp)) continue;
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  redraw() { this._dirty = true; this._linksDirty = true; }

  _resolveLinks() {
    for (const link of this.data.links) {
      if (typeof link.source !== 'object') link.source = this.nodeById.get(link.source);
      if (typeof link.target !== 'object') link.target = this.nodeById.get(link.target);
    }
  }

  _initWorker() {
    this.worker = new Worker(new URL('./simulation-worker.js', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'tick') {
        const { positions } = data;
        const nodes = this.data.nodes;
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].x = positions[i * 2];
          nodes[i].y = positions[i * 2 + 1];
        }
        this._dirty = true;
        this._linksDirty = true;
        if (this._urlFollowNode) {
          const n = this._urlFollowNode;
          const scale = 0.6;
          select(this.canvas).call(
            this.zoom.transform,
            zoomIdentity.translate(this.width / 2 - n.x * scale, this.height / 2 - n.y * scale).scale(scale)
          );
        }
      } else if (data.type === 'end') {
        this._onSimulationEnd?.();
      }
    };
    this.worker.postMessage({
      type: 'init',
      nodes: this.data.nodes.map(n => ({ id: n.id, radius: n.radius })),
      links: this.data.links.map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      })),
      params: this.simulationParams,
    });
  }

  updateSimulationData() {
    if (!this.worker) return;
    const orangeIds = new Set(this.data.nodes.filter(n => n.isOrange).map(n => n.id));
    if (this.showEmpresasSocios) {
      this.worker.postMessage({ type: 'all-nodes' });
    } else {
      const activeIds = this.data.nodes.filter(n => !orangeIds.has(n.id)).map(n => n.id);
      this.worker.postMessage({ type: 'update-nodes', activeIds });
    }
  }

  getQualificacaoDescription(codigo) {
    return QUALIFICACAO_MAP[codigo] || "Não informada";
  }

  setupEventListeners() {
    let searchDebounce = null;
    const searchEl = document.getElementById('searchInput');
    const searchWrapper = searchEl.closest('.search-wrapper');
    const clearBtn = document.getElementById('searchClear');
    const updateClearBtn = () => searchWrapper.classList.toggle('has-value', searchEl.value.length > 0);

    searchEl.addEventListener('input', (e) => {
      updateClearBtn();
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => this.searchNodes(e.target.value.toLowerCase()), 300);
    });
    searchEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { clearTimeout(searchDebounce); this.searchNodes(e.target.value.toLowerCase()); }
    });
    clearBtn.addEventListener('click', () => {
      searchEl.value = ''; updateClearBtn(); clearTimeout(searchDebounce);
      this.searchNodes(''); searchEl.focus();
    });

    document.getElementById('showLabelsToggle').addEventListener('change', (e) => {
      this.showLabels = e.target.checked;
      if (this.worker) this.worker.postMessage({ type: 'set-labels', withLabels: this.showLabels });
      this._dirty = true;
    });

    document.getElementById('showEmpresasSociosToggle').addEventListener('change', (e) => {
      this.showEmpresasSocios = e.target.checked;
      this.updateSimulationData();
      this._dirty = true;
      this._linksDirty = true;
      window.dispatchEvent(new Event('vorcaro-socios-toggle'));
    });

    document.getElementById('light-toggle').addEventListener('click', () => {
      this.lightMode = !this.lightMode;
      document.getElementById('light-toggle').classList.toggle('active', this.lightMode);
      this._linksDirty = true;
      this._dirty = true;
    });

    this.zoom = zoom()
      .scaleExtent([0.02, 10])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this._dirty = true;
        this._linksDirty = true;
      });

    select(this.canvas).call(this.zoom);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'node-tooltip';
    document.body.appendChild(this.tooltip);

    this.canvas.addEventListener('mousemove', (event) => {
      if (!this.data) return;
      const rect = this.canvas.getBoundingClientRect();
      const cx = (event.clientX - rect.left - this.transform.x) / this.transform.k;
      const cy = (event.clientY - rect.top - this.transform.y) / this.transform.k;
      let nearest = null, minDistSq = Infinity;
      for (const node of this.data.nodes) {
        if (!this.showEmpresasSocios && node.isOrange) continue;
        const dx = cx - node.x, dy = cy - node.y;
        const dSq = dx * dx + dy * dy;
        const t = node.radius + 4;
        if (dSq <= t * t && dSq < minDistSq) { nearest = node; minDistSq = dSq; }
      }
      if (nearest) {
        this.tooltip.textContent = nearest.label;
        this.tooltip.style.left = (event.clientX + 14) + 'px';
        this.tooltip.style.top  = (event.clientY - 8) + 'px';
        this.tooltip.classList.add('visible');
        this.canvas.style.cursor = 'pointer';
      } else {
        this.tooltip.classList.remove('visible');
        this.canvas.style.cursor = '';
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.tooltip.classList.remove('visible');
      this.canvas.style.cursor = '';
    });

    this.canvas.addEventListener('click', (event) => {
      if (!this.data) return;
      const rect = this.canvas.getBoundingClientRect();
      const cx = (event.clientX - rect.left - this.transform.x) / this.transform.k;
      const cy = (event.clientY - rect.top - this.transform.y) / this.transform.k;
      let clickedNode = null, minDistSq = Infinity;
      const hitR = window.matchMedia('(pointer: coarse)').matches ? 44 : 30;
      for (const node of this.data.nodes) {
        if (!this.showEmpresasSocios && node.isOrange) continue;
        const dx = cx - node.x, dy = cy - node.y;
        const dSq = dx * dx + dy * dy;
        if (dSq <= hitR * hitR && dSq < minDistSq) { clickedNode = node; minDistSq = dSq; }
      }
      if (clickedNode) { this.selectNode(clickedNode); this.showNodeInfo(clickedNode); }
      else { this.clearSelection(); this.hideNodeInfo(); }
    });

    select(this.canvas).call(
      this.zoom.transform,
      zoomIdentity.translate(this.width / 2, this.height / 2).scale(0.5)
    );

    window.addEventListener('resize', () => {
      this.setupCanvas();
      this._dirty = true;
      this._linksDirty = true;
    });

    document.getElementById('closeNodeInfo').addEventListener('click', () => {
      this.hideNodeInfo(); this.clearSelection();
    });
    document.getElementById('navBack').addEventListener('click', () => this.navigateBack());
    document.getElementById('navFwd').addEventListener('click', () => this.navigateFwd());

    window.addEventListener('popstate', (e) => {
      if (this._skipNextPopstate) { this._skipNextPopstate = false; return; }
      const idx = e.state?.navIndex ?? -1;
      this.navIndex = idx;
      if (idx >= 0) { this._goToHistoryState(); }
      else { this.selectedNode = null; this.selectedConnectedIds = new Set(); this._dirty = true; }
      this.updateNavButtons();
    });

    history.replaceState({ navIndex: -1 }, '', location.href);
  }

  buildNodeMaps() {
    this.nodeById    = new Map(this.data.nodes.map(n => [n.id, n]));
    this.nodeByLabel = new Map(this.data.nodes.map(n => [n.label, n]));
  }

  buildAdjacency() {
    this.adjacency = new Map();
    for (const link of this.data.links) {
      const { source: s, target: t } = link;
      if (!this.adjacency.has(s.id)) this.adjacency.set(s.id, []);
      if (!this.adjacency.has(t.id)) this.adjacency.set(t.id, []);
      this.adjacency.get(s.id).push({ neighbor: t, link });
      this.adjacency.get(t.id).push({ neighbor: s, link });
    }
  }

  async loadNetwork() {
    this.showLoading(true);
    const paths = [
      'output/network_vorcaro_cosmograph.json',
      './output/network_vorcaro_cosmograph.json',
      'network_vorcaro_cosmograph.json',
    ];
    let loaded = false;
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        this.data = await response.json();
        console.log(`Loaded: ${this.data.nodes.length} nodes, ${this.data.links.length} links`);
        this.processData();
        this.buildNodeMaps();
        this._initWorker();    // must come before _resolveLinks (needs raw IDs)
        this._resolveLinks();
        this.buildAdjacency();
        this.updateSimulationData();
        this.updateStats();
        this.restoreFromUrl();
        this._startRenderLoop();
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
    window.dispatchEvent(new CustomEvent('vorcaro-loaded'));
  }

  processData() {
    for (const node of this.data.nodes) {
      if (!node.originalColor) { node.originalColor = node.color; node.originalSize = node.size; }
      else { node.color = node.originalColor; node.size = node.originalSize; }
      switch (node.color) {
        case '#ff0000': node.radius = 20; node.originalRadius = 20; break;
        case '#4488ff': node.radius = 15; node.originalRadius = 15; break;
        case '#800080': node.radius = 10; node.originalRadius = 10; break;
        default:        node.radius = 5;  node.originalRadius = 5;  break;
      }
      node.isHenrique = node.color === '#ff0000';
      node.isOrange   = node.originalColor === '#ffa500';
      node.highlighted = false;
    }
  }

  drawNodes() {
    const ctx = this.context;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const vp = this._computeViewport(50);
    const nodeHidden  = node => !this.showEmpresasSocios && node.isOrange;
    const nodeVisible = node => !nodeHidden(node) && this._nodeInViewport(node, vp);

    if (!this.selectedNode) {
      if (this.cnaeFilter || this.statusFilters.size > 0) {
        const strokeWidth = Math.max(1, 1.5 / this.transform.k);
        const isMatch = node =>
          this.cnaeFilter ? node.cnae === this.cnaeFilter : this.statusFilters.has(node.status);
        ctx.fillStyle = '#333';
        ctx.beginPath();
        for (const node of this.data.nodes) {
          if (!nodeVisible(node) || isMatch(node)) continue;
          ctx.moveTo(node.x + node.radius, node.y);
          ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        }
        ctx.fill();
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ff88'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = strokeWidth;
        for (const node of this.data.nodes) {
          if (!nodeVisible(node) || !isMatch(node)) continue;
          ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          ctx.fill(); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        return;
      }

      const groups = new Map();
      for (const node of this.data.nodes) {
        if (!nodeVisible(node) || node.highlighted) continue;
        let arr = groups.get(node.color);
        if (!arr) { arr = []; groups.set(node.color, arr); }
        arr.push(node);
      }
      for (const [color, nodes] of groups) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const node of nodes) { ctx.moveTo(node.x + node.radius, node.y); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI); }
        ctx.fill();
      }

      const highlighted = this.data.nodes.filter(n => nodeVisible(n) && n.highlighted);
      if (highlighted.length) {
        const strokeWidth = Math.max(1, 1.5 / this.transform.k);
        ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ff88'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = strokeWidth;
        for (const node of highlighted) {
          ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
          ctx.fill(); ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      return;
    }

    const strokeWidth = Math.max(1, 2 / this.transform.k);
    const groups = new Map();
    for (const node of this.data.nodes) {
      if (!nodeVisible(node) || node.id === this.selectedNode.id || this.selectedConnectedIds.has(node.id)) continue;
      let arr = groups.get(node.color);
      if (!arr) { arr = []; groups.set(node.color, arr); }
      arr.push(node);
    }
    for (const [color, nodes] of groups) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const node of nodes) { ctx.moveTo(node.x + node.radius, node.y); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI); }
      ctx.fill();
    }

    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ff88'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = strokeWidth;
    for (const node of this.data.nodes) {
      if (!nodeVisible(node) || node.id === this.selectedNode.id || !this.selectedConnectedIds.has(node.id)) continue;
      const r = node.radius * 1.4;
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    }

    ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffff00'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 2 / this.transform.k);
    ctx.beginPath();
    ctx.arc(this.selectedNode.x, this.selectedNode.y, this.selectedNode.radius * 1.8, 0, 2 * Math.PI);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawLabels() {
    this.labelPositions = [];
    const z = this.transform.k;
    const vp = this._computeViewport(100);

    const labelsToShow = this.data.nodes.filter(node => {
      if (!this.showEmpresasSocios && node.isOrange) return false;
      if (!this._nodeInViewport(node, vp)) return false;
      if (this.showLabels) {
        if (z > 3.0) return node.radius >= 3;
        if (z > 1.5) return node.radius >= 5;
        return node.radius >= 7;
      }
      if (this.selectedNode) return node.id === this.selectedNode.id || this.selectedConnectedIds.has(node.id);
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
    if (this.showLabels) maxLabels = Math.max(20, Math.min(200, Math.round(30 * z)));
    else if (z > 2.0)   maxLabels = Math.max(200, Math.min(800, z * 300));
    else if (z > 1.0)   maxLabels = Math.max(100, Math.min(400, z * 200));
    else                maxLabels = Math.max(50, Math.min(150, z * 100));

    const ctx = this.context;
    ctx.textAlign = 'center';

    for (const node of labelsToShow.slice(0, maxLabels)) {
      let fontSize = Math.max(14, Math.min(24, 14 + z * 3));
      let maxLength = Math.max(15, Math.min(60, 15 + z * 15));
      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) { fontSize = Math.max(14, Math.min(24, fontSize * 1.5)); maxLength = Math.min(80, maxLength * 1.5); }
        else if (this.selectedConnectedIds.has(node.id)) { fontSize = Math.max(12, Math.min(22, fontSize * 1.2)); maxLength = Math.min(70, maxLength * 1.2); }
      }
      const text = node.label.length > maxLength ? node.label.substring(0, maxLength) + '...' : node.label;
      ctx.font = `${fontSize}px Monda`;
      const textWidth = ctx.measureText(text).width;
      const textHeight = fontSize + 2;
      const offset = node.radius + Math.max(8, 12 / z);
      const labelY = this.findBestLabelPosition(node.x, node.y - offset, textWidth, textHeight);

      let fillStyle = '#ffffff', lineWidth = Math.max(2, 4 / z);
      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) { fillStyle = '#ffff00'; lineWidth = Math.max(3, 5 / z); }
        else if (this.selectedConnectedIds.has(node.id)) fillStyle = '#00ff88';
      }
      ctx.lineWidth = lineWidth; ctx.strokeStyle = '#000000'; ctx.fillStyle = fillStyle;
      ctx.strokeText(text, node.x, labelY); ctx.fillText(text, node.x, labelY);
      this.labelPositions.push({ x: node.x - textWidth / 2 - 2, y: labelY - textHeight - 2, width: textWidth + 4, height: textHeight + 4 });
    }
  }

  findBestLabelPosition(x, preferredY, width, height) {
    const s = Math.max(15, 25 / this.transform.k);
    const positions = [preferredY, preferredY - s, preferredY + s, preferredY - s * 2, preferredY + s * 2, preferredY - s * 3, preferredY + s * 3];
    for (const y of positions) {
      const r = { x: x - width / 2 - 2, y: y - height - 2, width: width + 4, height: height + 4 };
      if (!this.hasLabelCollision(r)) return y;
    }
    return preferredY;
  }

  hasLabelCollision(rect) {
    for (let i = 0; i < this.labelPositions.length; i++) {
      const pos = this.labelPositions[i];
      if (rect.x < pos.x + pos.width && rect.x + rect.width > pos.x &&
          rect.y < pos.y + pos.height && rect.y + rect.height > pos.y) return true;
    }
    return false;
  }

  drawEdgeLabels() {
    if (!this.selectedNode || !this.data.links) return;
    const ctx = this.context;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
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
      ctx.strokeText(text, labelX, labelY); ctx.fillText(text, labelX, labelY);
    }
  }

  selectNode(node) {
    this.selectedNode = node;
    this.selectedConnectedIds = new Set();
    if (node && this.adjacency) {
      for (const { neighbor } of (this.adjacency.get(node.id) ?? [])) this.selectedConnectedIds.add(neighbor.id);
    }
    this._dirty = true;
  }

  clearSelection() {
    this.selectedNode = null;
    this.selectedConnectedIds = new Set();
    history.replaceState(history.state, '', location.pathname);
    this._dirty = true;
  }

  pushNav(state) {
    const current = this.navHistory[this.navIndex];
    if (current && current.type === state.type) {
      if (state.type === 'node' && current.id === state.id) return;
      if (state.type === 'search' && current.term === state.term) return;
    }
    this.navHistory = this.navHistory.slice(0, this.navIndex + 1);
    this.navHistory.push(state);
    this.navIndex = this.navHistory.length - 1;
    const url = state.type === 'node' ? '?n=' + encodeURIComponent(state.id) : location.pathname;
    history.pushState({ navIndex: this.navIndex }, '', url);
    this.updateNavButtons();
  }

  updateNavButtons() {
    const back = document.getElementById('navBack');
    const fwd  = document.getElementById('navFwd');
    if (back) back.disabled = this.navIndex <= 0;
    if (fwd)  fwd.disabled  = this.navIndex >= this.navHistory.length - 1;
  }

  navigateBack() {
    if (this.navIndex <= 0) return;
    this.navIndex--;
    this._goToHistoryState();
    this._skipNextPopstate = true;
    history.go(-1);
  }

  navigateFwd() {
    if (this.navIndex >= this.navHistory.length - 1) return;
    this.navIndex++;
    this._goToHistoryState();
    this._skipNextPopstate = true;
    history.go(1);
  }

  _goToHistoryState() {
    const state = this.navHistory[this.navIndex];
    if (!state) return;
    if (state.type === 'node') {
      const node = this.nodeById?.get(state.id);
      if (!node) return;
      this.selectNode(node);
      this.showNodeInfo(node, false);
      const scale = Math.max(1, this.transform.k);
      select(this.canvas).transition().duration(500).call(
        this.zoom.transform,
        zoomIdentity.translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale).scale(scale)
      );
    } else if (state.type === 'search') {
      this.selectedNode = null;
      this.selectedConnectedIds = new Set();
      const si = document.getElementById('searchInput');
      si.value = state.term;
      si.closest('.search-wrapper').classList.toggle('has-value', state.term.length > 0);
      this.searchNodes(state.term, false);
    }
    this.updateNavButtons();
  }

  showNodeInfo(node, pushHistory = true) {
    if (pushHistory) this.pushNav({ type: 'node', id: node.id });
    const seenIds = new Set();
    const connectedPairs = [];
    for (const entry of (this.adjacency?.get(node.id) ?? [])) {
      if (seenIds.has(entry.neighbor.id)) continue;
      seenIds.add(entry.neighbor.id);
      connectedPairs.push(entry);
    }
    connectedPairs.sort((a, b) => a.neighbor.label.localeCompare(b.neighbor.label));

    const color = node.originalColor || node.color;
    let nodeType, nodeTypeText;
    if (color === '#ff0000')      { nodeType = 'henrique';       nodeTypeText = 'Pessoa central'; }
    else if (color === '#4488ff') { nodeType = 'empresa-direta'; nodeTypeText = 'Empresa direta'; }
    else if (color === '#800080') { nodeType = 'socio';           nodeTypeText = 'Sócio'; }
    else                          { nodeType = 'empresa-socio';  nodeTypeText = 'Empresa do sócio'; }

    let connectionsHtml = '';
    let companyCount = 0, personCount = 0;
    if (connectedPairs.length > 0) {
      const items = connectedPairs.map(({ neighbor: cn, link }) => {
        const cnColor = cn.originalColor || cn.color;
        let cls = 'connection-item';
        if (cnColor === '#ff0000')      { cls += ' henrique';       personCount++; }
        else if (cnColor === '#4488ff') { cls += ' empresa-direta'; companyCount++; }
        else if (cnColor === '#800080') { cls += ' socio';           personCount++; }
        else                            { cls += ' empresa-socio';  companyCount++; }
        let qualText = '';
        if (link?.qualificacao_socio !== undefined) qualText = this.getQualificacaoDescription(link.qualificacao_socio);
        const cnaeDesc = cn.cnae ? (CNAE_LABELS.get(cn.cnae) ?? `CNAE ${cn.cnae}`) : null;
        const hoverBg = cnaeDesc ? cnaeDescToHsl(cnaeDesc) : 'rgba(0,255,136,0.1)';
        const roleSpan = qualText ? `<span class="node-type node-role">${qualText}</span>` : '';
        const cnaeSpan = cnaeDesc ? `<span class="conn-cnae">${cnaeDesc}</span>` : '';
        const badgesHtml = (roleSpan || cnaeSpan)
          ? `<span class="connection-badges">${roleSpan}${cnaeSpan}</span>`
          : '';
        return `<li class="${cls}" data-node-id="${cn.id}" style="--hover-bg:${hoverBg}" title="${cn.label}"><span class="conn-name">${cn.label}</span>${badgesHtml}</li>`;
      }).join('');
      connectionsHtml = `<div class="connections-section"><ul class="connections-list">${items}</ul></div>`;
    }

    const cnaeDesc = node.cnae ? (CNAE_LABELS.get(node.cnae) ?? `CNAE ${node.cnae}`) : null;
    const cnaeHtml = cnaeDesc ? `<span class="node-type cnae-tag clickable-filter" data-cnae="${node.cnae}">${cnaeDesc}</span>` : '';
    const statusLabel = node.status ?? null;
    const statusClass = statusLabel ? `status-${statusLabel.toLowerCase()}` : '';
    const statusHtml = statusLabel ? `<span class="node-type node-status ${statusClass}">${statusLabel}</span>` : '';
    const countBadges = [];
    if (companyCount > 0) countBadges.push(`<span class="node-type cnae-tag">${companyCount} empresa${companyCount !== 1 ? 's' : ''}</span>`);
    if (personCount  > 0) countBadges.push(`<span class="node-type cnae-tag">${personCount} sócio${personCount !== 1 ? 's' : ''}</span>`);
    const countBadge = countBadges.join('');

    document.getElementById('nodeInfo').classList.add('open');
    document.querySelector('.top-controls').classList.remove('open');
    document.getElementById('nodeInfoContent').innerHTML = `
      <div class="node-details">
        <div class="node-name">${node.label}</div>
        <div class="node-type-row">
          <span class="node-type ${nodeType}">${nodeTypeText}</span>${statusHtml}${cnaeHtml}${countBadge}
        </div>
      </div>
      ${connectionsHtml}
    `;

    const cnaeTagEl = document.querySelector('#nodeInfoContent .cnae-tag[data-cnae]');
    if (cnaeTagEl) {
      cnaeTagEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = +cnaeTagEl.dataset.cnae;
        const desc = CNAE_LABELS.get(code);
        const labels = this.filterByCnae(code);
        this.showCnaeInfo(code, desc, labels);
        window.syncCnaePanel?.(code, desc);
      });
    }

    document.querySelectorAll('#nodeInfoContent .connection-item[data-node-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const raw = item.getAttribute('data-node-id');
        const target = this.nodeById.get(+raw) ?? this.nodeById.get(raw);
        if (target) this.selectNodeById(target.id);
      });
    });
  }

  hideNodeInfo() { document.getElementById('nodeInfo').classList.remove('open'); }

  selectNodeById(nodeId) {
    const node = this.nodeById.get(nodeId) ?? this.nodeById.get(+nodeId);
    if (!node) return;
    this.selectNode(node);
    this.showNodeInfo(node);
    if (node.x !== undefined && node.y !== undefined) {
      const scale = Math.max(1, this.transform.k);
      select(this.canvas).transition().duration(500).call(
        this.zoom.transform,
        zoomIdentity.translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale).scale(scale)
      );
    }
  }

  searchNodes(searchTerm, pushHistory = true) {
    const countEl = document.getElementById('searchCount');
    if (!this.data || !searchTerm.trim()) {
      if (countEl) countEl.textContent = '';
      this.processData(); this._dirty = true;
      document.getElementById('nodeInfo').classList.remove('open');
      return;
    }
    const matches = this.data.nodes.filter(node =>
      (!node.isOrange || this.showEmpresasSocios) && node.label.toLowerCase().includes(searchTerm)
    );
    if (countEl) countEl.textContent = matches.length || '';
    if (matches.length === 0) {
      this.processData(); this._dirty = true;
      document.getElementById('nodeInfo').classList.remove('open');
      return;
    }
    const matchIds = new Set(matches.map(n => n.id));
    const connectedIds = new Set();
    for (const id of matchIds) {
      for (const { neighbor } of (this.adjacency.get(id) ?? [])) connectedIds.add(neighbor.id);
    }
    for (const node of this.data.nodes) {
      if (matchIds.has(node.id))          { node.color = '#00ff88'; node.highlighted = true;  node.radius = 10; }
      else if (connectedIds.has(node.id)) { node.color = '#00ffff'; node.highlighted = false; node.radius = 6;  }
      else                                { node.color = '#333333'; node.highlighted = false; node.radius = 3;  }
    }
    this._dirty = true;
    this.showSearchResults(matches, searchTerm, pushHistory);
    const node = matches[0];
    select(this.canvas).transition().duration(750).call(
      this.zoom.transform,
      zoomIdentity.translate(this.width / 2 - node.x * 1.5, this.height / 2 - node.y * 1.5).scale(1.5)
    );
  }

  showSearchResults(matches, searchTerm, pushHistory = true) {
    if (pushHistory) this.pushNav({ type: 'search', term: searchTerm });
    const items = matches.slice().sort((a, b) => a.label.localeCompare(b.label)).map(node => {
      const color = node.originalColor || node.color;
      let cls = 'connection-item';
      if (color === '#ff0000')      cls += ' henrique';
      else if (color === '#4488ff') cls += ' empresa-direta';
      else if (color === '#800080') cls += ' socio';
      else                          cls += ' empresa-socio';
      return `<li class="${cls}" data-node-id="${node.id}">${node.label}</li>`;
    }).join('');
    document.getElementById('nodeInfoTitle').textContent = 'Detalhes';
    document.getElementById('nodeInfo').classList.add('open');
    document.getElementById('nodeInfoContent').innerHTML = `
      <div class="node-name" style="font-size:15px;margin-bottom:10px">${searchTerm}</div>
      <div class="node-type-row" style="margin-bottom:15px">
        <span class="node-type cnae-tag">${matches.length} resultado${matches.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="connections-section" style="border-top:none;padding-top:0"><ul class="connections-list">${items}</ul></div>
    `;
    document.querySelectorAll('#nodeInfoContent .connection-item[data-node-id]').forEach(el => {
      el.addEventListener('click', () => this.selectNodeById(Number(el.dataset.nodeId)));
    });
  }

  updateStats() {
    let red = 0, blue = 0, purple = 0, orange = 0;
    for (const n of this.data.nodes) {
      const c = n.originalColor || n.color;
      if      (c === '#ff0000') red++;
      else if (c === '#4488ff') blue++;
      else if (c === '#800080') purple++;
      else if (c === '#ffa500') orange++;
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toLocaleString(); };
    set('count-henrique', red);
    set('count-blue',     blue);
    set('count-purple',   purple);
    set('count-orange',   orange);
  }

  restoreFromUrl() {
    const id = new URLSearchParams(location.search).get('n');
    if (!id) return;
    const node = this.nodeById.get(+id) ?? this.nodeById.get(id);
    if (!node) return;
    // Select node and show info panel as soon as first positions arrive; tick handler follows it
    const trySelect = () => {
      if (node.x !== undefined && node.y !== undefined) {
        this.selectNode(node);
        this.showNodeInfo(node);
        this._urlFollowNode = node;
      } else { setTimeout(trySelect, 100); }
    };
    setTimeout(trySelect, 300);
    // Stop following and lock to final settled position after simulation ends
    this._onSimulationEnd = () => {
      this._onSimulationEnd = null;
      this._urlFollowNode = null;
      const scale = 0.6;
      select(this.canvas).transition().duration(600).call(
        this.zoom.transform,
        zoomIdentity.translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale).scale(scale)
      );
    };
  }

  filterByCnae(cnaeCode) {
    this.cnaeFilter = cnaeCode;
    this.clearSelection();
    if (!this.data) return [];
    const labels = this.data.nodes.filter(n => n.cnae === cnaeCode && (this.showEmpresasSocios || !n.isOrange)).map(n => n.label).sort((a, b) => a.localeCompare(b));
    this._dirty = true;
    return labels;
  }

  showCnaeInfo(cnaeCode, cnaeDesc, labels) {
    const items = labels.map(label => {
      const node = this.data?.nodes.find(n => n.label === label);
      const color = node ? (node.originalColor || node.color) : null;
      let cls = 'connection-item';
      if (color === '#4488ff') cls += ' empresa-direta'; else cls += ' empresa-socio';
      return `<li class="${cls}" data-label="${label.replace(/"/g, '&quot;')}">${label}</li>`;
    }).join('');
    document.getElementById('nodeInfoTitle').textContent = 'Detalhes';
    document.getElementById('nodeInfo').classList.add('open');
    document.getElementById('nodeInfoContent').innerHTML = `
      <div class="node-name">${cnaeDesc ?? `CNAE ${cnaeCode}`}</div>
      <div class="node-type-row" style="margin-bottom:15px">
        <span class="node-type cnae-tag">${labels.length} empresa${labels.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="connections-section" style="border-top:none;padding-top:0"><ul class="connections-list">${items}</ul></div>
    `;
    document.querySelectorAll('#nodeInfoContent .connection-item[data-label]').forEach(el => {
      el.addEventListener('click', () => {
        const node = this.nodeByLabel.get(el.dataset.label);
        if (node) this.selectNodeById(node.id);
      });
    });
  }

  clearCnaeFilter() {
    this.cnaeFilter = null; this.processData(); this._dirty = true;
    document.getElementById('nodeInfo').classList.remove('open');
  }

  toggleStatusFilter(status) {
    if (this.statusFilters.has(status)) this.statusFilters.delete(status);
    else this.statusFilters.add(status);
    this.processData(); this._dirty = true;
  }

  clearStatusFilters() { this.statusFilters.clear(); this.processData(); this._dirty = true; }

  countByStatus() {
    if (!this.data) return {};
    const counts = {};
    for (const n of this.data.nodes) { if (n.status) counts[n.status] = (counts[n.status] ?? 0) + 1; }
    return counts;
  }

  selectNodeByLabel(label) {
    const node = this.nodeByLabel?.get(label);
    if (node) this.selectNodeById(node.id);
  }

  showLoading(show) { document.getElementById('loading').style.display = show ? 'block' : 'none'; }
}

document.addEventListener('DOMContentLoaded', () => {
  window.networkViz = new FastNetworkVisualization();
});
