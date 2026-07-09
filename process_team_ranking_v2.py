#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Análise e Ranking Mensal da Equipa RIBBAI v2.0
Versão melhorada com análise mais precisa dos dados
"""

import os
import re
from collections import defaultdict
from datetime import datetime
import json

class ImprovedTeamRankingAnalyzer:
    def __init__(self, base_path):
        self.base_path = base_path
        self.daily_reports_path = os.path.join(base_path, "docs/operational-records/2026/06-june/daily")
        
        # Lista canônica de nomes de colaboradores
        self.canonical_names = {
            'filipe catalão': 'Filipe Catalão',
            'filipe': 'Filipe Catalão',
            'bruno': 'Bruno',
            'carolina': 'Carolina', 
            'matilde': 'Matilde',
            'lil': 'Lil',
            'lee': 'Lee',
            'pablo': 'Pablo',
            'diogo': 'Diogo',
            'sofia': 'Sofia',
            'marta': 'Marta'
        }
        
        self.team_data = defaultdict(lambda: {
            'total_overtime_minutes': 0,
            'total_overtime_instances': 0,
            'positive_mentions': 0,
            'days_worked': 0,
            'opening_shifts': 0,
            'closing_shifts': 0,
            'responsibilities': set(),
            'feedback_notes': [],
            'overtime_details': [],
            'special_mentions': []
        })
        
    def normalize_name(self, name):
        """Normaliza nomes de colaboradores para formato canônico"""
        if not name:
            return None
            
        name_clean = name.lower().strip()
        
        # Remove caracteres especiais e números
        name_clean = re.sub(r'[^\w\s]', '', name_clean)
        
        # Verifica se é um nome canônico
        if name_clean in self.canonical_names:
            return self.canonical_names[name_clean]
            
        # Verifica se contém um nome canônico
        for canon_key, canon_name in self.canonical_names.items():
            if canon_key in name_clean:
                return canon_name
                
        return None

    def parse_time_to_minutes(self, time_str):
        """Converte string de tempo para minutos"""
        if not time_str:
            return 0
            
        time_str = str(time_str).lower().strip()
        
        # Remove caracteres especiais
        time_str = re.sub(r'[^\d\w\s]', '', time_str)
        
        total_minutes = 0
        
        # Padrão para horas e minutos (1h40, 2h30, etc.)
        hour_min_pattern = r'(\d+)h(\d+)'
        hour_min_match = re.search(hour_min_pattern, time_str)
        if hour_min_match:
            hours = int(hour_min_match.group(1))
            minutes = int(hour_min_match.group(2))
            total_minutes = hours * 60 + minutes
            return total_minutes
        
        # Padrão para só horas (2h, 3h, etc.)
        hour_pattern = r'(\d+)h(?!\d)'
        hour_match = re.search(hour_pattern, time_str)
        if hour_match:
            hours = int(hour_match.group(1))
            total_minutes = hours * 60
            return total_minutes
            
        # Padrão para só minutos (45min, 30 min, etc.)
        min_pattern = r'(\d+)\s*min'
        min_match = re.search(min_pattern, time_str)
        if min_match:
            total_minutes = int(min_match.group(1))
            return total_minutes
            
        return 0

    def extract_overtime_comprehensive(self, content):
        """Extração abrangente de dados de horas extra"""
        overtime_data = {}
        
        # Múltiplos padrões de busca para horas extra
        patterns = [
            r'### Resumo De Horas Extra.*?(?=###|##|\Z)',
            r'## Horas Extra.*?(?=###|##|\Z)', 
            r'### Overtime Input.*?(?=###|##|\Z)',
            r'Totalizou.*?(\d+h\d+|\d+:\d+|\d+ horas?)'
        ]
        
        for pattern in patterns:
            sections = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
            
            for section in sections:
                section_text = section.group(0)
                
                # Busca por tabelas de horas extra
                table_rows = re.findall(r'\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|', section_text)
                
                for row in table_rows:
                    name_raw = row[0].strip()
                    overtime_str = row[1].strip()
                    
                    # Skip headers e totais
                    if any(word in name_raw.lower() for word in ['colaborador', '---', 'total', 'registo', 'horas extra']):
                        continue
                    
                    # Normaliza nome
                    name = self.normalize_name(name_raw)
                    if name:
                        overtime_minutes = self.parse_time_to_minutes(overtime_str)
                        if overtime_minutes > 0:
                            overtime_data[name] = overtime_data.get(name, 0) + overtime_minutes
                            
        # Busca também por menções diretas de horas extra no texto
        for canon_name in self.canonical_names.values():
            # Padrão: "Totalizou 1h45m de horas extra"
            pattern = rf'{re.escape(canon_name)}.*?totalizou.*?(\d+h\d+|\d+:\d+)'
            matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
            
            for match in matches:
                overtime_str = match.group(1)
                overtime_minutes = self.parse_time_to_minutes(overtime_str)
                if overtime_minutes > 0:
                    overtime_data[canon_name] = overtime_data.get(canon_name, 0) + overtime_minutes
                    
        return overtime_data

    def extract_team_feedback_improved(self, content):
        """Extração melhorada de feedback da equipa"""
        feedback_data = {}
        
        # Busca por secções de feedback
        feedback_patterns = [
            r'### Team Feedback Input.*?(?=###|##|\Z)',
            r'## Desempenho Da Equipa.*?(?=###|##|\Z)',
            r'## Destaques Da Equipa.*?(?=###|##|\Z)'
        ]
        
        for pattern in feedback_patterns:
            sections = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
            
            for section in sections:
                section_text = section.group(0)
                
                # Busca por feedback de colaboradores individuais
                for canon_name in self.canonical_names.values():
                    # Padrões para capturar menções do colaborador
                    name_patterns = [
                        rf'{re.escape(canon_name)}[:\-]\s*([^.\n]+)',
                        rf'-\s*{re.escape(canon_name)}[:\-]\s*([^.\n]+)',
                        rf'### {re.escape(canon_name)}\s*\n(.*?)(?=###|\n\n)',
                    ]
                    
                    for name_pattern in name_patterns:
                        matches = re.finditer(name_pattern, section_text, re.IGNORECASE | re.DOTALL)
                        for match in matches:
                            feedback_text = match.group(1).strip()
                            if len(feedback_text) > 10:  # Só feedbacks substanciais
                                if canon_name not in feedback_data:
                                    feedback_data[canon_name] = []
                                feedback_data[canon_name].append(feedback_text)
                                
        return feedback_data

    def count_responsibilities(self, content):
        """Conta responsabilidades específicas de cada colaborador"""
        responsibilities = defaultdict(set)
        
        # Define palavras-chave por tipo de responsabilidade
        responsibility_keywords = {
            'Abertura': ['abertura', 'assegurou a abertura', 'realizou a abertura'],
            'Fecho': ['fecho', 'participou no fecho', 'assegurou o fecho'],
            'Coordenação': ['coordenação', 'coordenou', 'supervisão', 'supervisou'],
            'Runner': ['runner', 'apoio operacional'],
            'Gestão de Porta': ['porta', 'gestão da entrada', 'gestão de entrada'],
            'Sala Interior': ['sala interior', 'interior'],
            'Quiosque': ['quiosque', 'gelados'],
            'Setor 50': ['setor 50', 'zona 50', 'mesas 50'],
            'Setor 60': ['setor 60', 'zona 60', 'mesas 60'],
            'Setor 70': ['setor 70', 'zona 70', 'mesas 70']
        }
        
        for canon_name in self.canonical_names.values():
            # Busca pela secção específica do colaborador
            name_section_pattern = rf'### {re.escape(canon_name)}\s*\n(.*?)(?=###|\n##)'
            name_section = re.search(name_section_pattern, content, re.DOTALL | re.IGNORECASE)
            
            if name_section:
                section_text = name_section.group(1).lower()
                
                for resp_type, keywords in responsibility_keywords.items():
                    if any(keyword in section_text for keyword in keywords):
                        responsibilities[canon_name].add(resp_type)
                        
        return dict(responsibilities)

    def process_daily_report(self, file_path):
        """Processa um relatório diário"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            filename = os.path.basename(file_path)
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
            report_date = date_match.group(1) if date_match else "unknown"
            
            # Extrai dados melhorados
            overtime_data = self.extract_overtime_comprehensive(content)
            feedback_data = self.extract_team_feedback_improved(content)
            responsibilities = self.count_responsibilities(content)
            
            # Processa cada colaborador
            all_members = set(list(overtime_data.keys()) + list(feedback_data.keys()) + list(responsibilities.keys()))
            
            for member in all_members:
                if member:  # Verifica se o nome é válido
                    self.team_data[member]['days_worked'] += 1
                    
                    # Horas extra
                    if member in overtime_data:
                        minutes = overtime_data[member]
                        self.team_data[member]['total_overtime_minutes'] += minutes
                        self.team_data[member]['total_overtime_instances'] += 1
                        self.team_data[member]['overtime_details'].append({
                            'date': report_date,
                            'minutes': minutes,
                            'formatted': f"{minutes//60}h{minutes%60:02d}min"
                        })
                    
                    # Feedback positivo
                    if member in feedback_data:
                        feedback_count = len(feedback_data[member])
                        self.team_data[member]['positive_mentions'] += feedback_count
                        for feedback in feedback_data[member]:
                            self.team_data[member]['feedback_notes'].append({
                                'date': report_date,
                                'feedback': feedback
                            })
                    
                    # Responsabilidades
                    if member in responsibilities:
                        self.team_data[member]['responsibilities'].update(responsibilities[member])
                        
                        if 'Abertura' in responsibilities[member]:
                            self.team_data[member]['opening_shifts'] += 1
                        if 'Fecho' in responsibilities[member]:
                            self.team_data[member]['closing_shifts'] += 1
                            
        except Exception as e:
            print(f"Erro ao processar {file_path}: {str(e)}")

    def calculate_rankings(self):
        """Calcula rankings melhorados"""
        # Remove colaboradores com dados mínimos
        filtered_data = {name: data for name, data in self.team_data.items() 
                        if data['days_worked'] > 0 and name in self.canonical_names.values()}
        
        # Rankings individuais
        overtime_ranking = sorted(
            [(name, data['total_overtime_minutes']) for name, data in filtered_data.items() 
             if data['total_overtime_minutes'] > 0],
            key=lambda x: x[1], reverse=True
        )
        
        mentions_ranking = sorted(
            [(name, data['positive_mentions']) for name, data in filtered_data.items()],
            key=lambda x: x[1], reverse=True
        )
        
        consistency_ranking = sorted(
            [(name, data['days_worked']) for name, data in filtered_data.items()],
            key=lambda x: x[1], reverse=True
        )
        
        responsibility_ranking = sorted(
            [(name, len(data['responsibilities'])) for name, data in filtered_data.items()],
            key=lambda x: x[1], reverse=True
        )
        
        # Score composto melhorado
        composite_scores = {}
        max_overtime = max([data['total_overtime_minutes'] for data in filtered_data.values()]) or 1
        max_mentions = max([data['positive_mentions'] for data in filtered_data.values()]) or 1
        max_days = max([data['days_worked'] for data in filtered_data.values()]) or 1
        max_resp = max([len(data['responsibilities']) for data in filtered_data.values()]) or 1
        
        for name, data in filtered_data.items():
            # Scores normalizados (0-100)
            overtime_score = (data['total_overtime_minutes'] / max_overtime) * 100
            mentions_score = (data['positive_mentions'] / max_mentions) * 100  
            consistency_score = (data['days_worked'] / max_days) * 100
            responsibility_score = (len(data['responsibilities']) / max_resp) * 100
            
            # Score composto: Comprometimento 35%, Qualidade 35%, Consistência 20%, Versatilidade 10%
            composite_score = (
                overtime_score * 0.35 +
                mentions_score * 0.35 +
                consistency_score * 0.20 +
                responsibility_score * 0.10
            )
            
            composite_scores[name] = round(composite_score, 1)
            
        composite_ranking = sorted(composite_scores.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'composite': composite_ranking,
            'overtime': overtime_ranking,
            'mentions': mentions_ranking,
            'consistency': consistency_ranking,
            'responsibility': responsibility_ranking
        }

    def generate_detailed_report(self):
        """Gera relatório detalhado"""
        rankings = self.calculate_rankings()
        
        # Prepara dados detalhados
        detailed_data = {}
        for name, data in self.team_data.items():
            if name in self.canonical_names.values() and data['days_worked'] > 0:
                detailed = dict(data)
                detailed['responsibilities'] = list(detailed['responsibilities'])
                detailed['total_overtime_formatted'] = f"{detailed['total_overtime_minutes']//60}h{detailed['total_overtime_minutes']%60:02d}min"
                detailed['avg_overtime_per_shift'] = round(
                    detailed['total_overtime_minutes'] / max(detailed['total_overtime_instances'], 1), 1
                )
                detailed_data[name] = detailed
        
        return {
            'report_date': datetime.now().strftime('%d-%m-%Y'),
            'period': 'Junho 2026',
            'summary': {
                'total_collaborators': len(detailed_data),
                'total_reports_processed': len([f for f in os.listdir(self.daily_reports_path) if f.endswith('.md')]),
                'period_days': 30
            },
            'rankings': rankings,
            'detailed_data': detailed_data
        }

def main():
    analyzer = ImprovedTeamRankingAnalyzer(".")
    
    print("Analisando relatórios diários de Junho 2026...")
    
    # Lista arquivos disponíveis
    md_files = [f for f in os.listdir(analyzer.daily_reports_path) if f.endswith('.md')]
    print(f"Encontrados {len(md_files)} relatórios para processar")
    
    # Processa todos os relatórios
    for md_file in md_files:
        file_path = os.path.join(analyzer.daily_reports_path, md_file)
        analyzer.process_daily_report(file_path)
    
    # Gera relatório final
    report = analyzer.generate_detailed_report()
    
    # Salva em arquivo JSON
    with open('ranking_mensal_junho_2026.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\nRelatorio gerado: ranking_mensal_junho_2026.json")
    print(f"Colaboradores analisados: {report['summary']['total_collaborators']}")
    print(f"Relatorios processados: {report['summary']['total_reports_processed']}")
    
    # Preview dos resultados
    print("\n" + "="*60)
    print("RANKING MENSAL DA EQUIPA - JUNHO 2026")
    print("="*60)
    
    print("\n1. RANKING GERAL (Score Composto):")
    for i, (name, score) in enumerate(report['rankings']['composite'][:8], 1):
        days_worked = report['detailed_data'][name]['days_worked']
        overtime = report['detailed_data'][name]['total_overtime_formatted']
        mentions = report['detailed_data'][name]['positive_mentions']
        print(f"{i:2d}. {name:18s} - {score:5.1f}pts ({days_worked} dias | {overtime} | {mentions} mencoes)")
    
    print("\n2. RANKING POR HORAS EXTRA (Comprometimento):")
    for i, (name, minutes) in enumerate(report['rankings']['overtime'][:5], 1):
        formatted_time = f"{minutes//60}h{minutes%60:02d}min"
        instances = report['detailed_data'][name]['total_overtime_instances']
        print(f"{i:2d}. {name:18s} - {formatted_time} ({instances} ocasioes)")
    
    print("\n3. RANKING POR MENCOES POSITIVAS (Qualidade):")
    for i, (name, mentions) in enumerate(report['rankings']['mentions'][:5], 1):
        days = report['detailed_data'][name]['days_worked'] 
        avg = round(mentions/days, 1) if days > 0 else 0
        print(f"{i:2d}. {name:18s} - {mentions} mencoes ({avg} por dia)")

if __name__ == "__main__":
    main()