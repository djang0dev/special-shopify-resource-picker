import * as R from "remeda"
import { LibraryResource, LibraryResourceFilters } from "./commons/entities"

export const getRandomString = (length = 10) =>
  (Math.random() + 1).toString(36).substring(2, length + 2)

export const getRandomNumberFromN = (N: number): number => {
  return Math.floor(Math.random() * (N + 1))
}

/**
 * Capitalize the first letter of a string.
 * @param string
 */
export const cfl = (string: string) => string.charAt(0).toUpperCase() + string.slice(1)

/**
 * Beautify a camelCase string.
 * e.g. "myString" -> "My String"
 */
export const beautifyObjectName = (string: string) => {
  let output = string.replaceAll(/([A-Z])/g, " $1")
  output = output.charAt(0).toUpperCase() + output.slice(1)
  return output
}

export const beautifySlug = (string: string) => {
  return cfl(string.replaceAll("-", " "))
}

export const formatShopifyUrlImage = (
  url: string,
  options: {
    width?: number
    height?: number
    crop?: "bottom" | "center" | "left" | "right" | "top"
    scale?: 2 | 3
  },
): string => {
  const { width, height, crop, scale } = options
  if (width == null && height == null) return url
  let newUrl: string[] | string = url.split(/(\.[A-Za-z]+\?.*$)/)
  if (newUrl.length < 3) return url

  newUrl = `${newUrl[0]}_${width ?? ""}x${height ?? ""}${
    crop ? `_crop_${crop}` : ""
  }${scale ? `@${scale}x` : ""}${newUrl[1]}`
  return newUrl
}

export const getPaginatedItems = <T extends { cursor: number }>(
  items: T[],
  first: number,
  after?: number,
) => {
  const totalItems = items.length

  if (totalItems === 0) {
    return {
      data: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        latestCursor: after || 0,
      },
    }
  }

  const startIndex = after ? items.findIndex((item) => item.cursor > after) : 0

  if (startIndex === -1) {
    return {
      data: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: after !== undefined,
        latestCursor: after || 0,
      },
    }
  }

  const endIndex = Math.min(startIndex + first, totalItems)
  const data = items.slice(startIndex, endIndex)

  return {
    data,
    pageInfo: {
      hasNextPage: endIndex < totalItems,
      hasPreviousPage: startIndex > 0,
      endCursor: data.length > 0 ? data[data.length - 1].cursor : after || 0,
    },
  }
}

export const getPaginatedLibraryResources = <T extends LibraryResource>({
  resources,
}: {
  resources: T[]
}) => {
  const sortedResources = resources.sort((a, b) => a.cursor - b.cursor)
  return ({
    first,
    after,
    filters,
    query,
  }: {
    first: number
    after?: number
    filters: LibraryResourceFilters["filters"]
    query: string | null
  }) => {
    const lowercaseQuery = query?.toLowerCase()
    if (!sortedResources.length) {
      return {
        data: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, latestCursor: after || 0 },
      }
    }

    const allFilteredResources = filters
      ? sortedResources.filter((r) => {
          return (
            R.keys(filters)
              .map((key) => {
                const f = filters[key]
                return f.length === 0 || f.every((el) => r[key]?.includes(el))
              })
              .every(Boolean) &&
            (lowercaseQuery ? r.title["en-US"].toLowerCase().includes(lowercaseQuery) : true)
          )
        })
      : sortedResources

    const totalAllFilteredResources = allFilteredResources.length

    if (!totalAllFilteredResources) {
      return {
        data: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, latestCursor: after || 0 },
      }
    }

    const startIndex = after ? allFilteredResources.findIndex((r) => r.cursor > after) : 0

    if (startIndex === -1) {
      return {
        data: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: after !== undefined,
          latestCursor: after || 0,
        },
      }
    }

    const endIndex = Math.min(startIndex + first, totalAllFilteredResources)
    const data = allFilteredResources.slice(startIndex, endIndex)

    const endCursor = data.length > 0 ? data[data.length - 1].cursor : after || 0

    return {
      data,
      pageInfo: {
        hasNextPage: endIndex < totalAllFilteredResources,
        hasPreviousPage: startIndex > 0,
        endCursor: endCursor,
      },
    }
  }
}

// Errors
const defaultMessageError = "Something went wrong, this code is fked up"
export const handleErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error
  if (typeof error === "object" && error != null) {
    // In case of HttpErrorClient
    if ("error" in error && Reflect.get(error, "error") != null) {
      return `${String(Reflect.get(error.error ?? {}, "message"))} type: ${String(
        Reflect.get(error.error ?? {}, "type"),
      )} code: ${String(Reflect.get(error.error ?? {}, "code"))}`
    }
    if ("message" in error) return String(Reflect.get(error, "message"))
    return defaultMessageError
  }
  return defaultMessageError
}
