import type { ActorRefFrom } from "xstate"
import { createActorReferenceContext } from "../../hooks/actor-ref-creator.hook.tsx"
import { rootMachine } from "./root.machine.ts"

export const {
  ActorRefProvider: RootProvider,
  useActorRefContext: useRootRef,
  useActorRefSelector: useRootSelector,
} = createActorReferenceContext<ActorRefFrom<typeof rootMachine>>()
