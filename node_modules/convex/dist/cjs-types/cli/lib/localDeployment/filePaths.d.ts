import { Context } from "../../../bundler/context.js";
export declare function rootDeploymentStateDir(): string;
export declare function deploymentStateDir(deploymentName: string): string;
export type LocalDeploymentConfig = {
    ports: {
        cloud: number;
        site: number;
    };
    backendVersion: string;
    adminKey: string;
};
export declare function loadDeploymentConfig(ctx: Context, deploymentName: string): LocalDeploymentConfig | null;
export declare function saveDeploymentConfig(ctx: Context, deploymentName: string, config: LocalDeploymentConfig): void;
export declare function binariesDir(): string;
export declare function binaryZip(): string;
export declare function versionedBinaryDir(version: string): string;
export declare function executablePath(version: string): string;
//# sourceMappingURL=filePaths.d.ts.map