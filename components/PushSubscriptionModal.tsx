'use client'

import { PrListAction, PrListItem } from "@/app/_lib/submodules/pr-lib-utils/client/prList/prListData";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import { createClientObjectId } from "../../pr-lib-utils/client";
import ActionCancelRow from "../../pr-lib-utils/client/components/ActionCancelRow";
import MyFormGroup from "../../pr-lib-utils/client/components/MyFormGroup";
import PrList2, { PrList2Ref } from "../../pr-lib-utils/client/components/PrList2";
import useEnterFocusChain from "../../pr-lib-utils/client/hooks/useEnterFocusChain";
import { I18nClientUtils } from "../../pr-lib-utils/i18n/client";
import { TPushedDeviceWithClientId } from "../data";
import { PushSubscriptionModalProps, PushSubscriptionMsg } from "../hooks/usePushSubscription";
import { EditedDevice, PushSubscriptionManagerState } from "../PushSubscriptionManager";
import { I18nPush } from "./I18nPush";
import styles from './PushSubscriptionModal.module.css';
import { BsBreakpoint } from "../../pr-lib-utils/client/hooks/useBsBreakpoint";

/**
 * Does not register any service worker, but depends that a service worker that can handle push events is registered for route `'/'`.
 * On mount, an effect is started that checks if `localStorage` contains an entry with a stringified object of `PushSubscriptionInLocalStorage` for the key `'pushSubscription'`.
 * If it does, it checks the permission state for push subscriptions. 
 * If it is `denied`, the modal becomes visible and shows an error, and the subscription in `localStorage` is set to null, and it is also sent with null using `sendPushSubscription()`.
 * Otherwise, it renews the push subscription in the pushManager, updates the entry in `localStorage` and sends a new valid push subscription with the given `sendPushSubscription()`.
 */
export default function PushSubscriptionModal({ props }: { props: PushSubscriptionModalProps | null }) {

    if (props == null) {
        return <Spinner />
    }

    const { /* show, */ state, onHide, messages, onMsgHide/* , showDeviceList, devices */,
        l/* , spinning, editorHeader */, userAgent, onEditedDeviceOk, onCancel, onDevicesDelete/* , hint, dbg */ } = props;
    const showStates: typeof state.type[] = [
        'editing-before-creation',
        'loading-device-list',
        'device-list',
        // TODO ...
    ]
    const show = showStates.includes(state.type);
    const spinning = false; // TODO Probably, remove and the depending global spinner
    const hint = ''; // TODO

    return <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton><Modal.Title>{l.push.header}</Modal.Title><span className='ps-3' style={{ fontSize: 'x-small' }}>{state.type}</span></Modal.Header>
        <Modal.Body>
            {
                messages.map((msg, i) => <MsgAlert key={i} msg={msg} onHide={() => onMsgHide(i)} />)
            }
            {/* <ErrorAlert error={error} />
            <Alert variant='warning' show={!!warning}>{warning}</Alert> */}
            {
                spinning && <Spinner />
            }
            <Alert variant='info' show={!!hint}>{hint}</Alert>
            <DevicesCard l={l} bsBreakpoint={props.bsBreakpoint} userAgent={userAgent} header={l.push.hDevices} state={state} onDevicesDelete={onDevicesDelete} />
            {state.type === 'editing-before-creation' && <DeviceEditor l={l.push} state={state} defaultDevice={state.editedDevice} userAgent={userAgent} onOk={onEditedDeviceOk} onCancel={onCancel} />}
        </Modal.Body>

        {/* <Modal show={true}>
            <Modal.Header><Modal.Title>Really delete?</Modal.Title></Modal.Header>
            <Modal.Body>
                bla bla TODO
            </Modal.Body>
        </Modal> */}

    </Modal>
}

const idPrefix = createClientObjectId();
function deviceEditorId(suffix: string) {
    return idPrefix + '-' + suffix;
}
const deviceEditorChainIds = [
    'device',
    'browser',
].map(deviceEditorId);

function DeviceEditor({ l, state, defaultDevice, userAgent, onOk, onCancel }: {
    l: I18nPush;
    state: PushSubscriptionManagerState;
    defaultDevice: EditedDevice;
    userAgent: string | null;
    onOk: (device: string, browser: string) => void; onCancel: () => void;
}) {
    const [device, setDevice] = useState(defaultDevice.device)
    const [browser, setBrowser] = useState(defaultDevice.browser)
    useEnterFocusChain(true, deviceEditorChainIds, () => onOk(device, browser), () => { }, true);
    const id = deviceEditorId;
    const header = state.type === 'editing-before-creation' ? l.hThisDevice : l.hEditDevice

    return <Card className='mb-3'>
        <Card.Header>
            <Card.Title>{header}</Card.Title>
        </Card.Header>
        <Card.Body>
            <MyFormGroup
                controlId={id('device')} type='text' setDirty={() => { }}
                disabled={false}
                autoComplete="off" label={l.device} value={device} setValue={s => {
                    setDevice(s);
                }}
            />
            <MyFormGroup
                controlId={id('browser')} type='text' setDirty={() => { }}
                disabled={false}
                autoComplete="off" label={l.browser} value={browser} setValue={s => {
                    setBrowser(s);
                }}
            />
            <ActionCancelRow
                userAgent={userAgent}
                action={l.ok}
                actionVariant='primary'
                cancel={l.cancel}
                success=''
                error=''
                spinning={false}
                onAction={() => onOk(device, browser)}
                onCancel={onCancel}
            />
        </Card.Body>
    </Card>
}

type DeviceListItem = PrListItem & {
    device: TPushedDeviceWithClientId;
}

function DevicesCard({
    l,
    userAgent,
    header,
    // devices,
    state,
    onDevicesDelete,
    bsBreakpoint,
}: {
    l: I18nClientUtils & { push: I18nPush; };
    userAgent: string | null;
    header: string;
    // devices: TPushedDeviceWithClientId[];
    state: PushSubscriptionManagerState;
    onDevicesDelete(deviceIds: string[]): void;
    bsBreakpoint: BsBreakpoint;

}) {
    const [confirmingDelete, setConfirmingDelete] = useState<string[]>([]);

    const show = state.type === 'device-list' || state.type === 'loading-device-list';
    const prListRef = useRef<PrList2Ref>(null);

    const actions: PrListAction[] = [
        {
            id: 'delete',
            nodeSmall: <Button><i className='bi-trash'></i></Button>,
            nodeSingle: <NodeSingle icon='bi-trash' text={l.delete} />,
            nodeMulti: <NodeMulti icon='bi-trash' text={l.delete} />,
        }
    ];

    // const devices = state.type !== 'device-list' ? null : state.devices;


    const onAction = useCallback((actionId: string, itemKeys: string[]) => {

        switch (actionId) {
            case 'delete':
                // TODO NO, move this to the hook usePushSubscription!!!
                // doRequest<TPushNotificationsDeviceDeleteReq, TPushNotificationsDeviceDeleteRes>(
                //     l,
                //     '/api/pushNotifications/device/delete',
                //     {
                //         ids: itemKeys
                //     },
                //     PushNotificationsDeviceDeleteRes,
                //     version,
                // ).then(json => {
                //     switch (json.type) {
                //         case 'success':
                //             // TODO
                //             break;
                //         case 'noSession':
                //             on
                //     }
                // })

                setConfirmingDelete(itemKeys);

                // const delItems = devices?.filter(dev => itemKeys.includes(dev.id));
                // alert('NYI: delete ' + delItems?.map(item => item.device + ' / ' + item.browser).join(', '));

                break;
        }
    }, [])

    const deleteConfirmed = useCallback((itemKeys: string[]) => {
        onDevicesDelete(itemKeys);
    }, [onDevicesDelete])

    const ownDeviceId = state.type === 'device-list' ? state.ownDeviceId : '';
    const devices = state.type === 'device-list' ? state.devices : null;

    const items: DeviceListItem[] = useMemo(() => devices == null ? [] : devices.map(device => ({
        id: device.id,
        node: <div>{device.device} / {device.browser} {ownDeviceId === device.id && <small className='text-success'><i>{l.push.ownDevice}</i></small>}</div>,
        device: device,
    })), [l.push.ownDevice, ownDeviceId, devices]);

    useLayoutEffect(() => {
        prListRef.current?.updateItems(items);
    }, [items])

    return !show ? <></> : <>
        <Card className='mb-3'>
            <Card.Header>
                <Card.Title>
                    {header}
                </Card.Title>
            </Card.Header>
            <Card.Body>
                <PrList2 l={l} bsBreakpoint={bsBreakpoint} actions={actions} maxFirstActions={2} onAction={onAction} maxHeight="70vh" ref={prListRef} />
                {/* <ListGroup>
                {
                    state.type === 'device-list' ?
                        state.devices.map(device => <DeviceItem key={device.id} device={device} />) :
                        <Spinner />
                }
            </ListGroup> */}
                {/* {devices.map(device => <DeviceCard key={device.id} device={device} />)} */}
            </Card.Body>
        </Card>
        <Modal show={confirmingDelete.length > 0}>
            <Modal.Body>
                <p>{l.push.confirmDevicesDelete(confirmingDelete.length)}</p>
                <ActionCancelRow
                    userAgent={userAgent}
                    action={l.push.ok}
                    cancel={l.push.cancel}
                    error=""
                    onAction={() => {
                        deleteConfirmed(confirmingDelete);
                        setConfirmingDelete([]);
                    }}
                    onCancel={() => {
                        setConfirmingDelete([]);
                    }}
                    spinning={false}
                    success=""
                />
            </Modal.Body>
        </Modal>
    </>

}

// function DeviceCard({
//     device
// }: {
//     device: TPushedDeviceWithClientId;
// }) {
//     return <Card>
//         <Card.Body>
//             {device.id} - {device.device} - {device.browser}
//         </Card.Body>
//     </Card>
// }

// function DeviceItem({
//     device
// }: {
//     device: TPushedDeviceWithClientId;
// }) {
//     const confirmDelete = true;

//     return <ListGroup.Item className='d-flex align-items-center'>
//         {
//             confirmDelete ? <><div>Really delete?</div><Button variant='danger'>Yes</Button> <Button variant='secondary'>No</Button></> :
//                 <>
//                     <div className='me-2'>{device.id} - {device.device} - {device.browser}</div>
//                     <Button className='ms-auto' variant='danger'><i className='bi-trash'></i></Button>
//                 </>
//         }
//     </ListGroup.Item>
// }

function MsgAlert({ msg, onHide }: { msg: PushSubscriptionMsg; onHide(): void; }) {
    return <Alert
        variant={msg.type === 'error' ? 'danger' :
            msg.type === 'warning' ? 'warning' : 'info'
        }
        dismissible
        closeVariant="white"
        onClose={(show) => {
            if (!show) {
                onHide();
            }
        }}
    >
        {/* <Alert.Heading></Alert.Heading> */}
        {msg.s}
    </Alert>
}


function NodeSingle({
    icon, text
}: {
    icon: string;
    text: string;
}) {
    return (
        <div className={styles.nodeSingle}>
            <Button variant='outline-secondary'><i className={icon}></i></Button>
            <div>{text}</div>
        </div>
    )
}


function NodeMulti({
    icon, text
}: {
    icon: string;
    text: string;
}) {
    return (
        <div className={styles.nodeMulti}>
            <Button variant='outline-secondary'><i className={icon}></i></Button>
            <div>{text}</div>
        </div>
    )
}