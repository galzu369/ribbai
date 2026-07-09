/**
 * RIBBAI Business Intelligence - Data Integration Service
 * 
 * ETL service to bridge Markdown operational records to database,
 * parsing "Classificação Para O Sistema RIBBAI OPS" blocks.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { OperationalRecord, ServiceImprovementData, IncidentData, TeamFeedbackData, OvertimeData } from "../types";

export class DataIntegrationService {
  /**
   * Parse operational record Markdown file into structured data
   */
  static async parseOperationalRecord(markdownPath: string): Promise<OperationalRecord> {
    try {
      logger.info("Parsing operational record", { path: markdownPath });
      
      const content = readFileSync(markdownPath, "utf-8");
      const record = this.extractOperationalData(content);
      
      logger.info("Successfully parsed operational record", { 
        path: markdownPath,
        date: record.date.toISOString(),
        author: record.author,
        improvementsCount: record.serviceImprovements.length,
        incidentsCount: record.incidents.length,
        teamFeedbackCount: record.teamFeedback.length
      });
      
      return record;
    } catch (error) {
      logger.error("Failed to parse operational record", { path: markdownPath, error });
      throw error;
    }
  }

  /**
   * Extract structured data from complete operational record
   */
  private static extractOperationalData(markdown: string): OperationalRecord {
    const lines = markdown.split("\n");
    
    // Extract metadata table
    const metadata = this.extractMetadataTable(lines);
    
    // Extract main sections
    const executiveSummary = this.extractSection(lines, "Síntese Executiva") || "";
    const operationalNotes = this.extractBulletPoints(lines, "Notas Para A Gestão");
    const weeklyReportCandidates = this.extractBulletPoints(lines, "Candidatos Para O Relatório Semanal");
    const dailyRatings = this.extractDailyRatings(lines);
    
    // Extract "Classificação Para O Sistema RIBBAI OPS" block
    const classification = this.extractOperationalClassification(markdown);
    
    return {
      date: this.parsePortugueseDate(metadata.data || ""),
      author: metadata.autor || "Unknown",
      validator: metadata.validação,
      context: metadata.contexto,
      executiveSummary,
      operationalNotes,
      serviceImprovements: classification.serviceImprovements,
      incidents: classification.incidents,
      teamFeedback: classification.teamFeedback,
      overtimeData: classification.overtimeData,
      managementNotes: classification.managementNotes,
      inventoryContext: classification.inventoryContext,
      weeklyReportCandidates,
      dailyRatings,
    };
  }

  /**
   * Extract structured data from "Classificação Para O Sistema RIBBAI OPS" block
   */
  static extractOperationalClassification(markdown: string): {
    operationalNotes: string[];
    serviceImprovements: ServiceImprovementData[];
    incidents: IncidentData[];
    teamFeedback: TeamFeedbackData[];
    overtimeData: OvertimeData[];
    managementNotes: string[];
    inventoryContext?: string;
  } {
    const lines = markdown.split("\n");
    const classificationStart = lines.findIndex(line => 
      line.includes("Classificação Para O Sistema RIBBAI OPS")
    );
    
    if (classificationStart === -1) {
      logger.warn("No classification block found in operational record");
      return {
        operationalNotes: [],
        serviceImprovements: [],
        incidents: [],
        teamFeedback: [],
        overtimeData: [],
        managementNotes: [],
      };
    }

    const classificationLines = lines.slice(classificationStart);
    
    return {
      operationalNotes: this.extractBulletPoints(classificationLines, "Operational Notes"),
      serviceImprovements: this.extractServiceImprovements(classificationLines),
      incidents: this.extractIncidents(classificationLines),
      teamFeedback: this.extractTeamFeedback(classificationLines),
      overtimeData: this.extractOvertimeData(classificationLines),
      managementNotes: this.extractBulletPoints(classificationLines, "Management Notes"),
      inventoryContext: this.extractInventoryContext(classificationLines),
    };
  }

  /**
   * Extract metadata table from document header
   */
  private static extractMetadataTable(lines: string[]): Record<string, string> {
    const metadata: Record<string, string> = {};
    let inMetadataTable = false;

    for (const line of lines) {
      if (line.includes("| Campo | Valor |")) {
        inMetadataTable = true;
        continue;
      }
      
      if (inMetadataTable && line.startsWith("|")) {
        const parts = line.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length === 2) {
          const key = parts[0].toLowerCase().replace(/\s+/g, "");
          metadata[key] = parts[1];
        }
      } else if (inMetadataTable && !line.startsWith("|")) {
        break;
      }
    }

    return metadata;
  }

  /**
   * Extract service improvements from classification block
   */
  private static extractServiceImprovements(lines: string[]): ServiceImprovementData[] {
    const improvements: ServiceImprovementData[] = [];
    const sectionStart = lines.findIndex(line => 
      line.includes("Service Improvement Candidate")
    );

    if (sectionStart === -1) return improvements;

    // Try table format first, then field format
    const tableImprovement = this.extractServiceImprovementFromTable(lines, sectionStart);
    if (tableImprovement) {
      improvements.push(tableImprovement);
    } else {
      const fieldImprovement = this.extractServiceImprovementFromFields(lines, sectionStart);
      if (fieldImprovement) {
        improvements.push(fieldImprovement);
      }
    }

    return improvements.filter(imp => imp.type && (imp.problem || imp.solution));
  }

  /**
   * Extract service improvement from table format (| Field | Value |)
   */
  private static extractServiceImprovementFromTable(lines: string[], sectionStart: number): ServiceImprovementData | null {
    const improvement: Partial<ServiceImprovementData> = {};
    
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another section
      if (line.startsWith("###") || (line.startsWith("##") && !line.includes("Service Improvement"))) {
        break;
      }

      // Parse table rows (| Field | Value |)
      if (line.startsWith("| ") && line.includes(" | ") && !line.includes("---")) {
        const parts = line.split(" | ").map(part => part.replace(/^\||\|$/g, "").trim());
        if (parts.length >= 2) {
          const field = parts[0].toLowerCase();
          const value = parts[1];

          if (field === "tipo") {
            improvement.type = value;
          } else if (field === "observação" || field === "problema") {
            improvement.problem = value;
          } else if (field === "oportunidade" || field === "solução") {
            improvement.solution = value;
          } else if (field === "estado") {
            improvement.status = value;
          } else if (field === "responsável") {
            improvement.assignee = value;
          } else if (field === "impacto esperado") {
            improvement.expectedImpact = value;
          } else if (field === "período de observação") {
            improvement.observationPeriod = value;
          }
        }
      }
    }

    return Object.keys(improvement).length > 0 ? improvement as ServiceImprovementData : null;
  }

  /**
   * Extract service improvement from field format (**Field:** value)
   */
  private static extractServiceImprovementFromFields(lines: string[], sectionStart: number): ServiceImprovementData | null {
    const improvement: Partial<ServiceImprovementData> = {};
    
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("**Tipo:**")) {
        if (Object.keys(improvement).length > 0) {
          break; // Only handle one improvement per section
        }
        improvement.type = line.replace("**Tipo:**", "").trim();
      } else if (line.startsWith("**Problema/Observação:**")) {
        improvement.problem = line.replace("**Problema/Observação:**", "").trim();
      } else if (line.startsWith("**Solução/Oportunidade:**")) {
        improvement.solution = line.replace("**Solução/Oportunidade:**", "").trim();
      } else if (line.startsWith("**Estado:**")) {
        improvement.status = line.replace("**Estado:**", "").trim();
      } else if (line.startsWith("**Impacto Esperado:**")) {
        improvement.expectedImpact = line.replace("**Impacto Esperado:**", "").trim();
      } else if (line.startsWith("**Período de Observação:**")) {
        improvement.observationPeriod = line.replace("**Período de Observação:**", "").trim();
      } else if (line.includes("## ") && !line.includes("Service Improvement")) {
        break;
      }
    }

    return Object.keys(improvement).length > 0 ? improvement as ServiceImprovementData : null;
  }

  /**
   * Extract incidents from classification block
   */
  private static extractIncidents(lines: string[]): IncidentData[] {
    const incidents: IncidentData[] = [];
    const sections = ["Incident Input", "Technical Incident Input", "Team Conduct Input"];

    for (const sectionName of sections) {
      const sectionStart = lines.findIndex(line => line.includes(sectionName));
      if (sectionStart === -1) continue;

      // Try table format first, then field format
      const tableIncident = this.extractIncidentFromTable(lines, sectionStart);
      if (tableIncident) {
        incidents.push(tableIncident);
      } else {
        const fieldIncident = this.extractIncidentFromFields(lines, sectionStart);
        if (fieldIncident) {
          incidents.push(fieldIncident);
        }
      }
    }

    return incidents.filter(inc => inc.category && (inc.description || inc.correctiveAction));
  }

  /**
   * Extract incident from table format (| Field | Value |)
   */
  private static extractIncidentFromTable(lines: string[], sectionStart: number): IncidentData | null {
    const incident: Partial<IncidentData> = {};
    
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another section
      if (line.startsWith("###") || (line.startsWith("##") && !line.includes("Input"))) {
        break;
      }

      // Parse table rows (| Field | Value |)
      if (line.startsWith("| ") && line.includes(" | ") && !line.includes("---")) {
        const parts = line.split(" | ").map(part => part.replace(/^\||\|$/g, "").trim());
        if (parts.length >= 2) {
          const field = parts[0].toLowerCase();
          const value = parts[1];

          if (field === "categoria") {
            incident.category = value;
          } else if (field === "gravidade" || field === "severity") {
            incident.severity = value;
          } else if (field === "descrição" || field === "description") {
            incident.description = value;
          } else if (field === "intervenção" || field === "intervention") {
            incident.description = value; // Use intervention as description
          } else if (field === "resultado" || field === "result") {
            incident.correctiveAction = value;
          } else if (field === "impacto financeiro") {
            incident.financialImpact = this.parseFinancialValue(value);
          } else if (field === "impacto operacional") {
            incident.operationalImpact = value;
          } else if (field === "estado" || field === "status") {
            incident.status = value;
          } else if (field === "ação corretiva") {
            incident.correctiveAction = value;
          }
        }
      }
    }

    return Object.keys(incident).length > 0 ? incident as IncidentData : null;
  }

  /**
   * Extract incident from field format (**Field:** value)
   */
  private static extractIncidentFromFields(lines: string[], sectionStart: number): IncidentData | null {
    const incident: Partial<IncidentData> = {};
    
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("**Categoria:**")) {
        if (Object.keys(incident).length > 0) {
          break; // Only handle one incident per section
        }
        incident.category = line.replace("**Categoria:**", "").trim();
      } else if (line.startsWith("**Gravidade:**")) {
        incident.severity = line.replace("**Gravidade:**", "").trim();
      } else if (line.startsWith("**Impacto Financeiro:**")) {
        const impact = line.replace("**Impacto Financeiro:**", "").trim();
        incident.financialImpact = this.parseFinancialValue(impact);
      } else if (line.startsWith("**Estado:**")) {
        incident.status = line.replace("**Estado:**", "").trim();
      } else if (line.startsWith("**Ação Corretiva:**")) {
        incident.correctiveAction = line.replace("**Ação Corretiva:**", "").trim();
      } else if (line.startsWith("**Descrição:**")) {
        incident.description = line.replace("**Descrição:**", "").trim();
      } else if (line.includes("## ") && !line.includes("Input")) {
        break;
      }
    }

    return Object.keys(incident).length > 0 ? incident as IncidentData : null;
  }

  /**
   * Extract team feedback from classification block
   */
  private static extractTeamFeedback(lines: string[]): TeamFeedbackData[] {
    const feedback: TeamFeedbackData[] = [];
    const sectionStart = lines.findIndex(line => 
      line.includes("Team Feedback Input")
    );

    if (sectionStart === -1) return feedback;

    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Format 1: - **Name**: feedback text
      if (line.startsWith("- **")) {
        const nameMatch = line.match(/\*\*(.*?)\*\*:\s*(.*)/);
        if (nameMatch) {
          const employeeName = nameMatch[1].trim();
          const feedbackText = nameMatch[2].trim();
          
          feedback.push({
            employeeName,
            feedback: feedbackText,
            type: this.classifyFeedbackType(feedbackText),
            sentiment: this.analyzeSentiment(feedbackText),
          });
        }
      }
      // Format 2: - Text with names mentioned (e.g. "- Carolina e Pablo garantiram...")
      else if (line.startsWith("- ") && !line.startsWith("- **")) {
        const feedbackText = line.substring(2).trim();
        
        // Extract employee names mentioned in the feedback
        const employeeNames = this.extractEmployeeNamesFromText(feedbackText);
        
        if (employeeNames.length > 0) {
          // Create feedback entries for each mentioned employee
          for (const employeeName of employeeNames) {
            feedback.push({
              employeeName,
              feedback: feedbackText,
              type: this.classifyFeedbackType(feedbackText),
              sentiment: this.analyzeSentiment(feedbackText),
            });
          }
        } else {
          // If no specific names found, create a general team feedback
          feedback.push({
            employeeName: "Equipa",
            feedback: feedbackText,
            type: this.classifyFeedbackType(feedbackText),
            sentiment: this.analyzeSentiment(feedbackText),
          });
        }
      }
      else if (line.includes("## ") && !line.includes("Team Feedback")) {
        break;
      }
    }

    return feedback;
  }

  /**
   * Extract employee names mentioned in feedback text
   */
  private static extractEmployeeNamesFromText(text: string): string[] {
    const commonNames = ["Carolina", "Pablo", "Matilde", "Marta", "Bruno", "Diogo", "Filipe", "Lil"];
    const foundNames: string[] = [];
    
    for (const name of commonNames) {
      if (text.includes(name)) {
        foundNames.push(name);
      }
    }
    
    return foundNames;
  }

  /**
   * Extract overtime data from classification block
   */
  private static extractOvertimeData(lines: string[]): OvertimeData[] {
    const overtime: OvertimeData[] = [];
    const sectionStart = lines.findIndex(line => 
      line.includes("Overtime Input")
    );

    if (sectionStart === -1) return overtime;

    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("|") && line.includes("|") && !line.includes("Colaborador")) {
        const parts = line.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const employeeName = parts[0];
          const timeString = parts[1];
          const minutes = this.parseTimeToMinutes(timeString);
          
          if (employeeName && minutes > 0) {
            overtime.push({
              employeeName,
              minutes,
              reason: parts[2] || "",
              approved: true, // Assume approved if recorded
            });
          }
        }
      } else if (line.includes("## ") && !line.includes("Overtime")) {
        break;
      }
    }

    return overtime;
  }

  /**
   * Extract bullet points from a section
   */
  private static extractBulletPoints(lines: string[], sectionName: string): string[] {
    const points: string[] = [];
    
    // Define section name variants
    const sectionVariants = this.getSectionNameVariants(sectionName);
    
    let sectionStart = -1;
    for (const variant of sectionVariants) {
      sectionStart = lines.findIndex(line => line.includes(variant));
      if (sectionStart !== -1) break;
    }
    
    if (sectionStart === -1) return points;

    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("- ")) {
        points.push(line.substring(2).trim());
      } else if (line.includes("## ")) {
        break;
      }
    }

    return points;
  }

  /**
   * Get variants of section names to handle different formatting
   */
  private static getSectionNameVariants(sectionName: string): string[] {
    const variants = [sectionName];
    
    if (sectionName === "Notas Para A Gestão") {
      variants.push("Notas Para Gestão E Administração");
      variants.push("Notas Para Gestão");
    }
    
    return variants;
  }

  /**
   * Extract daily ratings from evaluation section
   */
  private static extractDailyRatings(lines: string[]): Record<string, number> {
    const ratings: Record<string, number> = {};
    const sectionStart = lines.findIndex(line => 
      line.includes("Avaliação Global Do Dia")
    );

    if (sectionStart === -1) return ratings;

    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("|") && line.includes("|") && !line.includes("Indicador")) {
        const parts = line.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const indicator = parts[0];
          const value = this.parseRatingValue(parts[1]);
          
          if (indicator && value !== null) {
            ratings[indicator] = value;
          }
        }
      } else if (line.includes("## ")) {
        break;
      }
    }

    return ratings;
  }

  /**
   * Helper: Parse Portuguese date format
   */
  private static parsePortugueseDate(dateString: string): Date {
    // Handle formats like "24-06-2026", "2026-06-24"
    const dateParts = dateString.split("-");
    if (dateParts.length === 3) {
      if (dateParts[0].length === 4) {
        // YYYY-MM-DD format
        return new Date(dateString);
      } else {
        // DD-MM-YYYY format
        return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      }
    }
    return new Date(dateString);
  }

  /**
   * Helper: Parse time string to minutes
   */
  private static parseTimeToMinutes(timeString: string): number {
    const cleanTime = timeString.replace(/[^\d:hm]/g, "");
    
    // Handle formats like "2h45m", "1h30", "45m", "+0h50"
    const hourMatch = cleanTime.match(/(\d+)h/);
    const minuteMatch = cleanTime.match(/(\d+)m/);
    
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);
    
    // Handle simple formats like "50" (assume minutes)
    if (!hourMatch && !minuteMatch && /^\d+$/.test(cleanTime)) {
      totalMinutes = parseInt(cleanTime);
    }

    return totalMinutes;
  }

  /**
   * Helper: Parse financial value from string
   */
  private static parseFinancialValue(value: string): number | undefined {
    const numericMatch = value.match(/€?(\d+(?:[.,]\d+)?)/);
    if (numericMatch) {
      return parseFloat(numericMatch[1].replace(",", "."));
    }
    return undefined;
  }

  /**
   * Helper: Parse rating value (handles X/10, X,Y/10, etc.)
   */
  private static parseRatingValue(value: string): number | null {
    const ratingMatch = value.match(/(\d+(?:[.,]\d+)?)/);
    if (ratingMatch) {
      return parseFloat(ratingMatch[1].replace(",", "."));
    }
    return null;
  }

  /**
   * Helper: Classify feedback type
   */
  private static classifyFeedbackType(feedback: string): "highlight" | "improvement_area" | "conduct" {
    const lowerFeedback = feedback.toLowerCase();
    
    if (lowerFeedback.includes("evolução") || lowerFeedback.includes("destaque") || 
        lowerFeedback.includes("bom") || lowerFeedback.includes("excelente")) {
      return "highlight";
    }
    
    if (lowerFeedback.includes("melhoria") || lowerFeedback.includes("desenvolver") ||
        lowerFeedback.includes("atenção") || lowerFeedback.includes("foco")) {
      return "improvement_area";
    }
    
    return "conduct";
  }

  /**
   * Helper: Analyze sentiment
   */
  private static analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
    const lowerText = text.toLowerCase();
    
    const positiveWords = ["bom", "excelente", "ótimo", "destaque", "evolução", "sucesso", "parabéns"];
    const negativeWords = ["problema", "erro", "falha", "melhoria", "atenção", "cuidado", "evitar"];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  /**
   * Helper: Extract section content
   */
  private static extractSection(lines: string[], sectionName: string): string | null {
    const sectionStart = lines.findIndex(line => line.includes(sectionName));
    if (sectionStart === -1) return null;

    const content: string[] = [];
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("## ")) break;
      if (line) content.push(line);
    }

    return content.join(" ").trim();
  }

  /**
   * Helper: Extract inventory context
   */
  private static extractInventoryContext(lines: string[]): string | undefined {
    const context = this.extractSection(lines, "Inventory Context");
    return context || undefined;
  }

  /**
   * Integrate parsed operational record into database
   */
  static async integrateOperationalRecord(record: OperationalRecord): Promise<{
    success: boolean;
    recordsCreated: {
      operationalNotes: number;
      serviceImprovements: number;
      incidents: number;
      teamFeedback: number;
      kpiSnapshots: number;
      overtimeRecords: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const recordsCreated = {
      operationalNotes: 0,
      serviceImprovements: 0,
      incidents: 0,
      teamFeedback: 0,
      kpiSnapshots: 0,
      overtimeRecords: 0,
    };

    try {
      logger.info("Integrating operational record into database", { 
        date: record.date.toISOString(), 
        author: record.author 
      });

      // Create operational notes
      if (record.operationalNotes.length > 0 || record.executiveSummary) {
        try {
          // Executive summary as main note
          if (record.executiveSummary) {
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "EXECUTIVE_SUMMARY",
                content: record.executiveSummary,
                author: record.author,
                priority: "HIGH",
                tags: ["summary", "executive"],
                createdBy: record.author,
              },
            });
            recordsCreated.operationalNotes++;
          }

          // Individual operational notes
          for (const note of record.operationalNotes) {
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "OPERATIONAL_NOTE",
                content: note,
                author: record.author,
                priority: "MEDIUM",
                tags: ["operational"],
                createdBy: record.author,
              },
            });
            recordsCreated.operationalNotes++;
          }

          // Management notes
          for (const note of record.managementNotes) {
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "MANAGEMENT_NOTE",
                content: note,
                author: record.author,
                priority: "HIGH",
                tags: ["management", "leadership"],
                createdBy: record.author,
              },
            });
            recordsCreated.operationalNotes++;
          }
        } catch (error) {
          errors.push(`Failed to create operational notes: ${error}`);
        }
      }

      // Create service improvements
      for (const improvement of record.serviceImprovements) {
        try {
          await prisma.serviceImprovement.create({
            data: {
              reportDate: record.date,
              type: improvement.type,
              problem: improvement.problem,
              solution: improvement.solution,
              status: improvement.status,
              expectedImpact: improvement.expectedImpact,
              observationPeriod: improvement.observationPeriod,
              assignedTo: record.author,
              category: this.categorizeImprovement(improvement.type),
              createdBy: record.author,
            },
          });
          recordsCreated.serviceImprovements++;
        } catch (error) {
          errors.push(`Failed to create service improvement: ${error}`);
        }
      }

      // Create incidents (convert to incidents table if exists, otherwise log)
      for (const incident of record.incidents) {
        try {
          // For now, we'll store as operational notes with incident tag
          await prisma.operationalNote.create({
            data: {
              reportDate: record.date,
              noteType: "OPERATIONAL_NOTE",
              content: `INCIDENT - ${incident.category}: ${incident.description}${
                incident.correctiveAction ? ` | Ação Corretiva: ${incident.correctiveAction}` : ''
              }${
                incident.financialImpact ? ` | Impacto: €${incident.financialImpact}` : ''
              }`,
              author: record.author,
              priority: incident.severity === "ALTA" ? "HIGH" : incident.severity === "MEDIA" ? "MEDIUM" : "LOW",
              tags: ["incident", incident.category.toLowerCase(), incident.severity.toLowerCase()],
              metadata: {
                incidentCategory: incident.category,
                severity: incident.severity,
                financialImpact: incident.financialImpact,
                status: incident.status,
              },
              createdBy: record.author,
            },
          });
          recordsCreated.incidents++;
        } catch (error) {
          errors.push(`Failed to create incident record: ${error}`);
        }
      }

      // Create team feedback
      for (const feedback of record.teamFeedback) {
        try {
          // Find employee by name
          const employee = await prisma.employee.findFirst({
            where: {
              OR: [
                { firstName: { contains: feedback.employeeName, mode: 'insensitive' } },
                { lastName: { contains: feedback.employeeName, mode: 'insensitive' } },
                { 
                  firstName: { 
                    in: feedback.employeeName.split(' ').map(name => name.trim()) 
                  } 
                },
              ],
            },
          });

          if (employee) {
            await prisma.teamFeedback.create({
              data: {
                reportDate: record.date,
                employeeId: employee.id,
                feedbackType: feedback.type.toUpperCase(),
                content: feedback.feedback,
                sentiment: feedback.sentiment.toUpperCase(),
                category: "PERFORMANCE",
                priority: feedback.sentiment === "negative" ? "HIGH" : "MEDIUM",
                providedBy: record.author,
                context: "Daily operational record",
                createdBy: record.author,
              },
            });
            recordsCreated.teamFeedback++;
          } else {
            // Create as operational note if employee not found
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "OPERATIONAL_NOTE",
                content: `TEAM FEEDBACK - ${feedback.employeeName}: ${feedback.feedback}`,
                author: record.author,
                priority: "MEDIUM",
                tags: ["team-feedback", feedback.type, feedback.sentiment],
                metadata: {
                  employeeName: feedback.employeeName,
                  feedbackType: feedback.type,
                  sentiment: feedback.sentiment,
                },
                createdBy: record.author,
              },
            });
          }
        } catch (error) {
          errors.push(`Failed to create team feedback for ${feedback.employeeName}: ${error}`);
        }
      }

      // Create KPI snapshots from daily ratings
      for (const [indicator, value] of Object.entries(record.dailyRatings)) {
        try {
          await prisma.kPISnapshot.create({
            data: {
              date: record.date,
              kpiCategory: "OPERATIONAL",
              kpiName: indicator,
              value: value,
              targetValue: 10, // Assuming 10-point scale
              unit: "points",
              trend: "STABLE", // Will be calculated later with historical data
              status: value >= 8 ? "GOOD" : value >= 6 ? "WARNING" : "CRITICAL",
              calculatedBy: "data-integration-service",
              metadata: {
                source: "daily_operational_record",
                author: record.author,
                scale: "1-10",
              },
            },
          });
          recordsCreated.kpiSnapshots++;
        } catch (error) {
          errors.push(`Failed to create KPI snapshot for ${indicator}: ${error}`);
        }
      }

      // Create overtime records
      for (const overtime of record.overtimeData) {
        try {
          // Find employee
          const employee = await prisma.employee.findFirst({
            where: {
              OR: [
                { firstName: { contains: overtime.employeeName, mode: "insensitive" } },
                { lastName: { contains: overtime.employeeName, mode: "insensitive" } }
              ]
            }
          });

          if (employee) {
            // Create or update attendance record with overtime
            const existingAttendance = await prisma.attendance.findFirst({
              where: {
                employeeId: employee.id,
                shift: {
                  shiftDate: record.date
                }
              }
            });

            if (existingAttendance) {
              // Update existing attendance with overtime
              await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                  overtimeHours: overtime.minutes / 60, // Convert minutes to hours
                }
              });
            } else {
              // Create shift and attendance if not exists
              const shift = await prisma.shift.create({
                data: {
                  employeeId: employee.id,
                  shiftDate: record.date,
                  startTime: new Date(record.date.getTime() + 9 * 60 * 60 * 1000), // 9 AM default
                  endTime: new Date(record.date.getTime() + 17 * 60 * 60 * 1000), // 5 PM default
                  shiftType: "REGULAR",
                  status: "COMPLETED",
                  createdBy: record.author
                }
              });

              await prisma.attendance.create({
                data: {
                  shiftId: shift.id,
                  employeeId: employee.id,
                  clockInTime: shift.startTime,
                  clockOutTime: shift.endTime,
                  actualHours: 8, // Default 8 hours
                  overtimeHours: overtime.minutes / 60,
                  status: "PRESENT",
                  isVerified: true,
                  verifiedBy: record.author,
                  verifiedAt: new Date()
                }
              });
            }

            // Also create as operational note for tracking
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "OPERATIONAL_NOTE",
                content: `OVERTIME - ${overtime.employeeName}: ${overtime.minutes} minutes (${overtime.reason || 'No reason specified'})`,
                author: record.author,
                priority: overtime.minutes > 60 ? "HIGH" : "MEDIUM",
                tags: ["overtime", "attendance", overtime.employeeName.toLowerCase()],
                metadata: {
                  employeeName: overtime.employeeName,
                  overtimeMinutes: overtime.minutes,
                  overtimeHours: overtime.minutes / 60,
                  reason: overtime.reason,
                  approved: overtime.approved
                },
                createdBy: record.author,
              },
              });
            recordsCreated.operationalNotes++;
            recordsCreated.overtimeRecords++;
          } else {
            // Create as operational note if employee not found
            await prisma.operationalNote.create({
              data: {
                reportDate: record.date,
                noteType: "OPERATIONAL_NOTE",
                content: `OVERTIME (Employee not found) - ${overtime.employeeName}: ${overtime.minutes} minutes`,
                author: record.author,
                priority: "MEDIUM",
                tags: ["overtime", "attendance", "employee-not-found"],
                metadata: {
                  employeeName: overtime.employeeName,
                  overtimeMinutes: overtime.minutes,
                  reason: overtime.reason
                },
                createdBy: record.author,
              },
            });
            recordsCreated.operationalNotes++;
          }
        } catch (error) {
          errors.push(`Failed to create overtime record for ${overtime.employeeName}: ${error}`);
        }
      }

      // Create weekly report candidates
      for (const candidate of record.weeklyReportCandidates) {
        try {
          await prisma.operationalNote.create({
            data: {
              reportDate: record.date,
              noteType: "WEEKLY_CANDIDATE",
              content: candidate,
              author: record.author,
              priority: "MEDIUM",
              tags: ["weekly-report", "candidate", "curation"],
              metadata: {
                category: "weekly_candidate",
                curatedFor: "weekly_report"
              },
              createdBy: record.author,
            },
          });
          recordsCreated.operationalNotes++;
        } catch (error) {
          errors.push(`Failed to create weekly candidate: ${error}`);
        }
      }

      // Create inventory context notes
      if (record.inventoryContext && record.inventoryContext.trim()) {
        try {
          await prisma.operationalNote.create({
            data: {
              reportDate: record.date,
              noteType: "INVENTORY_CONTEXT",
              content: record.inventoryContext,
              author: record.author,
              priority: "LOW",
              tags: ["inventory", "context", "analysis"],
              metadata: {
                category: "inventory_context",
                source: "operational_record"
              },
              createdBy: record.author,
            },
          });
          recordsCreated.operationalNotes++;
        } catch (error) {
          errors.push(`Failed to create inventory context: ${error}`);
        }
      }

      // Create classification operational notes
      for (const note of record.managementNotes) {
        try {
          await prisma.operationalNote.create({
            data: {
              reportDate: record.date,
              noteType: "MANAGEMENT_NOTE",
              content: note,
              author: record.author,
              priority: "HIGH",
              tags: ["management", "classification", "operations"],
              metadata: {
                category: "management_directive",
                source: "classification_block"
              },
              createdBy: record.author,
            },
          });
          recordsCreated.operationalNotes++;
        } catch (error) {
          errors.push(`Failed to create management note: ${error}`);
        }
      }

      logger.info("Successfully integrated operational record", {
        date: record.date.toISOString(),
        recordsCreated,
        errorsCount: errors.length,
      });

      return {
        success: errors.length === 0,
        recordsCreated,
        errors,
      };
    } catch (error) {
      logger.error("Failed to integrate operational record", { 
        date: record.date.toISOString(), 
        error 
      });
      return {
        success: false,
        recordsCreated,
        errors: [...errors, `Integration failed: ${error}`],
      };
    }
  }

  /**
   * Process and integrate operational record from file path
   */
  static async processOperationalRecordFile(filePath: string): Promise<{
    success: boolean;
    recordsCreated: {
      operationalNotes: number;
      serviceImprovements: number;
      incidents: number;
      teamFeedback: number;
      kpiSnapshots: number;
      overtimeRecords: number;
    };
    errors: string[];
    warnings: string[];
  }> {
    try {
      // Parse the record
      const record = await this.parseOperationalRecord(filePath);
      
      // Validate it
      const validation = this.validateOperationalRecord(record);
      
      if (!validation.isValid) {
        return {
          success: false,
          recordsCreated: {
            operationalNotes: 0,
            serviceImprovements: 0,
            incidents: 0,
            teamFeedback: 0,
            kpiSnapshots: 0,
            overtimeRecords: 0,
          },
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // Integrate into database
      const integration = await this.integrateOperationalRecord(record);
      
      return {
        success: integration.success,
        recordsCreated: integration.recordsCreated,
        errors: integration.errors,
        warnings: validation.warnings,
      };
    } catch (error) {
      return {
        success: false,
        recordsCreated: {
          operationalNotes: 0,
          serviceImprovements: 0,
          incidents: 0,
          teamFeedback: 0,
          kpiSnapshots: 0,
          overtimeRecords: 0,
        },
        errors: [`Failed to process file: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Migrate historical operational records from June 2026
   */
  static async migrateHistoricalRecords(): Promise<{
    processed: number;
    errors: string[];
    summary: Record<string, number>;
  }> {
    logger.info("Starting migration of historical operational records");
    
    let processed = 0;
    const errors: string[] = [];
    const summary = {
      operationalNotes: 0,
      serviceImprovements: 0,
      incidents: 0,
      teamFeedback: 0,
      overtimeRecords: 0,
      kpiSnapshots: 0,
    };

    try {
      const { readdirSync, existsSync } = await import("fs");
      const { join } = await import("path");
      
      const operationalRecordsDir = "docs/operational-records/2026/06-june/daily";
      
      if (!existsSync(operationalRecordsDir)) {
        errors.push(`Operational records directory not found: ${operationalRecordsDir}`);
        return { processed, errors, summary };
      }

      const files = readdirSync(operationalRecordsDir)
        .filter(file => file.endsWith(".md"))
        .filter(file => file.includes("registo-diario-operacional")) // Focus on main operational records
        .sort();

      logger.info(`Found ${files.length} operational record files to migrate`);

      for (const file of files) {
        try {
          const filePath = join(operationalRecordsDir, file);
          const result = await this.processOperationalRecordFile(filePath);
          
          processed++;
          
          if (result.success) {
            summary.operationalNotes += result.recordsCreated.operationalNotes;
            summary.serviceImprovements += result.recordsCreated.serviceImprovements;
            summary.incidents += result.recordsCreated.incidents;
            summary.teamFeedback += result.recordsCreated.teamFeedback;
            summary.overtimeRecords += result.recordsCreated.overtimeRecords;
            summary.kpiSnapshots += result.recordsCreated.kpiSnapshots;
          } else {
            errors.push(...result.errors.map(err => `${file}: ${err}`));
          }

          if (result.warnings.length > 0) {
            logger.warn(`Warnings for ${file}`, { warnings: result.warnings });
          }

        } catch (error) {
          errors.push(`Failed to process ${file}: ${error}`);
        }
      }
      
      logger.info("Historical records migration completed", { processed, errors: errors.length, summary });
      return { processed, errors, summary };
    } catch (error) {
      logger.error("Historical migration failed", { error });
      throw error;
    }
  }

  /**
   * Helper: Categorize improvement type
   */
  private static categorizeImprovement(type: string): string {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes("tecnologia") || lowerType.includes("sistema")) {
      return "TECHNOLOGICAL";
    }
    
    if (lowerType.includes("processo") || lowerType.includes("procedural")) {
      return "PROCEDURAL";
    }
    
    return "OPERATIONAL";
  }

  /**
   * Validate parsed operational record
   */
  static validateOperationalRecord(record: OperationalRecord): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!record.date || record.date.toString() === "Invalid Date") {
      errors.push("Invalid or missing date");
    }

    if (!record.author || record.author.trim() === "") {
      errors.push("Missing author");
    }

    if (!record.executiveSummary || record.executiveSummary.trim() === "") {
      warnings.push("Missing executive summary");
    }

    // Data quality checks
    if (record.dailyRatings && Object.keys(record.dailyRatings).length === 0) {
      warnings.push("No daily ratings found");
    }

    if (record.serviceImprovements.length === 0) {
      warnings.push("No service improvements recorded");
    }

    // Validate service improvements
    record.serviceImprovements.forEach((improvement, index) => {
      if (!improvement.type || !improvement.problem || !improvement.solution) {
        errors.push(`Service improvement ${index + 1} missing required fields`);
      }
    });

    // Validate incidents
    record.incidents.forEach((incident, index) => {
      if (!incident.category || !incident.description) {
        errors.push(`Incident ${index + 1} missing required fields`);
      }
    });

    const isValid = errors.length === 0;

    return { isValid, errors, warnings };
  }
}