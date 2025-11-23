import { StaticDecode, Type as T } from "@sinclair/typebox";

export const symbioteCommandSchema = T.Object({
  name: T.Literal("symbiote"),
  parameters: T.Object({
    action: T.Union([T.Literal("start"), T.Literal("restart"), T.Literal("stop")]),
  }),
});

export type Command = StaticDecode<typeof symbioteCommandSchema>;