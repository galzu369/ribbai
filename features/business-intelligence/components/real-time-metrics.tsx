"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  DollarSign, 
  Package,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DashboardData {
  healthScore: any;
  operationalKPIs: any;
  teamKPIs: any;
  financialKPIs: any;
  alerts: any[];
  lastUpdated: Date;
}

interface RealTimeMetricsProps {
  data: DashboardData;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  status?: 'good' | 'warning' | 'critical';
  realTime?: boolean;
}

function MetricCard({ 
  title, 
  value, 
  unit = '', 
  icon, 
  trend = 'stable',
  trendValue,
  status = 'good',
  realTime = false
}: MetricCardProps) {
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (realTime) {
      const interval = setInterval(() => {
        setIsLive(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [realTime]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return null;
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
    <div className="relative p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Live indicator */}
      {realTime && (
        <div className="absolute top-2 right-2">
          {isLive ? (
            <Wifi className="h-3 w-3 text-green-500 animate-pulse" />
          ) : (
            <WifiOff className="h-3 w-3 text-gray-400" />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>

      <div className="space-y-1">
        <div className={`text-xl font-bold ${getStatusColor(status)}`}>
          {formatValue(value)}{unit}
        </div>
        
        {trendValue !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {getTrendIcon(trend)}
            <span>{trendValue > 0 ? '+' : ''}{trendValue}%</span>
            <span>vs last period</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RealTimeMetrics({ data, className }: RealTimeMetricsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate real-time derived metrics
  const activeAlertsCount = data.alerts?.filter(alert => !alert.resolved).length || 0;
  const criticalAlertsCount = data.alerts?.filter(alert => alert.level === 'critical' && !alert.resolved).length || 0;
  const overtimePercentage = Math.round((data.teamKPIs?.overtimeHours / data.teamKPIs?.totalHours) * 100) || 0;
  const wasteValue = (data.financialKPIs?.inventoryValue * (data.financialKPIs?.wastePercentage / 100)) || 0;

  const realTimeMetrics = [
    {
      title: 'Health Score',
      value: data.healthScore?.overallScore || 0,
      unit: '%',
      icon: <Activity className="h-4 w-4 text-purple-500" />,
      trend: data.healthScore?.trend === 'up' ? 'up' as const : data.healthScore?.trend === 'down' ? 'down' as const : 'stable' as const,
      trendValue: 2.3,
      status: data.healthScore?.overallScore >= 85 ? 'good' : data.healthScore?.overallScore >= 70 ? 'warning' : 'critical' as const,
      realTime: true
    },
    {
      title: 'Active Team',
      value: data.teamKPIs?.activeEmployees || 0,
      unit: ' people',
      icon: <Users className="h-4 w-4 text-blue-500" />,
      trend: 'stable' as const,
      status: 'good' as const,
      realTime: true
    },
    {
      title: 'Inventory Value',
      value: data.financialKPIs?.inventoryValue || 0,
      unit: '€',
      icon: <Package className="h-4 w-4 text-green-500" />,
      trend: 'stable' as const,
      trendValue: 1.2,
      status: 'good' as const
    },
    {
      title: 'Daily Revenue',
      value: Math.round((data.financialKPIs?.monthlyConsumption || 0) / 30),
      unit: '€',
      icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
      trend: 'up' as const,
      trendValue: 4.7,
      status: 'good' as const,
      realTime: true
    },
    {
      title: 'Overtime Rate',
      value: overtimePercentage,
      unit: '%',
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      trend: overtimePercentage > 15 ? 'up' as const : 'down' as const,
      trendValue: -1.3,
      status: overtimePercentage > 20 ? 'critical' : overtimePercentage > 15 ? 'warning' : 'good' as const,
      realTime: true
    },
    {
      title: 'Active Alerts',
      value: activeAlertsCount,
      unit: ' alerts',
      icon: <Zap className="h-4 w-4 text-red-500" />,
      trend: activeAlertsCount > 5 ? 'up' as const : 'stable' as const,
      status: criticalAlertsCount > 0 ? 'critical' : activeAlertsCount > 3 ? 'warning' : 'good' as const,
      realTime: true
    }
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Real-Time Metrics
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {realTimeMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              icon={metric.icon}
              trend={metric.trend}
              trendValue={metric.trendValue}
              status={metric.status as MetricCardProps['status']}
              realTime={metric.realTime}
            />
          ))}
        </div>

        {/* System Status */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Performance Overview */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Performance Overview</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Operational Efficiency</span>
                <span className="text-right">
                  <span className="font-medium">{data.operationalKPIs?.efficiencyScore || 0}%</span>
                  <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
                </span>
              </div>
              <Progress value={data.operationalKPIs?.efficiencyScore || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Team Performance</span>
                <span className="text-right">
                  <span className="font-medium">{data.teamKPIs?.performanceIndex || 0}%</span>
                  <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
                </span>
              </div>
              <Progress value={data.teamKPIs?.performanceIndex || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Quality Score</span>
                <span className="text-right">
                  <span className="font-medium">{data.operationalKPIs?.qualityScore || 0}%</span>
                  <TrendingUp className="inline h-3 w-3 ml-1 text-green-500" />
                </span>
              </div>
              <Progress value={data.operationalKPIs?.qualityScore || 0} className="h-2" />
            </div>
          </div>

          {/* Current Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Current Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>System Status</span>
                <Badge variant="secondary" className="text-xs">
                  <Wifi className="h-2 w-2 mr-1" />
                  OPERATIONAL
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>Data Sync</span>
                <Badge variant="secondary" className="text-xs">
                  <Activity className="h-2 w-2 mr-1 animate-pulse" />
                  SYNCED
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>Alert Level</span>
                <Badge 
                  variant={criticalAlertsCount > 0 ? "destructive" : activeAlertsCount > 3 ? "outline" : "secondary"}
                  className="text-xs"
                >
                  {criticalAlertsCount > 0 ? 'CRITICAL' : activeAlertsCount > 3 ? 'WARNING' : 'NORMAL'}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span>Last Update</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((Date.now() - data.lastUpdated.getTime()) / 1000)}s ago
                </span>
              </div>

              <div className="flex justify-between">
                <span>Waste Impact</span>
                <span className="text-xs text-muted-foreground">
                  -{wasteValue.toLocaleString()}€
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}