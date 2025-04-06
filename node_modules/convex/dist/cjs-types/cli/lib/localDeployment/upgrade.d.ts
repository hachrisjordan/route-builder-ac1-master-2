import { Context } from "../../../bundler/context.js";
export declare function handlePotentialUpgrade(ctx: Context, args: {
    deploymentName: string;
    oldVersion: string | null;
    newBinaryPath: string;
    newVersion: string;
    ports: {
        cloud: number;
        site: number;
    };
    adminKey: string;
    forceUpgrade: boolean;
}): Promise<{
    cleanupHandle: string;
}>;
//# sourceMappingURL=upgrade.d.ts.map