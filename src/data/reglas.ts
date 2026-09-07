export type TipoSancion = 'tiempo' | 'descalificacion'
export interface ReglaCompetencia { id: string; descripcion: string; tipo: TipoSancion; segundos?: number }
const descripciones = [
  ['Alterar orden de caída de blancos', 0], ['Caída de víctima desde camilla', 0],
  ['Usar pasos entre zonas no habilitados', 0], ['Botar blanco sin pitón', 0],
  ['Uso indebido del material', 0], ['Usar mangueras distintas del material o diámetro reglamentario', 0],
  ['Ingresar víctima a zona con blanco no caído', 120], ['Dar agua desde salida del gemelo sin manguera conectada', 120],
  ['Continuar con una manguera rota sin cambiarla', 120], ['Botar blanco desde dirección incorrecta', 180],
  ['Apoyarse en muros al derribar blanco', 180], ['Pitonero con ambos pies fuera de la zona', 60],
  ['Blanco inválido no repuesto correctamente', 60], ['No levantar inmediatamente blanco caído accidentalmente', 60],
  ['No cerrar pitón tras caer último blanco', 60],
] as const
export const REGLAS: ReglaCompetencia[] = descripciones.map(([descripcion, segundos], i) => ({ id: `R${i + 1}`, descripcion, tipo: segundos ? 'tiempo' : 'descalificacion', ...(segundos ? { segundos } : {}) }))
