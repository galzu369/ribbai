#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Análise e Ranking Mensal da Equipa RIBBAI
Processa todos os registos diários operacionais de Junho 2026
"""

import os
import re
from collections import defaultdict
from datetime import datetime
import json

class TeamRankingAnalyzer:
    def __init__(self, base_path):
        self.base_path = base_path
        self.daily_reports_path = os.path.join(base_path, "docs/operational-records/2026/06-june/daily")
        self.team_data = defaultdict(lambda: {
            'total_overtime_hours': 0,
            'positive_mentions': 0,
            'days_worked': 0,
            'opening_shifts': 0,
            'closing_shifts': 0,
            'responsibilities': set(),
            'feedback_notes': [],
            'overtime_details': [],
            'special_achievements': [],
            'improvement_areas': []
        })
        
    def parse_time_to_minutes(self, time_str):
        """Converte string de tempo (1h40, 55min, etc.) em minutos"""
        if not time_str:
            return 0
            
        # Remove espaços e converte para minúsculas
        time_str = time_str.lower().strip()
        
        # Padrões de tempo
        hour_pattern = r'(\d+)h(\d+)?'
        min_pattern = r'(\d+)\s*min'
        
        total_minutes = 0
        
        # Procura padrão de horas (1h40, 2h, etc.)
        hour_match = re.search(hour_pattern, time_str)
        if hour_match:
            hours = int(hour_match.group(1))
            minutes = int(hour_match.group(2)) if hour_match.group(2) else 0
            total_minutes += hours * 60 + minutes
        
        # Procura padrão de minutos (55min, 30 min, etc.)
        min_match = re.search(min_pattern, time_str)
        if min_match:
            total_minutes += int(min_match.group(1))
            
        return total_minutes

    def extract_overtime_data(self, content):
        """Extrai dados de horas extra do conteúdo do relatório"""
        overtime_data = {}
        
        # Procura pela tabela de horas extra
        overtime_section = re.search(r'## Horas Extra.*?(?=##|\Z)', content, re.DOTALL | re.IGNORECASE)
        
        if overtime_section:
            section_text = overtime_section.group(0)
            
            # Padrão para capturar linhas da tabela de horas extra
            table_rows = re.findall(r'\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|', section_text)
            
            for row in table_rows:
                name = row[0].strip()
                overtime_str = row[1].strip()
                
                # Skip cabeçalhos da tabela
                if name.lower() in ['colaborador', '---', 'total da equipa', 'total equipa']:
                    continue
                    
                # Extrai tempo das horas extra
                overtime_minutes = self.parse_time_to_minutes(overtime_str)
                if overtime_minutes > 0:
                    overtime_data[name] = overtime_minutes
                    
        return overtime_data

    def extract_team_feedback(self, content):
        """Extrai feedback da equipa da secção Team Feedback Input"""
        feedback_data = {}
        
        # Procura pela secção Team Feedback Input
        feedback_section = re.search(r'### Team Feedback Input.*?(?=###|\Z)', content, re.DOTALL | re.IGNORECASE)
        
        if feedback_section:
            section_text = feedback_section.group(0)
            
            # Padrão para capturar feedback por colaborador
            feedback_lines = re.findall(r'-\s*([^:]+?):\s*(.+)', section_text)
            
            for line in feedback_lines:
                name = line[0].strip()
                feedback = line[1].strip()
                feedback_data[name] = feedback
                
        return feedback_data

    def extract_responsibilities(self, content):
        """Extrai responsabilidades e funções dos colaboradores"""
        responsibilities = defaultdict(set)
        
        # Procura por secções de equipa em serviço
        team_section = re.search(r'## Equipa Em Serviço.*?(?=##)', content, re.DOTALL | re.IGNORECASE)
        
        if team_section:
            section_text = team_section.group(0)
            
            # Padrão para capturar subsecções de colaboradores
            member_sections = re.findall(r'### ([^#\n]+)\n(.*?)(?=###|\Z)', section_text, re.DOTALL)
            
            for member, description in member_sections:
                member_name = member.strip()
                desc_text = description.lower()
                
                # Identifica responsabilidades específicas
                if 'abertura' in desc_text or 'assegurou a abertura' in desc_text:
                    responsibilities[member_name].add('Abertura')
                    
                if 'fecho' in desc_text or 'participou no fecho' in desc_text:
                    responsibilities[member_name].add('Fecho')
                    
                if 'coordenação' in desc_text or 'coordenou' in desc_text:
                    responsibilities[member_name].add('Coordenação')
                    
                if 'runner' in desc_text:
                    responsibilities[member_name].add('Runner')
                    
                if 'porta' in desc_text or 'gestão da entrada' in desc_text:
                    responsibilities[member_name].add('Gestão de Porta')
                    
                if 'sala interior' in desc_text:
                    responsibilities[member_name].add('Sala Interior')
                    
                if 'quiosque' in desc_text or 'gelados' in desc_text:
                    responsibilities[member_name].add('Quiosque de Gelados')
                    
        return dict(responsibilities)

    def process_daily_report(self, file_path):
        """Processa um relatório diário individual"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extrai data do nome do arquivo
            filename = os.path.basename(file_path)
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
            report_date = date_match.group(1) if date_match else "unknown"
            
            # Extrai dados de horas extra
            overtime_data = self.extract_overtime_data(content)
            
            # Extrai feedback da equipa
            feedback_data = self.extract_team_feedback(content)
            
            # Extrai responsabilidades
            responsibilities = self.extract_responsibilities(content)
            
            # Processa dados por colaborador
            for member in set(list(overtime_data.keys()) + list(feedback_data.keys()) + list(responsibilities.keys())):
                self.team_data[member]['days_worked'] += 1
                
                # Adiciona horas extra
                if member in overtime_data:
                    minutes = overtime_data[member]
                    self.team_data[member]['total_overtime_hours'] += minutes
                    self.team_data[member]['overtime_details'].append({
                        'date': report_date,
                        'minutes': minutes
                    })
                
                # Adiciona feedback
                if member in feedback_data:
                    self.team_data[member]['positive_mentions'] += 1
                    self.team_data[member]['feedback_notes'].append({
                        'date': report_date,
                        'feedback': feedback_data[member]
                    })
                
                # Adiciona responsabilidades
                if member in responsibilities:
                    self.team_data[member]['responsibilities'].update(responsibilities[member])
                    
                    if 'Abertura' in responsibilities[member]:
                        self.team_data[member]['opening_shifts'] += 1
                    if 'Fecho' in responsibilities[member]:
                        self.team_data[member]['closing_shifts'] += 1
                        
        except Exception as e:
            print(f"Erro ao processar {file_path}: {str(e)}")

    def analyze_all_reports(self):
        """Analisa todos os relatórios diários de junho"""
        if not os.path.exists(self.daily_reports_path):
            print(f"Pasta não encontrada: {self.daily_reports_path}")
            return
            
        # Lista todos os arquivos .md na pasta
        md_files = [f for f in os.listdir(self.daily_reports_path) if f.endswith('.md')]
        
        print(f"Processando {len(md_files)} relatórios diários...")
        
        for md_file in md_files:
            file_path = os.path.join(self.daily_reports_path, md_file)
            self.process_daily_report(file_path)
            
        print("Análise concluída!")

    def calculate_rankings(self):
        """Calcula rankings com base nas métricas extraídas"""
        rankings = {}
        
        # Ranking por horas extra (compromisso)
        overtime_ranking = sorted(
            [(name, data['total_overtime_hours']) for name, data in self.team_data.items() if data['total_overtime_hours'] > 0],
            key=lambda x: x[1],
            reverse=True
        )
        
        # Ranking por menções positivas (qualidade de desempenho)
        mentions_ranking = sorted(
            [(name, data['positive_mentions']) for name, data in self.team_data.items()],
            key=lambda x: x[1],
            reverse=True
        )
        
        # Ranking por dias trabalhados (consistência)
        days_ranking = sorted(
            [(name, data['days_worked']) for name, data in self.team_data.items()],
            key=lambda x: x[1],
            reverse=True
        )
        
        # Score composto (weighted average)
        composite_scores = {}
        for name, data in self.team_data.items():
            # Normaliza métricas (0-100 pontos cada)
            overtime_score = min(100, (data['total_overtime_hours'] / 60) * 10)  # 10 pontos por hora
            mentions_score = min(100, data['positive_mentions'] * 5)  # 5 pontos por menção
            consistency_score = min(100, data['days_worked'] * 3)  # 3 pontos por dia
            responsibility_score = min(100, len(data['responsibilities']) * 10)  # 10 pontos por responsabilidade
            
            # Pesos: Compromisso (30%), Qualidade (30%), Consistência (25%), Responsabilidades (15%)
            composite_score = (
                overtime_score * 0.30 +
                mentions_score * 0.30 +
                consistency_score * 0.25 +
                responsibility_score * 0.15
            )
            
            composite_scores[name] = composite_score
            
        composite_ranking = sorted(composite_scores.items(), key=lambda x: x[1], reverse=True)
        
        rankings = {
            'overtime': overtime_ranking,
            'mentions': mentions_ranking,
            'days_worked': days_ranking,
            'composite': composite_ranking
        }
        
        return rankings

    def generate_report(self):
        """Gera o relatório final de ranking"""
        rankings = self.calculate_rankings()
        
        report = {
            'report_date': datetime.now().strftime('%Y-%m-%d'),
            'period': 'Junho 2026',
            'rankings': rankings,
            'detailed_data': {}
        }
        
        # Converte sets para listas para JSON serialization
        for name, data in self.team_data.items():
            detailed_data = dict(data)
            detailed_data['responsibilities'] = list(detailed_data['responsibilities'])
            detailed_data['total_overtime_hours_formatted'] = f"{detailed_data['total_overtime_hours']//60}h{detailed_data['total_overtime_hours']%60:02d}min"
            report['detailed_data'][name] = detailed_data
            
        return report

def main():
    # Configura o path base
    base_path = "."
    
    # Cria e executa o analisador
    analyzer = TeamRankingAnalyzer(base_path)
    analyzer.analyze_all_reports()
    
    # Gera o relatório
    report = analyzer.generate_report()
    
    # Salva o relatório em JSON
    with open('team_ranking_june_2026.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
        
    print("Relatório de ranking gerado: team_ranking_june_2026.json")
    
    # Mostra preview dos resultados
    print("\n=== PREVIEW DOS RANKINGS ===")
    print("\n1. RANKING COMPOSTO (Score Global):")
    for i, (name, score) in enumerate(report['rankings']['composite'][:10], 1):
        print(f"{i:2d}. {name:15s} - {score:5.1f} pontos")
        
    print("\n2. RANKING POR HORAS EXTRA:")
    for i, (name, minutes) in enumerate(report['rankings']['overtime'][:10], 1):
        hours = minutes // 60
        mins = minutes % 60
        print(f"{i:2d}. {name:15s} - {hours}h{mins:02d}min")
        
    print("\n3. RANKING POR MENÇÕES POSITIVAS:")
    for i, (name, mentions) in enumerate(report['rankings']['mentions'][:10], 1):
        print(f"{i:2d}. {name:15s} - {mentions} menções")

if __name__ == "__main__":
    main()