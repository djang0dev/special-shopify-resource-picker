import { BlockStack, Box, Icon, InlineStack, Link, Page, Text } from "@shopify/polaris"
import { CodeIcon, EmailIcon, EyeCheckMarkIcon, LinkIcon, ViewIcon } from "@shopify/polaris-icons"
import { createBrowserInspector } from "@statelyai/inspect"
import { useActor } from "@xstate/react"
import type { FunctionComponent } from "react"
import { type ActorOptions, type AnyActorLogic, assign, fromCallback, setup } from "xstate"
import videoUrl from "../../assets/usage-stately-actors.mp4"
type BrowserInspector = ReturnType<typeof createBrowserInspector>

type ExampleComponent = FunctionComponent<{
  actorOptions: ActorOptions<AnyActorLogic> | undefined
}>

// Thanks, Baptiste, for this machine! - https://x.com/BDevessier
const inspectorLauncherMachine = setup({
  types: {
    context: {} as {
      updateId: number
      inspector: BrowserInspector | undefined
    },
    events: {} as { type: "inspector.open" } | { type: "inspector.closed" },
  },
  actors: {
    "Wait for inspector window to be closed": fromCallback<any, { inspector: BrowserInspector }>(
      ({ input, sendBack }) => {
        const timerId = setInterval(() => {
          const isInspectorClosed = input.inspector.adapter.targetWindow!.closed === true

          if (isInspectorClosed === true) {
            sendBack({
              type: "inspector.closed",
            })
          }
        }, 1_000)

        return () => {
          clearInterval(timerId)
        }
      },
    ),
  },
  actions: {
    "Create inspector and assign to context": assign({
      inspector: () => createBrowserInspector(),
    }),
    "Increment update id in context": assign({
      updateId: ({ context }) => context.updateId + 1,
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOkwBsB7WSAYgNgAcxMAXSgJxMufwG0ADAF1EoRtVytclfKJAAPRAEYALAE4SAJgDsAZhUrtAVgBsugUoAcJgDQgAnst2aSAt293aBJ7Wu2qAXwC7NCw8QlIeMHx6fCYWdi4KakhBESQQcVhJaVkMxQRNEw0lUx01FW8BTSK7RwRLJRIjdwtdJSKjNV0TIOCQfEoIODlQnAJiOSycmTkCgFpbB0RFoJCMcYiyKhoIKYkpWfzEFU065RMBEms1SwFLTVMHn17+sfDibl597MO80AKKiMLm0p00SiUJkadwERhU5wQSmcrh6Kku7SsKiRmj6ASAA */
  context: {
    updateId: 0,
    inspector: undefined,
  },
  initial: "closed",
  states: {
    closed: {
      on: {
        "inspector.open": {
          target: "open",
          actions: ["Create inspector and assign to context", "Increment update id in context"],
        },
      },
    },
    open: {
      invoke: {
        src: "Wait for inspector window to be closed",
        input: ({ context }) => {
          if (context.inspector === undefined) {
            throw new Error("Inspector must be defined in context")
          }

          return {
            inspector: context.inspector!,
          }
        },
      },
      on: {
        "inspector.closed": {
          target: "closed",
        },
      },
    },
  },
})

const InspectorSetter = ({
  inspector,
  Example,
}: {
  inspector: BrowserInspector | undefined
  Example: ExampleComponent
}) => {
  const actorOptions: ActorOptions<AnyActorLogic> | undefined =
    inspector === undefined
      ? undefined
      : {
          inspect: inspector.inspect as any,
        }

  return <Example actorOptions={actorOptions} />
}

const socials = [
  {
    name: "Website",
    url: "https://djang0.dev",
    icon: LinkIcon,
  },
  {
    name: "GitHub",
    url: "https://github.com/djang0dev",
    icon: CodeIcon,
  },
  {
    name: "Mail",
    url: "mailto:kinane@djang0.dev",
    icon: EmailIcon,
  },
] as const

export const AppExampleSandbox = ({
  Example,
  pageTitle,
}: { Example: ExampleComponent; pageTitle: string }) => {
  const [state, send] = useActor(inspectorLauncherMachine)

  const isClosed = state.matches("closed")
  return (
    <Page
      title={pageTitle}
      secondaryActions={[
        {
          onAction: () => {
            send({ type: "inspector.open" })
          },
          plain: true,
          outline: true,
          content: isClosed ? "Open Inspector" : "Visualizing",
          icon: isClosed ? ViewIcon : EyeCheckMarkIcon,
          disabled: !isClosed,
          helpText: isClosed ? (
            "Visualize the machines on Stately.ai"
          ) : (
            <div>
              {/* biome-ignore lint/a11y/useMediaCaption: I don't have */}
              <video src={videoUrl} autoPlay={true} loop={true} />
            </div>
          ),
        },
      ]}>
      <BlockStack gap={"200"}>
        <InspectorSetter
          key={state.context.updateId}
          Example={Example}
          inspector={state.context.inspector}
        />
        <Box>
          <InlineStack gap={"200"}>
            <Text as="p" variant="bodyMd">
              Made by{" "}
              <Link url="https://djang0.dev/" monochrome={true} target="_blank">
                Kinane Brevet
              </Link>{" "}
              - {new Date().getFullYear()}
            </Text>
            •
            <InlineStack gap={"025"}>
              {socials.map((social) => (
                <Link
                  key={social.url}
                  url={social.url}
                  monochrome={true}
                  removeUnderline={true}
                  target="_blank">
                  <Icon source={social.icon} tone="textPrimary" />
                </Link>
              ))}
            </InlineStack>
          </InlineStack>
        </Box>
      </BlockStack>
    </Page>
  )
}
