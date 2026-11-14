export {};

declare global {
  interface Window {
    OpcionesTemas?: {
      registrarTema(config: {
        id: string;
        etiqueta?: string;
        activar: () => void;
        desactivar?: () => void;
      }): HTMLElement | null;
      ocultarCorazon: () => void;
      mostrarCorazon: () => void;
      cerrarMenu: () => void;
      contenedorMenu: HTMLElement;
      listaTemas: HTMLElement;
    };
    CalabazaHalloween?: Record<string, (...args: unknown[]) => unknown>;
  }
}
