import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  BarChart3,
  Users,
  DollarSign,
  Settings,
  Bell,
  Menu
} from 'lucide-react';

export const metadata: Metadata = {
  title: {
    template: '%s | RIBBAI Dashboard',
    default: 'RIBBAI Dashboard',
  },
  description: 'Business Intelligence Dashboard for RIBBAI Operations Management',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link className="mr-6 flex items-center space-x-2" href="/dashboard">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block">
                RIBBAI Dashboard
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/dashboard/executive"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                Executive
              </Link>
              <Link
                href="/dashboard/operational"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Operations
              </Link>
              <Link
                href="/dashboard/team"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Team
              </Link>
              <Link
                href="/dashboard/financial"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Financial
              </Link>
              <Link
                href="/dashboard/reports"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Reports
              </Link>
            </nav>
          </div>
          
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Search could go here */}
            </div>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                <Bell className="h-4 w-4" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs"
                >
                  3
                </Badge>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                <Settings className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}