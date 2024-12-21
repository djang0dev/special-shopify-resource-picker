import {
  type AppliedFilterInterface,
  BlockStack,
  Box,
  Checkbox,
  ChoiceList,
  Filters,
  Grid,
  Icon,
  InlineStack,
  Modal,
  Spinner,
  Tag,
  Text,
  TextField,
  Thumbnail,
  Tooltip,
} from "@shopify/polaris"
import { LockFilledIcon, SearchIcon } from "@shopify/polaris-icons"
import React, { Fragment, type ReactElement, useMemo } from "react"
import useInfiniteScroll from "react-infinite-scroll-hook"
import * as R from "remeda"
import type { ActorRefFrom } from "xstate"
import { shopifyEditorConfig } from "../../shopify.config.ts"
import { beautifyObjectName, beautifySlug, formatShopifyUrlImage } from "../../utils.ts"

import { Resource } from "../../commons/entities.ts"
import {
  ResourcePickerRefProvider,
  useResourcePickerRefContext,
  useResourcePickerRefSelector,
} from "./resource-picker.context.ts"
import type { ResourceUiMode, resourcePickerMachineEditor } from "./resource-picker.machine.ts"

export const LibraryItem: React.FC<{
  resourceItem: Resource
  onSelect: (selected: boolean) => void
  isSelected: boolean
  lock?: {
    content: ReactElement
  }
  mode: ResourceUiMode
}> = ({ resourceItem, onSelect, isSelected, lock, mode }) => {
  const resourceItemTitle =
    typeof resourceItem.title === "string" ? resourceItem.title : resourceItem.title["en-US"]
  const resourceItemDescription =
    resourceItem.resourceNamespace === "library"
      ? resourceItem.description == null
        ? ""
        : resourceItem.description["en-US"]
      : ""
  return (
    <Box width={"100%"}>
      <button
        disabled={Boolean(lock)}
        className={`w-full ${lock ? "hover:cursor-not-allowed" : "hover:cursor-pointer"}`}
        type={"button"}
        onClick={(_data) => {
          onSelect(!isSelected)
        }}>
        {mode === "card" && (
          <div className={"object-contain"}>
            <Box
              background={isSelected ? "bg-surface-brand-selected" : undefined}
              padding={"0"}
              borderColor={isSelected ? "border" : "border-brand"}
              borderWidth={"025"}
              borderRadius={"100"}>
              <BlockStack gap={"050"}>
                {resourceItem.mainImageSrc && (
                  <Box>
                    <img
                      className={`w-full max-h-[350px] max-w-full rounded-t-lg ${lock ? "filter-grayscale" : ""}`}
                      src={formatShopifyUrlImage(resourceItem.mainImageSrc, { width: 600 })}
                      alt={resourceItemTitle}
                    />
                  </Box>
                )}
                <Box paddingBlock={"150"} paddingInline={"300"}>
                  <BlockStack gap={"050"}>
                    <InlineStack align={"space-between"}>
                      <Text as={"dt"} fontWeight={"medium"} variant={"bodyMd"}>
                        {resourceItemTitle}
                      </Text>
                      <InlineStack gap={"200"}>
                        <InlineStack gap={"100"}>
                          {resourceItem.resourceNamespace === "library" &&
                            resourceItem.tags?.map((tag) => {
                              return <Tag key={tag}>{tag}</Tag>
                            })}
                        </InlineStack>
                        <Box>{lock?.content}</Box>
                      </InlineStack>
                    </InlineStack>
                    <InlineStack wrap={true}>
                      <Text as={"dd"}>{resourceItemDescription}</Text>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </div>
        )}
        {mode === "resource-item" && (
          <Box width={"100%"}>
            <InlineStack align="start" blockAlign="center" gap="150">
              <Checkbox label="" checked={isSelected} />
              <Thumbnail
                source={
                  resourceItem.mainImageSrc
                    ? formatShopifyUrlImage(resourceItem.mainImageSrc, {
                        width: 100,
                        height: 100,
                      })
                    : formatShopifyUrlImage(
                        R.pipe(
                          shopifyEditorConfig,
                          R.prop("fallbacks"),
                          resourceItem.id.includes("gid://shopify/Product")
                            ? R.prop("productImageURL")
                            : R.prop("collectionImageURL"),
                        ),
                        {
                          width: 100,
                          height: 100,
                        },
                      )
                }
                alt={resourceItemTitle}
              />
              <Text as="dd">{resourceItemTitle}</Text>
            </InlineStack>
          </Box>
        )}
      </button>
    </Box>
  )
}

export const LibraryFilters = () => {
  const { resourceNamespace } = useResourcePickerRefSelector(
    (state) => state.context.resourceSettings,
  )
  const query = useResourcePickerRefSelector((state) => state.context.currentQuery.query)
  const queryFilters = useResourcePickerRefSelector((state) => {
    if (state.context.currentQuery.queryType === "library") {
      return state.context.currentQuery.filters
    }
    return undefined
  })

  const filtersData = useResourcePickerRefSelector((state) => state.context.filters)
  const { send } = useResourcePickerRefContext()

  const filters =
    resourceNamespace === "shopify"
      ? []
      : Object.entries(filtersData ?? {}).map(([filterId, filterData]) => {
          return {
            key: filterId,
            label: beautifyObjectName(filterId),
            filter: (
              <ChoiceList
                title={beautifyObjectName(filterId)}
                titleHidden
                choices={
                  !R.isArray(filterData)
                    ? []
                    : filterData.map((filterToken) => {
                        return { label: filterToken, value: filterToken }
                      })
                }
                selected={queryFilters?.tags ?? []}
                onChange={(selected) => {
                  send({
                    type: "rp.query.filters.edit",
                    payload: {
                      filterId,
                      value: selected,
                    },
                  })
                }}
                allowMultiple
              />
            ),
            shortcut: true,
          }
        })

  const appliedFilters = useMemo(() => {
    if (queryFilters && filtersData) {
      return Object.entries(filtersData).reduce<AppliedFilterInterface[]>((acc, [filterId]) => {
        const selectedFilterData = queryFilters[filterId as keyof typeof queryFilters]
        if (!selectedFilterData || selectedFilterData?.length === 0) return acc

        return [
          {
            key: filterId,
            label:
              R.isArray(selectedFilterData) && !R.isEmpty(selectedFilterData)
                ? `Selected: ${selectedFilterData.join(", ")}`
                : "",
            onRemove: () => {
              send({
                type: "rp.query.filters.edit",
                payload: {
                  filterId: filterId,
                  value: [],
                },
              })
            },
          },
        ]
      }, [] as AppliedFilterInterface[])
    }
    return []
  }, [queryFilters, send, filtersData])

  return (
    <Box paddingBlock={"300"} paddingInline={"200"} background={"bg-surface-secondary"}>
      <BlockStack gap={"025"}>
        <Box paddingInline={"200"}>
          <TextField
            autoComplete="off"
            label=""
            prefix={<Icon source={SearchIcon} />}
            value={query ?? ""}
            onChange={(value) => {
              send({
                type: "library.query.editQuery",
                payload: {
                  query: value,
                },
              })
            }}
          />
        </Box>
        <Filters
          filters={filters}
          onQueryChange={() => {}}
          onQueryClear={() => {}}
          onClearAll={() => {
            send({ type: "library.query.filters.clearAll" })
          }}
          hideQueryField={true}
          appliedFilters={appliedFilters}
        />
      </BlockStack>
    </Box>
  )
}

export const ResourceItems = () => {
  const resourceItems = useResourcePickerRefSelector((state) => state.context.currentResources)
  const selectedItems = useResourcePickerRefSelector((state) => state.context.selectedItems)
  const uiSettings = useResourcePickerRefSelector((state) => state.context.uiSettings)
  const shopAssignedAppPlanSlug = "free"
  const { send } = useResourcePickerRefContext()
  return resourceItems.map((resourceItem) => {
    let lock
    if (
      resourceItem.resourceNamespace === "shopify" ||
      resourceItem.allowedPlanSlugs.includes(shopAssignedAppPlanSlug) ||
      resourceItem.allowedPlanSlugs.includes("all")
    ) {
      lock = undefined
    } else {
      lock = {
        content: (
          <Box
            key={resourceItem.id}
            background="bg-fill-warning-secondary"
            borderRadius="100"
            padding={"025"}
            paddingInlineEnd={"100"}>
            <Tooltip
              content={`Upgrade to ${resourceItem.allowedPlanSlugs
                .map(beautifySlug)
                .join(", ")} plan to get access`}>
              <InlineStack blockAlign={"center"}>
                <Icon source={LockFilledIcon} tone={"warning"} />
                {/* FIXME: why does it refresh the whole page on redirect?*/}
                <Text as={"p"} tone={"caution"}>
                  Upgrade
                </Text>
              </InlineStack>
            </Tooltip>
          </Box>
        ),
      }
    }

    return (
      <Fragment key={resourceItem.id}>
        <LibraryItem
          lock={lock}
          mode={uiSettings.resourceUiMode}
          resourceItem={resourceItem}
          isSelected={selectedItems.has(resourceItem.id)}
          onSelect={(selected) => {
            if (selected) {
              send({
                type: "library.item.select",
                payload: {
                  itemId: resourceItem.id,
                },
              })
              return
            }

            send({
              type: "library.item.unselect",
              payload: {
                itemId: resourceItem.id,
              },
            })
          }}
        />
      </Fragment>
    )
  })
}
export const ResourcePickerMain = () => {
  const { send } = useResourcePickerRefContext()
  const isLoading = useResourcePickerRefSelector((state) => state.matches({ Open: "Loading" }))
  const isLoadMore = useResourcePickerRefSelector((state) =>
    state.matches({ Open: { LoadMore: "Retrieved" } }),
  )

  const uiSettings = useResourcePickerRefSelector((state) => state.context.uiSettings)

  const hasNextPage = useResourcePickerRefSelector(
    (state) => state.context.currentPageInfo.hasNextPage,
  )

  const [intersectionRef, { rootRef }] = useInfiniteScroll({
    loading: isLoading || isLoadMore,
    hasNextPage: hasNextPage,

    onLoadMore: () => {
      send({
        type: "library.items.loadMore",
      })
    },
    // disabled: !!error,
    rootMargin: "0px 0px 20px 0px",
  })

  if (isLoading) {
    return (
      <div className="w-full h-[600px] overflow-y-scroll">
        <BlockStack inlineAlign={"center"} align={"center"}>
          <Spinner size={"small"} />
        </BlockStack>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="h-[600px] overflow-y-scroll">
      <Box width={"100%"}>
        <Box width={"100%"} padding={"100"}>
          {uiSettings.resourceUiMode === "card" && (
            <Grid columns={{ xs: 1, lg: 2 }} gap={{ lg: "200" }}>
              <ResourceItems />
            </Grid>
          )}
          {uiSettings.resourceUiMode === "resource-item" && (
            <Box width={"100%"} padding={"100"}>
              <BlockStack gap={"100"} align={"center"}>
                <ResourceItems />
              </BlockStack>
            </Box>
          )}
        </Box>
      </Box>
      {(isLoadMore || hasNextPage) && (
        <div ref={intersectionRef} id={"bottom-library"}>
          <Box minHeight="30px">
            <BlockStack inlineAlign={"center"} align={"center"}>
              <Spinner size={"small"} />
            </BlockStack>
          </Box>
        </div>
      )}
    </div>
  )
}

export const ResourcePicker = () => {
  const state = useResourcePickerRefSelector((state) => state.value)
  const resourceType = useResourcePickerRefSelector(
    (state) => state.context.resourceSettings.resourceType,
  )

  const uiSettings = useResourcePickerRefSelector((state) => state.context.uiSettings)
  const resourceSettings = useResourcePickerRefSelector((state) => state.context.resourceSettings)
  const { send } = useResourcePickerRefContext()

  return (
    <Modal
      open={state !== "Closed"}
      title={`Select your ${beautifyObjectName(`${resourceType}${resourceSettings.selectionType === "multiple" ? "s" : ""}`)}`}
      onClose={() => {
        send({ type: "close" })
      }}
      primaryAction={
        resourceSettings.selectionType === "multiple"
          ? {
              content: "Select",
              onAction: () => {
                send({ type: "library.done" })
              },
            }
          : undefined
      }
      size={uiSettings.modalSize === "medium" ? undefined : uiSettings.modalSize}>
      <div className="relative overflow-hidden">
        <LibraryFilters />
        <ResourcePickerMain />
      </div>
    </Modal>
  )
}
export const ResourcePickerProvider: React.FC<{
  actorRef: ActorRefFrom<typeof resourcePickerMachineEditor>
}> = ({ actorRef }) => (
  <ResourcePickerRefProvider value={actorRef}>
    <ResourcePicker />
  </ResourcePickerRefProvider>
)
