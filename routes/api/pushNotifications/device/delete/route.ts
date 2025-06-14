import { PushNotificationsDeviceDeleteReq, TPushNotificationsDeviceDeleteRes } from "@/app/_lib/both/requests";
import { PushedDeviceDoc, pushNotificationsDb } from "@/app/_lib/submodules/pr-lib-push-notifications/server";
import { TVersion } from "@/app/_lib/submodules/pr-lib-sw-utils/sw-utils";
import { checkSessionAndRequest } from "@/app/_lib/submodules/pr-lib-user/server";
import assert from "assert";
import { Db, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

function myRes(res: TPushNotificationsDeviceDeleteRes) {
    return NextResponse.json(res);
}

export const pushNotificationsDeviceDelete_POST = async (version: TVersion, dbProm: Promise<Db>, request: NextRequest) => {
    const check = await checkSessionAndRequest(dbProm, PushNotificationsDeviceDeleteReq, request, version);
    if (check.type === 'error') return check.response;
    const { json, user } = check;
    const db = await pushNotificationsDb();

    const col = db.collection<PushedDeviceDoc>('pushedDevices');

    const delRes = await col.deleteMany({
        user: user.id,
        _id: {
            $in: json.ids.map(s => ObjectId.createFromHexString(s))
        }
    })
    assert(delRes.acknowledged);
    
    return myRes({
        type: 'success'
    })
}
