import { useGame } from '../../store/gameStore'
import { useUI } from '../../store/uiStore'
import './help.css'

/**
 * First-run how-to-play overlay. A manual sandbox can feel open-ended, so this
 * explains the one key idea (you control everything; the app just assists) and the
 * handful of moves. Auto-shows once (localStorage), reopenable from the HUD ?.
 */
export function HelpOverlay() {
  const open = useUI((s) => s.helpOpen)
  const setHelp = useUI((s) => s.setHelp)
  const online = useGame((s) => s.online)
  if (!open) return null
  const close = () => setHelp(false)

  return (
    <div className="help-scrim" role="dialog" aria-modal="true" aria-label="How to play" onClick={close}>
      <div className="help" onClick={(e) => e.stopPropagation()}>
        <button className="help-x" onClick={close} aria-label="Close">✕</button>
        <h2 className="help-title">How to play</h2>
        <p className="help-lead">
          This is a faithful, <strong>hands-on</strong> table for Catan Duel — it tracks everything and does the
          maths, dice and shuffling, but <strong>you</strong> decide every move. Nothing is locked; play it like the
          real cards in front of you.
        </p>
        <ul className="help-list">
          <li><b>Roll &amp; produce.</b> Hit <i>Roll dice</i>. Once they settle, matching regions glow — tap <i>Produce</i> to fill them.</li>
          <li><b>Store &amp; spend.</b> Click a region’s right half to add a resource, the left half to spend one (it rotates, max 3).</li>
          <li><b>Build.</b> Drag a road, settlement or city from the build bar onto the board — its cost is spent for you.</li>
          <li><b>Cards.</b> Drag a hand card to a building site, or tap it to play, resolve, or discard. Draw from any deck — or the discard pile.</li>
          <li><b>Advantages.</b> Tap the strength/trade discs in the centre to hand them to whoever leads.</li>
          <li><b>Events &amp; dice.</b> The event die and event cards pop up for both players; resolve them together.</li>
          <li><b>Win.</b> Reach the target VP (top bar), then <i>Claim victory</i> — your opponent agrees to end the game.</li>
          <li><b>Oops?</b> Use <i>↶ Undo</i> in the centre, or the <i>☰ Log</i> to see every action.</li>
        </ul>
        <p className="help-foot">
          {online ? 'You’re online — both screens stay in sync automatically.' : 'Pass-and-play on one screen, or open Online to play over the internet.'}
        </p>
        <button className="help-go" onClick={close}>Start playing</button>
      </div>
    </div>
  )
}
