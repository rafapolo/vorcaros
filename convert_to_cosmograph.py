#!/usr/bin/env python3

import pandas as pd
import json
from pathlib import Path

INPUT_FILE = "output/network_vorcano.csv"
OUTPUT_FILE = "output/network_vorcano_cosmograph.json"

# All central persons — shown in red
CENTRAL_PERSONS = {
    "HENRIQUE MOURA VORCARO",
    "DANIEL BUENO VORCARO",
}


def convert():
    df = pd.read_csv(INPUT_FILE)
    print(f"Converting {len(df)} relationships to JSON format...")

    # Determine node roles from relationship types
    person_to_company = df[df["relationship_type"] == "person_to_company"]
    company_to_socio = df[df["relationship_type"] == "company_to_socio"]

    central_upper = {p.upper() for p in CENTRAL_PERSONS}
    direct_companies = set(person_to_company["target"].dropna())
    socios = set(company_to_socio["target"].dropna()) - central_upper

    def node_color_size(label):
        # Central persons (Henrique, Daniel) — red
        if label.upper() in central_upper:
            return "#ff0000", 12
        # Direct companies of any central person — blue
        if label in direct_companies:
            return "#4488ff", 8
        # Socios of their companies — purple
        if label in socios:
            return "#800080", 6
        # Companies of socios — orange
        return "#ffa500", 5

    nodes = []
    links = []
    node_map = {}
    node_id = 0

    all_entities = set(df["source"].tolist() + df["target"].tolist())
    print(f"Found {len(all_entities)} unique entities")

    for entity in sorted(all_entities):
        node_map[entity] = node_id
        color, size = node_color_size(entity)
        nodes.append({"id": node_id, "label": entity, "color": color, "size": size})
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
    print(f"  Pessoas centrais (red): {red}")
    print(f"  Empresas diretas (blue): {blue}")
    print(f"  Socios (purple): {purple}")
    print(f"  Empresas dos socios (orange): {orange}")


if __name__ == "__main__":
    convert()
