#!/usr/bin/env python3

import pandas as pd
import duckdb
import json
from pathlib import Path

INPUT_FILE = "output/network_vorcano.csv"
OUTPUT_FILE = "output/network_vorcano_cosmograph.json"
DB_PATHS = [
    "/path/to/empresas.duckdb",
    "/path/to/empresas/db/empresas.duckdb",
]

CENTRAL_PERSONS = {
    "HENRIQUE MOURA VORCARO",
    "DANIEL BUENO VORCARO",
}


def load_cnae_map(razao_socials):
    """Return dict {razao_social: cnae_code} for the given company names."""
    for path in DB_PATHS:
        if Path(path).exists():
            conn = duckdb.connect(path, read_only=True)
            try:
                names = list(razao_socials)
                placeholders = ",".join(["?"] * len(names))
                rows = conn.execute(f"""
                    SELECT emp.razao_social, e.cnae_fiscal_principal
                    FROM companies.empresas emp
                    JOIN companies.estabelecimentos e USING (cnpj_basico)
                    WHERE emp.razao_social IN ({placeholders})
                      AND e.cnae_fiscal_principal IS NOT NULL
                    ORDER BY emp.razao_social, e.cnae_fiscal_principal
                """, names).fetchall()
                result = {}
                for razao, cnae in rows:
                    if razao not in result:
                        result[razao] = cnae
                print(f"  CNAE lookup: {len(result)}/{len(names)} companies matched")
                return result
            finally:
                conn.close()
    print("  WARNING: no database found, skipping CNAE lookup")
    return {}


def convert():
    df = pd.read_csv(INPUT_FILE)
    print(f"Converting {len(df)} relationships to JSON format...")

    person_to_company = df[df["relationship_type"] == "person_to_company"]
    company_to_socio = df[df["relationship_type"] == "company_to_socio"]

    central_upper = {p.upper() for p in CENTRAL_PERSONS}
    direct_companies = set(person_to_company["target"].dropna())
    socios = set(company_to_socio["target"].dropna()) - central_upper

    all_entities = set(df["source"].tolist() + df["target"].tolist())
    print(f"Found {len(all_entities)} unique entities")

    company_entities = {e for e in all_entities if e.upper() not in central_upper and e not in socios}
    cnae_map = load_cnae_map(company_entities)

    def node_color_size(label):
        if label.upper() in central_upper:
            return "#ff0000", 12
        if label in direct_companies:
            return "#4488ff", 8
        if label in socios:
            return "#800080", 6
        return "#ffa500", 5

    nodes = []
    links = []
    node_map = {}
    node_id = 0

    for entity in sorted(all_entities):
        node_map[entity] = node_id
        color, size = node_color_size(entity)
        node = {"id": node_id, "label": entity, "color": color, "size": size}
        cnae = cnae_map.get(entity)
        if cnae is not None:
            node["cnae"] = cnae
        nodes.append(node)
        node_id += 1

    for _, row in df.iterrows():
        src = node_map.get(row["source"])
        tgt = node_map.get(row["target"])
        if src is not None and tgt is not None:
            link = {"source": src, "target": tgt}
            if pd.notna(row.get("qualificacao_socio")):
                link["qualificacao_socio"] = int(row["qualificacao_socio"])
            links.append(link)

    graph_data = {"nodes": nodes, "links": links}

    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(graph_data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Output saved to: {OUTPUT_FILE}")
    print(f"Nodes: {len(nodes)}, Links: {len(links)}")

    blue = sum(1 for n in nodes if n["color"] == "#4488ff")
    purple = sum(1 for n in nodes if n["color"] == "#800080")
    orange = sum(1 for n in nodes if n["color"] == "#ffa500")
    red = sum(1 for n in nodes if n["color"] == "#ff0000")
    with_cnae = sum(1 for n in nodes if "cnae" in n)
    print(f"  Pessoas centrais (red): {red}")
    print(f"  Empresas diretas (blue): {blue}")
    print(f"  Socios (purple): {purple}")
    print(f"  Empresas dos socios (orange): {orange}")
    print(f"  Nodes com CNAE: {with_cnae}")


if __name__ == "__main__":
    convert()
