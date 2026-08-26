/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Copy visible de la portada, pendiente de migración i18n ADR-050. */
import { CAMPESINO_HOME_ROUTES } from '../../config/campesinoHomeRoutes';

/** Primera capa de puertas: preguntas concretas, no categorías técnicas. */
export const CAMPESINO_HOME_ACTIONS = Object.freeze([
  { id: 'siembro', icon: '🌱', title: '¿Qué siembro?', view: 'mundo_cultivos' },
  { id: 'plaga', icon: '🐛', title: '¿Tengo plaga?', view: 'directorio', data: { tab: 'plagas' } },
  { id: 'clima', icon: '🌦️', title: '¿Cómo va el clima?', view: 'clima_boletin' },
  { id: 'registro', icon: '🎙️', title: 'Registrar hablando', view: CAMPESINO_HOME_ROUTES.voz },
]);

export const CAMPESINO_HOME_SECONDARY_ACTIONS = Object.freeze([
  { id: 'activos', label: 'Mis matas', view: 'activos' },
  { id: 'cosecha', label: 'Mi cosecha', view: 'mi_cosecha' },
  { id: 'mercado', label: 'Precio y mercado', view: CAMPESINO_HOME_ROUTES.mercado },
]);
