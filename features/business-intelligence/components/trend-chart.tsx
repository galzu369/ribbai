"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3 
} from 'lucide-react';

interface TrendChartProps {
  title: string;
  data: any;
  className?: string;
  chartType?: 'line' | 'area' | 'bar';
}

// Mock data generator for demonstration
const generateMockTrendData = (type: string) => {
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return date.toISOString().split('T')[0];
  });

  switch (type) {
    case 'performance':
      return days.map((date, i) => ({
        date: date.split('-')[2] + '/' + date.split('-')[1],
        performance: 75 + Math.random() * 20 + (i * 0.5),
        quality: 80 + Math.random() * 15 + (i * 0.3),
        efficiency: 70 + Math.random() * 25 + (i * 0.7),
        target: 85
      }));
    
    case 'financial':
      return days.map((date, i) => ({
        date: date.split('-')[2] + '/' + date.split('-')[1],
        revenue: 15000 + Math.random() * 5000 + (i * 200),
        costs: 10000 + Math.random() * 3000 + (i * 100),
        profit: 5000 + Math.random() * 2000 + (i * 150)
      }));
    
    case 'team':
      return days.map((date, i) => ({
        date: date.split('-')[2] + '/' + date.split('-')[1],
        attendance: 85 + Math.random() * 10,
        performance: 80 + Math.random() * 15,
        overtime: Math.random() * 20 + (i * 0.5)
      }));
    
    default:
      return days.map((date, i) => ({
        date: date.split('-')[2] + '/' + date.split('-')[1],
        value: 50 + Math.random() * 40 + (i * 1)
      }));
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{`Date: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.dataKey}: ${typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}${
              entry.dataKey.includes('percentage') || entry.dataKey.includes('rate') ? '%' : 
              entry.dataKey.includes('revenue') || entry.dataKey.includes('cost') || entry.dataKey.includes('profit') ? '€' :
              entry.dataKey.includes('hours') || entry.dataKey.includes('time') ? 'h' : ''
            }`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendChart({ title, data, className, chartType = 'line' }: TrendChartProps) {
  // Generate mock data based on the trends provided
  const performanceData = generateMockTrendData('performance');
  const financialData = generateMockTrendData('financial');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    const variant = trend === 'improving' || trend === 'up' ? 'secondary' : 
                   trend === 'declining' || trend === 'down' ? 'destructive' : 'outline';
    return (
      <Badge variant={variant} className="text-xs">
        {trend === 'improving' ? 'IMPROVING' : 
         trend === 'declining' ? 'DECLINING' : 
         trend === 'stable' ? 'STABLE' : trend.toUpperCase()}
      </Badge>
    );
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="performance"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              name="Performance"
            />
            <Area
              type="monotone"
              dataKey="quality"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
              name="Quality"
            />
            <Area
              type="monotone"
              dataKey="efficiency"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
              name="Efficiency"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financialData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="costs" fill="#ef4444" name="Costs" />
            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default line chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={performanceData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="performance"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Performance"
          />
          <Line
            type="monotone"
            dataKey="quality"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Quality"
          />
          <Line
            type="monotone"
            dataKey="efficiency"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Efficiency"
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={{ r: 0 }}
            name="Target"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {title}
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <>
                {getTrendIcon(data.performanceTrend)}
                {getTrendBadge(data.performanceTrend)}
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {renderChart()}
        </div>
        
        {/* Trend Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {getTrendIcon(data?.performanceTrend || 'stable')}
            <span className="text-muted-foreground">Performance</span>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(data?.qualityTrend || 'stable')}
            <span className="text-muted-foreground">Quality</span>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(data?.efficiencyTrend || 'stable')}
            <span className="text-muted-foreground">Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(data?.costTrend || 'stable')}
            <span className="text-muted-foreground">Costs</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}