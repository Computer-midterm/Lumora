// Chooses which pre-built resolution of the sequence a device should use. Pure functions, unit-tested.
//
// Two decisions:
//  - scrub tier: the one resolution fetched for the whole sequence while scrolling;
//  - rest tier:  a sharper version of ONE frame, fetched only when scrolling comes to rest
//                (so a 4K frame is never part of the scrolling download).

export interface Tier {
  width: number;
  height: number;
  bytes: number;
}

export interface DeviceHints {
  /** CSS width of the artwork box on screen. */
  boxCssWidth: number;
  /** window.devicePixelRatio */
  dpr: number;
  /** navigator.deviceMemory in GB, when the browser reports it. */
  deviceMemory?: number;
  /** Touch-first device (phones, tablets). */
  coarsePointer: boolean;
  /** Data Saver, or a 2G/3G-class connection. */
  constrainedNetwork: boolean;
}

export interface TierPlan {
  scrub: Tier;
  /** Sharper tier for the resting frame, or null when the scrub tier is already enough. */
  rest: Tier | null;
  /** How many decoded frames may be kept around the current position. */
  windowSize: number;
  /** Fetch every Nth frame only (2 on constrained networks). */
  stride: 1 | 2;
  /** Device pixels the canvas backing store should be wide. */
  canvasWidth: number;
}

/** Smallest tier at least `need` wide (within `tolerance`), else the largest allowed. */
function smallestCovering(tiers: readonly Tier[], need: number, maxWidth: number, tolerance = 0.92): Tier {
  const allowed = tiers.filter((t) => t.width <= maxWidth);
  const pool = allowed.length ? allowed : [tiers[0]];
  return pool.find((t) => t.width >= need * tolerance) ?? pool[pool.length - 1];
}

const decodedMB = (t: Tier) => (t.width * t.height * 4) / 1048576;

export function planTiers(tiersIn: readonly Tier[], d: DeviceHints): TierPlan {
  const tiers = [...tiersIn].sort((a, b) => a.width - b.width);
  const smallMemory = typeof d.deviceMemory === 'number' && d.deviceMemory <= 4;

  // Scrubbing counts at most 2 device px per CSS px: beyond that the eye cannot follow moving lines.
  const scrubNeed = d.boxCssWidth * Math.min(Math.max(d.dpr, 1), 2);
  let scrubCap = 2560;
  if (d.coarsePointer || smallMemory) scrubCap = 1440;
  // (navigator.connection.downlink is deliberately not used: it is an estimate that is often wrong
  // on a fresh page, e.g. 1.7 Mbps reported on a fast local connection.)
  if (d.constrainedNetwork) scrubCap = 960;
  const scrub = smallestCovering(tiers, scrubNeed, scrubCap);

  // At rest the full pixel density counts (up to 3x). Never on constrained networks.
  const restNeed = d.boxCssWidth * Math.min(Math.max(d.dpr, 1), 3);
  const restCap = d.coarsePointer || smallMemory ? 2560 : 3840;
  const restPick = d.constrainedNetwork ? scrub : smallestCovering(tiers, restNeed, restCap);
  const rest = restPick.width > scrub.width ? restPick : null;

  // Decoded frames are width*height*4 bytes each: bound them by a memory budget, not a fixed count.
  const budgetMB = d.coarsePointer || smallMemory ? 72 : 150;
  const windowSize = Math.max(8, Math.min(36, Math.floor(budgetMB / decodedMB(scrub))));

  // Backing store: the artwork's real device-pixel width, never more than the sharpest tier in use.
  const canvasWidth = Math.max(2, Math.round(Math.min((rest ?? scrub).width, restNeed)));
  return { scrub, rest, windowSize, stride: d.constrainedNetwork ? 2 : 1, canvasWidth };
}
