"use strict";
import { logFailure, logMessage } from "../../../bundler/context.js";
export class LocalDeploymentError extends Error {
}
export function printLocalDeploymentOnError(ctx) {
  logFailure(ctx, `Hit an error while running local deployment.`);
  logMessage(
    ctx,
    "Your error has been reported to our team, and we'll be working on it."
  );
  logMessage(
    ctx,
    "To opt out, run `npx convex disable-local-deployments`. Then re-run your original command."
  );
}
//# sourceMappingURL=errors.js.map
