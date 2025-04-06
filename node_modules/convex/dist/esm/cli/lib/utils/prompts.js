"use strict";
import inquirer from "inquirer";
import { logOutput } from "../../../bundler/context.js";
export const promptString = async (ctx, options) => {
  if (process.stdin.isTTY) {
    const result = (await inquirer.prompt([
      {
        type: "input",
        name: "result",
        message: options.message,
        default: options.default
      }
    ])).result;
    return result;
  } else {
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: "Cannot prompt for input in non-interactive terminals."
    });
  }
};
export const promptOptions = async (ctx, options) => {
  if (process.stdin.isTTY) {
    const result = (await inquirer.prompt([
      {
        // In the Convex mono-repo, `list` seems to cause the command to not
        // respond to CTRL+C while `search-list` does not.
        type: process.env.CONVEX_RUNNING_LIVE_IN_MONOREPO ? "search-list" : "list",
        name: "result",
        message: options.message,
        choices: options.choices,
        default: options.default
      }
    ])).result;
    return result;
  } else {
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: "Cannot prompt for input in non-interactive terminals."
    });
  }
};
export const promptSearch = async (ctx, options) => {
  if (process.stdin.isTTY) {
    const result = (await inquirer.prompt([
      {
        type: "search-list",
        name: "result",
        message: options.message,
        choices: options.choices,
        default: options.default
      }
    ])).result;
    return result;
  } else {
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: "Cannot prompt for input in non-interactive terminals."
    });
  }
};
export const promptYesNo = async (ctx, options) => {
  if (process.stdin.isTTY) {
    const { result } = await inquirer.prompt([
      {
        type: "confirm",
        name: "result",
        message: options.message,
        default: options.default
      }
    ]);
    return result;
  } else {
    logOutput(ctx, options.message);
    return ctx.crash({
      exitCode: 1,
      errorType: "fatal",
      printedMessage: "Cannot prompt for input in non-interactive terminals."
    });
  }
};
//# sourceMappingURL=prompts.js.map
