'use server'

import { estimateUserAgent } from "../pr-lib-utils/server";

export async function loadUserAgent(): Promise<string | undefined> {
    return await estimateUserAgent();
}

