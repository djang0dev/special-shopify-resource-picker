import {
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  InlineStack,
  Layout,
  List,
  Select,
  Text,
} from "@shopify/polaris"
import { useActorRef } from "@xstate/react"
import { Fragment, useMemo } from "react"
import type { FC } from "react"
import { ActorOptions, AnyActorLogic } from "xstate"

import { getRandomNumberFromN } from "../../utils.ts"
import { ResourcePickerProvider } from "../resource-picker/resource-picker.view.tsx"
import { RootProvider, useRootRef, useRootSelector } from "./root.machine.context.tsx"
import { ResourcePickerValue, rootMachine } from "./root.machine.ts"

interface Props {
  actorOptions: ActorOptions<AnyActorLogic> | undefined
}
export const Root = ({ actorOptions }: Props) => {
  const rootActorRef = useActorRef(rootMachine, actorOptions)
  return (
    <RootProvider value={rootActorRef}>
      <RootMain />
    </RootProvider>
  )
}

export const RootForm = () => {
  const spawnForm = useRootSelector((snapshot) => snapshot.context.spawnForm)
  const { send } = useRootRef()
  return (
    <Box padding={"200"}>
      <BlockStack gap={"300"}>
        <ChoiceList
          allowMultiple={false}
          title="Resource Picker Item Type"
          selected={[spawnForm.resourceType]}
          onChange={(v) => {
            const selected = v.at(0)
            if (!selected) return
            send({
              type: "rpSpawnForm.edit",
              payload: {
                key: "resourceType",
                value: selected,
              },
            })
          }}
          choices={[
            { label: "Product", value: "product" },
            { label: "Collection", value: "collection" },
            { label: "Static Image", value: "libraryStaticImage" },
          ]}
        />
        <Select
          label="Resource Ui Mode"
          value={spawnForm.uiSettings.resourceUiMode}
          options={[
            {
              label: "Card",
              value: "card",
            },
            {
              label: "Resource Item",
              value: "resource-item",
            },
          ]}
          onChange={(v) => {
            send({
              type: "rpSpawnForm.edit",
              payload: {
                key: "uiSettings.resourceUiMode",
                value: v,
              },
            })
          }}
        />
        <ChoiceList
          choices={[
            {
              label: "Small",
              value: "small",
            },
            {
              label: "Medium",
              value: "medium",
            },
            {
              label: "Large",
              value: "large",
            },
            {
              label: "Full Screen",
              value: "fullScreen",
            },
          ]}
          selected={[spawnForm.uiSettings.modalSize ?? "medium"]}
          onChange={(v) => {
            const selected = v.at(0)
            if (!selected) return
            send({
              type: "rpSpawnForm.edit",
              payload: {
                key: "uiSettings.modalSize",
                value: selected,
              },
            })
          }}
          title={"Modal size"}
        />
        <ChoiceList
          choices={[
            {
              label: "Single",
              value: "single",
            },
            {
              label: "Multiple",
              value: "multiple",
            },
          ]}
          selected={[spawnForm.resourceSelectionType]}
          title={"Selection Type"}
          onChange={(v) => {
            const selected = v.at(0)
            if (!selected) return
            send({
              type: "rpSpawnForm.edit",
              payload: {
                key: "resourceSelectionType",
                value: selected,
              },
            })
          }}
        />
        <Button
          onClick={() => {
            send({
              type: "rp.spawn",
            })
          }}>
          Spawn
        </Button>
      </BlockStack>
    </Box>
  )
}

export const RootCard: FC<{ id: string } & ResourcePickerValue> = ({
  id,
  latestSelectedItemIds,
  actorRef,
}) => {
  const { send } = useRootRef()

  const random = useMemo(() => getRandomNumberFromN(5), [])
  return (
    <Box key={id}>
      <Card
        background={
          random === 0
            ? "bg-fill-magic-secondary"
            : random === 1
              ? "bg-fill-secondary"
              : random === 2
                ? "bg-fill-critical-secondary"
                : random === 3
                  ? "bg-fill-caution-secondary"
                  : random === 4
                    ? "bg-fill-success-secondary"
                    : "bg-fill-info-secondary"
        }>
        <Box minHeight={"70px"}>
          <BlockStack align={"center"} inlineAlign={"center"} gap={"300"}>
            <BlockStack align={"center"} inlineAlign={"center"} gap={"100"}>
              <Text as={"span"} truncate={false} fontWeight={"bold"} variant={"headingMd"}>
                Resource Picker - {id}
              </Text>
              <BlockStack>
                <Text as={"span"} alignment={"center"} fontWeight={"medium"}>
                  Latest Selected Ids
                </Text>
                <List>
                  {[...latestSelectedItemIds].map((id) => (
                    <List.Item key={id}>
                      <Text as={"span"}>{id}</Text>
                    </List.Item>
                  ))}
                </List>
              </BlockStack>
            </BlockStack>

            <InlineStack align={"center"} blockAlign={"center"} gap={"200"}>
              <Button
                size={"slim"}
                onClick={() => {
                  send({
                    type: "rp.open",
                    payload: {
                      id: id,
                    },
                  })
                }}>
                Open
              </Button>
              <Button
                size={"slim"}
                tone={"critical"}
                onClick={() => {
                  send({
                    type: "rp.kill",
                    payload: {
                      id: id,
                    },
                  })
                }}>
                Kill
              </Button>
            </InlineStack>
            <ResourcePickerProvider actorRef={actorRef} />
          </BlockStack>
        </Box>
      </Card>
    </Box>
  )
}

export const RootMain = () => {
  const resourcePickers = useRootSelector((state) => state.context.resourcePickers)
  return (
    <Layout>
      <Layout.Section>
        <Card>
          <Box width={"100%"} borderRadius={"050"}>
            <BlockStack gap={"500"}>
              <BlockStack gap={"200"} align={"center"} inlineAlign={"center"}>
                <Text as={"h2"} fontWeight={"bold"} variant={"headingLg"}>
                  Root Control Center
                </Text>
                <Box width={"100%"}>
                  <BlockStack gap={"400"}>
                    <Text as={"h3"} alignment={"center"}>
                      Selected Ids collected back from root
                    </Text>
                    <div className="grid grid-cols-2 gap-4">
                      {[...resourcePickers].map(([id, { latestSelectedItems, actorRef }]) => (
                        <Fragment key={id}>
                          <RootCard
                            key={id}
                            id={id}
                            latestSelectedItemIds={new Set(latestSelectedItems.keys())}
                            actorRef={actorRef}
                          />
                        </Fragment>
                      ))}
                    </div>
                  </BlockStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Box>
        </Card>
      </Layout.Section>
      <Layout.Section variant={"oneThird"}>
        <Box>
          <Card>
            <RootForm />
          </Card>
        </Box>
      </Layout.Section>
    </Layout>
  )
}
