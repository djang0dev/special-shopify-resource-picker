import "@shopify/polaris/build/esm/styles.css"

import { AppProvider } from "@shopify/polaris"
import { type ReactNode, useLayoutEffect, useState } from "react"
import { rootLocale } from "../environment.ts"

// For now the app is translated in en and fr exclusively
const languageMapper = new Map([
  ["fr", () => import("@shopify/polaris/locales/fr.json")] as const,
  ["en", () => import("@shopify/polaris/locales/en.json")] as const,
])
export const PolarisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [translation, setTranslation] = useState<any>(null)

  useLayoutEffect(() => {
    const loadTranslation = async () => {
      const l = languageMapper.get(rootLocale as any)
      if (l) {
        const result = await l()
        setTranslation(result)
      } else {
        const fallbackLanguageCallback = languageMapper.get("en")
        if (fallbackLanguageCallback) {
          const result = await fallbackLanguageCallback()
          setTranslation(result)
        }
      }
    }

    loadTranslation()
  }, [])

  if (!translation) {
    return null
  }

  return <AppProvider i18n={translation}>{children}</AppProvider>
}
