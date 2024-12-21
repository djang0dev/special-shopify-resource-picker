import { z } from "zod"

export const PageInfo = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().optional().nullable(),
  endCursor: z.string().optional().nullable(),
})

export type PageInfo = z.infer<typeof PageInfo>

export interface Product {
  id: string
  title: string
  description: string
  featuredImage: {
    id: string
    url: string
  }
  variants: {
    edges: {
      node: {
        price: {
          amount: string
          currencyCode: string
        }
      }
    }[]
  }
}

export interface ProductsResponse {
  products: {
    pageInfo: PageInfo
    edges: {
      node: Product
    }[]
  }
}

interface CollectionImage {
  url: string
}

interface CollectionNode {
  id: string
  title: string
  description: string
  image: CollectionImage
}

interface CollectionEdge {
  node: CollectionNode
}

export interface CollectionQueryResponse {
  collections: {
    pageInfo: PageInfo
    edges: CollectionEdge[]
  }
}

export interface CollectionQueryVariables {
  first: number
  after?: string
  query?: string
}

export const zDate = z.union([z.string(), z.date()]).pipe(z.coerce.date())
// Basic app local handled for now
export const AppLocales = z.object({
  "en-US": z.string(),
})
export type AppLocales = z.infer<typeof AppLocales>

// Related to resource picker
export const LibraryQuery = z.object({
  query: z.string().nullable(),
  filters: z.object({
    tags: z.array(z.string()).nullable().default(null),
  }),
  // query: z.string(),
  endCursor: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => v ?? null),
  first: z
    .string()
    .or(z.number())
    .optional()
    .default(10)
    .transform((v) => Number.parseInt(String(v))),
})
export type LibraryQuery = z.infer<typeof LibraryQuery>

export const BaseResource = z.object({
  id: z.string(),
  mainImageSrc: z.string().nullable(),
})

export const LibraryStaticImage = z.object({
  resourceType: z.literal("libraryStaticImage"),
  data: z.object({
    src: z.string(),
  }),
})

export const LibraryResourceFilters = z.object({
  filters: z.object({
    tags: z.array(z.string()),
  }),
})

export type LibraryResourceFilters = z.infer<typeof LibraryResourceFilters>

export const LibraryResource = BaseResource.extend({
  title: AppLocales,
  resourceNamespace: z.literal("library"),
  description: AppLocales.nullable(),
  tags: z.array(z.string()).nullable(),
  allowedPlanSlugs: z.array(z.union([z.string(), z.literal("all")])),
  status: z.enum(["active", "draft"]),
  resource: z.discriminatedUnion("resourceType", [LibraryStaticImage]),
  createdAt: zDate,
  updatedAt: zDate,
  cursor: z.number(),
})
export type LibraryResourceTypeUnion = LibraryResource["resource"]["resourceType"]

// export const LibraryResourceType = z.enum([
//   LibrarySizeChart.shape.resourceType.value,
//   LibraryStaticImage.shape.resourceType.value,
// ])

export const ShopifyResource = BaseResource.extend({
  resourceNamespace: z.literal("shopify"),
  // FIXME: redundancy with title title here and inside resource, this is shit
  title: z.string(),
  resource: z.discriminatedUnion("resourceType", [
    z.object({ resourceType: z.literal("product"), title: z.string() }),
    z.object({ resourceType: z.literal("collection"), title: z.string() }),
  ]),
})

export type ShopifyResource = z.infer<typeof ShopifyResource>

export type ShopifyResourceTypeUnion = ShopifyResource["resource"]["resourceType"]

export type LibraryResource = z.infer<typeof LibraryResource>

// Extract doesn't work like this Extract<LibraryResource, {resource: {resourceType: "libraryStaticImage"}} so I've made a generic in order to constrain R
export type GetLibraryResource<TResourceType extends LibraryResource["resource"]["resourceType"]> =
  LibraryResource extends { resource: infer R }
    ? R extends { resourceType: TResourceType }
      ? Omit<LibraryResource, "resource"> & { resource: R }
      : never
    : never

export const ShopifyQuery = z.object({
  query: z.string(),
  endCursor: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((v) => v ?? null),
  first: z
    .string()
    .or(z.number())
    .optional()
    .default(10)
    .transform((v) => Number.parseInt(String(v))),
})

export type ShopifyQuery = z.infer<typeof ShopifyQuery>
export type LibraryStaticImage = GetLibraryResource<"libraryStaticImage">

export const Resource = z.discriminatedUnion("resourceNamespace", [
  LibraryResource,
  ShopifyResource,
])
export type Resource = z.infer<typeof Resource>

export type ResourceNamespace = Resource["resourceNamespace"]
export type ResourceType = Resource["resource"]["resourceType"]
