'use client'

import ErrorAlert from "@/app/_lib/submodules/pr-lib-utils/client/components/ErrorAlert";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import { PushSubscriptionModalProps } from "../hooks/usePushSubscription";

/**
 * Does not register any service worker, but depends that a service worker that can handle push events is registered for route `'/'`.
 * On mount, an effect is started that checks if `localStorage` contains an entry with a stringified object of `PushSubscriptionInLocalStorage` for the key `'pushSubscription'`.
 * If it does, it checks the permission state for push subscriptions. 
 * If it is `denied`, the modal becomes visible and shows an error, and the subscription in `localStorage` is set to null, and it is also sent with null using `sendPushSubscription()`.
 * Otherwise, it renews the push subscription in the pushManager, updates the entry in `localStorage` and sends a new valid push subscription with the given `sendPushSubscription()`.
 */
export default function PushSubscriptionModal({
    l,
    show,
    error,
    warning,
    onHide,
}: PushSubscriptionModalProps) {


    return <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>{l.header}</Modal.Header>
        <Modal.Body>
            <ErrorAlert error={error}/>
            <Alert variant='warning' show={!!warning}>{warning}</Alert>
        </Modal.Body>
    </Modal>
}