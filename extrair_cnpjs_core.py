#!/usr/bin/env python3
"""
Extrai CNPJs das empresas de primeiro grau dos 5 membros core da família Vorcaro.
Consulta o DuckDB local e salva output/cnpjs_core.csv com CNPJ de 8 e 14 dígitos.
"""

import pandas as pd
import duckdb
import sys
from pathlib import Path

DB_PATHS = [
    "../empresas/empresas.duckdb",
    "../empresas/db/empresas.duckdb",
]
OUTPUT_FILE = "output/cnpjs_core.csv"

TARGET_NAMES = [
    "HENRIQUE MOURA VORCARO",
    "DANIEL BUENO VORCARO",
    "NATALIA BUENO VORCARO ZETTEL",
    "ALINE BUENO RIBEIRO VORCARO",
    "FELIPE CANCADO VORCARO",
]


def connect_db():
    for path in DB_PATHS:
        if Path(path).exists():
            print(f"Conectando a {path}")
            return duckdb.connect(path, read_only=True)
    print("Erro: banco de dados não encontrado em nenhum caminho conhecido")
    sys.exit(1)


def find_person(conn, name_pattern):
    df = conn.execute(f"""
        SELECT cpf_cnpj_socio, nome_socio_razao_social
        FROM companies.socios
        WHERE nome_socio_razao_social ILIKE '%{name_pattern}%'
          AND cpf_cnpj_socio IS NOT NULL AND cpf_cnpj_socio != ''
        LIMIT 1
    """).df()
    if df.empty:
        return None, None
    return str(df.iloc[0]["cpf_cnpj_socio"]), str(df.iloc[0]["nome_socio_razao_social"]).strip().strip('"')


def get_direct_companies(conn, cpf_raw):
    return conn.execute(f"""
        SELECT cnpj_basico, qualificacao_socio
        FROM companies.socios
        WHERE cpf_cnpj_socio = '{cpf_raw}'
          AND cnpj_basico IS NOT NULL AND cnpj_basico != ''
    """).df()


def enrich_cnpjs(conn, cnpj_basics):
    clause = "','".join(cnpj_basics)

    empresas_df = conn.execute(f"""
        SELECT cnpj_basico, razao_social, capital_social
        FROM companies.empresas
        WHERE cnpj_basico IN ('{clause}')
    """).df()

    # identificador_matriz_filial = 1 → matriz; monta CNPJ 14 dígitos
    estab_df = conn.execute(f"""
        SELECT
            cnpj_basico,
            cnpj_ordem,
            cnpj_dv,
            cnae_fiscal_principal AS cnae_fiscal,
            situacao_cadastral,
            LPAD(cnpj_basico, 8, '0')
                || LPAD(cnpj_ordem, 4, '0')
                || LPAD(cnpj_dv, 2, '0') AS cnpj_14
        FROM companies.estabelecimentos
        WHERE cnpj_basico IN ('{clause}')
          AND identificador_matriz_filial = 1
    """).df()

    merged = empresas_df.merge(
        estab_df[["cnpj_basico", "cnpj_14", "cnae_fiscal", "situacao_cadastral"]],
        on="cnpj_basico", how="left"
    )
    return merged


def main():
    conn = connect_db()
    rows = []

    try:
        for name_pattern in TARGET_NAMES:
            print(f"\nProcessando: {name_pattern}")
            cpf_raw, person_name = find_person(conn, name_pattern)
            if not cpf_raw:
                print(f"  AVISO: nenhum registro encontrado para '{name_pattern}' — pulando")
                continue
            print(f"  Encontrado: {person_name} (CPF: {cpf_raw})")

            direct_df = get_direct_companies(conn, cpf_raw)
            print(f"  Empresas diretas: {len(direct_df)}")

            if direct_df.empty:
                continue

            cnpj_basics = direct_df["cnpj_basico"].dropna().unique().tolist()
            enriched = enrich_cnpjs(conn, cnpj_basics)

            direct_df = direct_df.merge(enriched, on="cnpj_basico", how="left")
            direct_df.insert(0, "person", person_name)
            rows.append(direct_df)

    finally:
        conn.close()

    if not rows:
        print("Nenhum dado encontrado.")
        sys.exit(0)

    result = pd.concat(rows, ignore_index=True)
    result = result[["person", "cnpj_basico", "cnpj_14", "razao_social", "cnae_fiscal", "situacao_cadastral", "qualificacao_socio"]]
    result = result.drop_duplicates(subset=["cnpj_basico"])

    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT_FILE, index=False)

    print(f"\nTotal de empresas únicas: {len(result)}")
    print(f"Com CNPJ 14 dígitos: {result['cnpj_14'].notna().sum()}")
    print(f"Salvo em: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
