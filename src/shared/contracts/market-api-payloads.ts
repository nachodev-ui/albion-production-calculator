import type { paths as CentralApiPaths } from './central-api.generated'
import type { paths as LocalReceiverPaths } from './local-receiver.generated'

type JsonResponse<Response> = Response extends {
  readonly content: {
    readonly 'application/json': infer Body
  }
}
  ? Body
  : never

type OkResponse<Operation> = Operation extends {
  readonly responses: {
    readonly 200: infer Response
  }
}
  ? JsonResponse<Response>
  : never

type DataRow<Envelope> = Envelope extends {
  readonly data?: infer Data
}
  ? NonNullable<Data> extends readonly (infer Row)[]
    ? Row
    : never
  : never

type HistoryPoint<Row> = Row extends {
  readonly history?: infer History
}
  ? NonNullable<History> extends readonly (infer Point)[]
    ? Point
    : never
  : never

export type CentralMarketCatalogEnvelope = OkResponse<
  CentralApiPaths['/api/v1/markets']['get']
>

export type LocalMarketCatalogEnvelope = OkResponse<
  LocalReceiverPaths['/api/v1/markets']['get']
>

export type MarketCatalogEnvelope =
  | CentralMarketCatalogEnvelope
  | LocalMarketCatalogEnvelope

export type CentralPriceEnvelope = OkResponse<
  CentralApiPaths['/api/v1/prices/query']['post']
>

export type LocalPriceEnvelope = OkResponse<
  LocalReceiverPaths['/api/v1/prices']['get']
>

export type MarketPriceEnvelope = CentralPriceEnvelope | LocalPriceEnvelope

export type MarketPriceRow =
  | DataRow<CentralPriceEnvelope>
  | DataRow<LocalPriceEnvelope>

export type CentralHistoryEnvelope = OkResponse<
  CentralApiPaths['/api/v1/history/query']['post']
>

export type LocalHistoryEnvelope = OkResponse<
  LocalReceiverPaths['/api/v1/history']['get']
>

export type CentralHistorySeriesPayload = DataRow<CentralHistoryEnvelope>
export type LocalHistoryRecord = DataRow<LocalHistoryEnvelope>

export type MarketHistoryPointPayload =
  | HistoryPoint<CentralHistorySeriesPayload>
  | HistoryPoint<LocalHistoryRecord>
