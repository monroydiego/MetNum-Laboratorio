import { createContext, useContext } from 'react';
import type { MetodoInfoDTO } from '../types/numericos';

export interface EstadoCatalogo {
  estado: 'cargando' | 'listo' | 'error';
  metodos: MetodoInfoDTO[];
  porSlug: Map<string, MetodoInfoDTO>;
  error: string | null;
  recargar: () => void;
}

export const ContextoCatalogo = createContext<EstadoCatalogo>({
  estado: 'cargando',
  metodos: [],
  porSlug: new Map(),
  error: null,
  recargar: () => {},
});

/** Catálogo de métodos registrados en el backend (GET /api/metodos). */
export function useCatalogo(): EstadoCatalogo {
  return useContext(ContextoCatalogo);
}
