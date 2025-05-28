'use client'

import ErrorAlert from "@/app/_lib/submodules/pr-lib-utils/client/components/ErrorAlert";
import { useCallback, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import usePushSubscription, { PushSubscriptionHandler, PushSubscriptionSender } from "../hooks/usePushSubscription";

export interface I18nPush {
    header: string;
    eNoServiceWorker: string;
    wPermissionDenied: string;
}

export interface PushSubscriptionModalProps {
    l: I18nPush;
    vapidKeyPublic: string;
    sendPushSubscription: PushSubscriptionSender;
    delayStart?: boolean;
}

/**
 * Does not register any service worker, but depends that a service worker that can handle push events is registered for route `'/'`.
 * On mount, an effect is started that checks if `localStorage` contains an entry with a stringified object of `PushSubscriptionInLocalStorage` for the key `'pushSubscription'`.
 * If it does, it checks the permission state for push subscriptions. 
 * If it is `denied`, the modal becomes visible and shows an error, and the subscription in `localStorage` is set to null, and it is also sent with null using `sendPushSubscription()`.
 * Otherwise, it renews the push subscription in the pushManager, updates the entry in `localStorage` and sends a new valid push subscription with the given `sendPushSubscription()`.
 */
export default function PushSubscriptionModal({
    l,
    vapidKeyPublic,
    sendPushSubscription,
    delayStart,
}: PushSubscriptionModalProps) {
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');

    const onPushError = useCallback<PushSubscriptionHandler>((e) => {
        switch (e) {
            case 'no-service-worker-found':
                setError(l.eNoServiceWorker);
                break;
            case 'permission-denied':
                setWarning(l.wPermissionDenied);
                break;
        }
    }, [l])

    const [showModal, onHide] = usePushSubscription('/',
        'pushSubscription',
        vapidKeyPublic,
        // "BDd1oHzF6UUQSPVLTFxTflz_pxeUUrkcpRDs8O4k_3UdxBhGMV-zGjhOHltp90QzjR4CWscXJ-2hig0lw0Y8EqY",
        onPushError,
        sendPushSubscription,
        delayStart,
    );

    return <Modal show={showModal} onHide={onHide}>
        <Modal.Header closeButton>{l.header}</Modal.Header>
        <Modal.Body>
            <ErrorAlert error={error}/>
            <Alert variant='warning' show={!!warning}>{warning}</Alert>
        </Modal.Body>
    </Modal>
}