"""
Generates ≤3-word Portuguese short labels for all CNAE codes in cnae-labels.js
that currently have long DB descriptions. Keeps hand-crafted labels untouched.

Usage:
    ANTHROPIC_API_KEY=sk-... python3 shorten_cnaes.py
"""

import json, re, os, sys, time
import anthropic

SHORT_LABELS = {
    6462000:"Holdings de Instituições",4781400:"Varejo de Vestuário",8630503:"Consultas Médicas Ambulatoriais",7112000:"Serviços de Engenharia",9430800:"Associações de Direitos",4120400:"Construção de Edifícios",8299799:"Serviços Empresariais Diversos",6463800:"Sociedades de Participações",4754701:"Varejo de Móveis",6810201:"Compra e Venda Imóveis",4930202:"Transporte de Cargas",5611203:"Lanchonetes e Sucos",5611201:"Restaurantes e Similares",6911701:"Serviços Advocatícios",6424704:"Cooperativas de Crédito",4619200:"Representação de Mercadorias",7020400:"Consultoria em Gestão",4774100:"Varejo de Óptica",4712100:"Minimercados e Mercearias",9491000:"Organizações Religiosas Filosóficas",4110700:"Incorporação de Empreendimentos",8211300:"Apoio Administrativo Escritório",8599604:"Treinamento Profissional Gerencial",6612605:"Agentes de Investimentos",4530703:"Peças e Veículos",6920601:"Atividades de Contabilidade",6424703:"Cooperativas de Crédito",4744099:"Varejo de Construção",4789099:"Varejo de Diversos Produtos",6810202:"Aluguel de Imóveis",4751201:"Varejo de Informática",8630504:"Atividade Odontológica Clínica",4520001:"Manutenção de Veículos",4753900:"Varejo de Eletrodomésticos",9499500:"Atividades Associativas Diversas",8610102:"Atendimento de Urgência",4930201:"Transporte de Cargas",1412601:"Confecção de Vestuário",4729699:"Varejo de Alimentos",4618499:"Representação de Negócios",4771701:"Farmácias Sem Manipulação",7319002:"Promoção de Vendas",4723700:"Varejo de Bebidas",7490104:"Intermediação de Serviços",4722901:"Açougues Varejo Carnes",8610101:"Atendimento Hospitalar Geral",9492800:"Atividades Políticas Organizadas",6209100:"Suporte de TI",4752100:"Varejo de Telefonia",6821801:"Corretagem de Imóveis",4772500:"Varejo de Cosméticos",8630502:"Exames Médicos Clínicos",8640202:"Laboratórios Clínicos Gerais",8630599:"Atenção Ambulatorial Geral",9313100:"Condicionamento Físico Academias",134200:"Cultivo de Café",8630501:"Procedimentos Médicos Cirúrgicos",4721102:"Padaria e Confeitaria",8599699:"Atividades de Ensino",4744005:"Varejo de Construção",4742300:"Varejo de Material",8650003:"Psicologia e Psicanálise",7311400:"Agências de Publicidade",4759899:"Varejo de Uso Pessoal",4761003:"Varejo de Papelaria",9511800:"Reparação de Computadores",4773300:"Varejo de Produtos Médicos",8888888:"Atividade Não Informada",4784900:"Varejo de Gás GLP",6822600:"Gestão de Imóveis",9602502:"Estética e Beleza",9001999:"Artes Cênicas Complementares",8640201:"Laboratórios de Patologia",4711302:"Supermercados Varejo",5611204:"Bares de Bebidas",4724500:"Hortifrúti Varejo",4783101:"Joalheria Varejo",4789002:"Flores Naturais Varejo",8219999:"Apoio Administrativo Documentos",8230001:"Organização de Eventos",6201501:"Desenvolvimento de Software",8650099:"Profissionais de Saúde",7711000:"Aluguel de Automóveis",7739099:"Aluguel de Máquinas",7911200:"Agências de Viagens",6622300:"Corretagem de Seguros",3101200:"Fabricação de Móveis",4782201:"Varejo de Calçados",4771702:"Farmácias Com Manipulação",4755502:"Varejo de Armarinho",4313400:"Obras de Terraplenagem",4530701:"Atacado de Peças",9001902:"Produção Musical Eventos",4689399:"Atacado de Intermediários",4639701:"Atacado de Alimentos",7490101:"Tradução e Interpretação",4617600:"Representação de Alimentos",8640299:"Diagnóstico e Terapias",4541206:"Peças de Motocicletas",8650004:"Fisioterapia Clínica",8512100:"Educação Pré-Escola",230600:"Apoio À Produção",6491300:"Factoring e Fomento",5223100:"Estacionamento de Veículos",4511102:"Veículos Usados",6421200:"Bancos Comerciais Gerais",4299599:"Engenharia Civil Obras",4744001:"Varejo de Ferragens",151201:"Criação de Bovinos",4789001:"Suvenires e Artesanato",6110803:"Comunicação Multimídia",
}

SRC = "src/cnae-labels.js"

def load_current():
    """Parse all [code,"label"] entries from cnae-labels.js."""
    text = open(SRC).read()
    entries = {}
    for m in re.finditer(r'\[(\d+),"([^"]+)"\]', text):
        entries[int(m.group(1))] = m.group(2)
    return entries

def batches(items, size):
    it = list(items)
    for i in range(0, len(it), size):
        yield it[i:i+size]

def shorten_batch(client, batch):
    """batch: list of (code, long_description). Returns {code: short_label}."""
    lines = "\n".join(f'{code}: {desc}' for code, desc in batch)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": (
                "You will receive Brazilian CNAE economic activity descriptions.\n"
                "For each line formatted as '<code>: <description>', return a concise "
                "Portuguese label of AT MOST 3 words that clearly conveys the activity.\n"
                "Rules: preserve key nouns, no articles unless essential, no trailing punctuation.\n"
                "Return ONLY a JSON object mapping code strings to short labels.\n\n"
                f"{lines}"
            )
        }]
    )
    text = msg.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r'^```[a-z]*\n?', '', text)
    text = re.sub(r'\n?```$', '', text)
    raw = json.loads(text)
    return {int(k): v for k, v in raw.items()}

def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first.")

    current = load_current()
    to_shorten = [(code, label) for code, label in current.items() if code not in SHORT_LABELS]
    print(f"Shortening {len(to_shorten)} long labels in batches of 60…")

    client = anthropic.Anthropic()
    ai_labels = {}
    batch_list = list(batches(to_shorten, 60))
    for i, batch in enumerate(batch_list, 1):
        print(f"  batch {i}/{len(batch_list)} ({len(batch)} items)…", flush=True)
        result = shorten_batch(client, batch)
        ai_labels.update(result)
        if i < len(batch_list):
            time.sleep(0.5)

    merged = {**ai_labels, **SHORT_LABELS}  # short_labels win
    all_codes = sorted(merged)

    lines = ["export const CNAE_LABELS = new Map(["]
    for code in all_codes:
        label = merged[code].replace('"', '\\"')
        lines.append(f'  [{code},"{label}"],')
    lines.append("]);")
    lines.append("")

    with open(SRC, "w") as f:
        f.write("\n".join(lines))

    print(f"Done. Wrote {len(all_codes)} entries to {SRC}")
    print("Now run: bun run build")

if __name__ == "__main__":
    main()
