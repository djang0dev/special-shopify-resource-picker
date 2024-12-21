import toast from "react-hot-toast/headless"
import type { ErrorActorEvent } from "xstate"

export type HttpStatus =
  | 100
  | 101
  | 102
  | 103
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226
  | 300
  | 301
  | 302
  | 303
  | 304
  | 305
  | 306
  | 307
  | 308
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 419
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511

export interface AppHttpExceptionPayload<TExceptionTypes, TExceptionCodes> {
  type?: TExceptionTypes
  code?: TExceptionCodes
  status?: number
  isOperational?: boolean
  message: string
  errorDetails?: { key: string; value: string }[]
  additionalInfo?: Record<string, unknown>
  rawError: Error
  stackTrace?: string
}
export type AppHttpExceptionClientPayload<TExceptionTypes, TExceptionCodes> = Omit<
  AppHttpExceptionPayload<TExceptionTypes, TExceptionCodes>,
  "rawError" | "stack"
>

export interface SerializedHttpErrorClient {
  http: {
    method: string
    status: HttpStatus
    requestId: string
    path: string
  }
  error: AppHttpExceptionClientPayload<string, string>
  metas: {
    dateISOString: string
    timestamp: number
  }
}

const isASerializedHttpErrorClient = (error: unknown): error is SerializedHttpErrorClient =>
  typeof error === "object" &&
  error !== null &&
  "http" in error &&
  "error" in error &&
  "metas" in error
export const handleInvokeError = ({ event }: { event: ErrorActorEvent }): void => {
  console.error(event.error)
  const error = event.error ?? {}
  if (isASerializedHttpErrorClient(error)) {
    // @ts-expect-error TODO: Fix because not sure about error handling with client side error (not from the api)
    toast.error(error, { style: { maxHeight: "150px" } })
    return
  }
  toast.error(Reflect.get(error, "message") ?? "Something went wrong, please contact support.")
}
