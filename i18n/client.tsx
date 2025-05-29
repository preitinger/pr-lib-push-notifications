import { I18nPush } from "../components/I18nPush";
import { I18nBoth, LangCode } from "./both";

export interface I18nClient {
    push: I18nPush;
}

export type I18nClientArg = LangCode & I18nBoth & I18nClient;
