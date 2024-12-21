import { useSelector } from "@xstate/react"
import type { ProviderProps } from "react"
import { createContext, useContext } from "react"
import type { ActorRef, SnapshotFrom } from "xstate"

/**
 * @description allows to provide an actor context, and related hooks based on the actor ref
 */
export const createActorReferenceContext = <
  // biome-ignore lint/suspicious/noExplicitAny:
  TMachineReference extends ActorRef<any, any>,
>() => {
  const ActorReferenceContext = createContext<TMachineReference>(
    undefined as unknown as TMachineReference,
  )
  const ActorRefProvider = ({ children, value }: ProviderProps<TMachineReference>) => (
    <ActorReferenceContext.Provider value={value}>{children}</ActorReferenceContext.Provider>
  )

  const useActorRefContext = () => {
    const context = useContext(ActorReferenceContext)

    if (context === undefined) {
      throw new Error("useActorRefContext must be used within a ActorReferenceProvider")
    }
    return context
  }

  const useActorRefSelector = <T,>(
    selector: (emitted: SnapshotFrom<TMachineReference>) => T,
    compare?: (a: T, b: T) => boolean,
  ) => {
    const context = useActorRefContext()
    // FIXME: fix types
    // @ts-expect-error - false positive with xstate/react got some regression while bumping xstate version
    return useSelector(context, selector, compare)
  }

  return {
    useActorRefContext,
    useActorRefSelector,
    ActorRefProvider,
  }
}
