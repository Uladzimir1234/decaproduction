import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { OrderAssistant } from "@/components/ai/OrderAssistant";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <Outlet />
      </main>
      <OrderAssistant />
    </div>
  );
}
