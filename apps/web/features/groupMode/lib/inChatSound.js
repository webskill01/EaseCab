let ctx

/**
 * Soft bubble pop when a ride lands in the open chat. Synthesised with Web Audio,
 * so no asset to load; the chat was opened by a tap, so the browser allows audio.
 */
export function playInChatPop() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    // Bubble pop, notification-style: a round body whose pitch flicks UP (the "pop"),
    // a near-instant attack for the sharp edge, then a soft high ping riding on top.
    const t = ctx.currentTime
    const note = (at, type, from, to, vol, len) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(from, at)
      osc.frequency.exponentialRampToValueAtTime(to, at + 0.03)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(vol, at + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + len + 0.01)
    }
    note(t, 'sine', 380, 880, 0.32, 0.11)
    note(t + 0.045, 'triangle', 1320, 1480, 0.07, 0.14)
  } catch (err) {
    console.warn('in-chat sound unavailable', err) // no Web Audio: the chat just stays silent
  }
}

/** Set by the chat's Back so the list fades in on return (nothing pops in all at once). */
export const groupNav = { back: false }
