#!/usr/bin/env python3
"""
Cruza os CNPJs das empresas core da família Vorcaro com 13 tabelas de dados
governamentais. Usa DuckDB local (S3) para tabelas rápidas e o endpoint HTTP
https://db.xn--2dk.xyz/query para tabelas lentas.

Pré-requisito:
  pip install duckdb pandas requests

Uso:
  python investigar.py
  python investigar.py --cnpjs output/cnpjs_core.csv
"""

import argparse
import io
import sys
import threading
from pathlib import Path

import duckdb
import pandas as pd
import requests

BD_DB = "../baseldosdados/data/basedosdados.duckdb"
HTTP_ENDPOINT = "https://db.xn--2dk.xyz/query"
HTTP_PASSWORD = "s3nh4;s1nistr4"
OUTPUT_DIR = Path("output/investigacao")
DEFAULT_CNPJS_FILE = "output/cnpjs_core.csv"
QUERY_TIMEOUT = 120  # segundos — tabelas locais
HTTP_TIMEOUT = 300   # segundos — endpoint remoto

# (label, schema, table, cnpj_col, usar_cnpj_basico, usar_http)
TABELAS = [
    ("contratos_compra",            "br_cgu_licitacao_contrato", "contrato_compra",               "cpf_cnpj_contratado",   False, False),
    ("licitacao_participantes",     "br_cgu_licitacao_contrato", "licitacao_participante",         "cpf_cnpj_participante", False, True),
    ("eleicoes_receitas_candidato", "br_tse_eleicoes",           "receitas_candidato",             "cpf_cnpj_doador",       False, False),
    ("eleicoes_receitas_comite",    "br_tse_eleicoes",           "receitas_comite",                "cpf_cnpj_doador",       False, False),
    ("eleicoes_receitas_partido",   "br_tse_eleicoes",           "receitas_orgao_partidario",      "cpf_cnpj_doador",       False, False),
    ("credito_rural_mutuario",      "br_bcb_sicor",              "recurso_publico_mutuario",       "cnpj_basico",           True,  False),
    ("credito_rural_cooperado",     "br_bcb_sicor",              "recurso_publico_cooperado",      "cnpj_basico",           True,  False),
    ("saude_cnes_estabelecimento",  "br_ms_cnes",                "estabelecimento",                "cpf_cnpj",              False, True),
    ("saude_sih_internacoes",       "br_ms_sih",                 "aihs_reduzidas",                 "cnpj_estabelecimento",  False, True),
    ("saude_ans_planos",            "br_ans_beneficiario",       "informacao_consolidada",         "cnpj",                  False, True),
    ("camara_despesas",             "br_camara_dados_abertos",   "despesa",                        "cnpj_cpf_fornecedor",   False, False),
    ("camara_contratos",            "br_camara_dados_abertos",   "licitacao_contrato",             "cpf_cnpj_fornecedor",   False, False),
    ("cgu_cartao_pagamento",        "br_cgu_cartao_pagamento",   "microdados_governo_federal",     "cnpj_cpf_favorecido",   False, False),
]


def load_cnpjs(path):
    df = pd.read_csv(path, dtype=str)
    cnpjs_14 = df["cnpj_14"].dropna().str.strip().unique().tolist()
    cnpjs_basico = df["cnpj_basico"].dropna().str.strip().unique().tolist()
    print(f"CNPJs carregados: {len(cnpjs_14)} completos, {len(cnpjs_basico)} básicos (8 dígitos)")
    return cnpjs_14, cnpjs_basico


def build_in_list(values):
    escaped = [v.replace("'", "''") for v in values]
    return "['" + "', '".join(escaped) + "']"


def build_sql(schema, table, cnpj_col, cnpjs):
    return f"""SELECT * FROM {schema}.{table} WHERE {cnpj_col} IN {build_in_list(cnpjs)} LIMIT 10000"""


def query_local(label, schema, table, cnpj_col, cnpjs):
    sql = build_sql(schema, table, cnpj_col, cnpjs)
    result = [None]
    error = [None]
    conn_ref = [None]

    def run():
        try:
            conn_ref[0] = duckdb.connect(BD_DB, read_only=True)
            result[0] = conn_ref[0].execute(sql).df()
        except Exception as e:
            error[0] = str(e).split("\n")[0]
        finally:
            if conn_ref[0]:
                try:
                    conn_ref[0].close()
                except Exception:
                    pass

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout=QUERY_TIMEOUT)

    if t.is_alive():
        if conn_ref[0]:
            try:
                conn_ref[0].interrupt()
            except Exception:
                pass
        t.join(timeout=5)
        print(f"  {label}: TIMEOUT local ({QUERY_TIMEOUT}s)")
        return None

    if error[0]:
        print(f"  {label}: ERRO local — {error[0]}")
        return None

    print(f"  {label}: {len(result[0])} registros")
    return result[0]


def query_http(label, schema, table, cnpj_col, cnpjs):
    sql = build_sql(schema, table, cnpj_col, cnpjs)
    try:
        resp = requests.post(
            HTTP_ENDPOINT,
            headers={"X-Password": HTTP_PASSWORD},
            data=sql.encode(),
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        text = resp.text.strip()
        if not text:
            print(f"  {label}: 0 registros (HTTP)")
            return None
        df = pd.read_csv(io.StringIO(text), dtype=str)
        print(f"  {label}: {len(df)} registros (HTTP)")
        return df
    except requests.Timeout:
        print(f"  {label}: TIMEOUT HTTP ({HTTP_TIMEOUT}s)")
        return None
    except Exception as e:
        print(f"  {label}: ERRO HTTP — {e}")
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cnpjs", default=DEFAULT_CNPJS_FILE, help="CSV com CNPJs extraídos")
    args = parser.parse_args()

    if not Path(args.cnpjs).exists():
        print(f"Arquivo não encontrado: {args.cnpjs}")
        print("Execute primeiro: python extrair_cnpjs_core.py")
        sys.exit(1)

    if not Path(BD_DB).exists():
        print(f"Banco basedosdados não encontrado: {BD_DB}")
        sys.exit(1)

    cnpjs_14, cnpjs_basico = load_cnpjs(args.cnpjs)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sumario = []

    for label, schema, table, cnpj_col, usar_basico, usar_http in TABELAS:
        print(f"\nConsultando: {schema}.{table}{' [HTTP]' if usar_http else ''}")
        cnpjs = cnpjs_basico if usar_basico else cnpjs_14

        df = query_http(label, schema, table, cnpj_col, cnpjs) if usar_http \
            else query_local(label, schema, table, cnpj_col, cnpjs)

        if df is not None and not df.empty:
            out_path = OUTPUT_DIR / f"{label}.csv"
            df.to_csv(out_path, index=False)
            sumario.append((label, len(df), str(out_path)))
        else:
            sumario.append((label, 0, "—"))

    print("\n" + "=" * 60)
    print("SUMÁRIO DA INVESTIGAÇÃO")
    print("=" * 60)
    for label, count, path in sumario:
        status = f"{count} registros → {path}" if count > 0 else "sem resultados"
        print(f"  {label:<35} {status}")


if __name__ == "__main__":
    main()
