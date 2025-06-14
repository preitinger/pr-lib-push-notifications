// Jeder User hat * PushedDevice.
// 
// export interface 

import { ObjectId } from "mongodb";
import { clientPromise } from "../pr-lib-utils/server";
import { TPushedDeviceCommon } from "./data";


export async function pushNotificationsDb() {
    return (await clientPromise).db('pr-lib-push-notifications');

}

export type NotificationCategoryDoc = {
    appId: ObjectId;
    name: string;
}

export type PushedDeviceDoc = {
    userId: ObjectId;
    common: TPushedDeviceCommon;
}
