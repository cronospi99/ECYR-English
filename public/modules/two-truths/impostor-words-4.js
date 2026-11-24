/* Too Good To Be True — fourth word bank: more real words, invented words and look-alikes at every level
   (A1 to C2). Same fusion pattern as impostor-words-3.js, plus real words (added first, so a word that is
   real anywhere in the bank can never be played as an impostor). Entries whose first part is already in
   the bank are skipped, so the lists can only grow.
   real:  "word|español|synonym, synonym" (synonyms at the same level or lower)
   fake:  invented words that sound English (not in any dictionary)
   alike: "slip|real word it imitates" (the mistakes Spanish speakers really make)
   Check with: node scripts/tgtbt-check-bank.mjs */
(function (B) {
  if (!B) return;
  var MORE = {
    A1: {
      real: ['huge|enorme|big, giant', 'say|decir|tell, speak', 'tell|decir|say', 'go|ir|move, leave', 'mom|mamá|mum, mother', 'grandma|abuela|granny', 'grandpa|abuelo|granddad', 'student|estudiante|pupil', 'lunch|almuerzo|midday meal', 'dinner|cena|supper',
        'snack|merienda|bite to eat', 'trousers|pantalones|pants', 'pants|pantalones|trousers', 'sneakers|zapatillas|trainers', 'trainers|zapatillas|sneakers', 'sweater|suéter|jumper', 'jumper|suéter|sweater', 'coat|abrigo|jacket', 'jacket|chaqueta|coat', 'flat|apartamento|apartment',
        'apartment|apartamento|flat', 'lift|ascensor|elevator', 'elevator|ascensor|lift', 'autumn|otoño|fall', 'sidewalk|acera|pavement', 'pavement|acera|sidewalk', 'phone|teléfono|mobile', 'mobile|teléfono móvil|phone', 'candy|dulces|sweets', 'sweets|dulces|candy',
        'queue|fila|line', 'line|fila|queue', 'biscuit|galleta|cookie', 'cookie|galleta|biscuit', 'bike|bicicleta|bicycle', 'bicycle|bicicleta|bike', 'listen|escuchar|hear', 'hear|oír|listen', 'sunny|soleado|bright', 'cloudy|nublado|grey'],
      fake: ['grelp', 'zorbat', 'flimmo', 'wiskle', 'trebby', 'gonkle', 'snuddy', 'blimmet', 'crelp', 'dramby',
        'fozzle', 'yarnel', 'quilby', 'vunky', 'shromp', 'kleppy', 'brunty', 'dwibble', 'smeeky', 'glarpy',
        'tweffle', 'porkle', 'zumpy', 'hunkle', 'vrabby', 'nobbet', 'sklimp', 'trundo', 'blessy', 'cromby',
        'yimply', 'wopsy', 'dreebo', 'fludge', 'glopper', 'shlunk', 'mizzet', 'pokkle', 'jessle', 'ploffy'],
      alike: ['sevn|seven', 'eigth|eight', 'thirten|thirteen', 'fiften|fifteen', 'tusday|Tuesday', 'thursay|Thursday', 'fryday|Friday', 'saturdey|Saturday', 'agust|August', 'septembre|September',
        'octuber|October', 'novembre|November', 'janury|January', 'haved|had', 'doed|did', 'cutted|cut', 'readed|read', 'heared|heard', 'wented|went',
        'getted|got', 'childrens|children', 'wolfes|wolves', 'thiefes|thieves', 'lifes|lives', 'wifes|wives', 'lisen|listen', 'lunsh|lunch', 'milck|milk', 'chiken|chicken',
        'chesse|cheese', 'bannana|banana', 'aple|apple', 'strawbery|strawberry', 'pinapple|pineapple', 'potatoe|potato', 'swetter|sweater', 'pencel|pencil', 'notebok|notebook', 'windo|window',
        'desck|desk', 'estudent|student', 'espring|spring', 'hause|house', 'wather|water', 'sumer|summer', 'suny|sunny', 'cloudey|cloudy', 'husban|husband', 'marrid|married',
        'bycicle|bicycle', 'ticet|ticket', 'pasport|passport', 'bathrom|bathroom', 'bedrom|bedroom', 'gardin|garden', 'toilette|toilet', 'gril|girl', 'sixtenn|sixteen', 'eleaven|eleven']
    },
    A2: {
      real: ['borrow|pedir prestado|take for a while', 'invite|invitar|ask', 'refuse|rechazar|say no', 'agree|estar de acuerdo|say yes', 'prefer|preferir|like more', 'repeat|repetir|say again', 'nearby|cercano|close, near', 'lovely|encantador|nice, beautiful', 'friendly|amistoso|kind, nice', 'lonely|solitario|alone',
        'bored|aburrido|not interested', 'deep|profundo|far down', 'sharp|afilado|pointed', 'smooth|liso|flat', 'rough|áspero|bumpy', 'heavy|pesado|not light', 'wish|desear|hope', 'hope|esperar|wish', 'imagine|imaginar|picture', 'notice|notar|spot, see',
        'wake|despertar|get up', 'hit|golpear|bang', 'catch|atrapar|grab, get', 'smash|romper|break', 'rip|rasgar|tear', 'tear|rasgar|rip', 'fold|doblar|bend', 'bend|doblar|fold', 'wrap|envolver|cover', 'cover|cubrir|wrap',
        'chop|cortar|cut up', 'slice|rebanar|cut', 'boil|hervir|cook in water', 'suddenly|de repente|all at once', 'nearly|casi|almost', 'almost|casi|nearly', 'quite|bastante|fairly', 'fairly|bastante|quite', 'extremely|extremadamente|very', 'lately|últimamente|recently'],
      fake: ['flomby', 'trasky', 'glimpy', 'vondle', 'prenky', 'snurbly', 'dwibsy', 'hoppish', 'crulty', 'zimble',
        'brankel', 'fliddle', 'grumbet', 'skarply', 'wuffle', 'tibbet', 'klomper', 'sprindy', 'yundle', 'blopsy',
        'cravet', 'dozzle', 'mimpish', 'thrunky', 'quarnle', 'sneedy', 'plorbit', 'gwimble', 'trebbish', 'wolbop',
        'frundly', 'yorbit', 'glaskly', 'drimble', 'scrabbet', 'hobnick', 'pluffet', 'vandly', 'nurbish', 'sprockel'],
      alike: ['informacion|information', 'invitacion|invitation', 'sandwhich|sandwich', 'maibe|maybe', 'everithing|everything', 'somthing|something', 'somewere|somewhere', 'shoud|should', 'woud|would', 'coud|could',
        'enjoi|enjoy', 'choosen|chosen', 'flied|flew', 'hurted|hurt', 'costed|cost', 'letted|let', 'shutted|shut', 'sticked|stuck', 'sinked|sank', 'rised|rose',
        'waked|woke', 'digged|dug', 'beated|beat', 'bited|bit', 'expensiver|more expensive', 'carefuller|more careful', 'thinest|thinnest', 'hotest|hottest', 'bestest|best', 'worser|worse',
        'sandwichs|sandwiches', 'watchs|watches', 'dishs|dishes', 'foxs|foxes', 'churchs|churches', 'lunchs|lunches', 'beachs|beaches', 'brushs|brushes', 'toyes|toys', 'monkies|monkeys',
        'donkies|donkeys', 'telefone|telephone', 'musitian|musician', 'stoping|stopping', 'cuting|cutting', 'dieing|dying', 'lieing|lying', 'makeing|making',
        'takeing|taking', 'haveing|having', 'enjoing|enjoying', 'comunication|communication', 'electrisity|electricity', 'cheking|checking', 'wating|waiting', 'luckey|lucky', 'sunnyer|sunnier', 'cloudyer|cloudier']
    },
    B1: {
      real: ['adapt|adaptarse|adjust, change', 'adjust|ajustar|adapt, alter', 'afford|permitirse|have enough money for', 'apologise|disculparse|say sorry', 'arrange|organizar|organise, plan', 'attach|adjuntar|fasten, join', 'attract|atraer|draw, pull', 'behave|comportarse|act', 'calculate|calcular|work out, count', 'cancel|cancelar|call off',
        'contain|contener|hold, include', 'create|crear|make, produce', 'depend|depender|rely', 'discover|descubrir|find, uncover', 'divide|dividir|split, separate', 'hire|contratar|employ, take on', 'enable|permitir|allow, let', 'estimate|estimar|guess, calculate', 'exchange|intercambiar|swap, trade', 'swap|cambiar|exchange, trade',
        'fasten|sujetar|attach, tie', 'include|incluir|contain', 'insist|insistir|demand', 'invent|inventar|create, design', 'link|enlazar|connect, join', 'connect|conectar|link, join', 'mention|mencionar|refer to, say', 'occur|ocurrir|happen, take place', 'happen|suceder|occur', 'prevent|prevenir|stop, block',
        'provide|proporcionar|give, supply', 'supply|suministrar|provide, give', 'realise|darse cuenta|notice, understand', 'recommend|recomendar|suggest, advise', 'suggest|sugerir|propose, recommend', 'rely|confiar|depend, count on', 'remove|quitar|take away, delete', 'rescue|rescatar|save, free', 'stretch|estirar|extend, lengthen', 'survive|sobrevivir|live through, last',
        'ashamed|avergonzado|embarrassed', 'proud|orgulloso|pleased', 'humble|humilde|modest', 'modest|modesto|humble', 'reliable|fiable|dependable', 'rare|raro|unusual, uncommon', 'ordinary|ordinario|normal, usual', 'recent|reciente|new, latest', 'temporary|temporal|short-term', 'urgent|urgente|very important'],
      fake: ['vorbulate', 'plenkish', 'dasterous', 'glunify', 'mospulate', 'krendish', 'toblify', 'fremulous', 'yandrify', 'quasterly',
        'brindulate', 'snorbify', 'cleptous', 'pladify', 'trandulous', 'gimbify', 'wosterly', 'dreptive', 'korbulate', 'shelkish',
        'frindulate', 'zoblify', 'tammerous', 'glintify', 'pruskish', 'dovelate', 'krumbify', 'snastive', 'wilbrous', 'trevulate',
        'hampify', 'quonkish', 'blamsterly', 'vrendulous', 'skimpulate', 'ferkish', 'dolbrify', 'nuvulate', 'cresmify', 'plomerous'],
      alike: ['adventage|advantage', 'arrangment|arrangement', 'certanly|certainly', 'comunicate|communicate', 'competion|competition', 'decission|decision', 'discusion|discussion', 'embarasing|embarrassing', 'emergancy|emergency',
        'exacly|exactly', 'expence|expense', 'fasinating|fascinating', 'forgetfull|forgetful', 'frecuent|frequent', 'guidence|guidance', 'healthey|healthy', 'heigth|height', 'imagenation|imagination', 'imediate|immediate',
        'increadible|incredible', 'inteligent|intelligent', 'intrest|interest', 'jewellry|jewellery', 'lenguage|language', 'liesure|leisure', 'mantain|maintain', 'medecine|medicine', 'millitary|military', 'obediant|obedient',
        'oppinion|opinion', 'pationt|patient', 'plesant|pleasant', 'poluted|polluted', 'probem|problem', 'profesor|professor', 'pronounse|pronounce', 'quarell|quarrel', 'recomended|recommended', 'refridgerator|refrigerator',
        'relaible|reliable', 'sacrifise|sacrifice', 'satisified|satisfied', 'seperately|separately', 'temperture|temperature', 'trubble|trouble', 'unfortunatly|unfortunately', 'vegitarian|vegetarian', 'wellcome|welcome', 'calandar|calendar',
        'vacine|vaccine', 'creactive|creative', 'candidat|candidate', 'delitious|delicious', 'excercise|exercise']
    },
    B2: {
      real: ['assess|evaluar|evaluate, judge', 'evaluate|evaluar|assess', 'contribute|contribuir|add, donate', 'convey|transmitir|communicate, express', 'cope|sobrellevar|manage, deal', 'disregard|ignorar|ignore, overlook', 'dispose|deshacerse|get rid of', 'enforce|hacer cumplir|apply, impose', 'impose|imponer|force, enforce', 'inhibit|inhibir|hold back, restrain',
        'inspire|inspirar|motivate, encourage', 'interfere|interferir|get in the way, intervene', 'maintain|mantener|keep, sustain', 'modify|modificar|change, alter', 'neglect|descuidar|ignore, disregard', 'overcome|superar|beat, conquer', 'perceive|percibir|notice, sense', 'persist|persistir|continue, keep going', 'pursue|perseguir|chase, follow', 'reinforce|reforzar|strengthen, support',
        'reject|rechazar|refuse, turn down', 'relieve|aliviar|ease, soothe', 'resolve|resolver|solve, settle', 'retain|retener|keep, hold', 'seek|buscar|look for, search', 'tackle|abordar|deal with, handle', 'undergo|someterse a|experience, go through', 'undertake|emprender|take on, start', 'withstand|resistir|endure, resist', 'crude|tosco|rough, rude',
        'drastic|drástico|extreme, severe', 'elusive|esquivo|evasive, hard to catch', 'flawed|defectuoso|faulty, imperfect', 'inadequate|insuficiente|insufficient, poor', 'lenient|indulgente|tolerant, merciful', 'mediocre|mediocre|average, ordinary', 'obsolete|obsoleto|outdated, old-fashioned', 'outdated|anticuado|old-fashioned, obsolete', 'prompt|puntual|quick, immediate', 'rigid|rígido|stiff, inflexible',
        'subtle|sutil|delicate, slight', 'trivial|trivial|minor, unimportant', 'volatile|volátil|unstable, unpredictable', 'wary|receloso|cautious, careful', 'stiff|rígido|rigid, firm', 'blatant|descarado|obvious, flagrant', 'grim|sombrío|bleak, gloomy', 'cluster|racimo|group, bunch', 'withhold|retener|keep back', 'rebuke|reprender|scold, reprimand'],
      fake: ['brandulous', 'quistify', 'morvulent', 'pelkation', 'drestive', 'glomberate', 'snavity', 'tropulent', 'wrenkable', 'fostulate',
        'cliventive', 'dramplish', 'zenkance', 'prombulate', 'shalvity', 'kerrulous', 'wustify', 'blendiment', 'torvance', 'glibrate',
        'hastulent', 'snidative', 'plarbity', 'vorkable', 'dwemption', 'frottive', 'yimbrous', 'sparnity', 'quilvance',
        'nobulate', 'trasmity', 'gruvish', 'pleckment', 'smordity', 'velmirous', 'crandive', 'jostrance', 'weltify', 'zorbation'],
      alike: ['abandonned|abandoned', 'accidentaly|accidentally', 'acheivement|achievement', 'acknowlege|acknowledge', 'adaquate|adequate', 'advertisment|advertisement', 'alcohal|alcohol', 'archetect|architect', 'attendence|attendance', 'authorty|authority',
        'awkard|awkward', 'bankrupcy|bankruptcy', 'bargin|bargain', 'beleif|belief', 'boundry|boundary', 'cemetary|cemetery', 'changable|changeable', 'cieling|ceiling', 'commitee|committee', 'compatable|compatible',
        'competetive|competitive', 'consciense|conscience', 'consequense|consequence', 'consistancy|consistency', 'convinience|convenience', 'coorperate|cooperate', 'dependance|dependence', 'desparate|desperate', 'dicipline|discipline', 'ecconomy|economy',
        'effecient|efficient', 'elegent|elegant', 'embarass|embarrass', 'extravagent|extravagant', 'feasability|feasibility', 'feild|field', 'grievence|grievance', 'hierachy|hierarchy', 'hindrence|hindrance', 'hypocricy|hypocrisy',
        'ignorence|ignorance', 'immigrent|immigrant', 'inconvinient|inconvenient', 'initative|initiative', 'innocense|innocence', 'intelectual|intellectual', 'interferance|interference', 'irrelevent|irrelevant', 'jealosy|jealousy', 'labratory|laboratory',
        'lonelyness|loneliness', 'maintenence|maintenance', 'manageble|manageable', 'marketting|marketing', 'mathmatics|mathematics', 'miniture|miniature', 'miscelaneous|miscellaneous', 'nusiance|nuisance', 'obession|obsession', 'omision|omission']
    },
    C1: {
      real: ['allude|aludir|refer, hint', 'ambiguity|ambigüedad|vagueness, uncertainty', 'amplify|amplificar|increase, magnify', 'bestow|otorgar|confer, grant', 'capacity|capacidad|ability, potential', 'coherence|coherencia|consistency, unity', 'collaborate|colaborar|cooperate, work together', 'compensate|compensar|make up for, offset', 'configure|configurar|set up, arrange', 'constitute|constituir|form, make up',
        'contradiction|contradicción|inconsistency, conflict', 'cumbersome|engorroso|unwieldy, awkward', 'curb|frenar|restrain, limit', 'deficit|déficit|shortfall, shortage', 'diversify|diversificar|vary, expand', 'dominate|dominar|control, command', 'exclude|excluir|omit, leave out', 'fluctuation|fluctuación|variation, change', 'formulate|formular|devise, develop', 'hinge|depender de|depend, rest',
        'illustrate|ilustrar|demonstrate, show', 'inclination|inclinación|tendency, leaning', 'intervene|intervenir|step in, mediate', 'invoke|invocar|call upon, cite', 'legitimate|legítimo|lawful, valid', 'marginal|marginal|minor, slight', 'mediate|mediar|arbitrate, negotiate', 'paramount|primordial|supreme, vital', 'precede|preceder|come before', 'predominant|predominante|main, prevailing',
        'prerequisite|requisito previo|precondition, requirement', 'prevail|prevalecer|win out, predominate', 'quantify|cuantificar|measure, calculate', 'rectify|rectificar|correct, remedy', 'refine|refinar|improve, polish', 'reiterate|reiterar|repeat, restate', 'reluctance|reticencia|unwillingness, hesitation', 'replicate|replicar|copy, reproduce', 'resilience|resiliencia|toughness, adaptability', 'scope|alcance|extent, range',
        'stipulate|estipular|specify, require', 'supplement|complementar|add to, augment', 'suppress|suprimir|restrain, crush', 'sustain|sostener|maintain, support', 'terminate|terminar|end, conclude', 'trigger|desencadenar|cause, set off', 'underlie|subyacer|underpin, form the basis of', 'unprecedented|sin precedentes|never seen before', 'utilise|utilizar|use, employ', 'warrant|justificar|justify, merit'],
      fake: ['cognitorate', 'premisulate', 'fracturate', 'lexivous', 'synthetify', 'abstractate', 'parametrify', 'conceptulate', 'hypotheticate', 'analogulate',
        'consolidify', 'delimitude', 'dispersulate', 'ethicate', 'extrapolify', 'formatulate', 'heuristate', 'inferulent', 'intuitify', 'jurimentate', 'nominalate', 'operationify', 'pertinulent', 'qualifulate', 'recursivate', 'salientude', 'semantify', 'stratifulate', 'tangibulate',
        'validulate', 'variantify', 'verifulous', 'vectorulate'],
      alike: ['abreviation|abbreviation', 'acknowlegment|acknowledgment', 'adjasent|adjacent', 'alegation|allegation', 'ambiguety|ambiguity', 'amplifer|amplifier', 'aparatus|apparatus', 'arbitrery|arbitrary', 'articulete|articulate', 'assesment|assessment',
        'beneficiery|beneficiary', 'boundries|boundaries', 'capasity|capacity', 'coherense|coherence', 'collaborete|collaborate', 'compensete|compensate', 'consolidete|consolidate', 'constitucion|constitution', 'contradicion|contradiction', 'cumbersom|cumbersome',
        'defisit|deficit', 'diversifey|diversify', 'dominete|dominate', 'excluision|exclusion', 'formulete|formulate', 'illustrete|illustrate', 'inclinacion|inclination', 'intervension|intervention', 'legitamacy|legitimacy', 'marginel|marginal',
        'mediete|mediate', 'paramont|paramount', 'predominent|predominant', 'prerequisit|prerequisite', 'quantifey|quantify', 'rectifey|rectify', 'reitterate|reiterate', 'relucatance|reluctance', 'replicete|replicate', 'resiliense|resilience',
        'stipulete|stipulate', 'suplement|supplement', 'supress|suppress', 'terminete|terminate', 'trigerr|trigger', 'unpresedented|unprecedented', 'utilice|utilise', 'warant|warrant', 'sistematic|systematic', 'phenomenom|phenomenon']
    },
    C2: {
      real: ['abrogate|derogar|repeal, revoke', 'acerbic|mordaz|sharp, biting', 'admonish|amonestar|reprimand, scold', 'amalgamate|fusionar|merge, combine', 'anachronistic|anacrónico|outdated, out of date', 'antipathy|antipatía|hostility, aversion', 'apathetic|apático|indifferent, uninterested', 'appease|apaciguar|pacify, placate', 'audacious|audaz|bold, daring', 'austere|austero|severe, stern',
        'banal|banal|trite, commonplace', 'beguile|seducir|charm, captivate', 'candour|franqueza|honesty, frankness', 'cathartic|catártico|cleansing, purging', 'circuitous|tortuoso|roundabout, indirect', 'cloying|empalagoso|sickly, over-sweet', 'cryptic|críptico|enigmatic, obscure', 'cynical|cínico|sceptical, sardonic', 'debilitate|debilitar|weaken, enfeeble', 'decorous|decoroso|proper, seemly',
        'deference|deferencia|respect, submission', 'derision|escarnio|mockery, ridicule', 'despot|déspota|tyrant, autocrat', 'didactic|didáctico|instructive, educational', 'disparage|menospreciar|belittle, denigrate', 'dissipate|disipar|disperse, dwindle', 'effete|decadente|feeble, ineffectual', 'enigmatic|enigmático|mysterious, puzzling', 'equanimity|ecuanimidad|composure, calm', 'ersatz|sucedáneo|imitation, artificial',
        'evanescent|evanescente|fleeting, vanishing', 'facetious|burlón|flippant, jocular', 'felicitous|acertado|apt, well-chosen', 'florid|florido|ornate, flowery', 'furtive|furtivo|stealthy, secretive', 'grandiose|grandioso|pompous, ambitious', 'guile|astucia|cunning, craftiness', 'hubris|soberbia|arrogance, pride', 'indolent|indolente|lazy, idle', 'insidious|insidioso|stealthy, treacherous',
        'intrepid|intrépido|fearless, bold', 'laudable|loable|praiseworthy, commendable', 'malevolent|malévolo|spiteful, malicious', 'mellifluous|melifluo|sweet-sounding, dulcet', 'ominous|ominoso|threatening, sinister', 'ostracise|marginar|exclude, shun', 'palpable|palpable|tangible, obvious', 'pedantic|pedante|fussy, nit-picking', 'penchant|inclinación|liking, fondness', 'pensive|pensativo|thoughtful, reflective',
        'perennial|perenne|enduring, lasting', 'placid|plácido|calm, tranquil', 'prodigal|derrochador|wasteful, extravagant', 'redolent|evocador|reminiscent, suggestive', 'reticent|reticente|reserved, restrained', 'sanguine|optimista|hopeful, confident', 'sardonic|sardónico|mocking, scornful', 'staid|serio|sedate, sober', 'stoic|estoico|impassive, unemotional', 'sullen|hosco|sulky, morose',
        'taciturn|taciturno|reserved, silent', 'tenacious|tenaz|persistent, determined', 'trepidation|temor|anxiety, dread', 'vapid|insípido|insipid, bland', 'vehement|vehemente|forceful, passionate', 'venerable|venerable|respected, revered', 'zealous|ferviente|fervent, ardent'],
      fake: ['abrogulate', 'acerbify', 'admonitude', 'amalgamify', 'anachronulent', 'antipatulent', 'apathulate', 'appeasify', 'audacitate', 'austerify',
        'banalify', 'beguilitate', 'candourify', 'catharsify', 'circuitulate', 'cloyitude', 'crypticate', 'cynicify', 'debilitude', 'decorulent',
        'deferulate', 'derisitude', 'despotulate', 'didactify', 'disparify', 'dissipulent', 'effetitude', 'enigmatulate', 'equanimify', 'ersatulate',
        'evanescify', 'facetulate', 'felicitulent', 'floridate', 'grandiosify'],
      alike: ['abstemous|abstemious', 'acrimoney|acrimony', 'alacrety|alacrity', 'anathama|anathema', 'anacronism|anachronism', 'apocraphal|apocryphal', 'assetic|ascetic', 'asiduous|assiduous', 'bombastik|bombastic', 'capricous|capricious',
        'chicanary|chicanery', 'circumspec|circumspect', 'clandestin|clandestine', 'conviviel|convivial', 'delaterious|deleterious', 'diatrabe|diatribe', 'diffedent|diffident', 'dilitory|dilatory', 'disingenous|disingenuous', 'dogmatik|dogmatic',
        'ebulient|ebullient', 'affrontery|effrontery', 'egregius|egregious', 'erudit|erudite', 'exigant|exigent', 'fastideous|fastidious', 'fatuos|fatuous', 'fecound|fecund', 'fortuitus|fortuitous', 'fracteous|fractious',
        'gregarius|gregarious', 'hacknied|hackneyed', 'iconoclasst|iconoclast', 'impecunius|impecunious', 'imperturbeable|imperturbable', 'impetuos|impetuous', 'inexorible|inexorable', 'intransigant|intransigent', 'inveterete|inveterate', 'laconnic|laconic',
        'magnanimus|magnanimous', 'mercuriel|mercurial', 'nefarius|nefarious', 'obdurete|obdurate', 'ostentacious|ostentatious', 'parsimonius|parsimonious', 'abjurre|abjure', 'evanescant|evanescent', 'facetius|facetious', 'felicitus|felicitous',
        'florrid|florid', 'furtiv|furtive', 'hubrus|hubris', 'indolant|indolent', 'insidius|insidious', 'intrepit|intrepid', 'laudible|laudable', 'malevolant|malevolent', 'mellifluos|mellifluous', 'omenous|ominous',
        'palpible|palpable', 'pendantic|pedantic', 'pensiv|pensive', 'perenial|perennial', 'plasid|placid', 'prodigul|prodigal', 'redolant|redolent', 'reticant|reticent', 'sanguin|sanguine', 'sardonik|sardonic', 'stoick|stoic']
    }
  };
  function head(s) { return s.split('|')[0].toLowerCase(); }
  // A word that is real at ANY level can never be played as an impostor.
  var allReal = {};
  Object.keys(B).forEach(function (lv) { B[lv].real.forEach(function (s) { allReal[head(s)] = 1; }); });
  Object.keys(MORE).forEach(function (lv) { MORE[lv].real.forEach(function (s) { allReal[head(s)] = 1; }); });
  Object.keys(MORE).forEach(function (lv) {
    if (!B[lv]) return;
    ['real', 'fake', 'alike'].forEach(function (k) {
      var have = {}; B[lv][k].forEach(function (s) { have[head(s)] = 1; });
      MORE[lv][k].forEach(function (s) { var h = head(s); if (!have[h] && (k === 'real' || !allReal[h])) { have[h] = 1; B[lv][k].push(s); } });
    });
  });
})(window.TGTBT_BANK);
