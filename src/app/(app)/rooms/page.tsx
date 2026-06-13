import Link from "next/link";
import { CreateRoomForm, JoinRoomForm } from "@/components/RoomForms";
import { userRooms } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Rooms — WCBet.fun" };
export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const user = await requireUser();
  const rooms = userRooms(user.id);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-signal">
        Private leagues, public shame
      </p>
      <h1 className="display mt-1 text-5xl">Rooms</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section>
          {rooms.length === 0 ? (
            <div className="border border-line bg-card p-8">
              <h2 className="display text-2xl">No rooms yet</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
                A room is your private league: the admin sets goal-spreads on matches, everyone
                picks a side, points settle automatically when results land. Create one or join
                with a friend&apos;s code →
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {rooms.map((room) => (
                <li key={room.id}>
                  <Link
                    href={`/rooms/${room.code}`}
                    className="ticket block p-5 pl-8 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="display text-2xl">{room.name}</span>
                      {room.isAdmin && (
                        <span className="bg-pitch-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pitch-deep">
                          you run this room
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-soft">
                      <span>
                        <span className="score-num text-xl text-pitch">#{room.myRank}</span> of{" "}
                        {room.memberCount}
                      </span>
                      <span>
                        <span className={`score-num text-xl ${room.myPoints < 0 ? "text-signal" : ""}`}>
                          {room.myPoints > 0 ? `+${room.myPoints}` : room.myPoints}
                        </span>{" "}
                        points
                      </span>
                      <span className="ml-auto font-mono text-xs tracking-[0.25em] text-ink-faint">
                        {room.code}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <div className="border-2 border-ink bg-card p-5">
            <h2 className="display text-2xl">Start a room</h2>
            <p className="mb-4 mt-1 text-xs text-ink-soft">
              You become the bookmaker — you set the lines.
            </p>
            <CreateRoomForm />
          </div>
          <div className="border border-line bg-card p-5">
            <h2 className="display text-2xl">Have a code?</h2>
            <p className="mb-4 mt-1 text-xs text-ink-soft">Codes are 6 characters, case-insensitive.</p>
            <JoinRoomForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
