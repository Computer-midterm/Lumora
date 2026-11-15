// All page copy lives here so every claim can be reviewed in one place.
// Rules (from the handoff's PRODUCT_TRUTH.md / LANDING_PAGE_SPEC.md):
//  - Lumora is a working name for a product in early development.
//  - The build -> test -> repair engine is PLANNED and must be labelled that way.
//  - Illustrations and concept sketches are labelled as such. Nothing here is a product screenshot.
//  - No users, customers, testimonials, metrics, prices, dates, partners, waitlists or campaigns.

export const NAV = [
  { href: '#problem', label: 'Problem' },
  { href: '#approach', label: 'Approach' },
  { href: '#workspace', label: 'Workspace' },
  { href: '#status', label: 'Status' },
] as const;

export const HERO = {
  // Non-breaking space keeps the separator with the first phrase when the line wraps on phones.
  status: 'In development · not yet available',
  /** Two lines on wide screens; the second breaks at `titleBreak` on narrow ones. */
  titleLines: ['Build with AI.', 'Know what actually works.'],
  titleBreak: 'Know what ',
  titleEmphasis: 'actually',
  sub: 'Lumora is being developed to turn app ideas into tested web applications, with clear requirements, independent checks, and honest progress.',
  primary: { href: '#approach', label: 'See how it’s meant to work' },
  secondary: { href: '#status', label: 'Current status' },
  cue: 'Scroll to look closer',
  posterAlt:
    'A figure drawn from tangled black ink lines, seen in profile against a pale backdrop, its head a dense knot of loose strands.',
};

/** Captions that pass beside the image while the sequence plays. `at` = sequence progress (0-1). */
export const CHAPTERS = [
  { at: 0.25, kicker: 'From a distance', line: 'Everything seems to be in place.' },
  { at: 0.43, kicker: 'Up close', line: 'Now you can see what holds, and what doesn’t.' },
] as const;

// ---- The problem -----------------------------------------------------------------------------------

export const PROBLEM = {
  label: 'The problem',
  title: ['An app that looks finished', 'isn’t necessarily an app that works.'],
  lede: 'AI builders are quick to produce a convincing screen. What you rarely get is a straight answer about which parts have been checked.',
  demo: {
    caption: 'Illustration of a common pattern. Not a real app, and not a Lumora screenshot.',
    surface: { tag: 'As demoed', note: 'Every screen renders. It’s marked done.' },
    checked: { tag: 'As tested', note: 'Four things a customer would run into.' },
    app: {
      name: 'Booking',
      date: 'Thu 14',
      slots: ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30'],
      picked: 2,
      field: 'Your name',
      button: 'Confirm booking',
      done: 'Done',
    },
    findings: [
      { id: 'A', at: 'slot', title: 'Double booking', body: 'Two people can take the same slot.' },
      { id: 'B', at: 'field', title: 'Lost decision', body: 'A phone number was required last week. Now it’s gone.' },
      { id: 'C', at: 'button', title: 'Nothing saved', body: 'Confirm shows a success message. No booking is stored.' },
      { id: 'D', at: 'done', title: 'Self-reported', body: 'Marked done by the same tool that wrote the code.' },
    ],
  },
} as const;

// ---- The approach (planned) ------------------------------------------------------------------------

export const APPROACH = {
  label: 'The approach',
  badge: 'Planned · not built yet',
  title: ['From a tangle', 'to something you can check.'],
  lede: 'This is the workflow Lumora is being designed around. None of it runs in a released product today.',
  start: 'Your idea, in plain language',
  steps: [
    { title: 'Agree', body: 'You approve a plain list of what the app must do, before anything is built.' },
    { title: 'Build', body: 'A coding agent works in a sealed environment, away from your machine and accounts.' },
    { title: 'Test', body: 'Independent testers use the app like customers. They can’t touch the code or the criteria.' },
    { title: 'Repair', body: 'Failures go back for a fix. Then everything that already worked is tested again.' },
    { title: 'Report', body: 'Each feature is marked verified, failed, blocked or unfinished, with the evidence.' },
  ],
  loop: 'Test and repair repeat until it passes, or the budget you set runs out.',
  memory: { title: 'Project memory', body: 'Requirements, decisions and test history carry across every session.' },
} as const;

// ---- The workspace (concept) -----------------------------------------------------------------------

export type CheckState = 'verified' | 'failed' | 'blocked' | 'unfinished';

export const STATE_LABEL: Record<CheckState, string> = {
  verified: 'Verified',
  failed: 'Failed',
  blocked: 'Blocked',
  unfinished: 'Unfinished',
};

export const WORKSPACE = {
  label: 'The workspace',
  badge: 'Concept · not a screenshot',
  title: ['What you’d see', 'while it works.'],
  lede: 'A sketch of the workspace we’re designing toward, with made-up example data. None of it is running yet.',
  project: 'Example project · clinic booking app',
  tabs: [
    { id: 'contract', label: 'Contract', hint: 'What “done” means, approved by you' },
    { id: 'run', label: 'Test run', hint: 'Independent testers, real user flows' },
    { id: 'report', label: 'Report', hint: 'Every status, with its evidence' },
  ],
  contract: {
    head: 'Requirements · version 1',
    state: 'Waiting for your approval',
    items: [
      { id: 'R-01', text: 'A patient can book an open slot.', accept: 'The booking appears in the clinic calendar.' },
      { id: 'R-02', text: 'A slot can only be booked once.', accept: 'A second attempt on the same slot is refused.' },
      { id: 'R-03', text: 'A patient can reschedule.', accept: 'The old slot is freed, the new one is held.' },
      { id: 'R-04', text: 'Staff see today’s bookings.', accept: 'The list matches the calendar after a reload.' },
    ],
    foot: 'Nothing is built until you approve this list. Changing it later creates version 2.',
  },
  run: {
    head: 'Test run 3 · against requirements v1',
    testers: [
      { name: 'Tester A', flow: 'A new patient books a slot', steps: ['Open the calendar', 'Pick 10:00', 'Confirm', 'Reload: still booked'], result: [true, true, true, true] },
      { name: 'Tester B', flow: 'Two people want the same slot', steps: ['Both open 10:00', 'First confirms', 'Second confirms', 'Second is refused'], result: [true, true, true, false] },
      { name: 'Tester C', flow: 'A patient reschedules', steps: ['Open the booking', 'Pick 11:30', 'Confirm', 'Old slot is free'], result: [true, true, true, true] },
    ],
    foot: 'Testers report what they find. They can’t edit the code or the criteria they test against.',
  },
  report: {
    head: 'Report · requirements v1',
    rows: [
      { id: 'R-01', text: 'A patient can book an open slot.', state: 'verified', note: 'Run 3 · Tester A · recording and log' },
      { id: 'R-02', text: 'A slot can only be booked once.', state: 'failed', note: 'Run 3 · Tester B · repair attempt 2 of 3' },
      { id: 'R-03', text: 'A patient can reschedule.', state: 'verified', note: 'Run 3 · Tester C · recording and log' },
      { id: 'R-04', text: 'Staff see today’s bookings.', state: 'unfinished', note: 'Not started · budget reached' },
    ] satisfies { id: string; text: string; state: CheckState; note: string }[],
    foot: '2 of 4 verified. Work stopped at the budget you set, and the report says so.',
  },
} as const;

// ---- Status (honest, secondary) --------------------------------------------------------------------

export type Status = 'defined' | 'prototype' | 'planned' | 'undecided';

export const STATUS_LABEL: Record<Status, string> = {
  defined: 'Defined',
  prototype: 'Early prototype',
  planned: 'Not built yet',
  undecided: 'Undecided',
};

export const STATUS = {
  label: 'Where it stands',
  asOf: 'November 2026',
  title: 'Early, and honest about it.',
  rows: [
    { status: 'defined', item: 'Product direction and the planned workflow' },
    { status: 'prototype', item: 'Workspace interface: a private, local prototype with no AI connected' },
    { status: 'planned', item: 'Requirements drafting, sealed builds, independent testers, repair, evidence reports' },
    { status: 'undecided', item: 'Public name, release date, access and pricing. “Lumora” is a working name.' },
  ] satisfies { status: Status; item: string }[],
};

// ---- Closing ----------------------------------------------------------------------------------------

export const CLOSING = {
  title: ['Built for the', 'second look.'],
  body: 'When Lumora says an app works, you should be able to check. That’s the whole idea.',
  primary: { href: '#approach', label: 'Revisit the approach' },
  secondary: { href: '#top', label: 'Replay from the top' },
  /**
   * A real way to follow or contact the project, once the owner decides on one (an address, a form,
   * a page). While null, nothing is shown: no placeholder waitlist, no invented address.
   * Example: { href: 'mailto:hello@your-domain', label: 'Get in touch' }
   */
  contact: null as { href: string; label: string } | null,
  stillAlt: 'The ink-line figure from the opening, now a clean wireframe of loops against a cool grey backdrop.',
};

export const FOOTER = {
  note: 'Lumora is a working name for a product in early development. Planned features and concept sketches on this page don’t exist yet.',
};
