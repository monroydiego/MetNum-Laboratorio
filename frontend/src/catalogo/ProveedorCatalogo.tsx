import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listarMetodos, mensajeDeError } from '../services/apiClient';
import type { MetodoInfoDTO } from '../types/numericos';
import { ContextoCatalogo, type EstadoCatalogo } from './contexto';

export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const [metodos, setMetodos] = useState<MetodoInfoDTO[]>([]);
  const [estado, setEstado] = useState<EstadoCatalogo['estado']>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarMetodos()
      .then((lista) => {
        if (!vigente) return;
        setMetodos(lista);
        setEstado('listo');
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setEstado('error');
        setError(mensajeDeError(e));
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  const recargar = useCallback(() => {
    setEstado('cargando');
    setVersion((v) => v + 1);
  }, []);

  const valor = useMemo<EstadoCatalogo>(
    () => ({ estado, metodos, porSlug: new Map(metodos.map((m) => [m.slug, m])), error, recargar }),
    [estado, metodos, error, recargar],
  );

  return <ContextoCatalogo.Provider value={valor}>{children}</ContextoCatalogo.Provider>;
}
