import Link from "next/link";
import type { MatchWithTeams } from "@/lib/queries";
import { STAGE_NAMES } from "@/lib/types";
import { LocalTime } from "./LocalTime";

function TeamCell({
  team,
  label,
  align,
}: {
  team: MatchWithTeams["home"];
  label: string | null;
  align: "left" | "right";
}) {
  const content = team ? (
    <Link
      href={`/teams/${team.id}`}
      className="font-semibold text-ink transition-colors hover:text-pitch hover:underline underline-offset-2"
    >
      {align === "right" ? (
        <>
          {team.name} <span aria-hidden>{team.flag}</span>
        </>
      ) : (
        <>
          <span aria-hidden>{team.flag}</span> {team.name}
        </>
      )}
    </Link>
  ) : (
    <span className="text-ink-faint">{label}</span>
  );
  return <div className={align === "right" ? "text-right" : "text-left"}>{content}</div>;
}

/**
 * One schedule row: home — score/time — away, with stage/venue metadata.
 * `live` = kicked off but no result recorded yet.
 */
export function MatchRow({ match }: { match: MatchWithTeams }) {
  const finished = match.status === "finished";
  const live = !finished && new Date(match.kickoff_utc) <= new Date();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2.5 sm:px-4">
      <TeamCell team={match.home} label={match.home_label} align="right" />
      <div className="min-w-20 text-center">
        {finished ? (
          <span className="score-num text-2xl leading-none">
            {match.home_goals}–{match.away_goals}
          </span>
        ) : live ? (
          <span className="inline-block bg-signal px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-paper">
            In play
          </span>
        ) : (
          <span className="text-sm font-semibold text-ink-soft">
            <LocalTime iso={match.kickoff_utc} mode="time" />
          </span>
        )}
      </div>
      <TeamCell team={match.away} label={match.away_label} align="left" />
      <div className="col-span-3 -mt-1 text-center text-[11px] uppercase tracking-wider text-ink-faint">
        {match.group_name ? `Group ${match.group_name}` : STAGE_NAMES[match.stage]} · {match.venue},{" "}
        {match.city}
      </div>
    </div>
  );
}
