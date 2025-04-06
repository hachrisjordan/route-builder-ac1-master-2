import { Context } from "../../bundler/context.js";
import { DeploymentType } from "./api.js";
export declare function finalizeConfiguration(ctx: Context, options: {
    functionsPath: string;
    deploymentType: DeploymentType;
    url: string;
    wroteToGitIgnore: boolean;
    changedDeploymentEnvVar: boolean;
}): Promise<void>;
//# sourceMappingURL=init.d.ts.map