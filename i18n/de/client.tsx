import { I18nClient, I18nClientArg } from "../client";
import { deBoth } from "./both";

export const deClient: I18nClient = {
    push: {
        header: 'Push-Nachrichten für den Browser',
        eNoServiceWorker: 'Kein Service Worker gefunden',
        wPermissionDenied: 'Keine Berechtigung für Pushnachrichten für diese Webseite, obwohl diese früher aktiviert wurden. Wenn du in diesem Browser Pushnachrichten erhalten möchtest, bitte Browsereinstellungen prüfen und dann erneut Push-Nachrichten für diesen Browser aktivieren auf dieser Webseite unter den Abo-Einstellungen.',
    },
}

export const deClientArg: I18nClientArg = {
    ...deBoth,
    ...deClient,
    langCode: 'de',
}

export const libPushNotificationsClientDe = deClientArg;
export const libPushNotificationsClient = libPushNotificationsClientDe;
