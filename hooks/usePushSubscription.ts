'use client'

import { useCallback, useEffect, useState } from "react";
import * as rt from 'runtypes';
import { fromLocal, toLocal } from "../../pr-lib-utils/client/storage";


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


export default function usePushSubscription(
    clientURL: string | URL,
    storageKey: string,
    vapidKeyPublic: string,
    onError: PushSubscriptionHandler,
    sendPushSubscription: PushSubscriptionSender,
    delayStart?: boolean,
): [
        showModal: boolean,
        onHide: () => void
    ] {
    const [showModal, setShowModal] = useState(false);

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

    return [
        showModal,
        onHide
    ]

}