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
    NavidadChamoys?: {
      activar: () => void;
      desactivar: () => void;
      adornos: () => number;
      activo: () => boolean;
      registros: () => Array<{
        id: string;
        tipo: string;
        color: string;
        x: number;
        y: number;
        z: number;
        rotY: number;
        rotZ: number;
        escala: number;
        creado: string;
      }>;
      sincronizar: () => Promise<boolean>;
      quitarUltimo: () => boolean;
      estrellaPermitida: () => boolean;
      nube: () => { url: string; ruta: string; pendientes: number; borrados: number };
    };
  }
}
