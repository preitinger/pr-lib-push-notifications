import { I18nClient, I18nClientArg } from "../client";
import { enBoth } from "./both";

export const enClient: I18nClient = {
    push: {
        header: 'Push Messages',
        eNoServiceWorker: 'No service worker found',
        wPermissionDenied: 'Permission denied for push messages from this site. Please check your browser settings for this website and try again.',
        hDevices: 'Your Devices',
        hThisDevice: 'Receive push messages on this device here?',
        hEditDevice: 'Device',
        device: 'Device',
        browser: 'Browser',
        ok: 'OK',
        cancel: 'Cancel',
        deletingSubscription: 'Removing subscription from the server ...',
        subscriptionDeleted: 'Removing subscription from the server ... DONE.',
        sendingSubscription: 'Sending subscription to the server ...',
        subscriptionSent: 'Sending subscription to the server ... DONE.',
        confirmDevicesDelete: (n) => n === 1 ? 'Delete device?' : `Delete ${n} devices?`,
        ownDevice: '(this device)',
    },
}

export const enClientArg: I18nClientArg = {
    ...enBoth,
    ...enClient,
    langCode: 'en',
}

export const libPushNotificationsClientEn = enClientArg;
export const libPushNotificationsClient = libPushNotificationsClientEn;
