interface KeyValue<T = any> {
  [key: string]: T
}

type JSONPrimitive = boolean | number | string | null | undefined

type JSONValue = JSONPrimitive | JSONObject | JSONArray

interface JSONObject {
  [key: string]: JSONValue
}

interface JSONArray extends Array<JSONValue> {}

interface ReadonlyJSONObject {
  readonly [key: string]: ReadonlyJSONValue
}

interface ReadonlyJSONArray extends ReadonlyArray<ReadonlyJSONValue> {}

type ReadonlyJSONValue = JSONPrimitive | ReadonlyJSONObject | ReadonlyJSONArray

interface DataResponse {
  code: number
  msg: string
  data: any
}

type FrameRate =
  | number
  | {
      exact?: number | undefined
      ideal?: number | undefined
      max?: number | undefined
      min?: number | undefined
    }

interface ConfigurableNavigator {
  navigator?: Navigator
}

interface UseDisplayMediaOptions extends ConfigurableNavigator {
  enabled?: MaybeRef<boolean>
  video?: boolean | MediaTrackConstraints | undefined
  audio?: boolean | MediaTrackConstraints | undefined
}

interface UseUserMediaOptions extends ConfigurableNavigator {
  /**
   * If the stream is enabled
   * @default false
   */
  enabled?: MaybeRef<boolean>
  /**
   * Recreate stream when deviceIds or constraints changed
   *
   * @default true
   */
  autoSwitch?: MaybeRef<boolean>
  /**
   * MediaStreamConstraints to be applied to the requested MediaStream
   * If provided, the constraints will override videoDeviceId and audioDeviceId
   *
   * @default {}
   */
  constraints?: MaybeRef<MediaStreamConstraints>
}

interface UseMediaOptions extends ConfigurableNavigator {
  enabled?: MaybeRef<boolean>
  autoSwitch?: MaybeRef<boolean>
  useScreen?: boolean
  useVideo?: boolean
  useAudio?: boolean
  videoInputDeviceId?: string
  audioInputDeviceId?: string
}
