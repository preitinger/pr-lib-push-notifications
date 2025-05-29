import { I18nBoth, LangCode } from "./both";
import { deBoth } from "./de/both";
import { deServer } from "./de/server";
import { enBoth } from "./en/both";
import { enServer } from "./en/server";

export type I18nServer = object


export type I18nServerArg = LangCode & I18nBoth & I18nServer;


export function i18nServerArg(lang: string): I18nServerArg {
    switch (lang) {
        case 'de':
            return {
                langCode: 'de',
                ...deBoth,
                ...deServer
            }
        default:
            return {
                langCode: 'en',
                ...enBoth,
                ...enServer
            }
    }
}
