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

interface DataResponse extends KeyValue {
  code: number
  msg: string
  data: any
}
