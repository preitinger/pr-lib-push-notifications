import { I18nClient, I18nClientArg } from "../client";
import { deBoth } from "./both";

export const deClient: I18nClient = {
    push: {
        header: 'Push-Nachrichten',
        eNoServiceWorker: 'Kein Service Worker gefunden',
        wPermissionDenied: 'Keine Berechtigung für Pushnachrichten für diese Webseite. Wenn du in diesem Browser Pushnachrichten erhalten möchtest, bitte Browsereinstellungen ändern und dann erneut versuchen.',
        hDevices: 'Deine Geräte',
        hThisDevice: 'Auf diesem Gerät hier Pushnachrichten empfangen?',
        hEditDevice: 'Gerät',
        device: 'Gerät',
        browser: 'Browser',
        ok: 'OK',
        cancel: 'Abbrechen',
        deletingSubscription: 'Entferne Subskription vom Server ...',
        subscriptionDeleted: 'Entferne Subskription vom Server ... ERLEDIGT.',
        sendingSubscription: 'Sende Subskription zum Server ...',
        subscriptionSent: 'Sende Subskription zum Server ... ERLEDIGT.',
        confirmDevicesDelete: (n) => n === 1 ? 'Gerät löschen?' : `${n} Geräte löschen?`,
        ownDevice: '(dieses Gerät)',
    },
}

export const deClientArg: I18nClientArg = {
    ...deBoth,
    ...deClient,
    langCode: 'de',
}

export const libPushNotificationsClientDe = deClientArg;
export const libPushNotificationsClient = libPushNotificationsClientDe;
