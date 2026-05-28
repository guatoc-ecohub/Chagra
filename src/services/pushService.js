/**
 * pushService — Web Push API subscription management para Chagra PWA.
 *
 * FEAT-B #293 (operator 2026-05-28 autopiloto): el campesino abre Chagra
 * una vez al día. Sin push proactivas no se entera de helada / lluvia /
 * calendario siembra crítico cuando NO abre la app. Esta capa cliente
 * registra subscription contra el Service Worker + envía endpoint+keys
 * al backend (sidecar) que dispatchea desde cron systemd en alpha.
 *
 * Privacy-first:
 *   - Opt-in explícito (NotifPermissionPrompt component).
 *   - Subscription guardada solo en endpoint backend privado, NO tracker.
 *   - localStorage `chagra:push-subscribed:v1` marca estado local.
 *   - Unsubscribe sencillo: 1 click → revoca + borra del backend.
 *
 * Stack:
 *   - Web Push API (estándar W3C).
 *   - VAPID public key servida por el sidecar `/notifications/vapid-public`.
 *   - Subscription POST a `/notifications/subscribe` con X-Chagra-Token.
 */

const STORAGE_KEY = 'chagra:push-subscribed:v1';
const SIDECAR_BASE = '/api/sidecar';

/**
 * Verifica si push notifications son soportadas en este browser.
 * iOS Safari < 16.4 NO soporta. Firefox sí. Chrome desde forever.
 */
export function isPushSupported() {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Estado actual de la subscription. Lee localStorage + verifica con SW.
 */
export async function isSubscribed() {
    if (!isPushSupported()) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return Boolean(sub);
    } catch {
        return false;
    }
}

/**
 * Estado del permiso de notificación del browser.
 */
export function permissionStatus() {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Solicita permiso al usuario. Debe llamarse en respuesta a interacción
 * (click) — Chrome bloquea si se llama sin gesture.
 */
export async function requestPermission() {
    if (!isPushSupported()) {
        throw new Error('Push no soportado en este navegador');
    }
    const result = await Notification.requestPermission();
    return result; // 'granted' | 'denied' | 'default'
}

/**
 * Obtiene la VAPID public key del sidecar. Necesaria para subscribe.
 */
async function fetchVapidPublicKey() {
    const r = await fetch(`${SIDECAR_BASE}/notifications/vapid-public`);
    if (!r.ok) throw new Error(`VAPID fetch HTTP ${r.status}`);
    const { publicKey } = await r.json();
    return publicKey;
}

/**
 * Convierte VAPID public key base64-url a Uint8Array (formato requerido
 * por PushManager.subscribe).
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
    return out;
}

/**
 * Subscribe al user a push. Asume permiso ya granted.
 * Registra contra el SW + manda endpoint+keys al backend.
 */
export async function subscribePush() {
    if (!isPushSupported()) throw new Error('Push no soportado');
    if (permissionStatus() !== 'granted') {
        throw new Error('Permiso de notificación no concedido');
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
        const vapidPublicKey = await fetchVapidPublicKey();
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true, // requerido por todos los browsers
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
    }

    // Enviar al backend para guardar
    const payload = sub.toJSON();
    const r = await fetch(`${SIDECAR_BASE}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Subscribe backend HTTP ${r.status}`);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), endpoint: sub.endpoint }));
    } catch { /* quota o private mode */ }

    return sub;
}

/**
 * Unsubscribe del push. Borra subscription local + manda DELETE al backend.
 */
export async function unsubscribePush() {
    if (!isPushSupported()) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return true;
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        // Notificar al backend
        try {
            await fetch(`${SIDECAR_BASE}/notifications/subscribe`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint }),
            });
        } catch { /* backend offline está OK, browser ya canceló */ }
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return true;
    } catch {
        return false;
    }
}

/**
 * Lee el storage local — útil para mostrar fecha de subscription.
 */
export function getLocalSubscriptionInfo() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
