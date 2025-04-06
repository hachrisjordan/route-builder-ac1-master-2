import { Command } from "@commander-js/extra-typings";
export declare const deploy: Command<[], {
    verbose?: boolean | undefined;
    dryRun?: boolean | undefined;
    yes?: boolean | undefined;
    typecheck: "enable" | "try" | "disable";
    typecheckComponents: boolean;
    codegen: "enable" | "disable";
    cmd?: string | undefined;
    cmdUrlEnvVarName?: string | undefined;
    debugBundlePath?: string | undefined;
    debug?: boolean | undefined;
    writePushRequest?: string | undefined;
    liveComponentSources?: boolean | undefined;
    previewRun?: string | undefined;
    previewCreate?: string | undefined;
    checkBuildEnvironment: "enable" | "disable";
    adminKey?: string | undefined;
    url?: string | undefined;
    previewName?: string | undefined;
    envFile?: string | undefined;
    partitionId?: string | undefined;
}>;
//# sourceMappingURL=deploy.d.ts.map