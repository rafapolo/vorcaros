class FastNetworkVisualization {
  constructor() {
    this.canvas = document.getElementById('network-canvas');
    this.context = this.canvas.getContext('2d');
    this.data = null;
    this.transform = d3.zoomIdentity;
    this.simulation = null;
    this.selectedNode = null;
    this.labelPositions = [];
    this.showLabels = true;

    this.qualificacaoSocioMap = {
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

    this.simulationParams = {
      linkDistance: 145,
      chargeStrength: -500,
      linkStrength: 0.1,
      alphaDecay: 0.02
    };

    this.visualParams = {
      nodeSizeMultiplier: 3.5,
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


    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this.redraw();
      });

    d3.select(this.canvas).call(zoom);

    this.canvas.addEventListener('click', (event) => {
      if (!this.data) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const canvasX = (x - this.transform.x) / this.transform.k;
      const canvasY = (y - this.transform.y) / this.transform.k;

      let clickedNode = null;
      let minDistance = Infinity;

      for (const node of this.data.nodes) {
        const distance = Math.sqrt(
          Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2)
        );
        const clickRadius = 30;
        if (distance <= clickRadius && distance < minDistance) {
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

    d3.select(this.canvas).call(
      zoom.transform,
      d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(0.5)
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
    return this.qualificacaoSocioMap[codigo] || "Não informada";
  }

  updateSimulation() {
    if (this.simulation) {
      const linkForce = this.simulation.force('link');
      const chargeForce = this.simulation.force('charge');
      if (linkForce) {
        linkForce.distance(this.simulationParams.linkDistance);
        linkForce.strength(this.simulationParams.linkStrength);
      }
      if (chargeForce) {
        chargeForce.strength(this.simulationParams.chargeStrength);
      }
      this.simulation.alphaDecay(this.simulationParams.alphaDecay);
      this.simulation.alpha(0.5).restart();
    }
  }

  updateNodeSizes() {
    if (this.data && this.data.nodes) {
      this.data.nodes.forEach(node => {
        const baseRadius = node.originalRadius || node.radius;
        node.radius = baseRadius * this.visualParams.nodeSizeMultiplier;
      });
      if (this.simulation) {
        this.simulation.force('collision', d3.forceCollide().radius(d => d.radius + 2));
      }
    }
  }


  async loadNetwork() {
    this.showLoading(true);

    const possiblePaths = [
      'output/network_vorcano_cosmograph.json',
      './output/network_vorcano_cosmograph.json',
      'network_vorcano_cosmograph.json',
      './network_vorcano_cosmograph.json'
    ];

    let loaded = false;

    for (const path of possiblePaths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;

        this.data = await response.json();
        console.log("Data loaded:", this.data.nodes.length, "nodes,", this.data.links.length, "links");

        this.processData();
        this.initializeSimulation();
        this.updateStats();

        loaded = true;
        break;
      } catch (error) {
        console.log(`Error with ${path}:`, error.message);
      }
    }

    if (!loaded) {
      console.error("Failed to load network data");
      alert("Não foi possível carregar os dados da rede. Gere os dados primeiro com:\n\npython generate_network.py\npython convert_to_cosmograph.py");
    }

    this.showLoading(false);
  }

  processData() {
    // Colors are baked into the JSON by convert_to_cosmograph.py.
    // Restore them from originalColor when resetting (e.g. after search).
    this.data.nodes.forEach(node => {
      if (!node.originalColor) {
        node.originalColor = node.color;
        node.originalSize = node.size;
      } else {
        node.color = node.originalColor;
        node.size = node.originalSize;
      }

      // Set radius from size
      switch (node.color) {
        case '#ff0000': node.radius = 12; node.originalRadius = 12; break; // Henrique
        case '#4488ff': node.radius = 9;  node.originalRadius = 9;  break; // direct companies
        case '#800080': node.radius = 7;  node.originalRadius = 7;  break; // socios
        default:        node.radius = 5;  node.originalRadius = 5;  break; // extended
      }

      node.isHenrique = node.color === '#ff0000';
    });

    const henriqueCount = this.data.nodes.filter(n => n.isHenrique).length;
    const blueCount = this.data.nodes.filter(n => n.originalColor === '#4488ff').length;
    console.log(`Processed: ${henriqueCount} central node(s), ${blueCount} direct companies`);
  }

  initializeSimulation() {
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links).id(d => d.id)
        .distance(this.simulationParams.linkDistance)
        .strength(this.simulationParams.linkStrength))
      .force('charge', d3.forceManyBody().strength(this.simulationParams.chargeStrength))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => d.radius + 2))
      .alphaDecay(this.simulationParams.alphaDecay)
      .on('tick', () => this.redraw());
  }

  redraw() {
    if (!this.data) return;

    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);

    this.context.translate(this.transform.x, this.transform.y);
    this.context.scale(this.transform.k, this.transform.k);

    this.drawLinks();
    this.drawNodes();

    if (this.showLabels || this.selectedNode) {
      this.drawLabels();
    }

    if (this.transform.k > 1.0) {
      this.drawEdgeLabels();
    }

    this.context.restore();
  }

  drawLinks() {
    this.context.globalAlpha = this.visualParams.linkOpacity;
    this.context.lineWidth = this.visualParams.linkWidth;

    this.data.links.forEach(link => {
      let strokeStyle = '#666';
      let lineWidth = this.visualParams.linkWidth;
      let alpha = this.visualParams.linkOpacity;

      if (this.selectedNode) {
        const isConnected = (link.source.id === this.selectedNode.id || link.target.id === this.selectedNode.id);
        if (isConnected) {
          strokeStyle = '#00ff88';
          lineWidth = Math.max(1.5, 2 / this.transform.k);
          alpha = 1.0;
          this.context.shadowColor = '#00ff88';
          this.context.shadowBlur = 10;
        } else {
          this.context.shadowBlur = 0;
        }
      } else {
        this.context.shadowBlur = 0;
      }

      this.context.globalAlpha = alpha;
      this.context.strokeStyle = strokeStyle;
      this.context.lineWidth = lineWidth;
      this.context.beginPath();
      this.context.moveTo(link.source.x, link.source.y);
      this.context.lineTo(link.target.x, link.target.y);
      this.context.stroke();
    });

    this.context.shadowBlur = 0;
  }

  drawNodes() {
    this.context.globalAlpha = 1;

    this.data.nodes.forEach(node => {
      let fillStyle = node.color;
      let radius = node.radius;
      let strokeStyle = null;
      let strokeWidth = 0;

      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) {
          fillStyle = '#ffff00';
          radius = node.radius * 1.8;
          strokeStyle = '#ffffff';
          strokeWidth = Math.max(1, 2 / this.transform.k);
          this.context.shadowColor = '#ffff00';
          this.context.shadowBlur = 15;
        } else if (this.isConnectedToSelected(node)) {
          fillStyle = '#00ff88';
          radius = node.radius * 1.4;
          strokeStyle = '#ffffff';
          strokeWidth = Math.max(1, 2 / this.transform.k);
          this.context.shadowColor = '#00ff88';
          this.context.shadowBlur = 10;
        } else {
          this.context.shadowBlur = 0;
        }
      } else {
        this.context.shadowBlur = 0;
      }

      this.context.globalAlpha = 1.0;
      this.context.fillStyle = fillStyle;
      this.context.beginPath();
      this.context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      this.context.fill();

      if (strokeStyle && strokeWidth > 0) {
        this.context.strokeStyle = strokeStyle;
        this.context.lineWidth = strokeWidth;
        this.context.stroke();
      }
    });

    this.context.shadowBlur = 0;
  }

  drawLabels() {
    this.labelPositions = [];

    const labelsToShow = this.data.nodes.filter(node => {
      if (this.showLabels) {
        const z = this.transform.k;
        if (z > 3.0) return node.radius >= 3;
        if (z > 1.5) return node.radius >= 5;
        return node.radius >= 7;
      }

      if (this.selectedNode) {
        return node.id === this.selectedNode.id || this.isConnectedToSelected(node);
      }

      const zoomFactor = this.transform.k;
      if (zoomFactor > 2.0) return node.radius >= 3;
      if (zoomFactor > 1.0) return node.isHenrique || node.radius >= 5;
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
    const zoomFactor = this.transform.k;
    if (this.showLabels) {
      maxLabels = Math.max(20, Math.min(200, Math.round(30 * zoomFactor)));
    } else if (zoomFactor > 2.0) {
      maxLabels = Math.max(200, Math.min(800, zoomFactor * 300));
    } else if (zoomFactor > 1.0) {
      maxLabels = Math.max(100, Math.min(400, zoomFactor * 200));
    } else {
      maxLabels = Math.max(50, Math.min(150, zoomFactor * 100));
    }
    const finalLabelsToShow = labelsToShow.slice(0, maxLabels);

    this.context.fillStyle = '#ffffff';
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 3;
    this.context.font = '14px Barlow';
    this.context.textAlign = 'center';

    finalLabelsToShow.forEach(node => {
      let fontSize = Math.max(12, Math.min(20, 12 + this.transform.k * 3));
      let maxLength = Math.max(15, Math.min(60, 15 + this.transform.k * 15));

      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) {
          fontSize = Math.max(12, Math.min(20, fontSize * 1.5));
          maxLength = Math.min(80, maxLength * 1.5);
        } else if (this.isConnectedToSelected(node)) {
          fontSize = Math.max(10, Math.min(18, fontSize * 1.2));
          maxLength = Math.min(70, maxLength * 1.2);
        }
      }

      const text = node.label.length > maxLength ? node.label.substring(0, maxLength) + '...' : node.label;

      this.context.font = `${fontSize}px Barlow`;
      const textWidth = this.context.measureText(text).width;
      const textHeight = fontSize + 2;

      const offset = node.radius + Math.max(8, 12 / this.transform.k);
      let labelY = this.findBestLabelPosition(node.x, node.y - offset, textWidth, textHeight);

      let strokeStyle = '#000000';
      let fillStyle = '#ffffff';
      let lineWidth = Math.max(2, 4 / this.transform.k);

      if (this.selectedNode) {
        if (node.id === this.selectedNode.id) {
          fillStyle = '#ffff00';
          lineWidth = Math.max(3, 5 / this.transform.k);
        } else if (this.isConnectedToSelected(node)) {
          fillStyle = '#00ff88';
        }
      }

      this.context.lineWidth = lineWidth;
      this.context.strokeStyle = strokeStyle;
      this.context.fillStyle = fillStyle;

      this.context.strokeText(text, node.x, labelY);
      this.context.fillText(text, node.x, labelY);

      this.labelPositions.push({
        x: node.x - textWidth / 2 - 2,
        y: labelY - textHeight - 2,
        width: textWidth + 4,
        height: textHeight + 4
      });
    });
  }

  findBestLabelPosition(x, preferredY, width, height) {
    const baseSpacing = Math.max(15, 25 / this.transform.k);
    const positions = [
      preferredY,
      preferredY - baseSpacing,
      preferredY + baseSpacing,
      preferredY - baseSpacing * 2,
      preferredY + baseSpacing * 2,
      preferredY - baseSpacing * 3,
      preferredY + baseSpacing * 3
    ];

    for (const y of positions) {
      const rect = { x: x - width / 2 - 2, y: y - height - 2, width: width + 4, height: height + 4 };
      if (!this.hasLabelCollision(rect)) return y;
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
    if (!this.data || !this.data.links) return;

    this.context.fillStyle = "#ffffff";
    this.context.strokeStyle = "#000000";
    this.context.lineWidth = 2;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    const baseFontSize = Math.max(8, Math.min(12, 8 + this.transform.k * 1.5));
    this.context.font = `${baseFontSize}px Arial`;

    const showAllEdgeLabels = false;

    this.data.links.forEach((link) => {
      if (!link.qualificacao_socio && link.qualificacao_socio !== 0) return;

      let shouldShowLabel = showAllEdgeLabels;
      if (this.selectedNode && !showAllEdgeLabels) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        shouldShowLabel = sourceId === this.selectedNode.id || targetId === this.selectedNode.id;
      }
      if (!shouldShowLabel) return;

      const qualificacaoDesc = this.getQualificacaoDescription(link.qualificacao_socio);
      if (!qualificacaoDesc || qualificacaoDesc === "Não informada") return;

      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const angle = Math.atan2(dy, dx);
      const offsetDistance = 15 / this.transform.k;
      const labelX = midX + Math.sin(angle) * offsetDistance;
      const labelY = midY + (-Math.cos(angle)) * offsetDistance;

      const maxLength = Math.max(10, 20 - (2 - this.transform.k) * 5);
      const text = qualificacaoDesc.length > maxLength ? qualificacaoDesc.substring(0, maxLength) + "..." : qualificacaoDesc;

      if (this.selectedNode) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const isConnected = sourceId === this.selectedNode.id || targetId === this.selectedNode.id;
        this.context.fillStyle = isConnected ? "#00ff88" : "#cccccc";
      } else {
        this.context.fillStyle = "#ffffff";
      }

      this.context.strokeText(text, labelX, labelY);
      this.context.fillText(text, labelX, labelY);
    });
  }

  selectNode(node) {
    this.selectedNode = node;
    this.redraw();
  }

  clearSelection() {
    this.selectedNode = null;
    this.redraw();
  }

  showNodeInfo(node) {
    const connectedNodes = [];

    this.data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (sourceId === node.id) {
        const targetNode = typeof link.target === 'object' ? link.target : this.data.nodes.find(n => n.id === link.target);
        if (targetNode) connectedNodes.push(targetNode);
      } else if (targetId === node.id) {
        const sourceNode = typeof link.source === 'object' ? link.source : this.data.nodes.find(n => n.id === link.source);
        if (sourceNode) connectedNodes.push(sourceNode);
      }
    });

    const uniqueConnectedNodes = connectedNodes
      .filter((n, i, arr) => arr.findIndex(x => x.id === n.id) === i)
      .sort((a, b) => a.label.localeCompare(b.label));

    // Determine node type based on color
    let nodeType, nodeTypeText;
    const color = node.originalColor || node.color;
    if (color === '#ff0000') {
      nodeType = 'henrique';
      nodeTypeText = 'Pessoa central';
    } else if (color === '#4488ff') {
      nodeType = 'empresa-direta';
      nodeTypeText = 'Empresa direta';
    } else if (color === '#800080') {
      nodeType = 'socio';
      nodeTypeText = 'Sócio';
    } else {
      nodeType = 'empresa-socio';
      nodeTypeText = 'Empresa do sócio';
    }

    let connectionsHtml = '';
    if (uniqueConnectedNodes.length > 0) {
      const connectionItems = uniqueConnectedNodes.map(cn => {
        const cnColor = cn.originalColor || cn.color;
        let itemClass = 'connection-item';
        if (cnColor === '#ff0000') itemClass += ' henrique';
        else if (cnColor === '#4488ff') itemClass += ' empresa-direta';
        else if (cnColor === '#800080') itemClass += ' socio';
        else itemClass += ' empresa-socio';

        const nodeConnectionCount = this.data.links.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return sourceId === cn.id || targetId === cn.id;
        }).length;

        const linkBetween = this.data.links.find(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return (sourceId === node.id && targetId === cn.id) || (sourceId === cn.id && targetId === node.id);
        });

        let qualText = '';
        if (linkBetween && linkBetween.qualificacao_socio !== undefined) {
          const desc = this.getQualificacaoDescription(linkBetween.qualificacao_socio);
          qualText = ` — ${desc}`;
        }

        return `<li class="${itemClass}" data-node-id="${cn.id}">${cn.label}<span class="connection-meta">${qualText}</span></li>`;
      }).join('');

      connectionsHtml = `
        <div class="connections-section">
          <div class="connections-header">
            Conexões <span class="connection-count">${uniqueConnectedNodes.length}</span>
          </div>
          <ul class="connections-list">${connectionItems}</ul>
        </div>
      `;
    }

    const content = `
      <div class="node-details">
        <div class="node-name">${node.label}</div>
        <span class="node-type ${nodeType}">${nodeTypeText}</span>
      </div>
      ${connectionsHtml}
    `;

    document.getElementById('nodeInfo').style.display = 'flex';
    document.getElementById('nodeInfoContent').innerHTML = content;

    document.querySelectorAll('.connection-item[data-node-id]').forEach(item => {
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        const nodeId = item.getAttribute('data-node-id');
        let targetNode = this.data.nodes.find(n => n.id === nodeId)
          || this.data.nodes.find(n => n.id === Number(nodeId))
          || this.data.nodes.find(n => String(n.id) === nodeId);
        if (targetNode) this.selectNodeById(targetNode.id);
      });
    });
  }

  hideNodeInfo() {
    document.getElementById('nodeInfo').style.display = 'none';
  }

  selectNodeById(nodeId) {
    const node = this.data.nodes.find(n => n.id === nodeId);
    if (node) {
      this.selectNode(node);
      this.showNodeInfo(node);
      if (node.x !== undefined && node.y !== undefined) {
        const scale = Math.max(1, this.transform.k);
        d3.select(this.canvas)
          .transition()
          .duration(500)
          .call(
            d3.zoom().transform,
            d3.zoomIdentity
              .translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale)
              .scale(scale)
          );
      }
    }
  }

  isConnectedToSelected(node) {
    if (!this.selectedNode) return false;
    return this.data.links.some(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return (sourceId === this.selectedNode.id && targetId === node.id) ||
             (targetId === this.selectedNode.id && sourceId === node.id);
    });
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
    this.data.links.forEach(link => {
      if (matchIds.has(link.source.id)) connectedIds.add(link.target.id);
      if (matchIds.has(link.target.id)) connectedIds.add(link.source.id);
    });

    this.data.nodes.forEach(node => {
      if (matchIds.has(node.id)) {
        node.color = '#ffff00';
        node.radius = 10;
      } else if (connectedIds.has(node.id)) {
        node.color = '#00ffff';
        node.radius = 6;
      } else {
        node.color = '#333333';
        node.radius = 3;
      }
    });

    this.redraw();

    if (matches.length > 0) {
      const node = matches[0];
      const scale = 1.5;
      d3.select(this.canvas)
        .transition()
        .duration(750)
        .call(
          d3.zoom().transform,
          d3.zoomIdentity
            .translate(this.width / 2 - node.x * scale, this.height / 2 - node.y * scale)
            .scale(scale)
        );
    }
  }

  updateStats() {
    const redCount    = this.data.nodes.filter(n => (n.originalColor || n.color) === '#ff0000').length;
    const blueCount   = this.data.nodes.filter(n => (n.originalColor || n.color) === '#4488ff').length;
    const purpleCount = this.data.nodes.filter(n => (n.originalColor || n.color) === '#800080').length;
    const orangeCount = this.data.nodes.filter(n => (n.originalColor || n.color) === '#ffa500').length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toLocaleString(); };
    set('count-henrique', redCount);
    set('count-blue', blueCount);
    set('count-purple', purpleCount);
    set('count-orange', orangeCount);

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
