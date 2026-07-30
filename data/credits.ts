/**
 * Authorship, in one place so it never falls out of sync between the lobby,
 * the mission report, the page metadata and the README.
 */
export const CREDITS = {
  author: 'Dr. Lai Chin Siong',
  /** Shown on the lobby and the mission report. */
  line: 'Created by Dr. Lai Chin Siong',
  /**
   * Add an institution here if you want it on screen, e.g.
   *   affiliation: 'Universiti Tun Hussein Onn Malaysia'
   * Leave empty to show the name alone.
   */
  affiliation: '',
  year: 2026
} as const;
