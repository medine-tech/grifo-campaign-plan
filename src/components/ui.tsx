"use client";
import { useEffect, useState } from "react";
import {
  Radar,
  Binoculars,
  Lightbulb,
  Swords,
  Store,
  Landmark,
  Handshake,
  Compass,
  X,
  LoaderCircle,
} from "lucide-react";
export function IslandIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const Icon =
    (
      {
        Radar,
        Binoculars,
        Lightbulb,
        Swords,
        Store,
        Landmark,
        Handshake,
      } as Record<string, typeof Compass>
    )[name] || Compass;
  return <Icon size={size} strokeWidth={1.6} />;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message || "No pudimos completar la solicitud.",
    );
  return result as T;
}
export function useApi<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => setRevision((r) => r + 1) };
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={20} /> Cargando la campaña…
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={32} strokeWidth={1.3} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value))
    : "Sin fecha";
}
