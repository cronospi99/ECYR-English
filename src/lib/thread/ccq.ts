/**
 * Bancos de CCQ (concept-checking questions) por regla gramatical (ProfileRule.id).
 * Preguntas de sí/no sobre el CONCEPTO (tiempo, certeza, obligación…), nunca con la estructura meta
 * ni sobre la historia. Si una regla no tiene banco no se genera ningún ítem.
 */
type Q = [q: string, a: string];

const BANK: Record<string, Q[]> = {
  'past-simple': [['Is it finished?', 'Yes.'], ['Is it happening now?', 'No.']],
  'past-continuous': [['Was the action in progress at that time?', 'Yes.'], ['Is it happening now?', 'No.']],
  'past-perfect': [['Did both things happen before now?', 'Yes.'], ['Did one happen before the other?', 'Yes.']],
  'present-perfect': [['Did it happen before now?', 'Yes.'], ['Do we know exactly when?', 'No.'], ['Is it important now?', 'Yes.']],
  'perfect-continuous': [['Did it start in the past?', 'Yes.'], ['Is it still going on?', 'Yes, or it has just stopped.']],
  'used-to': [['Did it happen many times?', 'Yes.'], ['Does it happen now?', 'No.']],
  future: [['Is it happening now?', 'No.'], ['Is it decided?', 'Yes.']],
  'goals-perfect': [['Will it be finished at that time?', 'Yes.'], ['Has it happened already?', 'No.']],
  'first-conditional': [['Is it possible?', 'Yes.'], ['Is it certain?', 'No.'], ['Has it happened yet?', 'No.']],
  'unreal-conditional': [['Is it real now?', 'No.'], ['Is it likely?', 'No.']],
  'inversion-conditionals': [['Is it a condition?', 'Yes.'], ['Is it likely?', 'No.']],
  wish: [['Is it true now?', 'No.'], ['Does the person want it to be different?', 'Yes.']],
  'past-modal-judge': [['Did it happen?', 'No.'], ['Can we change it now?', 'No.']],
  'past-modal-cert': [['Are we completely sure?', 'No.'], ['Is it a guess?', 'Yes.']],
  'past-obligation': [['Was it necessary?', 'Yes.'], ['Is it finished?', 'Yes.']],
  certainty: [['Are we completely sure?', 'No.'], ['Is it a guess?', 'Yes.']],
  necessity: [['Is there a choice?', 'No.'], ['Is it necessary?', 'Yes.']],
  advice: [['Is it a rule?', 'No.'], ['Is it a good idea?', 'Yes.']],
  expectations: [['Is it written in a law?', 'No.'], ['Do many people expect it?', 'Yes.']],
  passive: [['Is the person who did it important here?', 'No.'], ['Is the focus on the action?', 'Yes.']],
  'passive-modal': [['Is the person who does it important here?', 'No.'], ['Is it a recommendation?', 'Yes.']],
  'tell-say': [['Are these the exact words?', 'No.'], ['Is it about something that was said before?', 'Yes.']],
  'past-distancing': [['Is it about the past?', 'No.'], ['Is it more polite?', 'Yes.']],
  'future-in-past': [['Was it in the future at that time?', 'Yes.'], ['Do we know if it happened?', 'No.']],
  'would-requests': [['Is it a command?', 'No.'], ['Is it polite?', 'Yes.']],
  superlative: [['Is one thing more than all the others?', 'Yes.'], ['Are they all the same?', 'No.']],
  comparison: [['Are they the same?', 'No.'], ['Is there a difference?', 'Yes.']],
  'comparative-nuance': [['Are the two things changing together?', 'Yes.'], ['Are they the same?', 'No.']],
  contrast: [['Are the two ideas different?', 'Yes.'], ['Is the second idea a surprise?', 'Yes.']],
  sequence: [['Did one thing happen before the other?', 'Yes.'], ['Did they happen at the same time?', 'No.']],
  frequency: [['Is it a habit?', 'Yes.'], ['Is it only happening now?', 'No.']],
  'present-continuous': [['Is it happening now?', 'Yes.'], ['Is it finished?', 'No.']],
  hedging: [['Is the speaker completely sure?', 'No.'], ['Is the speaker trying to sound careful?', 'Yes.']],
  preference: [['Does the person have a choice?', 'Yes.'], ['Is it the first choice?', 'Yes.']],
  because: [['Is it the reason?', 'Yes.'], ['Does it come before the result in time?', 'Yes.']],
  'object-placement': [['Is the meaning the same in both orders?', 'Yes.']],
};

export const ccqBank = (ruleId?: string): Q[] => (ruleId ? (BANK[ruleId] ?? []) : []);
export const hasCcq = (ruleId?: string) => ccqBank(ruleId).length > 0;
