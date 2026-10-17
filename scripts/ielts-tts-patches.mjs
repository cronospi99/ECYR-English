/**
 * IELTS Simulator voices → the platform's natural neural voices.
 *
 * Upstream records AI-voiced Listening sections with Gemini TTS. On the
 * platform, Gemini only writes the scripts and questions: each section is
 * recorded line by line with Edge neural voices through window.__ecyrTts
 * (src/features/ielts/engine/tts.ts → /api/tts), a distinct voice per speaker,
 * as one MP3. Used by scripts/import-ielts.mjs; every patch asserts it matches.
 *
 * Also runnable on an already-imported engine:
 *   node scripts/ielts-tts-patches.mjs src/features/ielts/engine/ielts-engine.js
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const NEW_TTS = `// Natural neural voices from the ECYR platform (window.__ecyrTts, served by
// /api/tts). Gemini only writes the scripts and questions; it never generates audio.
function ttsError(message, code, wait){ const e = new Error(message); e.code = code; e.wait = wait || 0; return e; }

// One voice per speaker, never the same voice twice in a section (names for the progress and the track note).
function naturalVoicesFor(part){
  const tts = window.__ecyrTts;
  return (tts ? tts.voicesFor(part) : []).map(v=>({ speaker:v.speaker, voice:v.voice }));
}

// One recorded section as MP3 ({ b64, mime }). Throws .code "quota" when the
// natural voices are unavailable (signed out, service down), so the caller
// falls back to the device's voice for the rest.
async function callNaturalTTS(part){
  const tts = window.__ecyrTts;
  if(!tts) throw ttsError("Natural voices are not available in this version.", "quota");
  try{ return await tts.recordSection(part); }
  catch(e){ throw ttsError((e && e.message) || "Natural voices are not available right now.", "quota"); }
}

`;

export function applyTtsPatches(js, log = () => undefined) {
  const patch = (label, find, replace) => {
    if (!js.includes(find)) throw new Error(`tts patch "${label}" no longer matches — update scripts/ielts-tts-patches.mjs`);
    js = js.replace(find, replace);
    log(label);
  };
  const region = (label, start, end, replace) => {
    const a = js.indexOf(start);
    const b = js.indexOf(end, a);
    if (a < 0 || b < 0) throw new Error(`tts patch "${label}" no longer matches — update scripts/ielts-tts-patches.mjs`);
    js = js.slice(0, a) + replace + js.slice(b);
    log(label);
  };

  region(
    'tts: drop Gemini voice list',
    'const TTS_VOICES = {',
    'const LISTENING_AI_ACCENTS = {',
    '// Voices: natural neural voices from the platform (naturalVoicesFor / callNaturalTTS below).\n',
  );
  region('tts: natural voices instead of Gemini TTS', "// Gemini's voices, one per speaker, never the same voice twice in a section.", "/* ---- the device's own voice ----", NEW_TTS);
  patch('tts: voices per section', '      const voices = pickTTSVoices(part.speakers);', '      const voices = naturalVoicesFor(part);');
  patch(
    'tts: record a section',
    'await callGeminiTTS(ttsTextFor(part, part.accent), voices), { ai:true, name:`${part.title}.wav` }',
    'await callNaturalTTS(part), { ai:true, name:`${part.title}.mp3` }',
  );
  patch('tts: library file extension', '.slice(0, 80) + ".wav";', '.slice(0, 80) + (custom[i].mime === "audio/mpeg" ? ".mp3" : ".wav");');
  patch(
    'tts: library file type',
    'new Blob([bytes], { type:"audio/wav" }), { contentType:"audio/wav", upsert:true }',
    'new Blob([bytes], { type:custom[i].mime || "audio/wav" }), { contentType:custom[i].mime || "audio/wav", upsert:true }',
  );
  patch(
    'tts: track note',
    '["AI voices (Gemini)", `Recorded with ${escapeHtml((part.voices || []).join(" & ") || "Gemini voices")}',
    '["Natural AI voices", `Recorded with ${escapeHtml((part.voices || []).join(" & ") || "natural voices")}',
  );
  patch(
    'tts: card copy for students',
    "The AI writes four new sections and 40 questions; your device's voice reads them aloud. (Your teacher makes the natural AI-voiced tests and adds them to the class library — Option 1.)",
    "The AI writes four new sections and 40 questions; natural neural voices read them aloud, a different voice for each speaker (your device's voice if they are unavailable).",
  );
  patch(
    'tts: card copy',
    "then Gemini reads them aloud with natural voices, two in the conversations. Free: the voice quota allows a few tests a day; if it runs out, your device's voice reads the rest.",
    "then natural neural voices read them aloud, a different voice for each speaker. If the voices are unavailable, your device's voice reads the rest.",
  );
  patch(
    'tts: translator listens through the platform',
    `  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(T.result.text);`,
    `  try{
    if(window.__ecyrTts){ window.__ecyrTts.say(T.result.text, T.to); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(T.result.text);`,
  );
  // Sections without a recording: read live by the platform (natural voices, device voice as fallback).
  patch(
    'tts: live reading through the platform',
    'function speakPartInBrowser(part, rate, onend){\n',
    'function speakPartInBrowser(part, rate, onend){\n  if(window.__ecyrTts) return window.__ecyrTts.playPart(part, rate, onend);\n',
  );
  return js;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/ielts-tts-patches.mjs <ielts-engine.js>');
    process.exit(1);
  }
  fs.writeFileSync(file, applyTtsPatches(fs.readFileSync(file, 'utf8'), (l) => console.log(`  ✓ ${l}`)));
}
