import type { ActorRefFrom } from "xstate"
import { createActorReferenceContext } from "../../hooks/actor-ref-creator.hook.tsx"
import { resourcePickerMachineEditor } from "./resource-picker.machine.ts"

export const {
  ActorRefProvider: ResourcePickerRefProvider,
  useActorRefContext: useResourcePickerRefContext,
  useActorRefSelector: useResourcePickerRefSelector,
} = createActorReferenceContext<ActorRefFrom<typeof resourcePickerMachineEditor>>()
