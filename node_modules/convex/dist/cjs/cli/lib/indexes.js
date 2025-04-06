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
var indexes_exports = {};
__export(indexes_exports, {
  pushSchema: () => pushSchema
});
module.exports = __toCommonJS(indexes_exports);
var import_chalk = __toESM(require("chalk"), 1);
var import_path = __toESM(require("path"), 1);
var import_bundler = require("../../bundler/index.js");
var import_context = require("../../bundler/context.js");
var import_utils = require("./utils/utils.js");
async function pushSchema(ctx, origin, adminKey, schemaDir, dryRun) {
  if (!ctx.fs.exists(import_path.default.resolve(schemaDir, "schema.ts")) && !ctx.fs.exists(import_path.default.resolve(schemaDir, "schema.js"))) {
    return {};
  }
  const bundles = await (0, import_bundler.bundleSchema)(ctx, schemaDir, []);
  (0, import_context.changeSpinner)(ctx, "Checking for index or schema changes...");
  let data;
  const fetch = (0, import_utils.deploymentFetch)(ctx, {
    deploymentUrl: origin,
    adminKey
  });
  try {
    const res = await fetch("/api/prepare_schema", {
      method: "POST",
      body: JSON.stringify({
        bundle: bundles[0],
        adminKey,
        dryRun
      })
    });
    (0, import_utils.deprecationCheckWarning)(ctx, res);
    data = await res.json();
  } catch (err) {
    (0, import_context.logFailure)(ctx, `Error: Unable to run schema validation on ${origin}`);
    return await (0, import_utils.logAndHandleFetchError)(ctx, err);
  }
  const schemaId = data.schemaId;
  const schemaState = await waitForReadySchema(ctx, origin, adminKey, schemaId);
  logIndexChanges(ctx, data, dryRun);
  return { schemaId, schemaState };
}
async function waitForReadySchema(ctx, origin, adminKey, schemaId) {
  const path2 = `api/schema_state/${schemaId}`;
  const depFetch = (0, import_utils.deploymentFetch)(ctx, {
    deploymentUrl: origin,
    adminKey
  });
  const fetch = async () => {
    try {
      const resp = await depFetch(path2, { method: "GET" });
      const data2 = await resp.json();
      return data2;
    } catch (err) {
      (0, import_context.logFailure)(
        ctx,
        `Error: Unable to build indexes and run schema validation on ${origin}`
      );
      return await (0, import_utils.logAndHandleFetchError)(ctx, err);
    }
  };
  setSchemaProgressSpinner(ctx, null);
  const data = await (0, import_utils.poll)(fetch, (data2) => {
    setSchemaProgressSpinner(ctx, data2);
    return data2.indexes.every((index) => index.backfill.state === "done") && data2.schemaState.state !== "pending";
  });
  switch (data.schemaState.state) {
    case "failed":
      (0, import_context.logFailure)(ctx, "Schema validation failed");
      (0, import_context.logError)(ctx, import_chalk.default.red(`${data.schemaState.error}`));
      return await ctx.crash({
        exitCode: 1,
        errorType: {
          "invalid filesystem or db data": data.schemaState.tableName ? {
            tableName: data.schemaState.tableName
          } : null
        },
        printedMessage: null
        // TODO - move logging into here
      });
    case "overwritten":
      return await ctx.crash({
        exitCode: 1,
        errorType: "fatal",
        printedMessage: `Schema was overwritten by another push.`
      });
    case "validated":
      (0, import_context.logFinishedStep)(ctx, "Schema validation complete.");
      break;
    case "active":
      break;
  }
  return data.schemaState;
}
function setSchemaProgressSpinner(ctx, data) {
  if (!data) {
    (0, import_context.changeSpinner)(
      ctx,
      "Backfilling indexes and checking that documents match your schema..."
    );
    return;
  }
  const indexesCompleted = data.indexes.filter(
    (index) => index.backfill.state === "done"
  ).length;
  const numIndexes = data.indexes.length;
  const indexesDone = indexesCompleted === numIndexes;
  const schemaDone = data.schemaState.state !== "pending";
  if (indexesDone && schemaDone) {
    return;
  }
  let msg;
  if (!indexesDone && !schemaDone) {
    msg = `Backfilling indexes (${indexesCompleted}/${numIndexes} ready) and checking that documents match your schema...`;
  } else if (!indexesDone) {
    msg = `Backfilling indexes (${indexesCompleted}/${numIndexes} ready)...`;
  } else {
    msg = "Checking that documents match your schema...";
  }
  (0, import_context.changeSpinner)(ctx, msg);
}
function logIndexChanges(ctx, indexes, dryRun) {
  if (indexes.dropped.length > 0) {
    let indexDiff = "";
    for (const index of indexes.dropped) {
      indexDiff += `  [-] ${stringifyIndex(index)}
`;
    }
    indexDiff = indexDiff.slice(0, -1);
    (0, import_context.logFinishedStep)(
      ctx,
      `${dryRun ? "Would delete" : "Deleted"} table indexes:
${indexDiff}`
    );
  }
  if (indexes.added.length > 0) {
    let indexDiff = "";
    for (const index of indexes.added) {
      indexDiff += `  [+] ${stringifyIndex(index)}
`;
    }
    indexDiff = indexDiff.slice(0, -1);
    (0, import_context.logFinishedStep)(
      ctx,
      `${dryRun ? "Would add" : "Added"} table indexes:
${indexDiff}`
    );
  }
}
function stringifyIndex(index) {
  return `${index.table}.${index.name} ${JSON.stringify(index.fields)}`;
}
//# sourceMappingURL=indexes.js.map
