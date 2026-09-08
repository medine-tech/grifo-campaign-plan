"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Compass,
  LayoutDashboard,
  Map,
  Users,
  KeyRound,
  BookOpen,
  Settings,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { islands, type User } from "@/lib/domain";
import { api, IslandIcon } from "./ui";
export function Shell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const link = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={"nav-link " + (path === href ? "active" : "")}
    >
      {icon}
      <span>{label}</span>
      {path === href && <span className="nav-dot" />}
    </Link>
  );
  return (
    <div className="app-layout">
      <button
        className="mobile-menu icon-button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
      >
        {open ? <X /> : <Menu />}
      </button>
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            <Compass size={29} strokeWidth={1.4} />
          </span>
          <span>
            GRIFO<small>PLAN DE CAMPAÑA</small>
          </span>
        </Link>
        <div className="season-label">
          <span className="live-dot" />
          Juegos Imperiales · 2026
        </div>
        <nav aria-label="Navegación principal">
          <div className="nav-group">LA CAMPAÑA</div>
          {link("/dashboard", "Vista general", <LayoutDashboard size={18} />)}
          {link("/map", "Mapa de territorios", <Map size={18} />)}
          {link("/members", "Miembros", <Users size={18} />)}
          <div className="nav-group">LAS SIETE ISLAS</div>
          {islands.map((i) => (
            <div key={i.id}>
              {link("/islands/" + i.id, i.name, <IslandIcon name={i.icon} />)}
            </div>
          ))}
          <div className="nav-group">HERRAMIENTAS</div>
          {link("/tokens", "Mis agentes", <KeyRound size={18} />)}
          {link(
            "/api/documentation",
            "Documentación API",
            <BookOpen size={18} />,
          )}
          {link("/settings", "Configuración", <Settings size={18} />)}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="https://github.com/medine-tech/grifo-campaign-plan/issues"
            target="_blank"
            rel="noreferrer"
          >
            Construimos en abierto <ArrowUpRight size={15} />
          </a>
          <div className="user-row">
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="user-name">
              {user.name}
              <small>
                {user.role === "admin"
                  ? "Administración"
                  : "Miembro de la casa"}
              </small>
            </span>
            <button
              className="icon-button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={async () => {
                try {
                  await api("/auth/logout", { method: "POST" });
                  router.push("/login");
                  router.refresh();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Casa del Grifo <span className="muted">/</span> Centro de
            operaciones
          </span>
          <span className="season-badge">
            8–14 SEP <b>SEMANA 02</b>
          </span>
        </header>
        <main id="main-content">{children}</main>
        <footer className="app-footer">
          <span>Territorios, personas y un mismo horizonte.</span>
          <a href="/api/documentation">
            API v1 <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}
