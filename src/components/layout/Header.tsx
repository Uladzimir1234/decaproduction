import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ClipboardList, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const navigation = [{
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard
}, {
  name: "Orders",
  href: "/orders",
  icon: ClipboardList
}];
export function Header() {
  const location = useLocation();
  const {
    toast
  } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };
  return <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">WD</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline-block">DECA Windows & Door Production </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return <Link key={item.name} to={item.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>;
          })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && <div className="md:hidden border-t bg-card animate-fade-in">
          <nav className="container py-4 space-y-1">
            {navigation.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>;
        })}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-3 px-3">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </div>}
    </header>;
}