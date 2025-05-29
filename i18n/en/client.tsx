import { I18nClient, I18nClientArg } from "../client";
import { enBoth } from "./both";

export const enClient: I18nClient = {
    push: {
        header: 'Push messages to the browser',
        eNoServiceWorker: 'No service worker found',
        wPermissionDenied: 'Permission denied for push messages from this site. Please check your browser settings for this website.',
    },
}

export const enClientArg: I18nClientArg = {
    ...enBoth,
    ...enClient,
    langCode: 'en',
}

export const libPushNotificationsClientEn = enClientArg;
export const libPushNotificationsClient = libPushNotificationsClientEn;
