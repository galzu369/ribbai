"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  Target,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface AIAnalysis {
  summary: string;
  keyEvents: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  positiveHighlights?: string[];
  pendingSituations?: string[];
  managementAlerts?: string[];
}

interface AIInsightsProps {
  analysis: AIAnalysis;
  className?: string;
}

interface InsightSectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  type: 'success' | 'warning' | 'info' | 'neutral';
  emptyMessage?: string;
}

function InsightSection({ title, icon, items, type, emptyMessage }: InsightSectionProps) {
  const [expanded, setExpanded] = useState(false);
  
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'info':
        return <Lightbulb className="h-3 w-3 text-blue-500" />;
      default:
        return <ArrowRight className="h-3 w-3 text-gray-500" />;
    }
  };

  const displayItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  if (items.length === 0) {
    return (
      <Card className={`border ${getTypeStyles(type)}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {icon}
            {title}
            <Badge variant="outline" className="text-xs">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">
            {emptyMessage || `No ${title.toLowerCase()} identified`}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${getTypeStyles(type)}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="outline" className="text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayItems.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            {getItemIcon(type)}
            <span className="flex-1">{item}</span>
          </div>
        ))}
        
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs h-6 px-2 mt-2"
          >
            {expanded ? 'Show Less' : `Show ${items.length - 3} More`}
            <Eye className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AIInsights({ analysis, className }: AIInsightsProps) {
  const [feedback, setFeedback] = useState<Record<string, 'positive' | 'negative' | null>>({});

  const handleFeedback = (section: string, type: 'positive' | 'negative') => {
    setFeedback(prev => ({
      ...prev,
      [section]: prev[section] === type ? null : type
    }));
  };

  const getInsightScore = () => {
    const total = analysis.risks.length + analysis.opportunities.length + analysis.recommendations.length;
    const positive = analysis.opportunities.length + (analysis.positiveHighlights?.length || 0);
    const negative = analysis.risks.length;
    
    if (total === 0) return { score: 85, status: 'good' };
    
    const ratio = (positive - negative) / total;
    if (ratio > 0.3) return { score: 92, status: 'excellent' };
    if (ratio > 0) return { score: 85, status: 'good' };
    if (ratio > -0.3) return { score: 75, status: 'fair' };
    return { score: 65, status: 'needs attention' };
  };

  const insightScore = getInsightScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI-Powered Insights
          </h2>
          <p className="text-muted-foreground">
            Automated analysis and intelligent recommendations
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">{insightScore.score}%</div>
          <div className="text-xs text-muted-foreground">Insight Score</div>
          <Badge 
            variant={insightScore.status === 'excellent' ? 'default' : 'secondary'}
            className="text-xs mt-1"
          >
            {insightScore.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Executive Summary
            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${feedback.summary === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`}
                onClick={() => handleFeedback('summary', 'positive')}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${feedback.summary === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}
                onClick={() => handleFeedback('summary', 'negative')}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Key Events */}
      {analysis.keyEvents && analysis.keyEvents.length > 0 && (
        <InsightSection
          title="Key Events"
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          items={analysis.keyEvents}
          type="info"
          emptyMessage="No significant events recorded"
        />
      )}

      {/* Analysis Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Risks */}
        <InsightSection
          title="Risks Identified"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          items={analysis.risks}
          type="warning"
          emptyMessage="No risks identified - great job!"
        />

        {/* Opportunities */}
        <InsightSection
          title="Opportunities"
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          items={analysis.opportunities}
          type="success"
          emptyMessage="No new opportunities detected"
        />

        {/* Recommendations */}
        <InsightSection
          title="Recommendations"
          icon={<Target className="h-4 w-4 text-purple-500" />}
          items={analysis.recommendations}
          type="info"
          emptyMessage="No action items at this time"
        />
      </div>

      {/* Additional Sections */}
      {(analysis.positiveHighlights?.length || analysis.pendingSituations?.length || analysis.managementAlerts?.length) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Positive Highlights */}
          {analysis.positiveHighlights && analysis.positiveHighlights.length > 0 && (
            <InsightSection
              title="Positive Highlights"
              icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              items={analysis.positiveHighlights}
              type="success"
              emptyMessage="Keep up the great work!"
            />
          )}

          {/* Pending Situations */}
          {analysis.pendingSituations && analysis.pendingSituations.length > 0 && (
            <InsightSection
              title="Pending Situations"
              icon={<Clock className="h-4 w-4 text-orange-500" />}
              items={analysis.pendingSituations}
              type="warning"
              emptyMessage="All situations resolved"
            />
          )}

          {/* Management Alerts */}
          {analysis.managementAlerts && analysis.managementAlerts.length > 0 && (
            <InsightSection
              title="Management Alerts"
              icon={<Zap className="h-4 w-4 text-red-500" />}
              items={analysis.managementAlerts}
              type="warning"
              emptyMessage="No urgent management attention needed"
            />
          )}
        </div>
      )}

      {/* AI Assistant Footer */}
      <Alert className="border-purple-200 bg-purple-50">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>AI Analysis Complete</strong>
              <p className="text-xs text-muted-foreground mt-1">
                Analysis generated at {new Date().toLocaleTimeString()} • 
                Based on {analysis.keyEvents?.length || 0} events, {analysis.risks.length} risks, and {analysis.opportunities.length} opportunities
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Generate Report
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}