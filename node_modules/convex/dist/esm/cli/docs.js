"use strict";
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import open from "open";
import { logMessage, oneoffContext } from "../bundler/context.js";
import { getTargetDeploymentName } from "./lib/deployment.js";
import { bigBrainFetch, deprecationCheckWarning } from "./lib/utils/utils.js";
export const docs = new Command("docs").description("Open the docs in the browser").allowExcessArguments(false).option("--no-open", "Print docs URL instead of opening it in your browser").action(async (options) => {
  const ctx = oneoffContext();
  const configuredDeployment = getTargetDeploymentName();
  const getCookieUrl = `get_cookie/${configuredDeployment}`;
  const fetch = await bigBrainFetch(ctx);
  try {
    const res = await fetch(getCookieUrl);
    deprecationCheckWarning(ctx, res);
    const { cookie } = await res.json();
    await openDocs(ctx, options.open, cookie);
  } catch {
    await openDocs(ctx, options.open);
  }
});
async function openDocs(ctx, toOpen, cookie) {
  let docsUrl = "https://docs.convex.dev";
  if (cookie !== void 0) {
    docsUrl += "/?t=" + cookie;
  }
  if (toOpen) {
    await open(docsUrl);
    logMessage(ctx, chalk.green("Docs have launched! Check your browser."));
  } else {
    logMessage(ctx, chalk.green(`Find Convex docs here: ${docsUrl}`));
  }
}
//# sourceMappingURL=docs.js.map
