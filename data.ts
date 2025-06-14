import * as rt from 'runtypes';
import { WithClientId } from '../pr-lib-utils/both';


export const PushedDeviceCommon = rt.Object({
    device: rt.String,
    browser: rt.String,
    subscriptionJson: rt.String.or(rt.Null),
}).exact()
export type TPushedDeviceCommon = rt.Static<typeof PushedDeviceCommon>

export const PushedDeviceWithClientId = WithClientId(PushedDeviceCommon).exact();
export type TPushedDeviceWithClientId = rt.Static<typeof PushedDeviceWithClientId>
