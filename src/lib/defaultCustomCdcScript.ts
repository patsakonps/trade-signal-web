export const defaultCustomCdcScript = `function calculate(ctx) {
  const { candles, params, helpers } = ctx;

  const src = helpers.ohlc4(candles);
  const ap = helpers.ema(src, params.apPeriod ?? 2);
  const fast = helpers.ema(ap, params.shortPeriod ?? 12);
  const slow = helpers.ema(ap, params.longPeriod ?? 26);

  const series = candles.map((candle, i) => {
    const bullish = fast[i] > slow[i];
    const bearish = fast[i] < slow[i];
    const previousBullish = i > 0 ? fast[i - 1] > slow[i - 1] : false;
    const previousBearish = i > 0 ? fast[i - 1] < slow[i - 1] : false;

    const green = bullish && ap[i] > fast[i];
    const red = bearish && ap[i] < fast[i];
    const yellow = bullish && ap[i] < fast[i];
    const blue = bearish && ap[i] > fast[i];

    const buy = bullish && previousBearish;
    const sell = bearish && previousBullish;

    return {
      time: candle.openTime,
      price: candle.close,
      zone: green ? "GREEN" : red ? "RED" : yellow ? "YELLOW" : blue ? "BLUE" : "WHITE",
      signal: buy ? "BUY" : sell ? "SELL" : "HOLD",
      color: green ? "GREEN" : red ? "RED" : yellow ? "YELLOW" : blue ? "BLUE" : "WHITE",
      values: {
        AP: ap[i],
        Fast: fast[i],
        Slow: slow[i],
        Bullish: bullish,
        Bearish: bearish
      }
    };
  });

  const latest = series[series.length - 1];

  return {
    indicatorKey: "CUSTOM_CDC",
    latest,
    series,
    alerts: [
      { name: "Buy Signal", triggered: latest.signal === "BUY", message: "Buy" },
      { name: "Sell Signal", triggered: latest.signal === "SELL", message: "Sell" }
    ]
  };
}`;
