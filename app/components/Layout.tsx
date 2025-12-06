import { Link, Outlet, useLocation } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Brain, Bell, Code, Zap, Settings } from 'lucide-react';
import { cn } from './ui/button';

export function Layout() {
  const location = useLocation();
  
  const navItems = [
    { href: '/', icon: MessageSquare, label: 'Chat' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/memories', icon: Brain, label: 'Memory' },
    { href: '/reminders', icon: Bell, label: 'Reminders' },
    { href: '/automations', icon: Zap, label: 'Automations' },
    { href: '/code-explorer', icon: Code, label: 'Code Explorer' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 md:w-64 border-r border-border flex flex-col bg-card">
        <div className="p-4 flex items-center gap-2 border-b border-border h-16">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">H</div>
          <span className="font-bold text-lg hidden md:block">HER</span>
        </div>
        
        <nav className="flex-1 p-2 gap-2 flex flex-col">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-secondary text-secondary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon size={20} />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
