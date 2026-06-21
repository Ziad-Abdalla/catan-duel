// Shared draw-stack metadata so every "tuck under a stack" / browse UI can label
// stacks consistently — including the era stacks (5, 6, …), not just the base four.

export type DeckSet =
  | 'base' | 'gold' | 'turmoil' | 'progress'
  | 'intrigue' | 'merchants' | 'barbarians' | 'explorers' | 'sages' | 'prosperity'

export const SET_LABEL: Record<DeckSet, string> = {
  base: 'Basic',
  gold: 'Era of Gold',
  turmoil: 'Era of Turmoil',
  progress: 'Innovation',
  intrigue: 'Era of Intrigue',
  merchants: 'Merchant Princes',
  barbarians: 'Era of Barbarians',
  explorers: 'Era of Explorers',
  sages: 'Era of Sages',
  prosperity: 'Era of Prosperity',
}

/** Which set a draw stack belongs to, inferred from its cards' id prefix. */
export function setOfStack(stack: string[]): DeckSet {
  return (stack[0]?.split('-')[0] ?? 'base') as DeckSet
}
