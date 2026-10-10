// Class Mixer — PPP. One shared input (a situation + ONE question) that covers every chosen class.
// Everybody answers the same question; the teacher decides the output (spoken or written dynamic).
(function(){

  // The shared input: one situation, one question. The question is open enough that every
  // structure in the chosen classes is a legitimate way of answering it.
  var INPUTS = [
   {id:"decision", situation:"Someone has to make a decision about {themes} today, and three people disagree about what to do.",
    question:"What is going on, and what should they do?",
    board:["What is going on?","What should they do?","Why not the other option?"]},

   {id:"newcomer", situation:"A new person joins the group and knows nothing about {themes}. You have five minutes with them.",
    question:"What do they need to know, and what will happen if nobody tells them?",
    board:["What do they need to know?","What happens if nobody tells them?","What would you tell them first?"]},

   {id:"changed", situation:"Something about {themes} is not what it was a year ago.",
    question:"What changed, and is the change a good one?",
    board:["What changed?","Who noticed first?","Is it a good change?"]},

   {id:"problem", situation:"A small problem with {themes} was ignored, and now it is a big one.",
    question:"How did it get this far, and who fixes it now?",
    board:["How did it get this far?","Who fixes it?","What do they do first?"]},

   {id:"choice", situation:"Two options are on the table about {themes}, and only one can happen.",
    question:"Which option do you take, and what do you lose by taking it?",
    board:["Which option?","What do you lose?","What would change your mind?"]}
  ];

  // Production dynamics — all of them run on the SAME question above.
  var WRITTEN = [
   {id:"one-text", name:"One Text, Every Structure", minutes:6, mode:"Individually, then pairs check",
    scenario:"Answer the question in one continuous text. Not a list of sentences \u2014 one answer that holds together.",
    product:"A single text of {paras} short paragraphs that answers the question and uses every structure below at least once.",
    stages:["1 min \u2014 write the question at the top of the page and the structure list down the margin.","4 min \u2014 write the answer. Tick a structure in the margin each time you use it.","1 min \u2014 swap with a partner: they tick what they can actually find and circle any structure you claimed but did not use."],
    criteria:["Every structure on the list is ticked and findable in the text.","The text answers the question in the first two sentences \u2014 it does not warm up.","Nothing in the text could be cut without losing part of the answer."],
    extension:"Rewrite the answer in three sentences, keeping the strongest structure."},

   {id:"two-answers", name:"Two Answers, One Question", minutes:6, mode:"Pairs, one sheet, two columns",
    scenario:"Two people answer the same question and do not agree. Write both answers side by side.",
    product:"Two columns of {paras} sentences each, answering the same question in opposite directions.",
    stages:["1 min \u2014 decide who takes which side and split the structure list between the two columns.","4 min \u2014 write both columns. Every sentence must answer the question, not attack the other column.","1 min \u2014 add one closing line under both columns saying which answer you would follow, and why."],
    criteria:["Both columns answer the same question, and the split of structures is written at the top.","No sentence in either column repeats a sentence from the other.","The closing line commits to one column."],
    extension:"Write the third answer that neither column thought of."},

   {id:"note", name:"Written Answer to Someone Absent", minutes:6, mode:"Individually",
    scenario:"The person who asked the question is not in the room. Write them the answer.",
    product:"A written message that answers the question in full, in {paras} short paragraphs, signed off.",
    stages:["1 min \u2014 note down who they are and what they already know.","4 min \u2014 write the message. Each structure below has to earn its place: no sentence exists only to use a structure.","1 min \u2014 underline the one sentence that is the actual answer."],
    criteria:["The underlined sentence answers the question on its own.","Every structure below appears, and each one carries real information.","The message uses at least six of the target words."],
    extension:"Add the one line you would only write if nobody else was going to read it."},

   {id:"record", name:"Answer Sheet, Then Report", minutes:7, mode:"Groups of 3, one written page",
    scenario:"The group answers the question once, in writing, and has to defend it afterwards.",
    product:"One page: the answer, the evidence for it, and the objection you expect.",
    stages:["1 min \u2014 deal the structure list out: every person takes at least one and writes their part.","4 min \u2014 write the three headed sections. Answer first, evidence second, expected objection last.","2 min \u2014 read it to another group; they raise the objection you did not write down."],
    criteria:["All three sections are written and every structure below appears in the section its owner wrote.","The evidence is specific \u2014 names, numbers or events, not adjectives.","The expected objection is one the other group actually raised or could have."],
    extension:"Rewrite the answer so the objection no longer works."}
  ];

  var SPOKEN = [
   {id:"round", name:"Same Question, Round the Room", minutes:6, mode:"Whole class, standing or seated circle",
    scenario:"Everyone answers the same question out loud, one after another, and nobody may repeat an answer already given.",
    product:"One spoken answer per student, each at least three sentences, none repeated.",
    stages:["1 min \u2014 deal the structure list out; each student knows which structure they must use.","4 min \u2014 go round. If an answer is already taken, the student has to move their answer, not their structure.","1 min \u2014 name the two answers the room had not thought of."],
    criteria:["Every structure on the list is heard at least once.","No answer is under three sentences, and none repeats an earlier one.","Each student uses their assigned structure correctly \u2014 the form is corrected on the spot."],
    extension:"Second lap: same question, and each student must use the structure of the person before them."},

   {id:"pairs", name:"Ask, Answer, Swap", minutes:6, mode:"Rotating pairs",
    scenario:"You carry the question to three different people and answer theirs in return.",
    product:"Three answers heard and noted in single words, plus a 20-second spoken summary of the best one.",
    stages:["1 min \u2014 copy the question and the follow-ups below onto your sheet.","4 min \u2014 90 seconds per partner: ask the question, then one follow-up from the list, then swap roles and rotate.","1 min \u2014 report the best answer you heard in 20 seconds, quoting the words the person used."],
    criteria:["Every follow-up below is asked at least twice across the room.","Every answer is pushed to two sentences \u2014 a one-word answer gets the follow-up immediately.","The summary quotes real words and is not read off the sheet."],
    extension:"Go back to the person whose answer you understood least and ask again."},

   {id:"panel", name:"Three on the Question", minutes:7, mode:"Groups of 4 \u2014 three answering, one chairing",
    scenario:"Three people answer the question in front of the group; the chair keeps them on it.",
    product:"Two rounds of 90 seconds with different people answering, and a chair's verdict at the end.",
    stages:["1 min \u2014 cast the chair; the chair takes the follow-up list below.","4 min \u2014 round one: each of the three answers for 30 seconds, then the chair asks one follow-up each.","2 min \u2014 round two with new speakers, then the chair says which answer wins and quotes the line that won it."],
    criteria:["Every follow-up below is used, so every chosen class is covered.","No speaker runs past 30 seconds, and no answer starts with \u201cI think it depends\u201d and stops there.","The verdict quotes an actual sentence somebody said."],
    extension:"The chair takes the question and answers it in 30 seconds."},

   {id:"defend", name:"Answer and Defend", minutes:6, mode:"Two lines facing each other",
    scenario:"One line answers the question; the facing line challenges each answer in one sentence.",
    product:"Every student has answered once and challenged once, with the two strongest exchanges replayed.",
    stages:["1 min \u2014 line A takes the structures in odd positions, line B the even ones.","4 min \u2014 A answers, B challenges in one sentence, A responds once. Then step one place to the right and swap roles.","1 min \u2014 replay the two exchanges the class thought were the strongest."],
    criteria:["Every structure on the list is used by whichever line owns it.","Each challenge is a full sentence that uses the challenger's structure.","Every answer gets a response \u2014 nobody lets a challenge stand unanswered."],
    extension:"Run the last exchange again with the lines swapped."}
  ];

  function span(u){
    var raw = String(u.classes || u.pages || "").replace(/[\u2013\u2014]/g, "-");
    var m = raw.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!m) return null;
    var a = +m[1], b = m[2] ? +m[2] : a;
    return [Math.min(a, b), Math.max(a, b)];
  }

  function parse(input, units){
    var txt = String(input || "").replace(/[\u2013\u2014]/g, "-").toLowerCase();
    var toks = txt.split(/[,;/]+|\band\b/).map(function(s){ return s.trim(); }).filter(Boolean);
    var picked = [], unknown = [], nums = [];
    toks.forEach(function(t){
      var mu = t.match(/^(?:u|unit|units)\s*(\d+)(?:\s*-\s*(\d+))?$/);
      if (mu){
        var lo = +mu[1], hi = mu[2] ? +mu[2] : +mu[1];
        var hitU = units.filter(function(u){ return u.n >= Math.min(lo,hi) && u.n <= Math.max(lo,hi); });
        if (hitU.length) picked = picked.concat(hitU); else unknown.push(t);
        return;
      }
      var ns = t.match(/\d+/g);
      if (!ns){ unknown.push(t); return; }
      var a = +ns[0], b = ns[1] ? +ns[1] : +ns[0];
      var l = Math.min(a, b), h = Math.max(a, b);
      for (var k = l; k <= h; k++) nums.push(k);
      var hit = units.filter(function(u){ var sp = span(u); return sp && sp[0] <= h && sp[1] >= l; });
      if (hit.length) picked = picked.concat(hit); else unknown.push(t);
    });
    var seen = {}, out = [];
    picked.forEach(function(u){ if (!seen[u.n]){ seen[u.n] = 1; out.push(u); } });
    out.sort(function(a, b){ return a.n - b.n; });
    var cseen = {}, classes = [];
    nums.forEach(function(n){ if (!cseen[n]){ cseen[n] = 1; classes.push(n); } });
    classes.sort(function(a, b){ return a - b; });
    return { units: out, unknown: unknown, classes: classes };
  }

  function rnd(seed){ var x = Math.sin(seed * 9301.7 + 49297.3) * 233280; return x - Math.floor(x); }

  function pick(arr, n, seed){
    var a = (arr || []).slice(), out = [];
    for (var i = 0; a.length && out.length < n; i++) out.push(a.splice(Math.floor(rnd(seed + i * 7.31) * a.length), 1)[0]);
    return out;
  }

  function one(pool, seed){ return pool[Math.floor(rnd(seed) * pool.length) % pool.length]; }
  function lower(s){ return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // A real question from the material, if the unit has one; otherwise null.
  function askOf(g){
    var pools = [g.examples, g.more, (g.drill && g.drill.items) || [],
                 ((g.dialogue || []).map(function(d){ return d.line; }))];
    for (var p = 0; p < pools.length; p++){
      var arr = pools[p] || [];
      for (var i = 0; i < arr.length; i++){
        var s = String(arr[i]).split("\u2014")[0].trim();
        var q = s.match(/[^.?!]*\?/);
        if (q && q[0].trim().length > 8 && q[0].trim().length < 78) return q[0].trim();
      }
    }
    return null;
  }

  function build(sel, o){
    o = o || {};
    var seed = (o.seed | 0) + 3;

    var themes = sel.map(function(u){ return lower(u.theme); });
    // Read-aloud: at most two themes, joined with "and". No counts, no semicolons.
    var themeList = themes[0];
    // Panel-only: the full list, for reference under the situation.
    var themeLine = themes.join("  \u00b7  ");

    var topics = [];
    sel.forEach(function(u){
      (u.grammar || []).forEach(function(g){
        topics.push({
          unit: u.n, unitTitle: u.title, cls: u.classes || u.pages || String(u.n),
          name: g.name, cue: (g.examples && g.examples[0]) || g.short || "",
          ask: askOf(g), theme: lower(u.theme)
        });
      });
    });
    if (!topics.length) topics.push({ unit: sel[0].n, unitTitle: sel[0].title, cls: sel[0].classes || "", name: sel[0].title, cue: "", ask: null, theme: themes[0] });

    var lex = sel.map(function(u, i){
      return { unit: u.n, unitTitle: u.title, terms: pick(u.vocab, 4, seed + i * 11.7).map(function(v){ return v.term; }).join("  \u00b7  ") };
    });
    var lexByUnit = {};
    lex.forEach(function(l){ lexByUnit[l.unit] = l.terms.split("  \u00b7  "); });

    var inp = one(INPUTS, seed + 2.7);

    // Every structure is a legal way of answering the one question. This is the list the
    // teacher deals out in the practice stage.
    var probes = topics.map(function(t, i){
      var words = (lexByUnit[t.unit] || []).slice(0, 2).filter(Boolean).join(" and ");
      return {
        label: "cl. " + t.cls + " \u00b7 U" + t.unit,
        text: "Answer it with " + t.name.toLowerCase() + (t.cue ? " \u2014 like \u201c" + t.cue + "\u201d" : "") + (words ? ". Use " + words + "." : ".")
      };
    });

    // Follow-ups the teacher (or a student) uses to push an answer into the next class's structure.
    var follows = topics.map(function(t, i){
      var nxt = topics[(i + 1) % topics.length];
      var q = nxt.ask || null;
      return {
        label: "cl. " + t.cls + " \u2192 cl. " + nxt.cls,
        text: q ? "After their answer, ask \u201c" + q + "\u201d \u2014 it forces " + nxt.name.toLowerCase() + "."
               : "After their answer, push it into " + nxt.name.toLowerCase() + ": ask why, or ask what would change it."
      };
    });

    var w = one(WRITTEN, seed + 5.1), s = one(SPOKEN, seed + 19.4);

    var fill = function(str){
      return String(str).split("{themes}").join(themeList)
        .split("{question}").join(inp.question)
        .split("{paras}").join(String(Math.max(2, Math.min(5, Math.ceil(topics.length / 2)))))
        .split("{qCount}").join(String(follows.length));
    };

    var ppp = [
      { phase: "1 \u00b7 PRESENT", minutes: "2 min", text: "Read the situation and the question aloud, then answer it yourself in 40 seconds using every structure on the list once. They only listen \u2014 no notes, no repeating after you." },
      { phase: "2 \u00b7 PRACTICE", minutes: "3 min", text: "Deal the structure list out. Each student answers the same question using only their structure. Correct the form on the spot; the answer does not count until the form is right." },
      { phase: "3 \u00b7 PRODUCE", minutes: (w.minutes > s.minutes ? w.minutes : s.minutes) + " min", text: "Same question, no restrictions. They answer it in the output you choose below \u2014 written or spoken \u2014 using the structures freely." }
    ];

    var outputMenu = [
      "Spoken \u00b7 45 seconds each, no notes, all " + topics.length + " structures.",
      "Spoken \u00b7 pairs, 90 seconds, one answer built by two people.",
      "Written \u00b7 one paragraph, hand it in, every structure ticked in the margin.",
      "Written \u00b7 " + Math.max(2, Math.min(5, Math.ceil(topics.length / 2))) + " short paragraphs, read aloud at the end.",
      "Mixed \u00b7 half the room writes while half speaks, then swap and compare answers."
    ];

    var total = 5 + Math.max(w.minutes, s.minutes);

    var acts = [w, s].map(function(f, idx){
      var written = idx === 0;
      var crit = f.criteria.map(fill);
      if (sel.length > 1) crit.push(written
        ? "A reader cannot tell where one class stops and the next begins."
        : "No two answers in a row lean on the same class.");
      return {
        n: idx + 1,
        kind: written ? "WRITTEN" : "SPOKEN",
        tag: written ? "PRODUCE \u00b7 WRITTEN" : "PRODUCE \u00b7 SPOKEN",
        name: f.name,
        mode: f.mode,
        minutes: f.minutes + " min",
        scenario: fill(f.scenario),
        product: fill(f.product),
        stages: f.stages.map(function(st, i){ return { n: i + 1, text: fill(st) }; }),
        itemsLabel: written ? "THE STRUCTURE LIST (deal it out)" : "FOLLOW-UPS THAT MOVE THE ANSWER ON",
        items: written ? probes : follows,
        criteria: crit,
        extension: fill(f.extension)
      };
    });

    var classesLabel = sel.map(function(u){ return u.classes ? "cl. " + u.classes : "pp. " + u.pages; }).join("   /   ");
    var unitsLabel = sel.map(function(u){ return "U" + u.n + " \u00b7 " + (u.classes ? "cl. " + u.classes : "pp. " + u.pages); }).join("   /   ");

    return {
      title: "One question across " + sel.length + " class block" + (sel.length === 1 ? "" : "s"),
      subtitle: "Present \u00b7 Practice \u00b7 Produce \u2014 same input for everyone, and you choose the output",
      unitsLabel: unitsLabel,
      classesLabel: classesLabel,
      unitTitles: sel.map(function(u){ return u.title; }).join("  +  "),
      minutes: total + " min total",
      topicCount: topics.length,
      questionCount: follows.length,
      timeNote: "The input never changes: one situation, one question, all the structures on the board. Present and practise with the whole class, then run either production dynamic below \u2014 or both, half the room each.",
      core: { situation: fill(inp.situation), question: inp.question, board: inp.board, themeLine: themeLine },
      ppp: ppp,
      outputMenu: outputMenu,
      probes: probes,
      topics: topics,
      questions: follows,
      contribs: probes,
      lex: lex,
      acts: acts
    };
  }

  window.MIXER = { parse: parse, build: build, written: WRITTEN, spoken: SPOKEN, inputs: INPUTS };
})();
