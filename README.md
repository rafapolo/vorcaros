# Família Vorcaro — Redes Societárias

Visualização interativa da rede societária da família Vorcaro em dois graus: as empresas onde Henrique e Daniel Vorcaro são sócios, os demais sócios dessas empresas, e as outras empresas onde esses sócios participam.

O grafo é renderizado em canvas com simulação de forças (d3-force), permitindo explorar conexões entre milhares de nós com performance fluida. Clicar em qualquer nó revela suas conexões diretas, o tipo de vínculo societário (sócio, administrador, diretor etc.) e permite navegar de nó em nó.

## O que mostra

| Cor | Nó |
|-----|----|
| Vermelho | Henrique & Daniel Vorcaro |
| Azul | Empresas onde são sócios diretos |
| Roxo | Demais sócios dessas empresas |
| Laranja | Empresas dos sócios |

## Stack

- **Dados**: CNPJ público, processado via Python (`generate_network.py` + `convert_to_cosmograph.py`)
- **Visualização**: d3-force + Canvas 2D
- **Build**: Bun — tree-shaking do d3 (~74 KB vs ~500 KB do CDN)
- **Deploy**: GitHub Actions → GitHub Pages

## Rodar

```bash
bun install
bun run build   # gera dist/
# abra index.html no navegador
```

Para desenvolvimento com rebuild ao salvar:

```bash
bun run dev     # → http://localhost:5173
```
