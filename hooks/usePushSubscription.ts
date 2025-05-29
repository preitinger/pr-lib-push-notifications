'use client'

import { useCallback, useEffect, useState } from "react";
import * as rt from 'runtypes';
import { fromLocal, toLocal } from "../../pr-lib-utils/client/storage";
import { I18nPush } from "../components/I18nPush";


export const PushSubscriptionInLocalStorage = rt.Object({
    device: rt.String,
    browser: rt.String,
    subscriptionJson: rt.String.or(rt.Null),
})
export type TPushSubscriptionInLocalStorage = rt.Static<typeof PushSubscriptionInLocalStorage>

export type PushSubscriptionError = 'no-service-worker-found'
    | 'permission-denied';

export type PushSubscriptionHandler = (e: PushSubscriptionError) => void;
export type PushSubscriptionSender = (sub: { device: string; browser: string; subscriptionJson: string | null }) => Promise<{
    type: 'success';
} | {
    type: 'error';
    error: string;
}>;


export interface PushSubscriptionModalProps {
    l: I18nPush;
    show: boolean;
    error: string;
    warning: string;
    onHide(): void;
}

type UsePushSubscriptionRes = [
    pushSubscriptionModalProps: PushSubscriptionModalProps,
    /**
     * Das Ergebnis befindet sich in localStorage[storageKey]
     */
    tryCreatePushSubscription: () => Promise<void>,

]

/**
 * Does not register any service worker, but depends that a service worker that can handle push events is registered for route `'/'`.
 * On mount, an effect is started that checks if `localStorage` contains an entry with a stringified object of `PushSubscriptionInLocalStorage` for the key `'pushSubscription'`.
 * If it does, it checks the permission state for push subscriptions. 
 * If it is `denied`, the modal becomes visible and shows an error, and the subscription in `localStorage` is set to null, and it is also sent with null using `sendPushSubscription()`.
 * Otherwise, it renews the push subscription in the pushManager, updates the entry in `localStorage` and sends a new valid push subscription with the given `sendPushSubscription()`.
 */
export default function usePushSubscription(
    l: I18nPush,
    clientURL: string | URL,
    storageKey: string,
    vapidKeyPublic: string,
    sendPushSubscription: PushSubscriptionSender,
    delayStart?: boolean,
): UsePushSubscriptionRes {
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    const onError = useCallback<PushSubscriptionHandler>((e) => {
        console.log('onPushError', e);
        switch (e) {
            case 'no-service-worker-found':
                setError(l.eNoServiceWorker);
                break;
            case 'permission-denied':
                setWarning(l.wPermissionDenied);
                break;
        }
    }, [l])

    useEffect(() => {

        const pushSubscriptionOptions = {
            userVisibleOnly: true,
            applicationServerKey: vapidKeyPublic
        };


        async function checkPush() {
            const localSub = fromLocal(PushSubscriptionInLocalStorage, storageKey);

            if (localSub != null) {

                const reg = await navigator.serviceWorker.getRegistration(clientURL)
                if (reg == null) {
                    setShowModal(true);
                    onError('no-service-worker-found');
                    return;
                }
                const permissionState = await reg.pushManager.permissionState(pushSubscriptionOptions);
                switch (permissionState) {
                    case 'denied':
                        toLocal(storageKey, Date.now(), {
                            device: localSub.value.device,
                            browser: localSub.value.browser,
                            subscriptionJson: null,

                        });
                        sendPushSubscription({
                            device: localSub.value.device,
                            browser: localSub.value.browser,
                            subscriptionJson: null,
                        });
                        setShowModal(true);
                        onError('permission-denied');
                        break;
                    case 'granted':
                    // no break
                    case 'prompt':
                        const sub = await reg.pushManager.subscribe(pushSubscriptionOptions)
                        const subJson = JSON.stringify(sub.toJSON());
                        if (subJson !== localSub.value.subscriptionJson) {
                            const newSub = {
                                ...localSub.value,
                                subscriptionJson: subJson
                            };
                            toLocal(storageKey, Date.now(), newSub);
                            sendPushSubscription(newSub);
                        }
                        break;
                }

            }

        }

        if (!delayStart) {
            checkPush();
        }
    }, [clientURL, storageKey, vapidKeyPublic, delayStart, onError, sendPushSubscription])

    const onHide = useCallback(() => {
        setShowModal(false);
    }, [])

    const pushSubscriptionModalProps: PushSubscriptionModalProps = {
        l: l,
        show: showModal,
        error,
        warning,
        onHide,
    }

    const tryCreatePushSubscription = useCallback(async () => {

        const pushSubscriptionOptions = {
            userVisibleOnly: true,
            applicationServerKey: vapidKeyPublic
        };

        const reg = await navigator.serviceWorker.getRegistration(clientURL)
        if (reg == null) {
            setShowModal(true);
            onError('no-service-worker-found');
            return;
        }
        const permissionState = await reg.pushManager.permissionState(pushSubscriptionOptions);
        const device = 'TODO device';
        const browser = 'TODO browser';

        switch (permissionState) {
            case 'denied':
                toLocal(storageKey, Date.now(), {
                    device,
                    browser,
                    subscriptionJson: null,

                });
                sendPushSubscription({
                    device,
                    browser,
                    subscriptionJson: null,
                });
                setShowModal(true);
                onError('permission-denied');
                break;
            case 'granted':
            // no break
            case 'prompt':
                const sub = await reg.pushManager.subscribe(pushSubscriptionOptions)
                const subJson = JSON.stringify(sub.toJSON());
                const newSub = {
                    device,
                    browser,
                    subscriptionJson: subJson
                };
                toLocal(storageKey, Date.now(), newSub);
                sendPushSubscription(newSub);
                break;
        }
    }, [clientURL, onError, sendPushSubscription, storageKey, vapidKeyPublic])

    const res: UsePushSubscriptionRes = [
        pushSubscriptionModalProps,
        tryCreatePushSubscription,
    ]

    console.log('res of usePushSubscription', res);

    return res

}