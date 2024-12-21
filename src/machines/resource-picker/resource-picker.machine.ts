import type { ModalProps } from "@shopify/polaris"
import { create } from "mutative"
import { assertEvent, assign, fromPromise, sendParent, setup } from "xstate"
import type {
  LibraryQuery,
  LibraryResourceFilters,
  LibraryResourceTypeUnion,
  PageInfo,
  Resource,
  ResourceNamespace,
  ResourceType,
  ShopifyQuery,
  ShopifyResourceTypeUnion,
} from "../../commons/entities"
import { handleInvokeError } from "../../commons/http-errors"

export interface GetResourcePickerItemsCbOutput {
  pageInfo: PageInfo
  libraryItems: Resource[]
}
export type ResourcePickerItemsCb = (
  payload: DiscriminatedQueryUnion,
) => Promise<GetResourcePickerItemsCbOutput>
export type DiscriminatedLibraryQuery = LibraryQuery & { queryType: "library" }
export type DiscriminatedShopifyQuery = ShopifyQuery & { queryType: "shopify" }

export type DiscriminatedQueryUnion = DiscriminatedLibraryQuery | DiscriminatedShopifyQuery

export type ResourceSelectionType = "single" | "multiple"
export interface ResourceSettings {
  resourceNamespace: ResourceNamespace
  resourceType: ResourceType
  selectionType: ResourceSelectionType
}

export type FiltersHandler = (
  resourceType: LibraryResourceTypeUnion,
) => Promise<LibraryResourceFilters>

export type ResourceSettingsV2 = { selectionType: ResourceSelectionType } & (
  | {
      resourceNamespace: "library"
      resourceType: LibraryResourceTypeUnion
      queryHandler: ResourcePickerItemsCb
      filtersHandler: FiltersHandler
    }
  | {
      resourceNamespace: "shopify"
      resourceType: ShopifyResourceTypeUnion
      queryHandler: ResourcePickerItemsCb
    }
)

export const isShopifyQueryQuery = (
  payload: DiscriminatedQueryUnion["query"],
): payload is ShopifyQuery["query"] => {
  return typeof payload === "string"
}
export type ResourceUiMode = "resource-item" | "card"

export interface UiSettings {
  modalSize: ModalProps["size"] | "medium"
  resourceUiMode: ResourceUiMode
}
export type ResourceSearchMachineInput = {
  uiSettings: UiSettings
  resourceSettings: ResourceSettingsV2
}

export const resourcePickerMachineEditor = setup({
  types: {
    input: {} as ResourceSearchMachineInput,
    context: {} as ResourceSearchMachineInput & {
      filters: Record<string, string[] | string> | undefined
      selectedItems: Map<string, Resource>
      currentQuery: DiscriminatedQueryUnion
      currentResources: Resource[]
      currentPageInfo: PageInfo
    },
    events: {} as
      | {
          type: "library.query.editQuery"
          payload: {
            query: string
          }
        }
      | {
          type: "rp.query.filters.edit"
          payload: {
            filterId: string
            value: string[]
          }
        }
      | {
          type: "library.query.filters.clearAll"
        }
      | {
          type: "open"
          payload: {
            selectedItems?: Map<string, Resource>
          }
        }
      | {
          type: "close"
        }
      | {
          type: "library.item.select"
          payload: {
            itemId: string
          }
        }
      | {
          type: "library.item.unselect"
          payload: {
            itemId: string
          }
        }
      | {
          type: "library.items.loadMore"
        }
      | {
          type: "library.done"
        },
  },

  actors: {
    getLibraryItem: fromPromise(
      async ({
        input,
      }: {
        input: {
          query: DiscriminatedQueryUnion
          handler: ResourcePickerItemsCb
        }
      }) => {
        return input.handler(input.query)
      },
    ),

    getFilters: fromPromise(
      async ({
        input,
      }: {
        input: {
          handler: FiltersHandler
          resourceType: LibraryResourceTypeUnion
        }
      }) => {
        return input.handler(input.resourceType)
      },
    ),
  },
  actions: {
    injectSelectedItems: assign(({ event, context }) =>
      create(context, (draft) => {
        assertEvent(event, "open")
        draft.selectedItems = event.payload?.selectedItems ?? new Map()
      }),
    ),
    clearQueryEndCursor: assign(({ context }) =>
      create(context, (draft) => {
        draft.currentQuery.endCursor = null
      }),
    ),
    editSearch: assign(({ context, event }) => {
      assertEvent(event, "library.query.editQuery")
      return create(context, (draft) => {
        draft.currentQuery.query = event.payload.query
      })
    }),
    clearSelected: assign(({ context }) =>
      create(context, (draft) => {
        draft.selectedItems.clear()
      }),
    ),
    clearFilters: assign(({ event, context }) => {
      assertEvent(event, "library.query.filters.clearAll")
      return create(context, (draft) => {
        if (draft.currentQuery.queryType === "library") {
          for (const filterToken in draft.currentQuery.filters) {
            draft.currentQuery.filters[filterToken as keyof LibraryResourceFilters["filters"]] = []
          }
        }
      })
    }),
    editFilter: assign(({ event, context }) => {
      assertEvent(event, "rp.query.filters.edit")
      return create(context, (draft) => {
        if (draft.currentQuery.queryType === "library")
          draft.currentQuery.filters[
            event.payload.filterId as keyof LibraryResourceFilters["filters"]
          ] = event.payload.value
      })
    }),
    sendSelectedItemsToParent: sendParent(({ context, self }) => {
      return {
        type: "rp.items.selected",
        payload: {
          selectedItems: context.selectedItems,
          senderId: self.id,
          resourceSettings: context.resourceSettings,
        },
      }
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCc4HsCuyDGYAKAltgNZjIB0AwgDZqyQDEaADmAHYDaADALqKjM6BAC4E0bfiAAeiAKwAmADQgAnogAcARnIAWAJwGAzADZjXQwHY9hvRYC+d5aliYc+IqQoB5VmwbZaem4+JBBBWBExCVCZBHlDLXJZLhSbWWNNK0NZZTUETXlbXWN1dRtNLgzNdR0HJ3QsXEISMnIfdioACzASBmDJcMjxSVj5At0dWUNNdOSa+Xkc1Q1F8gW9Masx6a5ZOpBnVyaPVva2Lp7iPs0QgSFRYZjEeS55CamZ4zmdBaW803U5Eq8jM+j0ZhMe0cBwabmanjavguvQ48luYXuURGiE0G3e01mXHmi1yz2s5AsILMXD0yU001s+0OjXcLW8SIAMmgAIYQABiBGowjIsAYEHEYHIBDYADc0KRyMy4Sd2R0ubyBUKRQhpXLsNyHpxeP1QoNDdi4uMdJMCV8iT8ScsEBZphSLGZZBZqpVsvZoUrjmzEWqefzBcLkKKyMg0BRmNQDQAzWMAW0VsMDCLO5HVYa1kZ1srQ+sNwRNdwi5qeCHSegpnvU8i0sk0xgSf0QFlKQPUsnBLqJpnkTIzrKznND0qgYolUqLCoDY9OE95U8LeoNUTLvAGmMeoFiFh02mBLfUGXienUFlJCGPbwWXzK1j09OsI5cLPhy5Dq7Y0+jWNyHjJNU3TT9lSDbNczXXVi03cRt3RM0sWrCwWyBYxFmqC8bGvW9klkchjCsI8dBIq83yheoIMzH9zgAUQgEQGGoAgACNkG5ZAVClYUU1gchaF5ABZWMwHLDFK1Qg8cWSLggWsCwj0pEibCUJ16WqJJPm9TRJlkBQPyOJdVUY5jhFYjiuJ48gAEcMDIXjIBEABFRyeMklD92kTtz0w7DzwKPCbyddQUmImkdF2UwuEmQpjK-FVg3MkRyAAZTAagelEf8GGQZh7I83jE3DEVyBc4QvL3aJZPyfQFJpSwVJBF0NlvLQdApcwCkMgwmwS-1R2-MzyCYtLMuy7BcunNjOO43iHKc8hSvzQSAjAbiAEFqGoarpJ82J9L0RqlJatT2qdaxAQqPRovBExLHSRLIPHDpxuEDKspyqcrPm2yRDANN6Cmqqd1NGqLQqcLyFsL5jEmXssI0vJNH07Rpmw91DEKSEXro0aPq+0HfrmmzeMBtMMDYEGcv2oZat8hBwqIqwSlpBHkfQ280fJNIaj7B6SPx0yUrGiziZ+vKyYW8hxTYCTwYrBmLUvbR5PMDnMmsDt8mqN53XSNStC9cwRZGsWicy7jsE6UnrNlpbbMq9ynPpqs6oqH5YZKd1SmUiwaRRztW10YEMi+GwbXN5LsytzacDtvKpFgYQDUlblEwjAAKeSAEp8uG2OkXjm2k6gd2ZKZ47TuanRVLa4PnRItYevIwoQXimOoJLiWtrYblqBUAAvMBJp+8Q+iVqSVerNWkhSTX0m17IefpYwKS+QP9PMYwOe7t7Us+-vB5HsfvumqJrmQyHqwqLDyFbLhMhMfR1FfHmaSIzHDNbWR9AWAfeiOZQxiVQOQAASmAYQyACBgBlGAGcCs5xygXEXHuv4IBgMlFAmBcCEHrngqWY009vKMyOrYG6XpXwtj3mCXW9JLBrHfovHGz8ZjURhLRUW0FQHiUgdA2B8DGApzTsKcgmcc4vC4AXRcFteGiX4bgoRCCICV0Op2V0p4cLBSvKFVG9dtAgkMtFBI1oiRAIoAAEQlFPG+B1yHPDbIYHS6R3QunWPhTS99yBaEWDUQOjZ6RQmhGwNAEA4CSDkSqXcDiLQAFo9C3niRvReaT0kpD9DREyFsaB0EgLE2edUSI8y7NoQ2LZwSvjip6SxKVCkeyZjYW8LwN6Ph0KUJshkjzDiGtw+RSJKDdBIA0qusQvF5C0ApDYr5wRvjGFwLJXCcnF0wZqCM8AIZxOrAkRqvY7rxAUOYXst4uwb3SP4qwvY4oJDqQo5i-5RkaPyOhBSmRcRvhdBkQwpzopJHkORCoshOo6EMIYO5vcRBPMcc6BIAUzy4T0beLCgITptkWLsZ+LZwV9JWRgo+ktL6PK2UUpmNRAQglpAoAyRhNA80KF1cld0db9UpBC96EtraJynNCqGQdfH1zUmMB6hgdAdWtL43qkw94VFubipK+LxZpRPkPUe49L4+TIVDeQR5fGvI+aC5+tg159lbsvAwfYEboXZecXM2DeV30CWsBsCgCivGBcYelHS1jwxqOpQOOLskKsPiAxR4DlH4LAA6z26E2kurGC8fxnrNJgtZvDF4BgEaMnla9YBdqlGCMjRAaNTNNiAl2PXQoWFyLTDFSm01xjPTKSJC2CxOaCbkBsQrEtox-7aAAfEbYNhBxr29sYrCbYtBlH0A4BwQA */
  id: "resourcePicker",
  initial: "Closed",
  context: ({ input }) => ({
    ...input,
    filters: undefined,
    selectedItems: new Map(),
    // TODO: Pagination with drizzle @see: https://orm.drizzle.team/learn/guides/limit-offset-pagination
    currentQuery:
      input.resourceSettings.resourceNamespace === "library"
        ? {
            queryType: "library",
            query: "",
            filters: {
              tags: [],
            },
            first: 10,
            endCursor: null,
          }
        : {
            queryType: "shopify",
            query: "",
            endCursor: null,
            first: 10,
          },
    currentResources: [],
    currentPageInfo: {
      endCursor: null,
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: "0",
    },
  }),
  states: {
    Closed: {
      on: {
        open: {
          actions: ["injectSelectedItems"],
          target: "Open",
        },
      },
    },
    Open: {
      on: {
        close: {
          target: "Closed",
        },
      },

      initial: "Check",
      states: {
        Check: {
          always: [
            {
              target: "LoadFilters",
              guard: ({ context }) => {
                return !context.filters && context.resourceSettings.resourceNamespace === "library"
              },
            },
            {
              target: "Edit",
              guard: ({ context }) => {
                return context.currentResources.length > 0
              },
            },
            {
              target: "Loading",
            },
          ],
        },
        LoadFilters: {
          invoke: {
            src: "getFilters",
            input: ({ context }) => {
              if (context.resourceSettings.resourceNamespace !== "library") {
                throw new Error("filters not implemented for shopify resources")
              }
              return {
                handler: context.resourceSettings.filtersHandler,
                resourceType: context.resourceSettings.resourceType,
              }
            },
            onError: {
              actions: handleInvokeError,
              target: "Edit",
            },
            onDone: {
              actions: assign(({ event, context }) =>
                create(context, (draft) => {
                  draft.filters = event.output.filters
                }),
              ),
              target: "Check",
            },
          },
        },
        Loading: {
          invoke: {
            input: ({ context }) => ({
              handler: context.resourceSettings.queryHandler,
              query: context.currentQuery,
            }),
            src: "getLibraryItem",
            onDone: {
              actions: assign(({ event, context }) =>
                create(context, (draft) => {
                  draft.currentResources = event.output.libraryItems
                  draft.currentPageInfo = event.output.pageInfo
                  draft.currentQuery.endCursor = event.output.pageInfo.endCursor ?? null
                }),
              ),
              target: "Edit",
            },
            onError: {
              actions: handleInvokeError,
              target: "Edit",
            },
          },
        },
        Edit: {
          initial: "Selecting",
          on: {
            "library.items.loadMore": {
              target: "LoadMore",
            },
            "library.query.editQuery": {
              actions: ["editSearch", "clearQueryEndCursor"],
              target: "#resourcePicker.Open.Edit.Searching",
            },
          },
          states: {
            Selecting: {
              on: {
                "rp.query.filters.edit": {
                  actions: ["editFilter", "clearQueryEndCursor"],
                  target: "#resourcePicker.Open.Loading",
                },
                "library.query.filters.clearAll": {
                  actions: ["clearFilters", "clearQueryEndCursor"],
                  target: "#resourcePicker.Open.Loading",
                },
                "library.item.select": {
                  actions: assign(({ event, context }) => {
                    const itemId = event.payload.itemId
                    const item = context.currentResources.find((item) => item.id === itemId)

                    if (!item) {
                      throw new Error(`item ${itemId} not found in currentResources`)
                    }

                    return create(context, (draft) => {
                      if (context.resourceSettings.selectionType === "single") {
                        draft.selectedItems.clear()
                      }
                      draft.selectedItems.set(event.payload.itemId, item)
                    })
                  }),
                  target: "AnalyzeSelection",
                },
                "library.item.unselect": {
                  actions: assign(({ event, context }) =>
                    create(context, (draft) => {
                      draft.selectedItems.delete(event.payload.itemId)
                    }),
                  ),
                },
                "library.done": {
                  target: "#resourcePicker.Done",
                },
              },
            },
            Searching: {
              on: {
                "library.query.editQuery": {
                  actions: ["clearQueryEndCursor", "editSearch"],
                  target: "Searching",
                  reenter: true,
                },
              },
              after: {
                5e2: {
                  target: "#resourcePicker.Open.Loading",
                },
              },
            },
            AnalyzeSelection: {
              always: [
                {
                  guard: ({ context }) => {
                    return (
                      // context.selectedItemIds.length === 1 &&
                      context.resourceSettings.selectionType === "single"
                    )
                  },

                  target: "#resourcePicker.Done",
                },
                {
                  target: "Selecting",
                },
              ],
            },
          },
        },
        LoadMore: {
          initial: "Retrieve",
          states: {
            Retrieve: {
              invoke: {
                input: ({ context }) => ({
                  handler: context.resourceSettings.queryHandler,
                  query: context.currentQuery,
                }),
                src: "getLibraryItem",
                onDone: {
                  actions: assign(({ event, context }) =>
                    create(context, (draft) => {
                      draft.currentResources.push(...event.output.libraryItems)
                      draft.currentPageInfo = event.output.pageInfo
                      draft.currentQuery.endCursor = event.output.pageInfo.endCursor ?? null
                    }),
                  ),
                  target: "Retrieved",
                },
              },
            },
            Retrieved: {
              after: {
                2e2: {
                  target: "#resourcePicker.Open.Edit",
                },
              },
            },
          },
        },
      },
    },
    Done: {
      always: [
        {
          actions: ["sendSelectedItemsToParent", "clearSelected"],
          target: "#resourcePicker.Closed",
        },
      ],
    },
  },
})
