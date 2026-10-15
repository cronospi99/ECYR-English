/* ---- ECYR: uploaded speaking answers (spliced in by scripts/import-ielts.mjs) ----
   A pre-recorded answer takes the same path as a live take: stored per slot,
   playable after any re-render, timed, and — when AI is available —
   transcribed, so the metrics, the language tools and transcript-based marking
   all see it. Without AI the learner can still type what they said. */
const IX_AUDIO_MAX = 18 * 1024 * 1024; // Gemini's inline-audio ceiling
const IX_AUDIO_EXT = /\.(mp3|m4a|mp4|aac|wav|ogg|oga|opus|webm|flac|amr|3gp)$/i;
const IX_AUDIO_URLS = {};
const IX_AUDIO_NOTE = {};

const IX_TRANSCRIBE_PROMPT = `You transcribe recordings of English learners answering a speaking-test question.
Write exactly what the speaker says, in English, as plain text: keep their grammar mistakes, repetitions, false starts and filler words (um, uh, er, like, you know) exactly as spoken — never correct or improve anything.
No timestamps, no speaker labels, no quotation marks, no commentary. If a word is unclear write [unclear]. If there is no intelligible speech at all, reply with exactly: [no speech]`;

function ixAudioMime(file){
  if(file.type) return file.type;
  const ext = ((file.name || "").match(/\.([a-z0-9]+)$/i) || [])[1] || "";
  return ({ mp3:"audio/mpeg", m4a:"audio/mp4", mp4:"audio/mp4", aac:"audio/aac", wav:"audio/wav", ogg:"audio/ogg",
            oga:"audio/ogg", opus:"audio/ogg", webm:"audio/webm", flac:"audio/flac", amr:"audio/amr", "3gp":"audio/3gpp" })[ext.toLowerCase()] || "audio/mpeg";
}

// One object URL per stored take, rebuilt only when the take changes.
function ixAudioUrl(slot){
  const S = state.speaking;
  const b64 = S.audioB64 && S.audioB64[slot];
  if(!b64) return "";
  const hit = IX_AUDIO_URLS[slot];
  if(hit && hit.b64 === b64) return hit.url;
  if(hit) URL.revokeObjectURL(hit.url);
  try{
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: S.audioMime[slot] || "audio/webm" }));
    IX_AUDIO_URLS[slot] = { b64, url };
    return url;
  }catch(e){ return ""; }
}

function ixAudioDuration(file){
  return new Promise(resolve=>{
    const a = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const done = d => { URL.revokeObjectURL(url); resolve(isFinite(d) && d > 0 ? Math.round(d) : 0); };
    a.preload = "metadata";
    a.onloadedmetadata = ()=>{
      // Some recorders (webm/opus) report Infinity until the end is sought.
      if(a.duration === Infinity){ a.currentTime = 1e7; a.ontimeupdate = ()=>{ a.ontimeupdate = null; done(a.duration); }; }
      else done(a.duration);
    };
    a.onerror = ()=>done(0);
    setTimeout(()=>done(a.duration), 8000);
    a.src = url;
  });
}

function ixAudioDropHtml(slot, label){
  const S = state.speaking;
  const has = !!(S.audioB64 && S.audioB64[slot]);
  const note = IX_AUDIO_NOTE[slot];
  return `
    <div class="ix-audio-drop ${has ? "has" : ""}" id="ixAudioDrop" role="button" tabindex="0" aria-label="${escapeXml(label)}">
      <input type="file" id="audioUpload" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac,.flac" hidden>
      <span class="ix-ad-ico" aria-hidden="true">${has ? "🎧" : "⬆"}</span>
      <span class="ix-ad-txt">
        <b>${has ? "Answer audio attached — drop another file to replace it" : escapeXml(label)}</b>
        <small>Drag an audio file here or click to choose · MP3, M4A, WAV, OGG, WEBM · up to 18 MB${geminiAvailable() ? " · AI writes the transcript for you" : ""}</small>
      </span>
    </div>
    <div class="ix-ad-status ${note ? note.kind : ""}" id="ixAudioStatus" role="status">${note ? escapeXml(note.text) : ""}</div>
    <div id="audioPlayback"></div>`;
}

function ixWireAudioDrop(slot, prompt, rerender){
  const drop = document.getElementById("ixAudioDrop");
  const inp = document.getElementById("audioUpload");
  if(!drop || !inp) return;
  const url = ixAudioUrl(slot);
  const pb = document.getElementById("audioPlayback");
  if(pb && url) pb.innerHTML = `<audio controls src="${url}" style="width:100%;margin-bottom:10px;"></audio>`;
  drop.addEventListener("click", e=>{ if(e.target !== inp) inp.click(); });
  drop.addEventListener("keydown", e=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); inp.click(); } });
  ["dragenter","dragover"].forEach(t=>drop.addEventListener(t, e=>{ e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave","drop"].forEach(t=>drop.addEventListener(t, e=>{ e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e=>{ const f = e.dataTransfer && e.dataTransfer.files[0]; if(f) ixTakeAudio(slot, f, prompt, rerender); });
  inp.addEventListener("change", ()=>{ const f = inp.files[0]; inp.value = ""; if(f) ixTakeAudio(slot, f, prompt, rerender); });
}

async function ixTakeAudio(slot, file, prompt, rerender){
  const S = state.speaking;
  const say = (text, kind) => {
    IX_AUDIO_NOTE[slot] = text ? { text, kind: kind || "" } : null;
    const el = document.getElementById("ixAudioStatus");
    if(el){ el.textContent = text || ""; el.className = "ix-ad-status " + (kind || ""); }
  };
  if(typeof mediaRecorder !== "undefined" && mediaRecorder && mediaRecorder.state !== "inactive"){
    say("Stop the live recording before uploading a file.", "err"); return;
  }
  if(!/^audio\//.test(file.type || "") && !(/^video\/(mp4|webm|3gpp)/.test(file.type || "")) && !IX_AUDIO_EXT.test(file.name || "")){
    say(`"${file.name}" is not an audio file.`, "err"); return;
  }
  if(file.size > IX_AUDIO_MAX){
    say(`That file is ${(file.size/1048576).toFixed(1)} MB — the limit is 18 MB. Trim it or export it as MP3.`, "err"); return;
  }
  const drop = document.getElementById("ixAudioDrop");
  if(drop) drop.classList.add("busy");
  say(`Reading ${file.name}…`, "busy");
  try{
    S.audioB64[slot] = await blobToBase64(file);
  }catch(err){
    if(drop) drop.classList.remove("busy");
    say("That file could not be read.", "err"); return;
  }
  S.audioMime[slot] = ixAudioMime(file).replace(/^video\//, "audio/");
  const duration = await ixAudioDuration(file);

  // A new take replaces the old one and whatever was marked from it.
  delete S.answers[slot];
  delete S.language[slot];
  if(S.hesitation) delete S.hesitation[slot];
  if(S.bandVersions) delete S.bandVersions[slot];
  S.transcripts[slot] = "";

  let note = { text: `${file.name} attached${duration ? ` · ${duration}s` : ""}. Type what you said in the box below to unlock the language tools.`, kind: "ok" };
  if(geminiAvailable()){
    say("Writing the transcript with AI…", "busy");
    try{
      const raw = await callGemini(IX_TRANSCRIBE_PROMPT, prompt ? `The question was: "${prompt}"` : "Transcribe the recording.", S.audioB64[slot], S.audioMime[slot]);
      const text = String(raw || "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
      if(/^\[no speech\]$/i.test(text)){
        note = { text: "No speech could be heard in that file. Check it is the right recording.", kind: "err" };
      }else{
        S.transcripts[slot] = text;
        note = { text: `${file.name} attached${duration ? ` · ${duration}s` : ""} — transcript ready. Check it against what you said before marking.`, kind: "ok" };
      }
    }catch(err){
      note = { text: `Audio attached, but the transcript failed: ${err.message || err}. You can type it below.`, kind: "err" };
    }
  }

  const words = countWords(S.transcripts[slot]);
  S.metrics[slot] = {
    words,
    duration,
    pace: duration && words ? Math.round(words / (duration / 60)) : 0,
    fillers: countFillers(S.transcripts[slot]).total,
    uploaded: true,
  };
  S.detector[slot] = analyseSpokenLanguage(S.transcripts[slot]);
  IX_AUDIO_NOTE[slot] = note;
  rerender();
}
