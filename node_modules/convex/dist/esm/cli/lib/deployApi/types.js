"use strict";
import { z } from "zod";
import { looseObject } from "./utils.js";
export const reference = z.string();
export const authInfo = looseObject({
  applicationID: z.string(),
  domain: z.string()
});
export const identifier = z.string();
//# sourceMappingURL=types.js.map
