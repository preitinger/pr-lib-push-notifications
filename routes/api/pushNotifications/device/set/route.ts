import { PushNotificationsDeviceSetReq, TPushNotificationsDeviceSetRes } from "@/app/_lib/both/requests";
import { PushedDeviceDoc, pushNotificationsDb } from "@/app/_lib/submodules/pr-lib-push-notifications/server";
import { TVersion } from "@/app/_lib/submodules/pr-lib-sw-utils/sw-utils";
import { checkSessionAndRequest } from "@/app/_lib/submodules/pr-lib-user/server";
import assert from "assert";
import { Db, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

function myRes(res: TPushNotificationsDeviceSetRes) {
    return NextResponse.json(res);
}

export const pushNotificationsDeviceSet_POST = async (version: TVersion, dbProm: Promise<Db>, request: NextRequest) => {
    const check = await checkSessionAndRequest(dbProm, PushNotificationsDeviceSetReq, request, version);
    if (check.type === 'error') return check.response;
    const { json, user } = check;
    const db = await pushNotificationsDb();

    const col = db.collection<PushedDeviceDoc>('pushedDevices');
    const newId = ObjectId.createFromHexString(json.device.id);
    const updateRes = await col.updateOne({
        _id: newId,
        user: user.id,
    }, {
        $set: {
            common: {
                device: json.device.device,
                browser: json.device.browser,
                subscriptionJson: json.device.subscriptionJson,
            },
        },
        $setOnInsert: {
            _id: newId,
            user: user.id,
        }
    }, {
        upsert: true,
    })

    assert(updateRes.acknowledged);
    if (updateRes.upsertedCount > 0) {
        assert(updateRes.upsertedCount === 1);
        assert(updateRes.upsertedId?.equals(newId));
    }
    return myRes({
        type: 'success',
        upserted: updateRes.upsertedCount > 0,
    })
}
