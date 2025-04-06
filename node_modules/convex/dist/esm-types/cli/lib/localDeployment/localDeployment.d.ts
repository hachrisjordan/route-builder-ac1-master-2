import { Context } from "../../../bundler/context.js";
import { OnDeploymentActivityFunc } from "../deployment.js";
export type DeploymentDetails = {
    deploymentName: string;
    deploymentUrl: string;
    adminKey: string;
    onActivity: OnDeploymentActivityFunc;
};
export declare function handleLocalDeployment(ctx: Context, options: {
    teamSlug: string;
    projectSlug: string;
    ports?: {
        cloud: number;
        site: number;
    };
    backendVersion?: string;
    forceUpgrade: boolean;
}): Promise<DeploymentDetails>;
//# sourceMappingURL=localDeployment.d.ts.map