import { Metadata } from 'next';
import { ExecutiveDashboard } from '@/features/business-intelligence/components/executive-dashboard';

export const metadata: Metadata = {
  title: 'Executive Dashboard | RIBBAI Operations',
  description: 'Real-time business intelligence and operational analytics for executive decision-making',
  keywords: ['dashboard', 'executive', 'business intelligence', 'analytics', 'KPI', 'operations'],
};

export default function ExecutiveDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <ExecutiveDashboard />
    </div>
  );
}