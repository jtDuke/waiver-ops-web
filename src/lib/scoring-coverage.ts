/**
 * Plain-language names for the league scoring rules the engine reports it
 * cannot evaluate.
 *
 * Sleeper's weekly projections do not carry every stat a league scores. When a
 * rule has no projected stat behind it, the value model silently leaves it out,
 * so players who earn points that way are ranked as if they did not. The board
 * has to say so rather than present the ranking as complete.
 */

const SETTING_LABELS: Record<string, string> = {
  kr_yd: "kick-return yards",
  pr_yd: "punt-return yards",
  def_kr_yd: "defensive kick-return yards",
  def_pr_yd: "defensive punt-return yards",
  st_ff: "special-teams forced fumbles",
  st_fum_rec: "special-teams fumble recoveries",
  st_td: "special-teams touchdowns",
  fum_rec_td: "fumble-recovery touchdowns",
  pass_td_50p: "50-yard passing touchdowns",
  rec_td_50p: "50-yard receiving touchdowns",
  rush_td_50p: "50-yard rushing touchdowns",
  fgm_50_59: "50 to 59 yard field goals",
  fgm_60p: "60-yard field goals",
  blk_kick_ret_yd: "blocked-kick return yards",
  pass_cmp_40p: "40-yard completions",
  rec_40p: "40-yard receptions",
  rush_40p: "40-yard runs",
};

export function scoringSettingLabel(setting: string): string {
  return SETTING_LABELS[setting] ?? setting.replace(/_/g, " ");
}

export function scoringSettingList(settings: readonly string[]): string {
  const labels = settings.map(scoringSettingLabel);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

const NOTE_TEXT: Record<string, string> = {
  "unsupported scoring settings":
    "Some of this league's scoring rules have no projected stat behind them, so this player's value leaves them out.",
  "missing player projection week":
    "This player has no projection for at least one week in the three-week window.",
  "incomplete starter projections":
    "Some of this team's current starters have no projection this week, so the lineup it is compared against is provisional.",
};

export function completenessNoteText(note: string): string {
  return NOTE_TEXT[note] ?? note;
}
