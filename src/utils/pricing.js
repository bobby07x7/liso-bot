// Simple supply/demand pricing model.
// More supply -> price drifts down toward base. More demand pressure -> price rises.
// demand_pressure accumulates from buy/sell nudges between ticks, then is folded
// into current_price and decayed back toward 0 on each tick.

function computeNextPrice(basePrice, currentPrice, supply, demandPressure) {
  const supplyFactor = clamp(1000 / Math.max(supply, 50), 0.5, 3); // scarce supply -> higher factor
  const demandFactor = 1 + clamp(demandPressure / 100, -0.6, 1.5);

  let target = basePrice * supplyFactor * demandFactor;
  target = clamp(target, basePrice * 0.4, basePrice * 5);

  // Ease current price toward target rather than snapping (smoother chart)
  const next = currentPrice + (target - currentPrice) * 0.35;
  return Math.max(1, Math.round(next));
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

module.exports = { computeNextPrice };
