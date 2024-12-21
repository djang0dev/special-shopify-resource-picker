import request from "graphql-request"
import { create } from "mutative"
import toast from "react-hot-toast/headless"
import set from "set-value"
import { ActorRefFrom, assertEvent, assign, enqueueActions, setup, stopChild } from "xstate"
import {
  CollectionQueryResponse,
  LibraryResourceTypeUnion,
  ProductsResponse,
  Resource,
  ShopifyResourceTypeUnion,
} from "../../commons/entities"
import {
  handlePaginatedLibraryStaticImageResources,
  libraryStaticImageResources,
} from "../../data/library-static-images-resources.data"
import { getShopifyCollections, getShopifyProducts } from "../../queries"
import { getRandomString } from "../../utils"
import {
  ResourceSearchMachineInput,
  ResourceSelectionType,
  ResourceSettings,
  ResourceSettingsV2,
  UiSettings,
  resourcePickerMachineEditor,
} from "../resource-picker/resource-picker.machine"

const rootPartialInput = {
  libraryStaticImage: {
    resourceSettings: {
      resourceNamespace: "library",
      resourceType: "libraryStaticImage",
      filtersHandler: async () => {
        return {
          filters: { tags: [...new Set(libraryStaticImageResources.flatMap((i) => i.tags))] },
        }
      },
      queryHandler: async (payload) => {
        if (payload.queryType === "shopify") {
          throw new Error(
            `Invalid library query received: ${JSON.stringify(
              payload,
            )}, might be due if you use the Shopify query formatting instead of the library one`,
          )
        }

        const items = handlePaginatedLibraryStaticImageResources({
          query: payload.query,
          first: payload.first,
          filters: { tags: payload.filters.tags ?? [] },
          after: payload.endCursor ? Number(payload.endCursor) : undefined,
        })

        console.log({ items })
        return {
          libraryItems: items.data.map((i) => ({
            tags: i.tags,
            updatedAt: new Date(i.updatedAt),
            cursor: i.cursor,
            resourceNamespace: "library",
            status: i.status,
            allowedPlanSlugs: ["all"],
            id: i.id,
            createdAt: i.createdAt,
            description: i.description,
            mainImageSrc: i.mainImageSrc,
            title: i.title,
            resource: {
              resourceType: "libraryStaticImage",
              title: i.title,
              data: {
                src: i.mainImageSrc,
              },
            },
          })),
          pageInfo: {
            hasNextPage: items.pageInfo.hasNextPage,
            hasPreviousPage: items.pageInfo.hasPreviousPage,
            endCursor: String(items.pageInfo.endCursor) || null,
          },
        }
      },
    },
  },
  product: {
    resourceSettings: {
      resourceNamespace: "shopify",
      queryHandler: async (payload) => {
        if (payload.queryType === "library") {
          throw new Error(
            `Invalid library query received: ${JSON.stringify(
              payload,
            )}, might be due if you use the Shopify query formatting instead of the library one`,
          )
        }

        const data = (await request("https://mock.shop/api", getShopifyProducts, {
          after: payload.endCursor,
          first: payload.first,
          query: payload.query,
        })) as ProductsResponse

        return {
          libraryItems: data.products.edges.map((edge) => ({
            allowedPlanSlugs: ["all"],
            id: edge.node.id,
            resourceNamespace: "shopify",
            mainImageSrc: edge.node.featuredImage.url,
            resource: { resourceType: "product", title: edge.node.title },
            title: edge.node.title,
          })),
          pageInfo: data.products.pageInfo,
        }
      },
      resourceType: "product",
    },
  },
  collection: {
    resourceSettings: {
      resourceNamespace: "shopify",
      queryHandler: async (payload) => {
        if (payload.queryType === "library") {
          throw new Error(
            `Invalid library query received: ${JSON.stringify(
              payload,
            )}, might be due if you use the Shopify query formatting instead of the library one`,
          )
        }

        const data = (await request("https://mock.shop/api", getShopifyCollections, {
          after: payload.endCursor,
          first: payload.first,
          query: payload.query,
        })) as CollectionQueryResponse

        return {
          libraryItems: data.collections.edges.map((edge) => ({
            allowedPlanSlugs: ["all"],
            id: edge.node.id,
            resourceNamespace: "shopify",
            mainImageSrc: edge.node.image.url,
            resource: { resourceType: "product", title: edge.node.title },
            title: edge.node.title,
          })),
          pageInfo: data.collections.pageInfo,
        }
      },
      resourceType: "collection",
    },
  },
} satisfies { [type: string]: { resourceSettings: Partial<ResourceSettingsV2> } }

export interface SpawnForm {
  uiSettings: UiSettings
  resourceType: ShopifyResourceTypeUnion
  resourceSelectionType: ResourceSelectionType
}

export interface ResourcePickerValue {
  actorRef: ActorRefFrom<typeof resourcePickerMachineEditor>
  latestSelectedItemIds: Set<string>
}

export const rootMachine = setup({
  types: {
    events: {} as
      | {
          type: "rp.spawn"
        }
      | {
          type: "rp.open"
          payload: {
            id: string
          }
        }
      | {
          type: "rp.kill"
          payload: {
            id: string
          }
        }
      | {
          type: "rp.items.selected"
          payload: {
            senderId: string
            selectedItems: Map<string, Resource>
            resourceSettings: ResourceSettings
          }
        }
      | {
          // TODO: better typesafety
          type: "rpSpawnForm.edit"
          payload: {
            key: string
            value: string
          }
        },

    context: {} as {
      spawnForm: {
        uiSettings: UiSettings
        resourceType: ShopifyResourceTypeUnion | LibraryResourceTypeUnion
        resourceSelectionType: ResourceSelectionType
      }
      resourcePickers: Map<
        string,
        {
          actorRef: ActorRefFrom<typeof resourcePickerMachineEditor>
          latestSelectedItems: Map<string, Resource>
        }
      >
    },
  },
  actions: {
    openResourcePicker: enqueueActions(({ context, enqueue, event }) => {
      assertEvent(event, "rp.open")
      const rp = context.resourcePickers.get(event.payload.id)
      if (!rp) return

      enqueue.sendTo(rp.actorRef, {
        type: "open",
        payload: {
          selectedItems: rp.latestSelectedItems,
        },
      })
    }),
    rpInsertLastSelectedItemsIds: assign(({ event, context }) => {
      assertEvent(event, "rp.items.selected")
      const id = event.payload.senderId
      return create(context, (draft) => {
        const resourcePicker = draft.resourcePickers.get(id)
        if (!resourcePicker) return
        resourcePicker.latestSelectedItems = event.payload.selectedItems
      })
    }),

    logContext: ({ context }) => {
      console.log({ context })
    },

    killResourcePicker: assign(({ event, context }) => {
      assertEvent(event, "rp.kill")
      const actorId = event.payload.id
      stopChild(actorId)
      return create(context, (draft) => {
        draft.resourcePickers.delete(actorId)
      })
    }),

    spawnResourcePicker: assign(({ context, event, spawn }) => {
      assertEvent(event, "rp.spawn")
      const systemId = getRandomString()
      const { spawnForm } = context
      // @ts-expect-error id wrong typing from xstate
      const actorRef = spawn(resourcePickerMachineEditor, {
        input: {
          resourceSettings: {
            ...rootPartialInput[spawnForm.resourceType]?.resourceSettings,
            selectionType: spawnForm.resourceSelectionType,
          } as ResourceSettingsV2,
          uiSettings: spawnForm.uiSettings,
        } satisfies ResourceSearchMachineInput,

        id: systemId,
      })

      return create(context, (draft) => {
        draft.resourcePickers.set(actorRef.id, {
          // @ts-expect-error id wrong typing from xstate
          actorRef: actorRef,
          latestSelectedItems: new Map(),
        })
      })
    }),
    editRpSpawnerForm: assign(({ context, event }) => {
      assertEvent(event, "rpSpawnForm.edit")

      console.log(event)
      return create(context, (draft) => {
        set(draft.spawnForm, event.payload.key, event.payload.value)
      })
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2qAuA6AlhANmAMTIAOAyqQIYDuAdgGKrIC2WkOGA2gAwC6iUKVSxOOVHUEgAHogBsADiwAmAMwLlATgCsAFh6bVygOwBGUwBoQAT3lms24wtOPTW4wdUBfL1bSZcAmIyXAwwFlgsWDBCAGMwiF4BJBBhUQxxSRTZBF1lK1sEPSVTM00eZR4KhSrlHz90bDxCElIsVFIwOiSpNLEJKRy5Yyw5OR5TOW1NDVNNeYLEPN0sYym5XUVjbQVNUx5depB-JqDWrABrHHx8HpS+jIHsxGMV5XXVOUMTExdFhFUEywqmmqj2r12zgUciOJ0CLRCsGo9DuQhE-SyoCGqhUpgUa20Lm0ql02hM-1KIx0qlMnzkykqxhMsMa8OCbSRtDoADVlKjUujHpiZIhtNpgWCFLpjPNPnptP9nA4qlVdOplNoDDwFD5fCA6KgIHApCdeoLMoNEABaOT-G1YFWOp1VYwsgLNMBm9IW54INzKLCaAnacZ4zSkjb-GWaQNS3T+kNyPHaXVeIA */
  id: "root",
  initial: "idle",
  context: {
    resourcePickers: new Map(),
    spawnForm: {
      uiSettings: {
        modalSize: "large",
        resourceUiMode: "resource-item",
      },
      resourceSelectionType: "multiple",
      resourceType: "product",
    },
  },
  states: {
    idle: {
      on: {
        "rpSpawnForm.edit": {
          actions: ["editRpSpawnerForm", "logContext"],
        },
        "rp.items.selected": {
          actions: [
            ({ event }) => {
              toast.success(
                `Root actor received the selected items ids from ${event.payload.senderId}`,
              )
            },
            "rpInsertLastSelectedItemsIds",
          ],
        },
        "rp.open": {
          actions: [
            "openResourcePicker",
            ({ event }) => {
              toast.success(`Resource picker ${event.payload.id} opened from root actor`)
            },
          ],
        },
        "rp.kill": {
          actions: [
            "killResourcePicker",
            ({ event }) => {
              toast.error(`Resource Picker ${event.payload.id} killed from root actor`)
            },
          ],
        },

        "rp.spawn": {
          actions: [
            "spawnResourcePicker",
            () => toast.success("Resource picker spawned from root actor"),
          ],
        },
      },
    },
  },
})
