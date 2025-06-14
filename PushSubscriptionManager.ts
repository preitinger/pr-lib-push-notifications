import { PushNotificationsDeviceListRes, PushNotificationsDeviceSetRes, TPushNotificationsDeviceListReq, TPushNotificationsDeviceListRes, TPushNotificationsDeviceSetReq, TPushNotificationsDeviceSetRes } from "../../both/requests";
import { TVersion } from "../pr-lib-sw-utils/sw-utils";
import { createClientObjectId, doRequest, I18nRequiredForDoRequest } from "../pr-lib-utils/client";
import { fromLocal, toLocal } from "../pr-lib-utils/client/storage";
import { I18nPush } from "./components/I18nPush";
import { PushedDeviceWithClientId, TPushedDeviceWithClientId } from "./data";

type SimpleState = 'waiting' |
    'idle' |
    'error' |
    'getting-sw' |
    'checking-permission' |
    'deleting-subscription' |
    'subscribing' |
    'sending-subscription' |
    'loading-device-list' |
    'no-session' |
    'other-session';


export type EditedDevice = {
    device: string;
    browser: string;
};

export type PushSubscriptionManagerState = {
    type: SimpleState;
} | {
    type: 'editing-before-creation';
    editedDevice: EditedDevice;
} | {
    type: 'device-list';
    devices: TPushedDeviceWithClientId[];
    /**
     * empty if no push subscription for this device registered.
     */
    ownDeviceId: string;
}

export type PushSubscriptionManagerEvent = {
    type: 'stateChanged';
    state: PushSubscriptionManagerState;
} | {
    type: 'noSession';
} | {
    type: 'otherSession';
} | {
    type: 'error';
    error: string;
} | {
    type: 'warn';
    warn: string;
};


export type PushSubscriptionManagerListener = (e: PushSubscriptionManagerEvent) => void;

export default class PushSubscriptionManager {
    constructor(l: { push: I18nPush } & I18nRequiredForDoRequest,
        version: TVersion,
        clientURL: string | URL,
        storageKey: string,
        vapidKeyPublic: string,
    ) {
        this.l = l;
        this.version = version;
        this.clientURL = clientURL;
        this.storageKey = storageKey;
        this.options = {
            userVisibleOnly: true,
            applicationServerKey: vapidKeyPublic,
        }
    }

    onDeviceOk(device: string, browser: string) {
        switch (this.state.type) {
            case 'editing-before-creation':
                this.continuePushSubscription(device, browser);
                break;
            default:
                console.warn('nyi');
                break;

        }
    }

    private async continuePushSubscription(device: string, browser: string) {
        this.setSimpleState('getting-sw');
        const reg = await navigator.serviceWorker.getRegistration(this.clientURL)
        if (reg == null) {
            this.setSimpleState('error');
            this.fire({
                type: 'error',
                error: this.l.push.eNoServiceWorker,
            })
            return;
        }
        this.setSimpleState('checking-permission');
        const permissionState = await reg.pushManager.permissionState(this.options);
        const localSub = fromLocal(PushedDeviceWithClientId, this.storageKey);
        const id = localSub?.value.id ?? createClientObjectId();

        switch (permissionState) {
            case 'denied': {
                // will set state:
                await this.deleteSubscription(device, browser, id);
                break;
            }
            case 'granted':
            // no break
            case 'prompt': {
                try {
                    this.setSimpleState('subscribing');
                    const sub = await reg.pushManager.subscribe(this.options)
                    const subJson = JSON.stringify(sub.toJSON());
                    const newSub = {
                        id,
                        device,
                        browser,
                        subscriptionJson: subJson
                    };
                    toLocal(this.storageKey, Date.now(), newSub);
                    this.setSimpleState('sending-subscription');
                    const sendRes = await this.sendPushSubscription(newSub);
                    switch (sendRes.type) {
                        case 'success':
                            this.setSimpleState('idle');
                            break;
                        case 'noSession':
                            this.fire({ type: 'noSession' });
                            this.setSimpleState('idle');
                            break;
                        case 'otherSession':
                            this.fire({ type: 'otherSession' });
                            this.setSimpleState('idle');
                            break;
                        case 'error':
                            this.fire({
                                type: 'error',
                                error: sendRes.error
                            });
                            this.setSimpleState('idle');
                            break;
                    }
                } catch (reason) {
                    await this.deleteSubscription(device, browser, id);
                    console.error('abgefangen in subscribe', reason);
                }
                break;
            }
        }

    }

    private async deleteSubscription(device: string, browser: string, id: string) {
        toLocal(this.storageKey, Date.now(), {
            device,
            browser,
            subscriptionJson: null,

        });
        this.fire({
            type: 'warn',
            warn: this.l.push.wPermissionDenied,
        })
        this.setSimpleState('deleting-subscription');
        const sendRes = await this.sendPushSubscription({
            id,
            device,
            browser,
            subscriptionJson: null,
        });
        switch (sendRes.type) {
            case 'success':
                this.setSimpleState('idle');
                break;
            case 'noSession':
                this.fire({ type: 'noSession' });
                this.setSimpleState('idle');
                break;
            case 'otherSession':
                this.fire({ type: 'otherSession' });
                this.setSimpleState('idle');
                break;
            case 'error':
                this.fire({
                    type: 'error',
                    error: sendRes.error
                });
                this.setSimpleState('idle');
                break;
        }

    }

    onCancel() {
        switch (this.state.type) {
            case 'editing-before-creation':
                this.setSimpleState('idle');
                break;
            case 'device-list':
                this.setSimpleState('idle');
                break;
            default:
                console.warn('nyi onCancel in state', this.state);
                break;
        }
    }

    async checkPush() {
        console.log('checkPush in state', this.state);
        switch (this.state.type) {
            case 'waiting':
                const localSub = fromLocal(PushedDeviceWithClientId, this.storageKey);

                if (localSub != null) {
                    this.continuePushSubscription(localSub.value.device, localSub.value.browser);
                } else {
                    this.setSimpleState('idle');
                }
                break;
            default:
                console.warn('nyi checkPush in', this.state);
                break;
        }
    }

    async tryCreatePushSubscription(): Promise<void> {
        console.log('tryCreatePushSubscription in state', this.state);
        switch (this.state.type) {
            case 'idle':
                const localSub = fromLocal(PushedDeviceWithClientId, this.storageKey);

                const device = localSub?.value.device ?? '';
                const browser = localSub?.value.browser ?? '';
                this.setState({
                    type: 'editing-before-creation',
                    editedDevice: { device, browser }
                });
                break;
            default:
                console.warn('tryCreatePushSubscription nyi in state', this.state);
                break;
        }
    }

    openDeviceList() {
        const localSub = fromLocal(PushedDeviceWithClientId, this.storageKey);
        this.setSimpleState('loading-device-list');
        doRequest<TPushNotificationsDeviceListReq, TPushNotificationsDeviceListRes>(
            this.l,
            '/api/pushNotifications/device/list',
            {},
            PushNotificationsDeviceListRes,
            this.version
        ).then(json => {
            switch (json.type) {
                case 'success':
                    this.setState({
                        type: 'device-list',
                        devices: json.devices,
                        ownDeviceId: localSub?.value.id ?? '',
                    })
                    break;
                case 'noSession':
                    this.fire({
                        type: 'noSession'
                    });
                    this.setSimpleState('idle');
                    break;
                case 'otherSession':
                    this.fire({ type: 'otherSession' });
                    this.setSimpleState('idle');
                    break;
                case 'error':
                    this.fire({
                        type: 'error',
                        error: json.error
                    })
                    this.setSimpleState('error');
                    break;
            }
        })

    }

    openCategoryList() {
        console.warn('nyi');

    }

    addListener(l: PushSubscriptionManagerListener) {
        this.listeners.push(l);
        console.log('nach addListener #', this.listeners.length);
    }

    removeListener(l: PushSubscriptionManagerListener) {
        for (let i = 0; i < this.listeners.length; ++i) {
            if (this.listeners[i] === l) {
                this.listeners.splice(i, 1);
                break;
            }
        }
        console.log('nach removeListener #', this.listeners.length);
    }

    private sendPushSubscription(subscription: TPushedDeviceWithClientId) {
        return doRequest<TPushNotificationsDeviceSetReq, TPushNotificationsDeviceSetRes>(
            this.l,
            '/api/pushNotifications/device/set',
            {
                device: subscription
            },
            PushNotificationsDeviceSetRes,
            this.version,
        );
    }

    private setState(s: PushSubscriptionManagerState) {
        console.log('PushSubscriptionManager: new state', s);
        this.state = s;
        this.fire({
            type: 'stateChanged',
            state: this.state,
        })
    }

    private setSimpleState(s: SimpleState) {
        this.setState({
            type: s,
        });
    }

    private fire(e: PushSubscriptionManagerEvent) {
        for (const l of this.listeners) {
            l(e);
        }
    }

    private l;
    private version;
    private options;
    private clientURL;
    private storageKey;
    private listeners: PushSubscriptionManagerListener[] = [];
    private showDeviceList = false;
    // private userAgent: string | undefined = undefined;
    private state: PushSubscriptionManagerState = { type: 'waiting' };
}
