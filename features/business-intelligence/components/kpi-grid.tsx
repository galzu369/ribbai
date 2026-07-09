"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
  BarChart3,
  Package,
  CheckCircle,
  Target,
  Activity
} from 'lucide-react';

interface KPIGridProps {
  title: string;
  kpis: any;
  type: 'operational' | 'team' | 'financial';
  className?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  target?: number;
  status?: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description?: string;
}

function KPICard({ 
  title, 
  value, 
  unit = '', 
  trend = 'stable',
  trendValue,
  target,
  status = 'good',
  icon,
  description
}: KPICardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <Badge 
            variant={status === 'good' ? 'secondary' : status === 'warning' ? 'outline' : 'destructive'}
            className="text-xs"
          >
            {status.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
              {formatValue(value)}{unit}
            </div>
            {trendValue && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getTrendIcon(trend)}
                <span>{trendValue > 0 ? '+' : ''}{trendValue}%</span>
              </div>
            )}
          </div>
        </div>

        {target && typeof value === 'number' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to target</span>
              <span>{Math.round((value / target) * 100)}%</span>
            </div>
            <Progress value={(value / target) * 100} className="h-1" />
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function KPIGrid({ title, kpis, type, className }: KPIGridProps) {
  const getOperationalKPIs = (data: any) => [
    {
      title: 'Operational Days',
      value: data.operationalDays || 0,
      unit: ' days',
      trend: 'stable' as const,
      status: 'good' as const,
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      description: 'Total operational days this period'
    },
    {
      title: 'Incident Count',
      value: data.incidentCount || 0,
      unit: ' incidents',
      trend: data.incidentCount > 5 ? 'up' as const : 'stable' as const,
      status: data.incidentCount > 5 ? 'warning' : 'good' as const,
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      description: 'Safety and operational incidents'
    },
    {
      title: 'Maintenance Hours',
      value: data.maintenanceHours || 0,
      unit: 'h',
      trend: 'stable' as const,
      status: 'good' as const,
      icon: <Activity className="h-4 w-4 text-purple-500" />,
      description: 'Preventive and corrective maintenance'
    },
    {
      title: 'Improvements',
      value: data.improvementCount || 0,
      unit: ' items',
      trend: 'up' as const,
      status: 'good' as const,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      description: 'Process improvements implemented'
    },
    {
      title: 'Efficiency Score',
      value: data.efficiencyScore || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: 2.3,
      target: 95,
      status: data.efficiencyScore >= 85 ? 'good' : 'warning' as const,
      icon: <BarChart3 className="h-4 w-4 text-blue-600" />,
      description: 'Overall operational efficiency'
    },
    {
      title: 'Quality Score',
      value: data.qualityScore || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: 1.8,
      target: 95,
      status: data.qualityScore >= 90 ? 'good' : 'warning' as const,
      icon: <Target className="h-4 w-4 text-indigo-500" />,
      description: 'Service and product quality rating'
    }
  ];

  const getTeamKPIs = (data: any) => [
    {
      title: 'Total Hours',
      value: data.totalHours || 0,
      unit: 'h',
      trend: 'stable' as const,
      status: 'good' as const,
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      description: 'Total worked hours this period'
    },
    {
      title: 'Overtime Hours',
      value: data.overtimeHours || 0,
      unit: 'h',
      trend: data.overtimeHours > 100 ? 'up' as const : 'stable' as const,
      status: data.overtimeHours > 150 ? 'critical' : data.overtimeHours > 100 ? 'warning' : 'good' as const,
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      description: 'Overtime hours worked'
    },
    {
      title: 'Performance Index',
      value: data.performanceIndex || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: 3.2,
      target: 90,
      status: data.performanceIndex >= 85 ? 'good' : 'warning' as const,
      icon: <BarChart3 className="h-4 w-4 text-purple-500" />,
      description: 'Team performance composite score'
    },
    {
      title: 'Attendance Rate',
      value: data.attendanceRate || 0,
      unit: '%',
      trend: 'stable' as const,
      target: 95,
      status: data.attendanceRate >= 90 ? 'good' : 'warning' as const,
      icon: <Users className="h-4 w-4 text-green-500" />,
      description: 'Employee attendance percentage'
    },
    {
      title: 'Participation Rate',
      value: data.participationRate || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: 5.1,
      target: 85,
      status: data.participationRate >= 75 ? 'good' : 'warning' as const,
      icon: <Activity className="h-4 w-4 text-indigo-500" />,
      description: 'Training and meeting participation'
    },
    {
      title: 'Active Employees',
      value: data.activeEmployees || 0,
      unit: ' people',
      trend: 'stable' as const,
      status: 'good' as const,
      icon: <Users className="h-4 w-4 text-blue-600" />,
      description: 'Currently active team members'
    }
  ];

  const getFinancialKPIs = (data: any) => [
    {
      title: 'Inventory Value',
      value: data.inventoryValue || 0,
      unit: '€',
      trend: 'stable' as const,
      status: 'good' as const,
      icon: <Package className="h-4 w-4 text-blue-500" />,
      description: 'Current total inventory value'
    },
    {
      title: 'Monthly Consumption',
      value: data.monthlyConsumption || 0,
      unit: '€',
      trend: 'up' as const,
      trendValue: 4.2,
      status: 'good' as const,
      icon: <DollarSign className="h-4 w-4 text-green-500" />,
      description: 'Total consumption costs this month'
    },
    {
      title: 'Waste Percentage',
      value: data.wastePercentage || 0,
      unit: '%',
      trend: data.wastePercentage > 3 ? 'up' as const : 'down' as const,
      trendValue: -0.8,
      target: 2,
      status: data.wastePercentage <= 2 ? 'good' : data.wastePercentage <= 4 ? 'warning' : 'critical' as const,
      icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      description: 'Inventory waste as % of total'
    },
    {
      title: 'Cost Variance',
      value: data.costVariance || 0,
      unit: '%',
      trend: data.costVariance > 0 ? 'up' as const : 'down' as const,
      trendValue: data.costVariance,
      status: Math.abs(data.costVariance) <= 5 ? 'good' : 'warning' as const,
      icon: <BarChart3 className="h-4 w-4 text-purple-500" />,
      description: 'Budget variance percentage'
    },
    {
      title: 'Profit Margin',
      value: data.profitMargin || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: 1.2,
      target: 25,
      status: data.profitMargin >= 20 ? 'good' : 'warning' as const,
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      description: 'Current profit margin percentage'
    },
    {
      title: 'Revenue Growth',
      value: data.revenueGrowth || 0,
      unit: '%',
      trend: 'up' as const,
      trendValue: data.revenueGrowth,
      status: data.revenueGrowth > 5 ? 'good' : 'warning' as const,
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      description: 'Month-over-month revenue growth'
    }
  ];

  const getKPIsByType = () => {
    switch (type) {
      case 'operational':
        return getOperationalKPIs(kpis);
      case 'team':
        return getTeamKPIs(kpis);
      case 'financial':
        return getFinancialKPIs(kpis);
      default:
        return [];
    }
  };

  const kpiCards = getKPIsByType();

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-muted-foreground">
          Key performance indicators and metrics for {type} performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            unit={kpi.unit}
            trend={kpi.trend}
            trendValue={kpi.trendValue}
            target={kpi.target}
            status={kpi.status as KPICardProps['status']}
            icon={kpi.icon}
            description={kpi.description}
          />
        ))}
      </div>
    </div>
  );
}