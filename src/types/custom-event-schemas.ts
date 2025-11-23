import { StaticDecode, Type } from "@sinclair/typebox";
import { SupportedEvents } from "./context";

const serverRegisterSchema = Type.Object({
    action: Type.Literal("server.register"),
    client_payload: Type.Object({
        sessionId: Type.String({
            description: "The session ID for the server",
            examples: ["1234567890"], // long term, multiple servers could be running, so we need to identify the server
        }),
        workflowRunId: Type.String({
            description: "The workflow run ID for the server",
            examples: ["1234567890"], // this is the ID of the workflow run that is running the server
        }),
        repository: Type.String({
            description: "The repository for the server",
            examples: ["keyrxng/Symbiote"], // the repository that the server is running in
        }),
    }),
});

export const customEventSchemas = {
    "server.register": serverRegisterSchema,
} as const

export type CustomEventSchemas<T extends SupportedEvents> = 
    T extends keyof typeof customEventSchemas ? StaticDecode<typeof customEventSchemas[T]> : never;