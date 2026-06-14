export function getBinanceChartUrl(symbol: string): string {
  return `https://www.binance.com/en/trade/${symbol.toUpperCase()}?type=spot`;
}

export function getTradingViewChartUrl(symbol: string): string {
  return `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol.toUpperCase()}`;
}
