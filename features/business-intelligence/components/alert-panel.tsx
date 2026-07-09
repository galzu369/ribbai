"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock,
  X,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AlertItem {
  id: string;
  type: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  category: string;
  triggeredAt: Date;
  acknowledged?: boolean;
  resolved?: boolean;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

export function AlertPanel({ 
  alerts = [], 
  className, 
  maxItems = 5,
  showFilters = true 
}: AlertPanelProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'info':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'team':
        return '👥';
      case 'financial':
        return '💰';
      case 'inventory':
        return '📦';
      case 'operational':
        return '⚙️';
      case 'health':
        return '🏥';
      case 'trend':
        return '📈';
      default:
        return '📋';
    }
  };

  const filteredAlerts = alerts
    .filter(alert => {
      if (!showResolved && alert.resolved) return false;
      if (filter !== 'all' && alert.level !== filter) return false;
      return true;
    })
    .slice(0, maxItems);

  const alertCounts = {
    critical: alerts.filter(a => a.level === 'critical' && !a.resolved).length,
    warning: alerts.filter(a => a.level === 'warning' && !a.resolved).length,
    info: alerts.filter(a => a.level === 'info' && !a.resolved).length,
    total: alerts.filter(a => !a.resolved).length
  };

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-600">All Clear!</p>
            <p className="text-sm text-muted-foreground">No active alerts at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            System Alerts
            <Badge variant="outline" className="text-xs">
              {alertCounts.total} active
            </Badge>
          </div>
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs"
            >
              {showResolved ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              {showResolved ? 'Hide' : 'Show'} Resolved
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alert Counts Summary */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex flex-col h-auto py-2"
          >
            <span className="font-bold">{alertCounts.total}</span>
            <span>All</span>
          </Button>
          <Button
            variant={filter === 'critical' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
            className="flex flex-col h-auto py-2"
          >
            <span className="font-bold">{alertCounts.critical}</span>
            <span>Critical</span>
          </Button>
          <Button
            variant={filter === 'warning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('warning')}
            className="flex flex-col h-auto py-2"
          >
            <span className="font-bold">{alertCounts.warning}</span>
            <span>Warning</span>
          </Button>
          <Button
            variant={filter === 'info' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('info')}
            className="flex flex-col h-auto py-2"
          >
            <span className="font-bold">{alertCounts.info}</span>
            <span>Info</span>
          </Button>
        </div>

        {/* Alert List */}
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-4">
              <Filter className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No alerts match the current filter
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <Alert 
                key={alert.id} 
                className={`border-l-4 ${
                  alert.level === 'critical' ? 'border-l-red-500' :
                  alert.level === 'warning' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                } ${alert.resolved ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getAlertIcon(alert.level)}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge variant={getBadgeVariant(alert.level)} className="text-xs">
                          {alert.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs">
                          {getCategoryIcon(alert.category)} {alert.category}
                        </span>
                      </div>
                      <AlertDescription className="text-xs">
                        {alert.description}
                      </AlertDescription>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Acknowledged
                          </Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-2 w-2 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Alert>
            ))
          )}
        </div>

        {/* Show More Button */}
        {alerts.length > maxItems && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" className="text-xs">
              View All Alerts ({alerts.length - maxItems} more)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}