#!/usr/bin/env python3
"""
Advanced Schedule OCR - Extração automática de horários das imagens
Processa células verdes para extrair horários de trabalho automaticamente
"""

import cv2
import numpy as np
import json
from datetime import datetime, timedelta
import os
from pathlib import Path

class AdvancedScheduleOCR:
    def __init__(self):
        # Colaboradores na ordem das colunas
        self.employees = [
            "Bruno", "Pablo", "Filipe", "Lil", "Carolina", 
            "Matilde", "Sofia", "Lee", "Diogo"
        ]
        
        # Horários (intervalos de 30 min das 8:30 às 00:30)
        self.time_slots = []
        current_time = datetime.strptime("08:30", "%H:%M")
        end_time = datetime.strptime("00:30", "%H:%M") + timedelta(days=1)
        
        while current_time < end_time:
            self.time_slots.append(current_time.strftime("%H:%M"))
            current_time += timedelta(minutes=30)
    
    def detect_green_cells(self, image_path):
        """Detecta células verdes na imagem"""
        print(f"📷 Processando imagem: {image_path}")
        
        # Carregar imagem
        img = cv2.imread(image_path)
        if img is None:
            print(f"❌ Erro ao carregar imagem: {image_path}")
            return None
            
        # Converter para HSV para melhor detecção de verde
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Definir range para cor verde (ajustável)
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        
        # Criar máscara para células verdes
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Encontrar contornos das células verdes
        contours, _ = cv2.findContours(green_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filtrar contornos por tamanho (eliminar ruído)
        min_area = 100
        valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
        
        print(f"✅ Encontradas {len(valid_contours)} células verdes")
        return valid_contours, img
    
    def map_cells_to_grid(self, contours, img):
        """Mapeia células verdes para grid de colaboradores/horários"""
        if not contours:
            return {}
        
        # Obter dimensões da imagem
        height, width = img.shape[:2]
        
        # Calcular grid aproximado baseado na posição das células
        grid_data = {}
        
        for contour in contours:
            # Obter retângulo da célula
            x, y, w, h = cv2.boundingRect(contour)
            center_x = x + w // 2
            center_y = y + h // 2
            
            # Mapear posição Y para horário (linha)
            time_index = int((center_y / height) * len(self.time_slots))
            if 0 <= time_index < len(self.time_slots):
                time_slot = self.time_slots[time_index]
            else:
                continue
                
            # Mapear posição X para colaborador (coluna) 
            employee_index = int((center_x / width) * len(self.employees))
            if 0 <= employee_index < len(self.employees):
                employee = self.employees[employee_index]
            else:
                continue
                
            # Armazenar no grid
            if employee not in grid_data:
                grid_data[employee] = []
            grid_data[employee].append(time_slot)
        
        return grid_data
    
    def extract_work_hours(self, grid_data):
        """Extrai horários de entrada/saída baseado nas células verdes"""
        schedule_data = {}
        
        for employee, time_slots in grid_data.items():
            if not time_slots:
                schedule_data[employee] = {
                    "status": "folga",
                    "start_time": None,
                    "end_time": None,
                    "total_hours": 0,
                    "breaks": []
                }
                continue
            
            # Ordenar horários
            time_slots.sort()
            
            # Primeira e última célula verde
            start_time = time_slots[0]
            
            # Última célula + 30 min (conforme explicação do utilizador)
            last_slot = datetime.strptime(time_slots[-1], "%H:%M")
            end_time = (last_slot + timedelta(minutes=30)).strftime("%H:%M")
            
            # Detectar pausas (gaps nos horários)
            breaks = self.detect_breaks(time_slots)
            
            # Calcular total de horas
            start_dt = datetime.strptime(start_time, "%H:%M")
            end_dt = datetime.strptime(end_time, "%H:%M")
            if end_dt < start_dt:  # Passa da meia-noite
                end_dt += timedelta(days=1)
            
            total_minutes = (end_dt - start_dt).total_seconds() / 60
            # Subtrair tempo de pausas
            break_minutes = sum((datetime.strptime(b["end"], "%H:%M") - 
                               datetime.strptime(b["start"], "%H:%M")).total_seconds() / 60 
                              for b in breaks)
            
            total_hours = (total_minutes - break_minutes) / 60
            
            schedule_data[employee] = {
                "status": "trabalho",
                "start_time": start_time,
                "end_time": end_time,
                "total_hours": round(total_hours, 1),
                "breaks": breaks,
                "time_slots": time_slots
            }
        
        return schedule_data
    
    def detect_breaks(self, time_slots):
        """Detecta pausas baseado em gaps nos horários"""
        breaks = []
        
        for i in range(len(time_slots) - 1):
            current = datetime.strptime(time_slots[i], "%H:%M")
            next_slot = datetime.strptime(time_slots[i + 1], "%H:%M")
            
            # Se há gap > 30 min, é uma pausa
            gap = (next_slot - current).total_seconds() / 60
            if gap > 30:
                break_start = (current + timedelta(minutes=30)).strftime("%H:%M")
                break_end = next_slot.strftime("%H:%M")
                breaks.append({
                    "start": break_start,
                    "end": break_end,
                    "duration_minutes": int(gap - 30)
                })
        
        return breaks
    
    def process_image(self, image_path, date_str):
        """Processa uma imagem completa"""
        print(f"\n🔄 Processando {date_str}...")
        
        # Detectar células verdes
        result = self.detect_green_cells(image_path)
        if result is None:
            return None
            
        contours, img = result
        
        # Mapear para grid
        grid_data = self.map_cells_to_grid(contours, img)
        
        # Extrair horários
        schedule_data = self.extract_work_hours(grid_data)
        
        return {
            "date": date_str,
            "employees": schedule_data,
            "extraction_info": {
                "cells_detected": len(contours),
                "processed_at": datetime.now().isoformat(),
                "confidence": "auto_extracted"
            }
        }
    
    def process_all_images(self):
        """Processa todas as imagens da semana 1-5 julho"""
        print("🚀 Iniciando processamento automático dos horários...")
        
        # Mapear imagens para datas
        image_mappings = [
            ("c:/Users/HP/.cursor/projects/c-Users-HP-Desktop-RIBBAI/assets/c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_7acf47c38f72cb06f23628e03286b77a_images_1000161754-c7ffd0a3-d936-4c56-bc31-276846c30a14.png", "2026-07-01"),
            ("c:/Users/HP/.cursor/projects/c-Users-HP-Desktop-RIBBAI/assets/c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_7acf47c38f72cb06f23628e03286b77a_images_IMG-20260628-WA0024-6d38e6c5-18ce-4bd3-b325-e90a392c6f1e.png", "2026-07-02,2026-07-03"),
            ("c:/Users/HP/.cursor/projects/c-Users-HP-Desktop-RIBBAI/assets/c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_7acf47c38f72cb06f23628e03286b77a_images_1000161521-fc23ac41-31cd-4574-9324-179a5e0590e2.png", "2026-07-04,2026-07-05")
        ]
        
        all_schedule_data = {}
        
        for image_path, dates in image_mappings:
            if "," in dates:  # Imagem com múltiplos dias
                # Para imagens com 2 dias, precisamos dividir horizontalmente
                for i, date in enumerate(dates.split(",")):
                    # Por agora, processamos a imagem toda (melhorar depois)
                    data = self.process_image(image_path, date)
                    if data:
                        all_schedule_data[date] = data
            else:  # Imagem com um dia
                data = self.process_image(image_path, dates)
                if data:
                    all_schedule_data[dates] = data
        
        return all_schedule_data
    
    def save_structured_data(self, schedule_data):
        """Salva dados estruturados em JSON"""
        output_dir = Path("c:/Users/HP/Desktop/RIBBAI/workforce-schedules/2026/julho")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_file = output_dir / "schedule-1-5-julho-2026-auto-extracted.json"
        
        structured_data = {
            "workforce_schedule": {
                "year": 2026,
                "month": 7,
                "week_number": 27,
                "period": "1-5 Julho 2026",
                "week_start": "2026-07-01",
                "week_end": "2026-07-05",
                "extraction_method": "advanced_ocr",
                "processed_at": datetime.now().isoformat()
            },
            "daily_schedules": schedule_data,
            "summary": self.generate_summary(schedule_data)
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(structured_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Dados salvos em: {output_file}")
        return output_file
    
    def generate_summary(self, schedule_data):
        """Gera resumo semanal"""
        summary = {}
        
        for employee in self.employees:
            total_hours = 0
            work_days = 0
            
            for date, day_data in schedule_data.items():
                if employee in day_data.get("employees", {}):
                    emp_data = day_data["employees"][employee]
                    if emp_data["status"] == "trabalho":
                        total_hours += emp_data["total_hours"]
                        work_days += 1
            
            summary[employee] = {
                "total_hours": round(total_hours, 1),
                "work_days": work_days,
                "rest_days": 5 - work_days
            }
        
        return summary

def main():
    """Função principal"""
    print("🎯 ADVANCED SCHEDULE OCR - Extração Automática de Horários")
    print("=" * 60)
    
    ocr = AdvancedScheduleOCR()
    
    # Processar todas as imagens
    schedule_data = ocr.process_all_images()
    
    if schedule_data:
        # Salvar dados estruturados
        output_file = ocr.save_structured_data(schedule_data)
        
        print("\n✅ PROCESSAMENTO CONCLUÍDO!")
        print(f"📄 Arquivo gerado: {output_file}")
        print("\n📊 Resumo:")
        for date, data in schedule_data.items():
            print(f"  📅 {date}: {len(data['employees'])} colaboradores processados")
    else:
        print("❌ Nenhum dado extraído das imagens")

if __name__ == "__main__":
    main()