"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreIndicatorProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
  status?: 'excellent' | 'good' | 'fair' | 'poor';
  className?: string;
}

export function HealthScoreIndicator({ 
  score, 
  trend = 'stable', 
  status = 'good',
  className 
}: HealthScoreIndicatorProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'destructive';
      default: return 'secondary';
    }
  };

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

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Score Display */}
      <div className="text-center">
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          /100
          {getTrendIcon(trend)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={score} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            {status.toUpperCase()}
          </Badge>
          <span>100</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="text-xs space-y-1">
        <div className="font-medium">Health Categories:</div>
        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
          <div>• Operations: 88%</div>
          <div>• Team: 82%</div>
          <div>• Financial: 87%</div>
          <div>• Quality: 84%</div>
          <div>• Efficiency: 86%</div>
          <div>• Inventory: 85%</div>
        </div>
      </div>
    </div>
  );
}