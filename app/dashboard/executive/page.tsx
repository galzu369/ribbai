import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Executive Dashboard | RIBBAI Operations',
  description:
    'Real-time business intelligence and operational analytics for executive decision-making',
  keywords: ['dashboard', 'executive', 'business intelligence', 'analytics', 'KPI', 'operations'],
};

export default function ExecutiveDashboardPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 text-center max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground">
          Esta secção está a ser preparada. A versão atual foi simplificada para permitir o
          lançamento do site na Vercel.
        </p>
      </div>
    </div>
  );
}