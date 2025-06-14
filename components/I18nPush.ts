'use client';

export interface I18nPush {
    header: string;
    eNoServiceWorker: string;
    wPermissionDenied: string;
    hDevices: string;
    hEditDevice: string;
    hThisDevice: string;
    device: string;
    browser: string;
    ok: string;
    cancel: string;
    deletingSubscription: string;
    subscriptionDeleted: string;
    sendingSubscription: string;
    subscriptionSent: string;
    confirmDevicesDelete: (n: number) => string;
    ownDevice: string;
}
