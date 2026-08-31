export interface RoundingConfig {
  enabled?: boolean;
  strategy?: 'NEAREST' | 'UP' | 'DOWN';
}

export interface RoundingResult {
  roundedTotal: number; // in paise
  roundOff: number; // in paise (+/-)
}

/**
 * Applies hospitality bill rounding to an unrounded amount in paise.
 * If rounding is disabled, roundOff is 0 and roundedTotal = unroundedPaise.
 *
 * Strategies:
 * - NEAREST: Standard half-up to nearest whole unit (Math.round(val / 100) * 100)
 * - UP: Always rounds up to next whole unit (Math.ceil(val / 100) * 100)
 * - DOWN: Always rounds down to lower unit (Math.floor(val / 100) * 100)
 */
export function calculateRoundOff(
  unroundedPaise: number,
  config?: RoundingConfig
): RoundingResult {
  const unrounded = Math.round(unroundedPaise || 0);

  if (!config || config.enabled === false) {
    return {
      roundedTotal: unrounded,
      roundOff: 0,
    };
  }

  const strategy = config.strategy || 'NEAREST';
  let roundedTotal = unrounded;

  if (strategy === 'UP') {
    roundedTotal = Math.ceil(unrounded / 100) * 100;
  } else if (strategy === 'DOWN') {
    roundedTotal = Math.floor(unrounded / 100) * 100;
  } else {
    // Default: NEAREST
    roundedTotal = Math.round(unrounded / 100) * 100;
  }

  const roundOff = roundedTotal - unrounded;

  return {
    roundedTotal,
    roundOff,
  };
}
