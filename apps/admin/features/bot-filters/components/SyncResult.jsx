/** Outcome of replaying a change to the fleet panels (only for fleet-shared lists). */
export function SyncResult({ peers }) {
  if (!peers || peers.length === 0) {
    return <p className="mt-1 text-xs text-red-600">Not synced: no fleet panel is configured on the server (FLEET_PEERS).</p>
  }
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-xs">
      {peers.map((p) => (
        <p key={p.peer} className={p.ok ? 'text-green-700' : 'text-red-600'}>
          {p.ok ? `Synced to ${p.peer}` : `Not synced to ${p.peer}: ${p.error || 'panel said not ok'}`}
        </p>
      ))}
    </div>
  )
}
