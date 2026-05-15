import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide
} from 'd3';

let simulation = null;
let allNodes = [];
let allRawLinks = []; // unresolved {source: id, target: id}
let params = {};
let activeIds = null; // null = all nodes active

function postPositions() {
  const buf = new Float32Array(allNodes.length * 2);
  for (let i = 0; i < allNodes.length; i++) {
    buf[i * 2]     = allNodes[i].x ?? 0;
    buf[i * 2 + 1] = allNodes[i].y ?? 0;
  }
  self.postMessage({ type: 'tick', positions: buf }, [buf.buffer]);
}

function linkDist(p) {
  return p.withLabels !== false ? p.linkDistance : 60;
}

function collideRadius(p) {
  return p.withLabels !== false ? d => d.radius + 40 : d => d.radius + 2;
}

function filterLinks(ids) {
  const raw = ids
    ? allRawLinks.filter(l => ids.has(l.source) && ids.has(l.target))
    : allRawLinks;
  return raw.map(l => ({ source: l.source, target: l.target }));
}

self.onmessage = function({ data }) {
  switch (data.type) {
    case 'init': {
      params = { ...data.params, withLabels: true };
      allNodes = data.nodes.map(n => ({ id: n.id, radius: n.radius }));
      allRawLinks = data.links;
      activeIds = null;
      simulation = forceSimulation(allNodes)
        .force('link', forceLink(filterLinks(null)).id(d => d.id)
          .distance(linkDist(params)).strength(params.linkStrength))
        .force('charge', forceManyBody().strength(params.chargeStrength))
        .force('center', forceCenter(0, 0))
        .force('collision', forceCollide().radius(collideRadius(params)))
        .alphaDecay(params.alphaDecay)
        .on('tick', postPositions)
        .on('end', () => self.postMessage({ type: 'end' }));
      break;
    }
    case 'update-nodes': {
      activeIds = new Set(data.activeIds);
      const activeNodes = allNodes.filter(n => activeIds.has(n.id));
      simulation
        .nodes(activeNodes)
        .force('link', forceLink(filterLinks(activeIds)).id(d => d.id)
          .distance(linkDist(params)).strength(params.linkStrength))
        .alpha(0.5).restart();
      break;
    }
    case 'all-nodes': {
      activeIds = null;
      simulation
        .nodes(allNodes)
        .force('link', forceLink(filterLinks(null)).id(d => d.id)
          .distance(linkDist(params)).strength(params.linkStrength))
        .alpha(0.5).restart();
      break;
    }
    case 'set-labels': {
      params.withLabels = data.withLabels;
      simulation
        .force('link', forceLink(filterLinks(activeIds)).id(d => d.id)
          .distance(linkDist(params)).strength(params.linkStrength))
        .force('collision', forceCollide().radius(collideRadius(params)))
        .alpha(0.5).restart();
      break;
    }
  }
};
