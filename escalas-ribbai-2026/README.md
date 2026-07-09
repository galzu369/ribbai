# RIBBAI 2.0 — Plano de Escalas Operacionais | Julho 2026

Sistema independente para geração de escalas operacionais da equipa de sala do restaurante RIBBAI 2.0.

## Descrição

Este sistema gera automaticamente o plano de escalas para julho de 2026, garantindo:
- **Ciclo 4+2**: 4 dias trabalho + 2 dias folga para cada colaborador
- **Cobertura adequada**: 2 pessoas na abertura, 5+ no almoço, 3 no fecho
- **Distribuição equilibrada**: Carga de trabalho justa entre todos os elementos
- **Qualidade visual premium**: Documento executivo com padrões institucionais

## Equipa (8 colaboradores)

- **Bruno** - Chefia operacional
- **Filipe** - Chefia operacional  
- **Carolina** - Elemento experiente
- **Pablo** - Especialista 60's
- **Lil** - Elemento polivalente
- **Matilde** - Responsável sala interior
- **Lee** - Elemento em desenvolvimento
- **Diogo** - Elemento em desenvolvimento

## Instalação

```bash
npm install
```

## Uso

### Gerar Escala Completa
```bash
npm run generate
```

### Gerar PDF Executivo
```bash
npm run pdf
```

### Visualizar no Browser
```bash
npm run dev
# Aceder a http://localhost:8080/output/schedule.html
```

## Estrutura de Ficheiros

```
escalas-ribbai-2026/
├── src/
│   ├── algorithm/      # Algoritmos de distribuição e otimização
│   ├── data/          # Dados dos colaboradores e calendário
│   ├── templates/     # Templates HTML/CSS
│   └── utils/         # Funções auxiliares
├── output/            # Ficheiros gerados (HTML, PDF, JSON)
├── scripts/          # Scripts de geração
└── package.json
```

## Funcionalidades

### Algoritmo Inteligente
- **CSP (Constraint Satisfaction Problem)** com otimização heurística
- **Validação automática** de todas as regras operacionais  
- **Distribuição equilibrada** com métricas de qualidade

### Documento Premium
- **Design institucional** baseado nos padrões RIBBAI
- **KPIs visuais** e estatísticas detalhadas
- **Calendário interativo** com código de cores
- **Páginas individuais** por colaborador

### Sistema de Cores

🟢 **Abertura** (09:00) - 2 pessoas  
🟠 **Pico Almoço** (12:00-16:30) - 5+ pessoas  
🟣 **Fecho** (23:00) - 3 pessoas  
⚪ **Folga** - Dias de descanso  

## Validação Automática

✅ Máximo 4 dias consecutivos de trabalho  
✅ Folgas sempre consecutivas (2 dias)  
✅ Cobertura mínima garantida em todos os turnos  
✅ Distribuição equilibrada (±1 dia entre colaboradores)  
✅ Sem conflitos de horários  

## Outputs Gerados

- **`schedule.html`** - Documento interativo responsivo
- **`schedule.pdf`** - PDF executivo para impressão  
- **`schedule-data.json`** - Dados estruturados reutilizáveis

## Qualidade Executiva

O documento final segue os padrões de qualidade institucional do RIBBAI 2.0, adequado para apresentação à Gerência e Administração como Plano Oficial de Escalas Operacionais.