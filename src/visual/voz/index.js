/*
 * Librería visual de VOZ de Chagra — la identidad "la voz con forma".
 *
 * `IrisVoz` es el gesto único de la voz en toda la app: donde antes iría un
 * micrófono genérico, va el iris (FAB, overlay de escucha, chip de estado,
 * onboarding de voz). Un solo primitivo, cuatro estados, cualquier tamaño.
 *
 *   import IrisVoz, { nivelSimulado, ESTADOS_VOZ } from '.../visual/voz';
 *
 *   <IrisVoz estado="escuchando" size={220} getNivel={() => rmsRef.current} />
 *
 * `getNivel` en producción = RMS real del micrófono (useVoiceRecorder);
 * sin él, IrisVoz usa `nivelSimulado` (pseudo-habla determinista) — útil
 * para demos, onboarding y estados sin permiso de mic todavía.
 */
export { default, default as IrisVoz } from './IrisVoz.jsx';
export { nivelSimulado, ESTADOS_VOZ, ANILLOS_IRIS } from './vozViva';
