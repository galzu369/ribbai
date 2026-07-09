"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  DollarSign,
  BarChart3,
  Activity,
  Zap,
} from 'lucide-react';
import { HealthScoreIndicator } from './health-score-indicator';
import { KPIGrid } from './kpi-grid';
import { TrendChart } from './trend-chart';
import { AlertPanel } from './alert-panel';
import { AIInsights } from './ai-insights';
import { RealTimeMetrics } from './real-time-metrics';

interface ExecutiveDashboardProps {
  className?: string;
}

interface DashboardData {
  healthScore: any;
  operationalKPIs: any;
  teamKPIs: any;
  financialKPIs: any;
  alerts: any[];
  aiAnalysis: any;
  trends: any;
  lastUpdated: Date;
}

export function ExecutiveDashboard({ className }: ExecutiveDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // In a real implementation, these would be API calls
      // For now, we'll simulate the data structure
      const dashboardData: DashboardData = {
        healthScore: {
          overallScore: 85,
          trend: 'up',
          breakdown: {
            operational: 88,
            team: 82,
            financial: 87,
            quality: 84,
            efficiency: 86,
            inventory: 85
          },
          status: 'good',
          recommendations: [
            "Optimize team scheduling to reduce overtime",
            "Implement inventory rotation alerts",
            "Review maintenance scheduling efficiency"
          ],
          lastCalculated: new Date()
        },
        operationalKPIs: {
          operationalDays: 26,
          incidentCount: 3,
          maintenanceHours: 8.5,
          improvementCount: 7,
          efficiencyScore: 88.2,
          qualityScore: 91.5
        },
        teamKPIs: {
          totalHours: 2240,
          overtimeHours: 120,
          performanceIndex: 86.7,
          attendanceRate: 94.2,
          participationRate: 78.9,
          activeEmployees: 28
        },
        financialKPIs: {
          inventoryValue: 125840.50,
          monthlyConsumption: 89750.25,
          wastePercentage: 2.8,
          costVariance: -3.2,
          profitMargin: 24.6,
          revenueGrowth: 8.4
        },
        alerts: [
          {
            id: '1',
            type: 'threshold',
            level: 'warning',
            title: 'High Overtime Detected',
            description: 'Overtime hours exceeded 15% threshold this week',
            category: 'team',
            triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: '2', 
            type: 'trend',
            level: 'info',
            title: 'Inventory Optimization Opportunity',
            description: 'Beverages category showing consistent overstock pattern',
            category: 'inventory',
            triggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
          }
        ],
        aiAnalysis: {
          summary: "Operations are performing well with strong financial metrics. Team productivity is high, though overtime management needs attention. Inventory optimization presents cost-saving opportunities.",
          keyEvents: [
            "Successfully implemented new inventory tracking system",
            "Team completed safety training certification",
            "Launched promotional campaign resulting in 12% revenue increase"
          ],
          risks: [
            "Overtime costs trending upward",
            "Kitchen equipment showing early maintenance signs"
          ],
          opportunities: [
            "Optimize beverage inventory levels",
            "Cross-train staff to improve flexibility"
          ],
          recommendations: [
            "Review and adjust staffing schedules",
            "Implement preventive maintenance schedule",
            "Launch inventory optimization initiative"
          ]
        },
        trends: {
          performanceTrend: 'improving',
          costTrend: 'stable',
          qualityTrend: 'improving',
          efficiencyTrend: 'stable'
        },
        lastUpdated: new Date()
      };

      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const containerClassName = ["space-y-6 p-6", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time business intelligence and operational analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Updated {data.lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Score Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Restaurant Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreIndicator 
              score={data.healthScore.overallScore}
              trend={data.healthScore.trend}
              status={data.healthScore.status}
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.operationalKPIs.efficiencyScore}%</div>
            <p className="text-xs text-muted-foreground">
              Efficiency Score
              <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.teamKPIs.performanceIndex}%</div>
            <p className="text-xs text-muted-foreground">
              Performance Index
              <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Financial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.financialKPIs.profitMargin}%</div>
            <p className="text-xs text-muted-foreground">
              Profit Margin
              <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operational">Operations</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Real-time Metrics */}
              <RealTimeMetrics data={data} />
              
              {/* Trend Charts */}
              <TrendChart 
                title="Performance Trends"
                data={data.trends}
                className="h-[300px]"
              />
            </div>
            
            <div className="space-y-6">
              {/* Alerts Panel */}
              <AlertPanel 
                alerts={data.alerts}
                className="h-fit"
              />
              
              {/* AI Quick Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <strong>Key Insight:</strong>
                    <p className="text-muted-foreground mt-1">
                      {data.aiAnalysis.summary}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {data.aiAnalysis.risks.length} Risk{data.aiAnalysis.risks.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {data.aiAnalysis.opportunities.length} Opportunit{data.aiAnalysis.opportunities.length !== 1 ? 'ies' : 'y'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {data.aiAnalysis.recommendations.length} Recommendation{data.aiAnalysis.recommendations.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <KPIGrid 
            title="Operational Performance"
            kpis={data.operationalKPIs}
            type="operational"
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <KPIGrid 
            title="Team Performance"
            kpis={data.teamKPIs}
            type="team"
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <KPIGrid 
            title="Financial Performance"
            kpis={data.financialKPIs}
            type="financial"
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIInsights analysis={data.aiAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}