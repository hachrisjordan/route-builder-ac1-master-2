"use strict";
import chalk from "chalk";
import {
  logFailure,
  logFinishedStep,
  logMessage,
  logOutput
} from "../../bundler/context.js";
import { runSystemQuery } from "./run.js";
import { deploymentFetch, logAndHandleFetchError } from "./utils/utils.js";
export async function envSetInDeployment(ctx, deployment, originalName, originalValue) {
  const [name, value] = await allowEqualsSyntax(
    ctx,
    originalName,
    originalValue
  );
  await callUpdateEnvironmentVariables(ctx, deployment, [{ name, value }]);
  const formatted = /\s/.test(value) ? `"${value}"` : value;
  logFinishedStep(
    ctx,
    `Successfully set ${chalk.bold(name)} to ${chalk.bold(formatted)}${deployment.deploymentNotice}`
  );
}
async function allowEqualsSyntax(ctx, name, value) {
  if (value === void 0) {
    if (/^[a-zA-Z][a-zA-Z0-9_]+=/.test(name)) {
      return name.split("=", 2);
    } else {
      return await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: "error: missing required argument 'value'"
      });
    }
  }
  return [name, value];
}
export async function envGetInDeployment(ctx, deployment, name) {
  const envVar = await runSystemQuery(ctx, {
    ...deployment,
    functionName: "_system/cli/queryEnvironmentVariables:get",
    componentPath: void 0,
    args: { name }
  });
  if (envVar === null) {
    logFailure(ctx, `Environment variable "${name}" not found.`);
    return;
  }
  logOutput(ctx, `${envVar.value}`);
}
export async function envRemoveInDeployment(ctx, deployment, name) {
  await callUpdateEnvironmentVariables(ctx, deployment, [{ name }]);
  logFinishedStep(
    ctx,
    `Successfully unset ${chalk.bold(name)}${deployment.deploymentNotice}`
  );
}
export async function envListInDeployment(ctx, deployment) {
  const envs = await runSystemQuery(ctx, {
    ...deployment,
    functionName: "_system/cli/queryEnvironmentVariables",
    componentPath: void 0,
    args: {}
  });
  if (envs.length === 0) {
    logMessage(ctx, "No environment variables set.");
    return;
  }
  for (const { name, value } of envs) {
    logOutput(ctx, `${name}=${value}`);
  }
}
async function callUpdateEnvironmentVariables(ctx, deployment, changes) {
  const fetch = deploymentFetch(ctx, deployment);
  try {
    await fetch("/api/update_environment_variables", {
      body: JSON.stringify({ changes }),
      method: "POST"
    });
  } catch (e) {
    return await logAndHandleFetchError(ctx, e);
  }
}
//# sourceMappingURL=env.js.map
