// @ts-expect-error
export const locale = window?.shopify?.config?.locale
export const rootLocale = locale?.split("-").at(0) ?? "en"
export const shopifyApiBaseUrl = "https://mock.shop/api"
