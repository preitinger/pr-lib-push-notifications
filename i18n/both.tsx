import * as rt from 'runtypes';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface I18nBoth {
}

export const CLangCode = rt.Object({
    langCode: rt.String
})
export type LangCode = rt.Static<typeof CLangCode>;

