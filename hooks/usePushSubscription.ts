'use client'

import assert from "assert";
import { useCallback, useEffect, useRef, useState } from "react";
import { TVersion } from "../../pr-lib-sw-utils/sw-utils";
import { doRequest, I18nRequiredForDoRequest } from "../../pr-lib-utils/client";
import { I18nPush } from "../components/I18nPush";
import PushSubscriptionManager, { PushSubscriptionManagerEvent, PushSubscriptionManagerState } from "../PushSubscriptionManager";
import { I18nClientUtils } from "../../pr-lib-utils/i18n/client";
import { PushNotificationsDeviceDeleteRes, TPushNotificationsDeviceDeleteReq, TPushNotificationsDeviceDeleteRes } from "@/app/_lib/both/requests";
import { BsBreakpoint } from "../../pr-lib-utils/client/hooks/useBsBreakpoint";

const managers = new Map<string, PushSubscriptionManager>();

function getManager(l: { push: I18nPush } & I18nRequiredForDoRequest,
    version: TVersion,
    clientURL: string | URL,
    storageKey: string,
    vapidKeyPublic: string,
) {
    const key = clientURL + ';' + storageKey;
    let m = managers.get(key);
    if (!m) {
        managers.set(key, m = new PushSubscriptionManager(l, version, clientURL, storageKey, vapidKeyPublic))
    }

    return m;
}

// export type PushSubscriptionError = 'no-service-worker-found'
//     | 'permission-denied';

// export type PushSubscriptionHandler = (e: PushSubscriptionError) => void;
// export type PushSubscriptionSender = (l: I18nRequiredForDoRequest, sub: TPushedDeviceWithClientId, version: TVersion) => Promise<{
//     type: 'success';
// } | {
//     type: TSessionErrorType;
// } | {
//     type: 'error';
//     error: string;
// }>;

export type PushSubscriptionMsg = {
    type: 'warning';
    s: string;
} | {
    type: 'error';
    s: string;
}

export interface PushSubscriptionModalProps {
    l: I18nClientUtils & { push: I18nPush };
    version: TVersion;
    userAgent: string | null;
    state: PushSubscriptionManagerState;
    messages: PushSubscriptionMsg[];
    onMsgHide(msgIdx: number): void;
    onEditedDeviceOk(device: string, browser: string): void;
    onCancel(): void;
    onHide(): void;
    onDevicesDelete(deviceIds: string[]): void;
    bsBreakpoint: BsBreakpoint;
}

type UsePushSubscriptionRes = [
    pushSubscriptionModalProps: PushSubscriptionModalProps | null,
    /**
     * Das Ergebnis befindet sich in localStorage[storageKey]
     */
    tryCreatePushSubscription: () => Promise<void>,
    openDeviceList: () => void,
    openCategoryList: () => void,
]

/**
 * Does not register any service worker, but depends that a service worker that can handle push events is registered for route `'/'`.
 * On mount, an effect is started that checks if `localStorage` contains an entry with a stringified object of `PushSubscriptionInLocalStorage` for the key `'pushSubscription'`.
 * If it does, it checks the permission state for push subscriptions. 
 * If it is `denied`, the modal becomes visible and shows an error, and the subscription in `localStorage` is set to null, and it is also sent with null using `sendPushSubscription()`.
 * Otherwise, it renews the push subscription in the pushManager, updates the entry in `localStorage` and sends a new valid push subscription with the given `sendPushSubscription()`.
 */
export default function usePushSubscription(
    l: { push: I18nPush } & I18nRequiredForDoRequest,
    version: TVersion,
    clientURL: string | URL,
    storageKey: string,
    vapidKeyPublic: string,
    userAgent: string | null,
    onNoSession: () => void,
    onOtherSession: () => void,
    setSpinnerModal: (show: boolean) => void,
    bsBreakpoint: BsBreakpoint,
    delayStart?: boolean,
    
): UsePushSubscriptionRes {
    const managerRef = useRef<PushSubscriptionManager | null>(null)
    const [state, setState] = useState<PushSubscriptionManagerState>({ type: 'waiting' });
    const [messages, setMessages] = useState<PushSubscriptionMsg[]>([]);
    // const [editedDevice, setEditedDevice] = useState<EditedDevice>(null);

    useEffect(() => {
        console.log('effect in usePushSubscriptions with delayStart=', delayStart);
        if (!delayStart) {
            function listener(e: PushSubscriptionManagerEvent) {
                console.log('listener', e);
                switch (e.type) {
                    case 'stateChanged':
                        assert(managerRef.current);
                        setState(e.state);
                        break;
                    case 'noSession':
                        onNoSession();
                        break;
                    case 'otherSession':
                        onOtherSession();
                        break;
                    case 'error':
                        // TODO
                        break;
                    case 'warn':
                        // TODO
                        break;
                }
            }
            managerRef.current = getManager(l, version, clientURL, storageKey, vapidKeyPublic);
            // setProps(managerRef.current.props);

            managerRef.current.addListener(listener);
            console.log('before managerRef.current.checkPush()');
            managerRef.current.checkPush();

            return () => {
                managerRef.current?.removeListener(listener);
            }

        }
    }, [delayStart, l, version, clientURL, storageKey, vapidKeyPublic, onNoSession, onOtherSession])

    const onMsgHide = useCallback((idx: number) => {
        setMessages((old) => {
            const newMessages: PushSubscriptionMsg[] = [];
            for (let i = 0; i < old.length; ++i) {
                if (i !== idx) {
                    newMessages.push(old[i]);
                }
            }
            return newMessages;
        });
    }, [])

    const onEditedDeviceOk = useCallback((device: string, browser: string) => {
        managerRef.current?.onDeviceOk(device, browser);
    }, []);

    const onCancel = useCallback(() => {
        if (state.type === 'editing-before-creation') {
            managerRef.current?.onCancel();
        }
    }, [state.type])

    const onHide = useCallback(() => {
        console.log('onHide in state', state.type);
        switch (state.type) {
            case 'editing-before-creation':
                managerRef.current?.onCancel();
                break;
            case 'device-list':
                managerRef.current?.onCancel();
                break;

        }
    }, [state.type])

    const tryCreatePushSubscription = useCallback(async () => {
        console.log('tryCreatePushSubscription in usePushSubscription');
        if (managerRef.current) {
            await managerRef.current.tryCreatePushSubscription();
        }
    }, [])

    const openDeviceList = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.openDeviceList();
        }
    }, [])

    const openCategoryList = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.openCategoryList();
        }
    }, [])

    const onDevicesDelete = useCallback((deviceIds: string[]) => {
        doRequest<TPushNotificationsDeviceDeleteReq, TPushNotificationsDeviceDeleteRes>(
            l,
            '/api/pushNotifications/device/delete',
            {
                ids: deviceIds
            },
            PushNotificationsDeviceDeleteRes,
            version,
            setSpinnerModal,
        ).then(json => {
            switch (json.type) {
                case 'success':
                    setState(old => old.type === 'device-list' ? {
                        type: 'device-list',
                        devices: old.devices.filter(d => !deviceIds.includes(d.id)),
                        ownDeviceId: old.ownDeviceId,
                    } : old)
                    break;
                case 'noSession':
                    onNoSession();
                    break;
                case 'otherSession':
                    onOtherSession();
                    break;
            }
        })

    }, [l, version, onNoSession, onOtherSession, setSpinnerModal])

    const pushSubscriptionModalProps: PushSubscriptionModalProps = {
        l: l,
        version,
        userAgent,
        state,
        messages,
        onMsgHide,
        onEditedDeviceOk,
        onCancel,
        onHide,
        onDevicesDelete,
        bsBreakpoint,
    };

    return [
        pushSubscriptionModalProps,
        tryCreatePushSubscription,
        openDeviceList,
        openCategoryList,
    ]
}
