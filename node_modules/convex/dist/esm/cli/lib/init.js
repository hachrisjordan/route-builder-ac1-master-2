"use strict";
import chalk from "chalk";
import { logFinishedStep, logMessage } from "../../bundler/context.js";
import { writeConvexUrlToEnvFile } from "./envvars.js";
export async function finalizeConfiguration(ctx, options) {
  const envVarWrite = await writeConvexUrlToEnvFile(ctx, options.url);
  if (envVarWrite !== null) {
    logFinishedStep(
      ctx,
      `Provisioned a ${options.deploymentType} deployment and saved its:
    name as CONVEX_DEPLOYMENT to .env.local
    URL as ${envVarWrite.envVar} to ${envVarWrite.envFile}`
    );
  } else if (options.changedDeploymentEnvVar) {
    logFinishedStep(
      ctx,
      `Provisioned ${options.deploymentType} deployment and saved its name as CONVEX_DEPLOYMENT to .env.local`
    );
  }
  if (options.wroteToGitIgnore) {
    logMessage(ctx, chalk.gray(`  Added ".env.local" to .gitignore`));
  }
  const anyChanges = options.wroteToGitIgnore || options.changedDeploymentEnvVar || envVarWrite !== null;
  if (anyChanges) {
    logMessage(
      ctx,
      `
Write your Convex functions in ${chalk.bold(options.functionsPath)}
Give us feedback at https://convex.dev/community or support@convex.dev
`
    );
  }
}
//# sourceMappingURL=init.js.map
