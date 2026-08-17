import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Dashboard from "./pages/Dashboard/Dashboard";
import Agenda from "./pages/Agenda/Agenda";
import Reservas from "./pages/Reservas/Reservas";
import Historico from "./pages/Historico/Historico";
import Configuracoes from "./pages/Configuracoes/Configuracoes";
import "./styles/pages.css";
import "./App.css";

function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`gp-shell ${collapsed ? "gp-shell-collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className="gp-main gp-scrollbar">
        <div className="gp-main-inner">
          <Routes>
            <Route path="/" element={<Dashboard onOpenMobileMenu={() => setMobileOpen(true)} />} />
            <Route path="/agenda" element={<Agenda onOpenMobileMenu={() => setMobileOpen(true)} />} />
            <Route path="/reservas" element={<Reservas onOpenMobileMenu={() => setMobileOpen(true)} />} />
            <Route path="/historico" element={<Historico onOpenMobileMenu={() => setMobileOpen(true)} />} />
            <Route
              path="/configuracoes"
              element={<Configuracoes onOpenMobileMenu={() => setMobileOpen(true)} />}
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
