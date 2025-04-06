"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var init_exports = {};
__export(init_exports, {
  finalizeConfiguration: () => finalizeConfiguration
});
module.exports = __toCommonJS(init_exports);
var import_chalk = __toESM(require("chalk"), 1);
var import_context = require("../../bundler/context.js");
var import_envvars = require("./envvars.js");
async function finalizeConfiguration(ctx, options) {
  const envVarWrite = await (0, import_envvars.writeConvexUrlToEnvFile)(ctx, options.url);
  if (envVarWrite !== null) {
    (0, import_context.logFinishedStep)(
      ctx,
      `Provisioned a ${options.deploymentType} deployment and saved its:
    name as CONVEX_DEPLOYMENT to .env.local
    URL as ${envVarWrite.envVar} to ${envVarWrite.envFile}`
    );
  } else if (options.changedDeploymentEnvVar) {
    (0, import_context.logFinishedStep)(
      ctx,
      `Provisioned ${options.deploymentType} deployment and saved its name as CONVEX_DEPLOYMENT to .env.local`
    );
  }
  if (options.wroteToGitIgnore) {
    (0, import_context.logMessage)(ctx, import_chalk.default.gray(`  Added ".env.local" to .gitignore`));
  }
  const anyChanges = options.wroteToGitIgnore || options.changedDeploymentEnvVar || envVarWrite !== null;
  if (anyChanges) {
    (0, import_context.logMessage)(
      ctx,
      `
Write your Convex functions in ${import_chalk.default.bold(options.functionsPath)}
Give us feedback at https://convex.dev/community or support@convex.dev
`
    );
  }
}
//# sourceMappingURL=init.js.map
