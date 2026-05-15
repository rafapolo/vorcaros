#!/usr/bin/env python3

import pandas as pd
import duckdb
import sys
import re
from pathlib import Path

DB_PATHS = [
    "../empresas/empresas.duckdb",
    "../empresas/db/empresas.duckdb",
]
OUTPUT_FILE = "output/network_vorcaro.csv"

# Each entry: partial name to search (ILIKE match)
TARGET_NAMES = [
    "HENRIQUE MOURA VORCARO",
    "DANIEL BUENO VORCARO",
    "NATALIA BUENO VORCARO ZETTEL",
    "ALINE BUENO RIBEIRO VORCARO",
    "FELIPE CANCADO VORCARO",
]

IGNORED_COMPANIES = {
    "STARMED ATIVIDADES MEDICAS LTDA",
}


def connect_db():
    for path in DB_PATHS:
        if Path(path).exists():
            print(f"Connecting to {path}")
            return duckdb.connect(path, read_only=True)
    print("Error: database not found at any known path")
    sys.exit(1)


def find_person(conn, name_pattern):
    """Return (cpf_raw, canonical_name) for the first match of name_pattern."""
    q = f"""
    SELECT cpf_cnpj_socio, nome_socio_razao_social
    FROM companies.socios
    WHERE nome_socio_razao_social ILIKE '%{name_pattern}%'
      AND cpf_cnpj_socio IS NOT NULL AND cpf_cnpj_socio != ''
    LIMIT 1
    """
    df = conn.execute(q).df()
    if df.empty:
        return None, None
    return str(df.iloc[0]["cpf_cnpj_socio"]), str(df.iloc[0]["nome_socio_razao_social"]).strip().strip('"')


def expand_person(conn, cpf_raw, person_name):
    """
    Return (initial_df, all_socios_df, socio_companies_df, company_lookup)
    for a single person identified by their raw CPF value.
    """
    # Companies where this person is a socio
    initial_df = conn.execute(f"""
        SELECT cnpj_basico, cpf_cnpj_socio, nome_socio_razao_social, qualificacao_socio
        FROM companies.socios
        WHERE cpf_cnpj_socio = '{cpf_raw}'
          AND nome_socio_razao_social IS NOT NULL AND nome_socio_razao_social != ''
    """).df()
    print(f"  Companies for {person_name}: {len(initial_df)}")

    if initial_df.empty:
        return initial_df, pd.DataFrame(), pd.DataFrame(), {}

    # All socios of those companies
    cnpj_clause = "','".join(initial_df["cnpj_basico"].dropna().unique().tolist())
    all_socios_df = conn.execute(f"""
        SELECT cnpj_basico, cpf_cnpj_socio, nome_socio_razao_social, qualificacao_socio
        FROM companies.socios
        WHERE cnpj_basico IN ('{cnpj_clause}')
          AND nome_socio_razao_social IS NOT NULL AND nome_socio_razao_social != ''
    """).df()
    print(f"  Socios of those companies: {len(all_socios_df)}")

    # Companies where those socios are partners
    socio_companies_df = pd.DataFrame()
    socio_ids = [str(s) for s in all_socios_df["cpf_cnpj_socio"].dropna().unique() if str(s).strip()]
    if socio_ids:
        socio_clause = "','".join(socio_ids)
        socio_companies_df = conn.execute(f"""
            SELECT cnpj_basico, cpf_cnpj_socio, nome_socio_razao_social, qualificacao_socio
            FROM companies.socios
            WHERE cpf_cnpj_socio IN ('{socio_clause}')
              AND nome_socio_razao_social IS NOT NULL AND nome_socio_razao_social != ''
        """).df()
        print(f"  Companies of those socios: {len(socio_companies_df)}")

    # Lookup razao_social for all CNPJs
    all_cnpjs = set()
    for df in [initial_df, all_socios_df, socio_companies_df]:
        if not df.empty:
            all_cnpjs.update(df["cnpj_basico"].dropna().unique())

    company_lookup = {}
    if all_cnpjs:
        cnpj_all_clause = "','".join(all_cnpjs)
        names_df = conn.execute(f"""
            SELECT cnpj_basico, razao_social FROM companies.empresas
            WHERE cnpj_basico IN ('{cnpj_all_clause}')
              AND razao_social IS NOT NULL AND razao_social != ''
        """).df()
        for _, row in names_df.iterrows():
            company_lookup[row["cnpj_basico"]] = str(row["razao_social"]).strip().strip('"')

    return initial_df, all_socios_df, socio_companies_df, company_lookup


def build_relationships(person_name, initial_df, all_socios_df, socio_companies_df, company_lookup):
    relationships = []

    def safe_name(val):
        return "" if pd.isna(val) else str(val).strip().strip('"')

    def qual(row):
        return row["qualificacao_socio"] if pd.notna(row["qualificacao_socio"]) else None

    # Person → their companies
    for _, row in initial_df.iterrows():
        company_name = company_lookup.get(row["cnpj_basico"], "")
        if company_name and company_name not in IGNORED_COMPANIES:
            relationships.append({
                "source": person_name,
                "target": company_name,
                "relationship_type": "person_to_company",
                "qualificacao_socio": qual(row),
            })

    # Companies → their socios
    for _, row in all_socios_df.iterrows():
        company_name = company_lookup.get(row["cnpj_basico"], "")
        socio_name = safe_name(row["nome_socio_razao_social"])
        if company_name and socio_name and company_name not in IGNORED_COMPANIES:
            relationships.append({
                "source": company_name,
                "target": socio_name,
                "relationship_type": "company_to_socio",
                "qualificacao_socio": qual(row),
            })

    # Socios → their other companies
    if not socio_companies_df.empty:
        socio_name_lookup = {
            str(row["cpf_cnpj_socio"]): safe_name(row["nome_socio_razao_social"])
            for _, row in all_socios_df.iterrows()
            if pd.notna(row["cpf_cnpj_socio"])
        }
        for _, row in socio_companies_df.iterrows():
            socio_id = str(row["cpf_cnpj_socio"]) if pd.notna(row["cpf_cnpj_socio"]) else ""
            company_name = company_lookup.get(row["cnpj_basico"], "")
            src_name = socio_name_lookup.get(socio_id, "")
            if src_name and company_name and company_name not in IGNORED_COMPANIES:
                relationships.append({
                    "source": src_name,
                    "target": company_name,
                    "relationship_type": "socio_to_company",
                    "qualificacao_socio": qual(row),
                })

    return relationships


def generate_network():
    conn = connect_db()

    try:
        all_relationships = []

        for name_pattern in TARGET_NAMES:
            print(f"\nProcessing: {name_pattern}")
            cpf_raw, person_name = find_person(conn, name_pattern)
            if not cpf_raw:
                print(f"  WARNING: no record found for '{name_pattern}' — skipping")
                continue
            print(f"  Found: {person_name} (CPF: {cpf_raw})")

            initial_df, all_socios_df, socio_companies_df, company_lookup = expand_person(
                conn, cpf_raw, person_name
            )
            rels = build_relationships(person_name, initial_df, all_socios_df, socio_companies_df, company_lookup)
            all_relationships.extend(rels)

        conn.close()

        if not all_relationships:
            print("Warning: no relationships found")
            sys.exit(0)

        network_df = pd.DataFrame(all_relationships)
        network_df["source"] = network_df["source"].astype(str)
        network_df["target"] = network_df["target"].astype(str)
        network_df = network_df.drop_duplicates(subset=["source", "target", "relationship_type"])

        Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
        network_df.to_csv(OUTPUT_FILE, index=False)

        print(f"\nNetwork generation complete!")
        print(f"Generated {len(network_df)} relationships")
        print(network_df["relationship_type"].value_counts().to_string())
        print(f"Output saved to: {OUTPUT_FILE}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    generate_network()
