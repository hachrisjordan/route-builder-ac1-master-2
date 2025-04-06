import WebSocket from "ws";
export declare const nodeWebSocket: {
    new (url: string | URL, protocols?: string | string[] | undefined): globalThis.WebSocket;
    prototype: globalThis.WebSocket;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
};
import { ClientMessage, ServerMessage } from "./protocol.js";
export type InMemoryWebSocketTest = (args: {
    address: string;
    socket: () => WebSocket;
    receive: () => Promise<ClientMessage>;
    send: (message: ServerMessage) => void;
    close: () => void;
}) => Promise<void>;
export declare function withInMemoryWebSocket(cb: InMemoryWebSocketTest, debug?: boolean): Promise<void>;
export declare function encodeServerMessage(message: ServerMessage): string;
//# sourceMappingURL=client_node_test_helpers.d.ts.map