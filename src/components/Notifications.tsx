/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { Toast } from "@shopify/polaris"
import toast, { useToaster } from "react-hot-toast/headless"
import { handleErrorMessage } from "../utils"

export const Notifications = () => {
  const { toasts, handlers } = useToaster()
  const { startPause, endPause } = handlers
  return (
    <div onMouseEnter={startPause} onMouseLeave={endPause}>
      {toasts
        .filter((t) => t.visible)
        .map((t) => {
          if (!t) return null
          if (t.type === "error") {
            const errorMessage = handleErrorMessage(t.message)
            return (
              <div key={t.id} {...t.ariaProps} style={t.style}>
                <Toast
                  key={t.id}
                  error={true}
                  // @ts-expect-error it works with element
                  content={
                    <div className="flex w-90 justify-start overflow-y-auto overflow-x-hidden">
                      <span className="w-full line-break-normal text-wrap-wrap overflow-hidden text-overflow-ellipsis whitespace-wrap word-wrap-break-word">
                        {errorMessage}
                      </span>
                    </div>
                  }
                  onDismiss={() => {
                    toast.dismiss(t.id)
                  }}
                />
              </div>
            )
          }
          return (
            <div key={t.id} {...t.ariaProps}>
              <Toast
                key={t.id}
                content={String(t.message)}
                onDismiss={() => {
                  toast.dismiss(t.id)
                }}
              />
            </div>
          )
        })}
    </div>
  )
}
