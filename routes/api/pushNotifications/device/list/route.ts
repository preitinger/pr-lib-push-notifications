import { PushNotificationsDeviceListReq, TPushNotificationsDeviceListRes } from "@/app/_lib/both/requests";
import { PushedDeviceDoc, pushNotificationsDb } from "@/app/_lib/submodules/pr-lib-push-notifications/server";
import { TVersion } from "@/app/_lib/submodules/pr-lib-sw-utils/sw-utils";
import { checkSessionAndRequest } from "@/app/_lib/submodules/pr-lib-user/server";
import { productionOrDebugConsole } from "@/app/_lib/submodules/pr-lib-utils/both";
import { Db } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

console.info('global.console will be set to productionOrDebugConsole.');
global.console = productionOrDebugConsole;


function myRes(res: TPushNotificationsDeviceListRes) {
    return NextResponse.json(res);
}

export const pushNotificationsDeviceList_POST = async function (version: TVersion, dbProm: Promise<Db>, request: NextRequest) {
    const check = await checkSessionAndRequest(dbProm, PushNotificationsDeviceListReq, request, version);
    console.log('check in pushNotificationsDeviceList', check);
    if (check.type === 'error') return check.response;
    const { user } = check;

    const pushDbProm = pushNotificationsDb();
    const db = await pushDbProm;
    const col = db.collection<PushedDeviceDoc>('pushedDevices');
    const devices = (await col.find({
        user: user.id,
    }).toArray()).map(d => ({
        id: d._id.toHexString(),
        ...d.common,
    }));
    console.log('devices', devices);

    return myRes({
        type: 'success',
        devices
    })
}
