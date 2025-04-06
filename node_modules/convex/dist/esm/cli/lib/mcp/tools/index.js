"use strict";
import zodToJsonSchema from "zod-to-json-schema";
import { TablesTool } from "./tables.js";
import { DataTool } from "./data.js";
import { StatusTool } from "./status.js";
import { FunctionSpecTool } from "./functionSpec.js";
import { RunTool } from "./run.js";
import { EnvListTool, EnvGetTool, EnvSetTool, EnvRemoveTool } from "./env.js";
import { RunOneoffQueryTool } from "./runOneoffQuery.js";
export function mcpTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema)
  };
}
export const convexTools = [
  StatusTool,
  DataTool,
  TablesTool,
  FunctionSpecTool,
  RunTool,
  EnvListTool,
  EnvGetTool,
  EnvSetTool,
  EnvRemoveTool,
  RunOneoffQueryTool
];
//# sourceMappingURL=index.js.map
