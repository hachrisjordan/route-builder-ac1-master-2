import { Long } from "../long.js";
import { Logger } from "../logging.js";
import { QueryId, Transition } from "./protocol.js";
import { FunctionResult } from "./function_result.js";
/**
 * A represention of the query results we've received on the current WebSocket
 * connection.
 */
export declare class RemoteQuerySet {
    private version;
    private readonly remoteQuerySet;
    private readonly queryPath;
    private readonly logger;
    constructor(queryPath: (queryId: QueryId) => string | null, logger: Logger);
    transition(transition: Transition): void;
    remoteQueryResults(): Map<QueryId, FunctionResult>;
    timestamp(): Long;
}
//# sourceMappingURL=remote_query_set.d.ts.map