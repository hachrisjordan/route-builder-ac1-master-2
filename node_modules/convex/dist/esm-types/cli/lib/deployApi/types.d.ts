import { z } from "zod";
export declare const reference: z.ZodString;
export type Reference = z.infer<typeof reference>;
export declare const authInfo: z.ZodObject<{
    applicationID: z.ZodString;
    domain: z.ZodString;
}, "passthrough", z.ZodTypeAny, {
    applicationID: string;
    domain: string;
}, {
    applicationID: string;
    domain: string;
}>;
export type AuthInfo = z.infer<typeof authInfo>;
export declare const identifier: z.ZodString;
export type Identifier = z.infer<typeof identifier>;
//# sourceMappingURL=types.d.ts.map