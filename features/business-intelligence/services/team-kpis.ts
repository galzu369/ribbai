/**
 * RIBBAI Business Intelligence - Team Performance KPIs Service
 * 
 * Calculates team and individual performance metrics including hours worked,
 * participation rates, performance indices, and development tracking.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logging";
import { TeamPerformanceMetrics, KPIValue } from "../types";
import { normalizeKPIValue } from "../utils/data-transforms";

export class TeamKPIService {
  /**
   * Calculate comprehensive team performance metrics for all employees
   */
  static async calculateTeamMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<TeamPerformanceMetrics[]> {
    logger.info("Calculating team performance metrics", { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    try {
      // Get all active employees
      const employees = await prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          teamFeedback: {
            where: {
              reportDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          kpiSnapshots: {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          shifts: {
            where: {
              shiftDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          attendanceRecords: {
            include: {
              shift: true,
            },
          },
        },
      });

      const teamMetrics: TeamPerformanceMetrics[] = [];

      for (const employee of employees) {
        const metrics = await this.calculateEmployeeMetrics(employee.id, startDate, endDate);
        teamMetrics.push(metrics);
      }

      logger.info("Team performance metrics calculated", {
        employeeCount: teamMetrics.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return teamMetrics;
    } catch (error) {
      logger.error("Failed to calculate team metrics", { error, startDate, endDate });
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific employee
   */
  static async calculateEmployeeMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TeamPerformanceMetrics> {
    try {
      const employee = await prisma.employee.findUniqueOrThrow({
        where: { id: employeeId },
        include: {
          shifts: {
            where: {
              shiftDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          attendanceRecords: {
            include: {
              shift: true,
            },
          },
          teamFeedback: {
            where: {
              reportDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
          kpiSnapshots: {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      // Calculate hours worked and overtime from attendance/shifts
      const hoursWorked = await this.calculateHoursWorked(employeeId, startDate, endDate);
      const overtimeHours = await this.calculateOvertimeHours(employeeId, startDate, endDate);
      
      // Calculate shift patterns
      const shiftMetrics = await this.calculateShiftMetrics(employeeId, startDate, endDate);
      
      // Calculate participation metrics
      const participationMetrics = await this.getParticipationMetrics(employeeId, startDate, endDate);
      
      // Calculate performance indices from feedback
      const performanceIndices = await this.calculatePerformanceIndices(employeeId, startDate, endDate);
      
      // Calculate incident and commendation metrics
      const behaviorMetrics = await this.calculateBehaviorMetrics(employeeId, startDate, endDate);

      const metrics: TeamPerformanceMetrics = {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        hoursWorked,
        overtimeHours,
        daysWorked: normalizeKPIValue(employee.shifts.length),
        openingShifts: shiftMetrics.openingShifts,
        closingShifts: shiftMetrics.closingShifts,
        reducedBreaks: shiftMetrics.reducedBreaks,
        inventoryParticipation: participationMetrics.inventoryParticipation,
        trainingParticipation: participationMetrics.trainingParticipation,
        briefingParticipation: participationMetrics.briefingParticipation,
        improvementParticipation: participationMetrics.improvementParticipation,
        extraCleaningParticipation: participationMetrics.extraCleaningParticipation,
        associatedIncidents: behaviorMetrics.associatedIncidents,
        commendations: behaviorMetrics.commendations,
        reliabilityIndex: performanceIndices.reliabilityIndex,
        leadershipIndex: performanceIndices.leadershipIndex,
        communicationIndex: performanceIndices.communicationIndex,
        organizationIndex: performanceIndices.organizationIndex,
        teamworkIndex: performanceIndices.teamworkIndex,
      };

      return metrics;
    } catch (error) {
      logger.error("Failed to calculate employee metrics", { error, employeeId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Calculate hours worked from attendance records and shifts
   */
  private static async calculateHoursWorked(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<KPIValue> {
    try {
      // Get attendance records for the period via shifts
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          employeeId,
          shift: {
            shiftDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        include: {
          shift: true,
        },
      });

      // Calculate total hours from attendance
      let totalHours = 0;
      
      for (const record of attendanceRecords) {
        if (record.actualHours) {
          totalHours += Number(record.actualHours);
        } else if (record.clockInTime && record.clockOutTime) {
          // Calculate hours from clock in/out times
          const checkInTime = new Date(record.clockInTime);
          const checkOutTime = new Date(record.clockOutTime);
          const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          totalHours += hoursWorked;
        } else if (record.status === 'PRESENT') {
          // Fallback: calculate from shift start/end times
          const shift = record.shift;
          const startTime = new Date(shift.startTime);
          const endTime = new Date(shift.endTime);
          const shiftHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += shiftHours;
        }
      }

      // If no attendance data, estimate from shifts
      if (totalHours === 0) {
        const shifts = await prisma.shift.count({
          where: {
            employeeId,
            shiftDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        });
        totalHours = shifts * 8; // Estimate 8 hours per shift
      }

      return normalizeKPIValue(totalHours, undefined, undefined);
    } catch (error) {
      logger.error("Failed to calculate hours worked", { error, employeeId });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate overtime hours from operational records and shifts
   */
  private static async calculateOvertimeHours(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<KPIValue> {
    try {
      // Get employee name to search in operational notes
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      });

      if (!employee) return normalizeKPIValue(0);

      // Search for overtime mentions in operational notes
      const overtimeNotes = await prisma.operationalNote.findMany({
        where: {
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
          OR: [
            { content: { contains: employee.firstName, mode: 'insensitive' } },
            { content: { contains: employee.lastName, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { content: { contains: 'overtime', mode: 'insensitive' } },
                { content: { contains: 'horas extra', mode: 'insensitive' } },
                { content: { contains: '+', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });

      // Parse overtime from content (simplified parsing)
      let totalOvertimeMinutes = 0;
      
      for (const note of overtimeNotes) {
        // Look for time patterns like "+2h30", "2h45", etc.
        const timeMatches = note.content.match(/\+?(\d+)h?(\d+)?m?/gi);
        if (timeMatches) {
          for (const match of timeMatches) {
            const hourMatch = match.match(/(\d+)h/);
            const minuteMatch = match.match(/(\d+)m/);
            
            let minutes = 0;
            if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
            if (minuteMatch) minutes += parseInt(minuteMatch[1]);
            
            totalOvertimeMinutes += minutes;
          }
        }
      }

      const overtimeHours = totalOvertimeMinutes / 60;
      return normalizeKPIValue(overtimeHours, 0, undefined); // Target: 0 overtime (or minimal)
    } catch (error) {
      logger.error("Failed to calculate overtime hours", { error, employeeId });
      return normalizeKPIValue(0);
    }
  }

  /**
   * Calculate shift-related metrics
   */
  private static async calculateShiftMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    openingShifts: KPIValue;
    closingShifts: KPIValue;
    reducedBreaks: KPIValue;
  }> {
    try {
      // Get shifts and analyze them
      const shifts = await prisma.shift.findMany({
        where: {
          employeeId,
          shiftDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      let openingShifts = 0;
      let closingShifts = 0;

      // Analyze shift types based on start and end times
      for (const shift of shifts) {
        const startTime = new Date(shift.startTime).getHours();
        const endTime = new Date(shift.endTime).getHours();

        // Opening shifts typically start before 10 AM
        if (startTime <= 10) {
          openingShifts++;
        }

        // Closing shifts typically end after 10 PM
        if (endTime >= 22) {
          closingShifts++;
        }
      }

      // Get reduced breaks from operational notes
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      });

      let reducedBreaksCount = 0;

      if (employee) {
        const breakNotes = await prisma.operationalNote.count({
          where: {
            reportDate: {
              gte: startDate,
              lte: endDate,
            },
            OR: [
              { content: { contains: employee.firstName, mode: 'insensitive' } },
              { content: { contains: employee.lastName, mode: 'insensitive' } },
            ],
            AND: [
              {
                OR: [
                  { content: { contains: 'pausa reduzida', mode: 'insensitive' } },
                  { content: { contains: 'reduced break', mode: 'insensitive' } },
                  { content: { contains: 'short break', mode: 'insensitive' } },
                ],
              },
            ],
          },
        });

        reducedBreaksCount = breakNotes;
      }

      return {
        openingShifts: normalizeKPIValue(openingShifts),
        closingShifts: normalizeKPIValue(closingShifts),
        reducedBreaks: normalizeKPIValue(reducedBreaksCount, 0, undefined), // Target: 0 reduced breaks
      };
    } catch (error) {
      logger.error("Failed to calculate shift metrics", { error, employeeId });
      return {
        openingShifts: normalizeKPIValue(0),
        closingShifts: normalizeKPIValue(0),
        reducedBreaks: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate performance indices from team feedback
   */
  static async calculatePerformanceIndices(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    reliabilityIndex: KPIValue;
    leadershipIndex: KPIValue;
    communicationIndex: KPIValue;
    organizationIndex: KPIValue;
    teamworkIndex: KPIValue;
  }> {
    try {
      // Get team feedback for the employee
      const feedback = await prisma.teamFeedback.findMany({
        where: {
          employeeId,
          reportDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Analyze feedback content to determine performance indices
      const indices = {
        reliability: [],
        leadership: [],
        communication: [],
        organization: [],
        teamwork: [],
      } as Record<string, number[]>;

      for (const feedbackItem of feedback) {
        const content = feedbackItem.content.toLowerCase();
        const sentimentScore = feedbackItem.sentiment === 'POSITIVE' ? 8 : 
                              feedbackItem.sentiment === 'NEUTRAL' ? 6 : 4;

        // Categorize feedback based on keywords
        if (content.includes('fiável') || content.includes('confiável') || 
            content.includes('reliable') || content.includes('pontual')) {
          indices.reliability.push(sentimentScore);
        }

        if (content.includes('liderança') || content.includes('leadership') ||
            content.includes('iniciativa') || content.includes('coordena')) {
          indices.leadership.push(sentimentScore);
        }

        if (content.includes('comunicação') || content.includes('communication') ||
            content.includes('explica') || content.includes('informa')) {
          indices.communication.push(sentimentScore);
        }

        if (content.includes('organização') || content.includes('organization') ||
            content.includes('organizado') || content.includes('método')) {
          indices.organization.push(sentimentScore);
        }

        if (content.includes('equipa') || content.includes('team') ||
            content.includes('colaboração') || content.includes('ajuda')) {
          indices.teamwork.push(sentimentScore);
        }
      }

      // Calculate average scores for each index
      const calculateIndex = (scores: number[]): KPIValue => {
        if (scores.length === 0) return normalizeKPIValue(7, 8, undefined); // Default good score

        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return normalizeKPIValue(average, 8, undefined); // Target: 8/10
      };

      return {
        reliabilityIndex: calculateIndex(indices.reliability),
        leadershipIndex: calculateIndex(indices.leadership),
        communicationIndex: calculateIndex(indices.communication),
        organizationIndex: calculateIndex(indices.organization),
        teamworkIndex: calculateIndex(indices.teamwork),
      };
    } catch (error) {
      logger.error("Failed to calculate performance indices", { error, employeeId });
      return {
        reliabilityIndex: normalizeKPIValue(7),
        leadershipIndex: normalizeKPIValue(7),
        communicationIndex: normalizeKPIValue(7),
        organizationIndex: normalizeKPIValue(7),
        teamworkIndex: normalizeKPIValue(7),
      };
    }
  }

  /**
   * Track participation in various activities
   */
  static async getParticipationMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    inventoryParticipation: KPIValue;
    trainingParticipation: KPIValue;
    briefingParticipation: KPIValue;
    improvementParticipation: KPIValue;
    extraCleaningParticipation: KPIValue;
  }> {
    try {
      // Get employee name for searching in operational records
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      });

      if (!employee) {
        return {
          inventoryParticipation: normalizeKPIValue(0),
          trainingParticipation: normalizeKPIValue(0),
          briefingParticipation: normalizeKPIValue(0),
          improvementParticipation: normalizeKPIValue(0),
          extraCleaningParticipation: normalizeKPIValue(0),
        };
      }

      // Search for participation mentions in operational notes
      const [
        inventoryParticipation,
        trainingParticipation,
        briefingParticipation,
        improvementParticipation,
        cleaningParticipation
      ] = await Promise.all([
        // Inventory participation
        prisma.operationalNote.count({
          where: {
            reportDate: { gte: startDate, lte: endDate },
            OR: [
              { content: { contains: employee.firstName, mode: 'insensitive' } },
              { content: { contains: employee.lastName, mode: 'insensitive' } },
            ],
            AND: [
              {
                OR: [
                  { content: { contains: 'inventário', mode: 'insensitive' } },
                  { content: { contains: 'inventory', mode: 'insensitive' } },
                  { content: { contains: 'contagem', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),

        // Training participation
        prisma.operationalNote.count({
          where: {
            reportDate: { gte: startDate, lte: endDate },
            OR: [
              { content: { contains: employee.firstName, mode: 'insensitive' } },
              { content: { contains: employee.lastName, mode: 'insensitive' } },
            ],
            AND: [
              {
                OR: [
                  { content: { contains: 'formação', mode: 'insensitive' } },
                  { content: { contains: 'training', mode: 'insensitive' } },
                  { content: { contains: 'curso', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),

        // Briefing participation
        prisma.operationalNote.count({
          where: {
            reportDate: { gte: startDate, lte: endDate },
            OR: [
              { content: { contains: employee.firstName, mode: 'insensitive' } },
              { content: { contains: employee.lastName, mode: 'insensitive' } },
            ],
            AND: [
              {
                OR: [
                  { content: { contains: 'briefing', mode: 'insensitive' } },
                  { content: { contains: 'reunião', mode: 'insensitive' } },
                  { content: { contains: 'meeting', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),

        // Improvement participation
        prisma.serviceImprovement.count({
          where: {
            reportDate: { gte: startDate, lte: endDate },
            assignedTo: {
              OR: [
                { contains: employee.firstName, mode: 'insensitive' },
                { contains: employee.lastName, mode: 'insensitive' },
              ],
            },
          },
        }),

        // Extra cleaning participation
        prisma.operationalNote.count({
          where: {
            reportDate: { gte: startDate, lte: endDate },
            OR: [
              { content: { contains: employee.firstName, mode: 'insensitive' } },
              { content: { contains: employee.lastName, mode: 'insensitive' } },
            ],
            AND: [
              {
                OR: [
                  { content: { contains: 'limpeza', mode: 'insensitive' } },
                  { content: { contains: 'cleaning', mode: 'insensitive' } },
                  { content: { contains: 'extra', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),
      ]);

      return {
        inventoryParticipation: normalizeKPIValue(inventoryParticipation),
        trainingParticipation: normalizeKPIValue(trainingParticipation),
        briefingParticipation: normalizeKPIValue(briefingParticipation),
        improvementParticipation: normalizeKPIValue(improvementParticipation),
        extraCleaningParticipation: normalizeKPIValue(cleaningParticipation),
      };
    } catch (error) {
      logger.error("Failed to calculate participation metrics", { error, employeeId });
      return {
        inventoryParticipation: normalizeKPIValue(0),
        trainingParticipation: normalizeKPIValue(0),
        briefingParticipation: normalizeKPIValue(0),
        improvementParticipation: normalizeKPIValue(0),
        extraCleaningParticipation: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate behavior-related metrics (incidents, commendations)
   */
  private static async calculateBehaviorMetrics(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    associatedIncidents: KPIValue;
    commendations: KPIValue;
  }> {
    try {
      // Get employee name for searching
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      });

      if (!employee) {
        return {
          associatedIncidents: normalizeKPIValue(0),
          commendations: normalizeKPIValue(0),
        };
      }

      // Count incidents associated with employee
      const incidentCount = await prisma.operationalNote.count({
        where: {
          reportDate: { gte: startDate, lte: endDate },
          OR: [
            { content: { contains: employee.firstName, mode: 'insensitive' } },
            { content: { contains: employee.lastName, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { tags: { has: 'incident' } },
                { content: { contains: 'incident', mode: 'insensitive' } },
                { content: { contains: 'problema', mode: 'insensitive' } },
                { content: { contains: 'erro', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });

      // Count commendations and positive feedback
      const commendationCount = await prisma.teamFeedback.count({
        where: {
          employeeId,
          reportDate: { gte: startDate, lte: endDate },
          sentiment: 'POSITIVE',
        },
      });

      // Also check for commendation mentions in operational notes
      const additionalCommendations = await prisma.operationalNote.count({
        where: {
          reportDate: { gte: startDate, lte: endDate },
          OR: [
            { content: { contains: employee.firstName, mode: 'insensitive' } },
            { content: { contains: employee.lastName, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { content: { contains: 'elogio', mode: 'insensitive' } },
                { content: { contains: 'commendation', mode: 'insensitive' } },
                { content: { contains: 'excelente', mode: 'insensitive' } },
                { content: { contains: 'parabéns', mode: 'insensitive' } },
                { content: { contains: 'destaque', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });

      return {
        associatedIncidents: normalizeKPIValue(incidentCount, 0, undefined), // Target: 0 incidents
        commendations: normalizeKPIValue(commendationCount + additionalCommendations),
      };
    } catch (error) {
      logger.error("Failed to calculate behavior metrics", { error, employeeId });
      return {
        associatedIncidents: normalizeKPIValue(0),
        commendations: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Calculate overtime metrics across team
   */
  static async getOvertimeMetrics(startDate: Date, endDate: Date): Promise<{
    totalOvertimeHours: KPIValue;
    overtimeByEmployee: Record<string, KPIValue>;
    overtimeTrend: KPIValue;
  }> {
    try {
      // Get all active employees
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true },
      });

      let totalOvertimeHours = 0;
      const overtimeByEmployee: Record<string, KPIValue> = {};

      // Calculate overtime for each employee
      for (const employee of employees) {
        const overtimeKPI = await this.calculateOvertimeHours(employee.id, startDate, endDate);
        const employeeName = `${employee.firstName} ${employee.lastName}`;
        
        overtimeByEmployee[employeeName] = overtimeKPI;
        totalOvertimeHours += overtimeKPI.value;
      }

      // Calculate trend (placeholder - would need historical data for proper trend)
      const overtimeTrend = normalizeKPIValue(0, 0, totalOvertimeHours); // Compare with previous period

      return {
        totalOvertimeHours: normalizeKPIValue(totalOvertimeHours, 0, undefined), // Target: minimal overtime
        overtimeByEmployee,
        overtimeTrend,
      };
    } catch (error) {
      logger.error("Failed to calculate overtime metrics", { error, startDate, endDate });
      return {
        totalOvertimeHours: normalizeKPIValue(0),
        overtimeByEmployee: {},
        overtimeTrend: normalizeKPIValue(0),
      };
    }
  }

  /**
   * Get team performance summary
   */
  static async getTeamPerformanceSummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    teamSize: KPIValue;
    avgHoursWorked: KPIValue;
    totalOvertimeHours: KPIValue;
    avgPerformanceScore: KPIValue;
    topPerformers: Array<{ name: string; score: number }>;
    improvementAreas: Array<{ area: string; employees: string[] }>;
    participationRates: Record<string, KPIValue>;
  }> {
    try {
      const teamMetrics = await this.calculateTeamMetrics(startDate, endDate);
      
      if (teamMetrics.length === 0) {
        return {
          teamSize: normalizeKPIValue(0),
          avgHoursWorked: normalizeKPIValue(0),
          totalOvertimeHours: normalizeKPIValue(0),
          avgPerformanceScore: normalizeKPIValue(0),
          topPerformers: [],
          improvementAreas: [],
          participationRates: {},
        };
      }

      // Calculate averages
      const totalHours = teamMetrics.reduce((sum, m) => sum + m.hoursWorked.value, 0);
      const totalOvertime = teamMetrics.reduce((sum, m) => sum + m.overtimeHours.value, 0);
      
      // Calculate overall performance score (average of all indices)
      const performanceScores = teamMetrics.map(m => {
        const indices = [
          m.reliabilityIndex.value,
          m.leadershipIndex.value,
          m.communicationIndex.value,
          m.organizationIndex.value,
          m.teamworkIndex.value,
        ];
        return indices.reduce((sum, score) => sum + score, 0) / indices.length;
      });

      const avgPerformanceScore = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;

      // Identify top performers (top 3)
      const topPerformers = teamMetrics
        .map(m => ({
          name: m.employeeName,
          score: (m.reliabilityIndex.value + m.leadershipIndex.value + 
                  m.communicationIndex.value + m.organizationIndex.value + 
                  m.teamworkIndex.value) / 5,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Identify improvement areas
      const improvementAreas = [];
      
      // Check for low communication scores
      const lowCommunication = teamMetrics
        .filter(m => m.communicationIndex.value < 6)
        .map(m => m.employeeName);
      
      if (lowCommunication.length > 0) {
        improvementAreas.push({ area: 'Communication', employees: lowCommunication });
      }

      // Check for high overtime
      const highOvertime = teamMetrics
        .filter(m => m.overtimeHours.value > 10) // More than 10 hours overtime
        .map(m => m.employeeName);
      
      if (highOvertime.length > 0) {
        improvementAreas.push({ area: 'Work-Life Balance', employees: highOvertime });
      }

      // Calculate participation rates
      const participationRates = {
        inventory: normalizeKPIValue(
          teamMetrics.reduce((sum, m) => sum + m.inventoryParticipation.value, 0) / teamMetrics.length
        ),
        training: normalizeKPIValue(
          teamMetrics.reduce((sum, m) => sum + m.trainingParticipation.value, 0) / teamMetrics.length
        ),
        briefings: normalizeKPIValue(
          teamMetrics.reduce((sum, m) => sum + m.briefingParticipation.value, 0) / teamMetrics.length
        ),
        improvements: normalizeKPIValue(
          teamMetrics.reduce((sum, m) => sum + m.improvementParticipation.value, 0) / teamMetrics.length
        ),
      };

      return {
        teamSize: normalizeKPIValue(teamMetrics.length),
        avgHoursWorked: normalizeKPIValue(totalHours / teamMetrics.length),
        totalOvertimeHours: normalizeKPIValue(totalOvertime),
        avgPerformanceScore: normalizeKPIValue(avgPerformanceScore, 8, undefined),
        topPerformers,
        improvementAreas,
        participationRates,
      };
    } catch (error) {
      logger.error("Failed to get team performance summary", { error, startDate, endDate });
      throw error;
    }
  }
}