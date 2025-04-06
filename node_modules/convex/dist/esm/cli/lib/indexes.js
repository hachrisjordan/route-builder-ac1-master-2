"use strict";
import chalk from "chalk";
import path from "path";
import { bundleSchema } from "../../bundler/index.js";
import {
  changeSpinner,
  logFailure,
  logFinishedStep,
  logError
} from "../../bundler/context.js";
import {
  poll,
  logAndHandleFetchError,
  deploymentFetch,
  deprecationCheckWarning
} from "./utils/utils.js";
export async function pushSchema(ctx, origin, adminKey, schemaDir, dryRun) {
  if (!ctx.fs.exists(path.resolve(schemaDir, "schema.ts")) && !ctx.fs.exists(path.resolve(schemaDir, "schema.js"))) {
    return {};
  }
  const bundles = await bundleSchema(ctx, schemaDir, []);
  changeSpinner(ctx, "Checking for index or schema changes...");
  let data;
  const fetch = deploymentFetch(ctx, {
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
    deprecationCheckWarning(ctx, res);
    data = await res.json();
  } catch (err) {
    logFailure(ctx, `Error: Unable to run schema validation on ${origin}`);
    return await logAndHandleFetchError(ctx, err);
  }
  const schemaId = data.schemaId;
  const schemaState = await waitForReadySchema(ctx, origin, adminKey, schemaId);
  logIndexChanges(ctx, data, dryRun);
  return { schemaId, schemaState };
}
async function waitForReadySchema(ctx, origin, adminKey, schemaId) {
  const path2 = `api/schema_state/${schemaId}`;
  const depFetch = deploymentFetch(ctx, {
    deploymentUrl: origin,
    adminKey
  });
  const fetch = async () => {
    try {
      const resp = await depFetch(path2, { method: "GET" });
      const data2 = await resp.json();
      return data2;
    } catch (err) {
      logFailure(
        ctx,
        `Error: Unable to build indexes and run schema validation on ${origin}`
      );
      return await logAndHandleFetchError(ctx, err);
    }
  };
  setSchemaProgressSpinner(ctx, null);
  const data = await poll(fetch, (data2) => {
    setSchemaProgressSpinner(ctx, data2);
    return data2.indexes.every((index) => index.backfill.state === "done") && data2.schemaState.state !== "pending";
  });
  switch (data.schemaState.state) {
    case "failed":
      logFailure(ctx, "Schema validation failed");
      logError(ctx, chalk.red(`${data.schemaState.error}`));
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
      logFinishedStep(ctx, "Schema validation complete.");
      break;
    case "active":
      break;
  }
  return data.schemaState;
}
function setSchemaProgressSpinner(ctx, data) {
  if (!data) {
    changeSpinner(
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
  changeSpinner(ctx, msg);
}
function logIndexChanges(ctx, indexes, dryRun) {
  if (indexes.dropped.length > 0) {
    let indexDiff = "";
    for (const index of indexes.dropped) {
      indexDiff += `  [-] ${stringifyIndex(index)}
`;
    }
    indexDiff = indexDiff.slice(0, -1);
    logFinishedStep(
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
    logFinishedStep(
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
