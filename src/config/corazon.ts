export interface CorazonConfig {
  color: number;
  segmentosContorno: number;
  segmentosProfundidad: number;
  profundidad: number;
  escalaCorazon: number;
  radioAnillo: number;
  grosorAnillo: number;
  velocidadGiro: number;
  velocidadAnillo: number;
}

export const CONFIG_CORAZON: CorazonConfig = {
  color: 0xff00c8,
  segmentosContorno: 20,
  segmentosProfundidad: 15,
  profundidad: 0.4,
  escalaCorazon: 1.15,
  radioAnillo: 1.2,
  grosorAnillo: 0.014,
  velocidadGiro: 0.006,
  velocidadAnillo: 0.018,
};

export const SIMBOLOS: readonly string[] = ['#', '%', '&', '/', '0', '1', 'x', '*', '¡', '!'];
