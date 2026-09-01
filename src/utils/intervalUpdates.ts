import { BigDecimal, ethereum, Value } from '@graphprotocol/graph-ts'

import { Bundle, Pool, PoolData, PoolManager, ProtocolData, Token, TokenData } from './../types/schema'
import { ZERO_BI } from './constants'

// Timeseries rows are append-only: graph-node assigns id and timestamp on
// save (host_exports store_set overwrites both before validation) and rolls
// rows up into the PoolStats/TokenStats/ProtocolStats aggregations at each
// hour/day boundary. We still set timestamp so the matchstick store sees a
// value, but as a plain i64: matchstick 0.6.0 cannot decode the Timestamp
// value kind, and graph-node discards the mapping-set value either way.

function eventTimestamp(event: ethereum.Event): i64 {
  return event.block.timestamp.toI64() * 1_000_000
}

/**
 * Record a protocol-level datapoint. Volume arguments are the deltas
 * contributed by this event; TVL is the state after the event.
 */
export function recordProtocolData(
  poolManager: PoolManager,
  event: ethereum.Event,
  volumeETH: BigDecimal,
  volumeUSD: BigDecimal,
  untrackedVolumeUSD: BigDecimal,
  feesUSD: BigDecimal,
): void {
  const data = new ProtocolData(0)
  data.set('timestamp', Value.fromI64(eventTimestamp(event)))
  data.volumeETH = volumeETH
  data.volumeUSD = volumeUSD
  data.untrackedVolumeUSD = untrackedVolumeUSD
  data.feesUSD = feesUSD
  data.tvlUSD = poolManager.totalValueLockedUSD
  data.save()
}

/**
 * Record a pool datapoint. Callers pass the already-loaded (and mutated)
 * Pool so no store.get is needed.
 */
export function recordPoolData(
  pool: Pool,
  event: ethereum.Event,
  volumeToken0: BigDecimal,
  volumeToken1: BigDecimal,
  volumeUSD: BigDecimal,
  untrackedVolumeUSD: BigDecimal,
  feesUSD: BigDecimal,
): void {
  const data = new PoolData(0)
  data.set('timestamp', Value.fromI64(eventTimestamp(event)))
  data.pool = pool.id
  data.volumeToken0 = volumeToken0
  data.volumeToken1 = volumeToken1
  data.volumeUSD = volumeUSD
  data.untrackedVolumeUSD = untrackedVolumeUSD
  data.feesUSD = feesUSD
  data.liquidity = pool.liquidity
  data.sqrtPrice = pool.sqrtPrice
  data.token0Price = pool.token0Price
  data.token1Price = pool.token1Price
  const tick = pool.tick
  data.tick = tick !== null ? tick : ZERO_BI
  data.tvlUSD = pool.totalValueLockedUSD
  data.save()
}

/**
 * Record a token datapoint. Callers pass the already-loaded Bundle to avoid
 * a redundant store.get.
 */
export function recordTokenData(
  token: Token,
  event: ethereum.Event,
  bundle: Bundle,
  volume: BigDecimal,
  volumeUSD: BigDecimal,
  untrackedVolumeUSD: BigDecimal,
  feesUSD: BigDecimal,
): void {
  const data = new TokenData(0)
  data.set('timestamp', Value.fromI64(eventTimestamp(event)))
  data.token = token.id
  data.volume = volume
  data.volumeUSD = volumeUSD
  data.untrackedVolumeUSD = untrackedVolumeUSD
  data.feesUSD = feesUSD
  data.priceUSD = token.derivedETH.times(bundle.ethPriceUSD)
  data.totalValueLocked = token.totalValueLocked
  data.totalValueLockedUSD = token.totalValueLockedUSD
  data.save()
}
