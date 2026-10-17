// Curated city dataset — Punjab / Haryana / Delhi NCR taxi corridor.
// The "12.ALL AREA DUTY" group is mixed-state (PB/HR/HP/RJ + common national
// drops), so the most frequent cross-border destinations are included too.
//
// Scope note: this is a curated regional set, NOT the full Census 2011 list
// (~7,935 towns). The seed loader (seed.js) is data-source agnostic — the full
// Census file can be dropped in later and loaded through the same upsert path.
//
// Each entry: { canonicalName, state, district?, type, lat?, lng?, population?, aliases[] }
// `aliases` cover English spelling variants, common misspellings, and (for major
// hubs) Gurmukhi / Devanagari forms. CityResolverService resolves raw WA strings
// against these via exact match → pg_trgm fuzzy.
//
// ============================================================================
// MERGE ANALYSIS — oracle-v2 + multibot legacy alias maps (2026-05-31)
// ============================================================================
// Sources:
//   A = whatsapp-taxi-bot-oracle-v2/core/cityAliases.js  (11 cities)
//   B = whatsapp-taxi-bot-multibot/core/cityAliases.js   (many cities, UK/HP heavy)
//
// LIST A — aliases added to EXISTING cities (not exhaustive of every typo,
//   only those not already present in the entry below):
//   Delhi     : igi, igi airport, indira gandhi airport, t1/t2/t3, terminal 1-3,
//               aerocity, connaught place, cp, dwarka, kashmere gate, kashmiri gate,
//               kashmir gate, kashmeri gate, isbt delhi, anand vihar, sarai kale khan,
//               nizamuddin, hazrat nizamuddin, ajmeri gate, sarai rohilla, karol bagh,
//               paharganj, chandni chowk, india gate, red fort, rohini, pitampura,
//               model town, civil lines, shahdara, dilshad garden, preet vihar,
//               mayur vihar, kalkaji, nehru place, greater kailash, gk/gk 1/gk 2,
//               defence colony, saket, hauz khas, green park, malviya nagar,
//               lajpat nagar, south/east/west/north/central delhi, janakpuri,
//               rajouri garden, punjabi bagh, paschim vihar, kirti nagar, moti nagar,
//               tilak nagar, subhash nagar, uttam nagar, lakshmi nagar, gtb nagar,
//               shalimar bagh, vasant vihar, vasant kunj, r k puram, munirka,
//               mahipalpur, vivek vihar, rajiv chowk, sadar, sadar bazar, okhla,
//               dli, dehli, dilli, dilhi, dilhe, delhy, delhi junction, delhi railway,
//               new delhi railway, new delhi station, old delhi, old delhi railway,
//               old delhi station, ajmeri gate railway, vijay nagar delhi
//   Gurugram  : grg, gurgoan, gurgao, guragon, cyber city, cyber hub, dlf cyber city,
//               golf course road, golf course extension, mg road, huda city centre,
//               iffco chowk, sushant lok, dlf phase/1-5, dlf 1-5, sector 29,
//               south city, palam vihar, udyog vihar, sohna, sohna road, manesar,
//               new gurgaon, old gurgaon, mg road gurgaon, mg road metro
//   Noida     : nioda, noyda, noeda, greater noida west, noida extension, noida sector,
//               noida city, noida city centre, sector 15/16/18/52/58/59/61/62/63/125/137,
//               botanical garden, film city, knowledge park, pari chowk, jewar,
//               jewar airport, alpha, beta, gamma, delta
//   Faridabad : fbd, faridabaad, fariadabad, fridabad, faridbaad, new faridabad,
//               old faridabad, badarpur, badarpur border, ballabgarh, bata chowk,
//               neelam chowk, nhpc chowk, sector 16 faridabad
//   Ghaziabad : ghz, gaziabad, ghazibaad, gaziabaad, indirapuram, vaishali,
//               kaushambi, vasundhara, mohan nagar, raj nagar, raj nagar extension,
//               vijay nagar, crossings republik, loni, loni border, old ghaziabad
//   Ambala    : amb, ambl, ambala cantonment, ambala railway station
//   Patiala   : pti, ptl, pattiala, samana
//   Chandigarh: chandi, chandhigarh, chandigrah, chandiarh, chandigad,
//               chandigarh airport, chandigarh sector, isbt 17, isbt 43, isbt chandigarh,
//               sector 17, sector 35, 43 bus stand, 43 isbt, bus stand 43, chandigarh 43,
//               pgi, pgimer, pkl
//   Zirakpur  : zkp, zirkapur, jerkpur, zirapur, dera bassi, dera basi, derabassi,
//               dhakoli, dhakauli
//   Mohali    : mhl, mohaali, moali, mohali airport, mohali phase, mohali sector,
//               phase 10, phase 11, khrar, kahrar, kurali, landran, morinda
//   Amritsar  : asr, amritsarr, amritsir, amritar, amritsar airport, golden temple,
//               wagah border, beas
//   Ludhiana  : ludhianaa, ludhianna
//   Jalandhar : jld, jalandar, jalandarh
//   Bathinda  : bti
//   Karnal    : karanal, kernal
//   Panipat   : panipaat, paneepat
//   Rohtak    : rohtaak
//   Hisar     : hesar
//   Pathankot : pathankote, pathankott
//   Agra      : aagra, taj mahal
//   Jaipur    : jpr, jaipure, jypur, pink city
//   Jodhpur   : jodhpure, jodhpurr
//   Ajmer     : ajmere, ajmeer, pushker (pushkar kept as own canonical)
//   Udaipur   : udaipure, udaypur
//   Dehradun  : dehradoon, dehraddun, dehraduun, dehradun airport, jolly grant,
//               jolly grant airport, clock tower dehradun, rajpur road, clement,
//               clement town, saharanpur (NOTE: saharanpur is UP, but maps here per legacy)
//   Haridwar  : hariwar, haridwaar, har ki pauri, har ki paudi, laxman jhula,
//               lakshman jhula, ram jhula, triveni ghat
//   Nainital  : nanital, naintal, nanitaal, nainital lake, naini lake, naina devi,
//               bhimtal, bhimtaal, sat tal, sattal, haldwani, haldvani, kathgodam,
//               kathgodaam
//   Shimla    : shimlaa, shimlah, shmla, shimla airport, mall road shimla, kufri,
//               kuffri, kufree, chail, chayl, the ridge, jakhu, jakhu temple,
//               naldehra, naldehara
//   Manali    : manaali, manalli, manal, manali airport, bhuntar airport, rohtang,
//               rohtang pass, rohtang la, rothang, solang, solang valley, solang nala,
//               sollang, old manali, mall road manali, vashisht, vashisth, vasisth,
//               naggar, nagar, naggr, naggar castle, kullu manali (kullu kept as own)
//   Dharamshala: dharmshala, dhramshala, dharmsala, dharamshala airport, gaggal airport,
//               mcleodganj, mcleod ganj, mcleodgunj, mcleodgng, mcleod,
//               dal lake dharamshala, bhagsu waterfall, bhagsu, bhagsunag, triund,
//               triyund, kangra, kangara, palampur, palampure
//   Solan     : solaan, solen, mushroom city
//   Mandi     : mandee, mandhi
//   Una       : unna
//   Pushkar   : pushker (typo alias added)
//   Mathura   : mathuara (typo alias added)
//   Mussoorie : mussorie, musoorie, mall road mussoorie, kempty falls, kempty fall,
//               landour, landaur
//   Rishikesh : risikesh, rishikes, laxman jhula / ram jhula kept on Haridwar per legacy
//
// LIST B — NEW canonical cities added (23 new entries):
//   Kotkapura (Punjab) — multibot canonical; faridkot→Kotkapura per multibot
//   Saharanpur (Uttar Pradesh) — appears in multibot Dehradun section; own UP city
//   Almora (Uttarakhand)
//   Corbett (Uttarakhand) — Jim Corbett National Park / Ramnagar hub
//   Pauri (Uttarakhand)
//   Rudraprayag (Uttarakhand) — includes Kedarnath route
//   Badrinath (Uttarakhand) — includes Chamoli/Joshimath/Auli
//   Yamunotri (Uttarakhand)
//   Gangotri (Uttarakhand) — includes Uttarkashi
//   Tehri (Uttarakhand)
//   Pithoragarh (Uttarakhand)
//   Bageshwar (Uttarakhand)
//   Champawat (Uttarakhand)
//   Rudrapur (Uttarakhand) — Udham Singh Nagar district hub
//   Dalhousie (Himachal Pradesh) — includes Khajjiar/Chamba
//   Kasauli (Himachal Pradesh)
//   Kinnaur (Himachal Pradesh)
//   Spiti (Himachal Pradesh)
//   Lahaul (Himachal Pradesh)
//   Sirmaur (Himachal Pradesh)
//   Barog (Himachal Pradesh)
//   Mashobra (Himachal Pradesh)
//   Rampur Bushahr (Himachal Pradesh)
//
// CONCERNS for reviewer:
//   1. oracle-v2 maps nabha/rajpura/sirhind/abohar/khanna/phagwara as aliases of
//      Patiala/Amritsar/Ludhiana/Jalandhar. Our curated cities.js has them as
//      SEPARATE canonical cities — those separate entries are preserved and the
//      legacy "sub-city" aliases are NOT moved. The aliases already present on
//      those canonical cities are unchanged.
//   2. multibot maps faridkot→Kotkapura; our cities.js has Faridkot as its own
//      canonical. Kotkapura is added as new canonical. faridkot/faridkote aliases
//      are kept on Kotkapura per multibot (not reassigned to Faridkot canonical).
//   3. oracle-v2 maps panchkula→Chandigarh; Panchkula remains its own canonical.
//      pgi/pgimer (PGIMER hospital) are on Chandigarh per legacy intent.
//      pkl (standard transport code for Panchkula) is on Panchkula — NOT Chandigarh.
//   4. multibot maps mussoorie/rishikesh/kullu/pushkar as sub-aliases of Dehradun/
//      Haridwar/Manali/Ajmer. Our cities.js keeps them as own canonicals; only
//      their distinct typo aliases are added to them directly (not to parent cities).
//   5. Saharanpur is geographically in UP, not Uttarakhand — added as UP entry despite
//      multibot placing it in the Dehradun section.
//   6. vijay nagar (unqualified) added to Ghaziabad (multibot); vijay nagar delhi
//      added to Delhi (oracle-v2).
// ============================================================================

/** @type {Array<{canonicalName:string,state:string,district?:string,type:string,lat?:number,lng?:number,population?:number,aliases:string[]}>} */
const CITIES = [
  // ----------------------------- Chandigarh (UT) + Tricity -----------------------------
  { canonicalName: 'Chandigarh', state: 'Chandigarh', district: 'Chandigarh', type: 'metro', lat: 30.7333, lng: 76.7794, aliases: ['manimajra', 'mani majra', 'chandigarh', 'chd', 'chadigarh', 'chandighar', 'ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़', 'chandi', 'chandhigarh', 'chandigrah', 'chandiarh', 'chandigad', 'chandigarh airport', 'chandigarh sector', 'isbt 17', 'isbt 43', 'isbt chandigarh', 'sector 17', 'sector 35', '43 bus stand', '43 isbt', 'bus stand 43', 'chandigarh 43', 'pgi', 'pgimer'] },
  { canonicalName: 'Mohali', state: 'Punjab', district: 'SAS Nagar', type: 'city', lat: 30.7046, lng: 76.7179, aliases: ['mohali', 'sas nagar', 'sahibzada ajit singh nagar', 'mohli', 'ਮੋਹਾਲੀ', 'mhl', 'mohaali', 'moali', 'mohali airport', 'mohali phase', 'mohali sector', 'phase 10', 'phase 11', 'khrar', 'kahrar', 'kurali', 'landran', 'morinda'] },
  { canonicalName: 'Panchkula', state: 'Haryana', district: 'Panchkula', type: 'city', lat: 30.6942, lng: 76.8606, aliases: ['panchkula', 'panchkoola', 'पंचकूला', 'pkl'] },
  { canonicalName: 'Zirakpur', state: 'Punjab', district: 'SAS Nagar', type: 'town', lat: 30.6425, lng: 76.8173, aliases: ['zirakpur', 'zirkpur', 'jirakpur', 'zkp', 'zirkapur', 'jerkpur', 'zirapur', 'dera bassi', 'dera basi', 'derabassi', 'dhakoli', 'dhakauli'] },
  { canonicalName: 'Kharar', state: 'Punjab', district: 'SAS Nagar', type: 'town', lat: 30.7460, lng: 76.6457, aliases: ['kharar', 'kharad'] },

  // ----------------------------- Punjab -----------------------------
  { canonicalName: 'Amritsar', state: 'Punjab', district: 'Amritsar', type: 'metro', lat: 31.6340, lng: 74.8723, aliases: ['amritsar', 'ammritsar', 'amritser', 'amrtsar', 'ਅੰਮ੍ਰਿਤਸਰ', 'अमृतसर', 'asr', 'amritsarr', 'amritsir', 'amritar', 'amritsar airport', 'golden temple', 'wagah border', 'beas'] },
  { canonicalName: 'Ludhiana', state: 'Punjab', district: 'Ludhiana', type: 'metro', lat: 30.9010, lng: 75.8573, aliases: ['ludhiana', 'ludhiyana', 'ludiana', 'ldh', 'ਲੁਧਿਆਣਾ', 'लुधियाना', 'ludhianaa', 'ludhianna'] },
  { canonicalName: 'Jalandhar', state: 'Punjab', district: 'Jalandhar', type: 'metro', lat: 31.3260, lng: 75.5762, aliases: ['jalandhar', 'jullundur', 'jaландhar', 'jalndhar', 'ਜਲੰਧਰ', 'जालंधर', 'jld', 'jalandar', 'jalandarh'] },
  { canonicalName: 'Patiala', state: 'Punjab', district: 'Patiala', type: 'city', lat: 30.3398, lng: 76.3869, aliases: ['patiala', 'patiyala', 'ptiala', 'ਪਟਿਆਲਾ', 'पटियाला', 'pti', 'ptl', 'pattiala', 'samana'] },
  { canonicalName: 'Bathinda', state: 'Punjab', district: 'Bathinda', type: 'city', lat: 30.2110, lng: 74.9455, aliases: ['bathinda', 'bhatinda', 'batinda', 'ਬਠਿੰਡਾ', 'बठिंडा', 'bti'] },
  { canonicalName: 'Hoshiarpur', state: 'Punjab', district: 'Hoshiarpur', type: 'city', lat: 31.5320, lng: 75.9110, aliases: ['hoshiarpur', 'hoshiyarpur', 'hsp'] },
  { canonicalName: 'Pathankot', state: 'Punjab', district: 'Pathankot', type: 'city', lat: 32.2643, lng: 75.6421, aliases: ['pathankot', 'pathonkot', 'ਪਠਾਨਕੋਟ', 'pathankote', 'pathankott'] },
  { canonicalName: 'Batala', state: 'Punjab', district: 'Gurdaspur', type: 'city', lat: 31.8186, lng: 75.2028, aliases: ['batala', 'batla'] },
  { canonicalName: 'Moga', state: 'Punjab', district: 'Moga', type: 'city', lat: 30.8160, lng: 75.1717, aliases: ['moga'] },
  { canonicalName: 'Abohar', state: 'Punjab', district: 'Fazilka', type: 'city', lat: 30.1450, lng: 74.1995, aliases: ['abohar'] },
  { canonicalName: 'Malerkotla', state: 'Punjab', district: 'Malerkotla', type: 'city', lat: 30.5304, lng: 75.8800, aliases: ['malerkotla', 'maler kotla', 'malerkatla', 'malerkotala'] },
  { canonicalName: 'Khanna', state: 'Punjab', district: 'Ludhiana', type: 'city', lat: 30.7050, lng: 76.2220, aliases: ['khanna'] },
  { canonicalName: 'Phagwara', state: 'Punjab', district: 'Kapurthala', type: 'city', lat: 31.2240, lng: 75.7710, aliases: ['phagwara', 'fagwara'] },
  { canonicalName: 'Muktsar', state: 'Punjab', district: 'Sri Muktsar Sahib', type: 'city', lat: 30.4760, lng: 74.5160, aliases: ['muktsar', 'sri muktsar sahib', 'mukatsar'] },
  { canonicalName: 'Barnala', state: 'Punjab', district: 'Barnala', type: 'city', lat: 30.3740, lng: 75.5460, aliases: ['barnala'] },
  { canonicalName: 'Rajpura', state: 'Punjab', district: 'Patiala', type: 'city', lat: 30.4840, lng: 76.5940, aliases: ['rajpura'] },
  { canonicalName: 'Firozpur', state: 'Punjab', district: 'Firozpur', type: 'city', lat: 30.9250, lng: 74.6130, aliases: ['firozpur', 'ferozepur', 'ferozpur'] },
  { canonicalName: 'Kapurthala', state: 'Punjab', district: 'Kapurthala', type: 'city', lat: 31.3800, lng: 75.3850, aliases: ['kapurthala'] },
  { canonicalName: 'Sangrur', state: 'Punjab', district: 'Sangrur', type: 'city', lat: 30.2458, lng: 75.8421, aliases: ['sangrur'] },
  { canonicalName: 'Fazilka', state: 'Punjab', district: 'Fazilka', type: 'city', lat: 30.4030, lng: 74.0280, aliases: ['fazilka'] },
  { canonicalName: 'Gurdaspur', state: 'Punjab', district: 'Gurdaspur', type: 'city', lat: 32.0410, lng: 75.4050, aliases: ['gurdaspur'] },
  { canonicalName: 'Mandi Gobindgarh', state: 'Punjab', district: 'Fatehgarh Sahib', type: 'town', lat: 30.6660, lng: 76.3020, aliases: ['mandi gobindgarh', 'gobindgarh', 'govindgarh'] },
  { canonicalName: 'Mansa', state: 'Punjab', district: 'Mansa', type: 'city', lat: 29.9880, lng: 75.3930, aliases: ['mansa'] },
  { canonicalName: 'Sunam', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 30.1280, lng: 75.7990, aliases: ['sunam'] },
  { canonicalName: 'Nabha', state: 'Punjab', district: 'Patiala', type: 'town', lat: 30.3740, lng: 76.1500, aliases: ['nabha'] },
  { canonicalName: 'Tarn Taran', state: 'Punjab', district: 'Tarn Taran', type: 'city', lat: 31.4510, lng: 74.9280, aliases: ['tarn taran', 'taran taran'] },
  { canonicalName: 'Nawanshahr', state: 'Punjab', district: 'SBS Nagar', type: 'town', lat: 31.1240, lng: 76.1170, aliases: ['nawanshahr', 'shaheed bhagat singh nagar', 'sbs nagar', 'banga'] },
  { canonicalName: 'Faridkot', state: 'Punjab', district: 'Faridkot', type: 'city', lat: 30.6750, lng: 74.7550, aliases: ['faridkot'] },
  { canonicalName: 'Nangal', state: 'Punjab', district: 'Rupnagar', type: 'town', lat: 31.3900, lng: 76.3750, aliases: ['nangal'] },
  { canonicalName: 'Anandpur Sahib', state: 'Punjab', district: 'Rupnagar', type: 'town', lat: 31.2390, lng: 76.5020, aliases: ['anandpur sahib', 'anandpur'] },
  { canonicalName: 'Rupnagar', state: 'Punjab', district: 'Rupnagar', type: 'city', lat: 30.9680, lng: 76.5270, aliases: ['rupnagar', 'ropar'] },
  { canonicalName: 'Dhuri', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 30.3680, lng: 75.8680, aliases: ['dhuri'] },
  { canonicalName: 'Jagraon', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.7870, lng: 75.4730, aliases: ['jagraon'] },
  { canonicalName: 'Sirhind', state: 'Punjab', district: 'Fatehgarh Sahib', type: 'town', lat: 30.6430, lng: 76.3820, aliases: ['sirhind', 'fatehgarh sahib'] },
  { canonicalName: 'Kotkapura', state: 'Punjab', district: 'Faridkot', type: 'town', lat: 30.9810, lng: 74.8280, aliases: ['kotkapura', 'kotakpura', 'faridkote', 'feridkot'] },

  // ----------------------------- Haryana -----------------------------
  { canonicalName: 'Gurugram', state: 'Haryana', district: 'Gurugram', type: 'metro', lat: 28.4595, lng: 77.0266, aliases: ['gurugram', 'gurgaon', 'ggn', 'गुड़गांव', 'गुरुग्राम', 'grg', 'gurgoan', 'gurgao', 'guragon', 'cyber city', 'cyber hub', 'dlf cyber city', 'golf course road', 'golf course extension', 'mg road', 'mg road gurgaon', 'mg road metro', 'huda city centre', 'iffco chowk', 'sushant lok', 'dlf phase', 'dlf phase 1', 'dlf phase 2', 'dlf phase 3', 'dlf phase 4', 'dlf phase 5', 'dlf 1', 'dlf 2', 'dlf 3', 'dlf 4', 'dlf 5', 'sector 29', 'south city', 'palam vihar', 'udyog vihar', 'sohna', 'sohna road', 'manesar', 'new gurgaon', 'old gurgaon'] },
  { canonicalName: 'Faridabad', state: 'Haryana', district: 'Faridabad', type: 'metro', lat: 28.4089, lng: 77.3178, aliases: ['faridabad', 'fbd', 'फरीदाबाद', 'faridabaad', 'fariadabad', 'fridabad', 'faridbaad', 'new faridabad', 'old faridabad', 'badarpur', 'badarpur border', 'ballabgarh', 'bata chowk', 'neelam chowk', 'nhpc chowk', 'sector 16 faridabad'] },
  { canonicalName: 'Panipat', state: 'Haryana', district: 'Panipat', type: 'city', lat: 29.3909, lng: 76.9635, aliases: ['panipat', 'पानीपत', 'panipaat', 'paneepat'] },
  { canonicalName: 'Ambala', state: 'Haryana', district: 'Ambala', type: 'city', lat: 30.3782, lng: 76.7767, aliases: ['ambala', 'umbala', 'ambala cantt', 'ambala city', 'अंबाला', 'amb', 'ambl', 'ambala cantonment', 'ambala railway station'] },
  { canonicalName: 'Yamunanagar', state: 'Haryana', district: 'Yamunanagar', type: 'city', lat: 30.1290, lng: 77.2674, aliases: ['yamunanagar', 'yamuna nagar', 'jagadhri'] },
  { canonicalName: 'Rohtak', state: 'Haryana', district: 'Rohtak', type: 'city', lat: 28.8955, lng: 76.6066, aliases: ['rohtak', 'रोहतक', 'rohtaak'] },
  { canonicalName: 'Hisar', state: 'Haryana', district: 'Hisar', type: 'city', lat: 29.1492, lng: 75.7217, aliases: ['hisar', 'hissar', 'हिसार', 'hesar'] },
  { canonicalName: 'Karnal', state: 'Haryana', district: 'Karnal', type: 'city', lat: 29.6857, lng: 76.9905, aliases: ['karnal', 'करनाल', 'karanal', 'kernal'] },
  { canonicalName: 'Sonipat', state: 'Haryana', district: 'Sonipat', type: 'city', lat: 28.9931, lng: 77.0151, aliases: ['sonipat', 'sonepat', 'सोनीपत'] },
  { canonicalName: 'Bhiwani', state: 'Haryana', district: 'Bhiwani', type: 'city', lat: 28.7930, lng: 76.1390, aliases: ['bhiwani'] },
  { canonicalName: 'Sirsa', state: 'Haryana', district: 'Sirsa', type: 'city', lat: 29.5350, lng: 75.0290, aliases: ['sirsa'] },
  { canonicalName: 'Bahadurgarh', state: 'Haryana', district: 'Jhajjar', type: 'city', lat: 28.6930, lng: 76.9350, aliases: ['bahadurgarh'] },
  { canonicalName: 'Jind', state: 'Haryana', district: 'Jind', type: 'city', lat: 29.3160, lng: 76.3160, aliases: ['jind'] },
  { canonicalName: 'Kurukshetra', state: 'Haryana', district: 'Kurukshetra', type: 'city', lat: 29.9695, lng: 76.8783, aliases: ['kurukshetra', 'thanesar', 'kkr'] },
  { canonicalName: 'Kaithal', state: 'Haryana', district: 'Kaithal', type: 'city', lat: 29.8010, lng: 76.3990, aliases: ['kaithal'] },
  { canonicalName: 'Rewari', state: 'Haryana', district: 'Rewari', type: 'city', lat: 28.1990, lng: 76.6170, aliases: ['rewari'] },
  { canonicalName: 'Palwal', state: 'Haryana', district: 'Palwal', type: 'city', lat: 28.1440, lng: 77.3320, aliases: ['palwal'] },
  { canonicalName: 'Hansi', state: 'Haryana', district: 'Hisar', type: 'town', lat: 29.1030, lng: 75.9630, aliases: ['hansi'] },
  { canonicalName: 'Narnaul', state: 'Haryana', district: 'Mahendragarh', type: 'town', lat: 28.0440, lng: 76.1090, aliases: ['narnaul'] },
  { canonicalName: 'Fatehabad', state: 'Haryana', district: 'Fatehabad', type: 'town', lat: 29.5150, lng: 75.4540, aliases: ['fatehabad'] },
  { canonicalName: 'Charkhi Dadri', state: 'Haryana', district: 'Charkhi Dadri', type: 'town', lat: 28.5920, lng: 76.2710, aliases: ['charkhi dadri', 'dadri'] },
  { canonicalName: 'Jhajjar', state: 'Haryana', district: 'Jhajjar', type: 'town', lat: 28.6060, lng: 76.6560, aliases: ['jhajjar'] },
  { canonicalName: 'Mahendragarh', state: 'Haryana', district: 'Mahendragarh', type: 'town', lat: 28.2780, lng: 76.1490, aliases: ['mahendragarh', 'mahendergarh'] },

  // ----------------------------- Delhi NCR -----------------------------
  { canonicalName: 'Delhi', state: 'Delhi', district: 'New Delhi', type: 'metro', lat: 28.6139, lng: 77.2090, aliases: ['delhi', 'new delhi', 'delhi ncr', 'ndls', 'दिल्ली', 'ਦਿੱਲੀ', 'dli', 'dehli', 'dilli', 'dilhi', 'dilhe', 'delhy', 'delhi airport', 'delhi junction', 'delhi railway', 'igi', 'igi airport', 'indira gandhi airport', 't1', 't2', 't3', 'terminal 1', 'terminal 2', 'terminal 3', 'terminal one', 'terminal two', 'terminal three', 'terminal1', 'terminal2', 'terminal3', 'aerocity', 'connaught place', 'cp', 'dwarka', 'dwarka sector', 'kashmere gate', 'kashmiri gate', 'kashmir gate', 'kashmeri gate', 'isbt delhi', 'anand vihar', 'anand vihar isbt', 'anand vihar terminal', 'sarai kale khan', 'sarai kale khan isbt', 'nizamuddin', 'hazrat nizamuddin', 'nizamuddin railway', 'new delhi railway', 'new delhi station', 'old delhi', 'old delhi railway', 'old delhi station', 'ajmeri gate', 'ajmeri gate railway', 'ajmeri gate railway station', 'sarai rohilla', 'karol bagh', 'paharganj', 'chandni chowk', 'india gate', 'red fort', 'rohini', 'pitampura', 'model town', 'civil lines', 'shahdara', 'dilshad garden', 'preet vihar', 'mayur vihar', 'kalkaji', 'nehru place', 'greater kailash', 'gk', 'gk 1', 'gk 2', 'defence colony', 'saket', 'saket metro', 'hauz khas', 'green park', 'malviya nagar', 'lajpat nagar', 'south delhi', 'east delhi', 'west delhi', 'north delhi', 'central delhi', 'janakpuri', 'rajouri garden', 'punjabi bagh', 'paschim vihar', 'kirti nagar', 'moti nagar', 'tilak nagar', 'subhash nagar', 'uttam nagar', 'lakshmi nagar', 'gtb nagar', 'vijay nagar delhi', 'shalimar bagh', 'vasant vihar', 'vasant kunj', 'r k puram', 'munirka', 'mahipalpur', 'vivek vihar', 'rajiv chowk', 'rajiv chowk metro', 'sadar', 'sadar bazar', 'okhla'] },
  { canonicalName: 'Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', type: 'city', lat: 28.5355, lng: 77.3910, aliases: ['noida', 'nioda', 'noyda', 'noeda', 'greater noida west', 'noida extension', 'noida sector', 'noida city', 'noida city centre', 'sector 15', 'sector 16', 'sector 18', 'sector 52', 'sector 58', 'sector 59', 'sector 61', 'sector 62', 'sector 63', 'sector 125', 'sector 137', 'botanical garden', 'film city', 'knowledge park', 'pari chowk', 'jewar', 'jewar airport', 'alpha', 'beta', 'gamma', 'delta'] },
  { canonicalName: 'Greater Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', type: 'city', lat: 28.4744, lng: 77.5040, aliases: ['greater noida', 'gr noida', 'greno'] },
  { canonicalName: 'Ghaziabad', state: 'Uttar Pradesh', district: 'Ghaziabad', type: 'city', lat: 28.6692, lng: 77.4538, aliases: ['ghaziabad', 'gzb', 'ghz', 'gaziabad', 'ghazibaad', 'gaziabaad', 'indirapuram', 'vaishali', 'kaushambi', 'vasundhara', 'mohan nagar', 'raj nagar', 'raj nagar extension', 'vijay nagar', 'crossings republik', 'loni', 'loni border', 'old ghaziabad'] },
  { canonicalName: 'Meerut', state: 'Uttar Pradesh', district: 'Meerut', type: 'city', lat: 28.9845, lng: 77.7064, aliases: ['meerut'] },
  { canonicalName: 'Hapur', state: 'Uttar Pradesh', district: 'Hapur', type: 'town', lat: 28.7300, lng: 77.7810, aliases: ['hapur'] },
  { canonicalName: 'Bulandshahr', state: 'Uttar Pradesh', district: 'Bulandshahr', type: 'town', lat: 28.4030, lng: 77.8580, aliases: ['bulandshahr', 'bulandshahar'] },
  { canonicalName: 'Baghpat', state: 'Uttar Pradesh', district: 'Baghpat', type: 'town', lat: 28.9440, lng: 77.2180, aliases: ['baghpat', 'bagpat'] },
  { canonicalName: 'Saharanpur', state: 'Uttar Pradesh', district: 'Saharanpur', type: 'city', lat: 29.9640, lng: 77.5460, aliases: ['saharanpur', 'saharnpur'] },

  // ----------------------------- Himachal Pradesh (corridor drops) -----------------------------
  { canonicalName: 'Shimla', state: 'Himachal Pradesh', district: 'Shimla', type: 'city', lat: 31.1048, lng: 77.1734, aliases: ['shimla', 'simla', 'शिमला', 'shimlaa', 'shimlah', 'shmla', 'shimla airport', 'mall road shimla', 'kufri', 'kuffri', 'kufree', 'chail', 'chayl', 'the ridge', 'jakhu', 'jakhu temple', 'naldehra', 'naldehara'] },
  { canonicalName: 'Solan', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9080, lng: 77.0990, aliases: ['solan', 'solaan', 'solen', 'mushroom city'] },
  { canonicalName: 'Baddi', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9580, lng: 76.7910, aliases: ['baddi'] },
  { canonicalName: 'Parwanoo', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8370, lng: 76.9610, aliases: ['parmanu', 'parwanoo', 'parwanu', 'parvanu'] },
  { canonicalName: 'Nalagarh', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 31.0410, lng: 76.7220, aliases: ['nalagarh'] },
  { canonicalName: 'Una', state: 'Himachal Pradesh', district: 'Una', type: 'town', lat: 31.4680, lng: 76.2700, aliases: ['una', 'unna'] },
  { canonicalName: 'Dharamshala', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 32.2190, lng: 76.3234, aliases: ['palmpur', 'dharamshala', 'dharamsala', 'mcleodganj', 'dharmshala', 'dhramshala', 'dharmsala', 'dharamshala airport', 'gaggal airport', 'mcleod ganj', 'mcleodgunj', 'mcleodgng', 'mcleod', 'dal lake dharamshala', 'bhagsu waterfall', 'bhagsu', 'bhagsunag', 'triund', 'triyund', 'kangra', 'kangara', 'palampur', 'palampure'] },
  { canonicalName: 'Manali', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 32.2396, lng: 77.1887, aliases: ['manali', 'manaali', 'manalli', 'manal', 'manali airport', 'bhuntar airport', 'kullu manali', 'rohtang', 'rohtang pass', 'rohtang la', 'rothang', 'solang', 'solang valley', 'solang nala', 'sollang', 'old manali', 'mall road manali', 'vashisht', 'vashisth', 'vasisth', 'naggar', 'naggr', 'naggar castle'] },
  { canonicalName: 'Kullu', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 31.9580, lng: 77.1090, aliases: ['kullu', 'kulloo', 'kulu'] },
  { canonicalName: 'Mandi', state: 'Himachal Pradesh', district: 'Mandi', type: 'town', lat: 31.7080, lng: 76.9320, aliases: ['mandi', 'mandee', 'mandhi'] },
  { canonicalName: 'Bilaspur (HP)', state: 'Himachal Pradesh', district: 'Bilaspur', type: 'town', lat: 31.3300, lng: 76.7570, aliases: ['bilaspur hp', 'bilaspur himachal', 'bilaspure'] },
  { canonicalName: 'Hamirpur (HP)', state: 'Himachal Pradesh', district: 'Hamirpur', type: 'town', lat: 31.6840, lng: 76.5220, aliases: ['hamirpur hp', 'hamirpur himachal', 'hamipur', 'hamirpure'] },
  { canonicalName: 'Dalhousie', state: 'Himachal Pradesh', district: 'Chamba', type: 'town', lat: 32.5389, lng: 75.9773, aliases: ['banikhet', 'dalhousie', 'dalhosie', 'dalhousee', 'dalhausie', 'khajjiar', 'khajjar', 'khajiar', 'mini switzerland', 'chamba'] },
  { canonicalName: 'Kasauli', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8990, lng: 76.9640, aliases: ['kasauli', 'kasaulee', 'kasoli'] },
  { canonicalName: 'Kinnaur', state: 'Himachal Pradesh', district: 'Kinnaur', type: 'town', lat: 31.5920, lng: 78.4390, aliases: ['kalpa', 'karcham', 'reckong peo', 'kinnaur', 'kinnor', 'kinnauar'] },
  { canonicalName: 'Spiti', state: 'Himachal Pradesh', district: 'Lahaul and Spiti', type: 'town', lat: 32.2460, lng: 78.0680, aliases: ['spiti', 'spity', 'spitti', 'spiti valley', 'kaza', 'kaaza', 'tabo', 'taabo', 'key monastery', 'ki monastery'] },
  { canonicalName: 'Lahaul', state: 'Himachal Pradesh', district: 'Lahaul and Spiti', type: 'town', lat: 32.6940, lng: 77.0600, aliases: ['lahaul', 'lahual', 'lahul', 'lahaul spiti', 'keylong', 'kyelong'] },
  { canonicalName: 'Sirmaur', state: 'Himachal Pradesh', district: 'Sirmaur', type: 'town', lat: 30.5580, lng: 77.1690, aliases: ['sirmaur', 'sirmour', 'sirmaour', 'nahan', 'nahaan'] },
  { canonicalName: 'Barog', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9750, lng: 77.0500, aliases: ['barog'] },
  { canonicalName: 'Mashobra', state: 'Himachal Pradesh', district: 'Shimla', type: 'town', lat: 31.1380, lng: 77.2130, aliases: ['mashobra', 'mashobara', 'mashobraa'] },
  { canonicalName: 'Rampur Bushahr', state: 'Himachal Pradesh', district: 'Shimla', type: 'town', lat: 31.4460, lng: 77.6290, aliases: ['rampur bushahr', 'rampur', 'rampure'] },

  // ----------------------------- Rajasthan (corridor drops) -----------------------------
  { canonicalName: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', type: 'metro', lat: 26.9124, lng: 75.7873, aliases: ['jaipur', 'jaypur', 'जयपुर', 'jpr', 'jaipure', 'jypur', 'pink city'] },
  { canonicalName: 'Jodhpur', state: 'Rajasthan', district: 'Jodhpur', type: 'city', lat: 26.2389, lng: 73.0243, aliases: ['jodhpur', 'jodhpure', 'jodhpurr'] },
  { canonicalName: 'Udaipur', state: 'Rajasthan', district: 'Udaipur', type: 'city', lat: 24.5854, lng: 73.7125, aliases: ['udaipur', 'udaipure', 'udaypur'] },
  { canonicalName: 'Ajmer', state: 'Rajasthan', district: 'Ajmer', type: 'city', lat: 26.4499, lng: 74.6399, aliases: ['ajmer', 'ajmere', 'ajmeer'] },
  { canonicalName: 'Bikaner', state: 'Rajasthan', district: 'Bikaner', type: 'city', lat: 28.0229, lng: 73.3119, aliases: ['bikaner'] },
  { canonicalName: 'Kota', state: 'Rajasthan', district: 'Kota', type: 'city', lat: 25.2138, lng: 75.8648, aliases: ['kota'] },
  { canonicalName: 'Sri Ganganagar', state: 'Rajasthan', district: 'Sri Ganganagar', type: 'city', lat: 29.9094, lng: 73.8800, aliases: ['sri ganganagar', 'ganganagar'] },
  { canonicalName: 'Hanumangarh', state: 'Rajasthan', district: 'Hanumangarh', type: 'town', lat: 29.5810, lng: 74.3290, aliases: ['hanumangarh'] },
  { canonicalName: 'Alwar', state: 'Rajasthan', district: 'Alwar', type: 'city', lat: 27.5530, lng: 76.6346, aliases: ['alwar'] },
  { canonicalName: 'Bhiwadi', state: 'Rajasthan', district: 'Alwar', type: 'town', lat: 28.2100, lng: 76.8600, aliases: ['bhiwadi'] },
  { canonicalName: 'Pushkar', state: 'Rajasthan', district: 'Ajmer', type: 'town', lat: 26.4900, lng: 74.5510, aliases: ['pushkar', 'pushker'] },

  // ----------------------------- Common national drops (Uttarakhand / UP / J&K) -----------------------------
  { canonicalName: 'Dehradun', state: 'Uttarakhand', district: 'Dehradun', type: 'city', lat: 30.3165, lng: 78.0322, aliases: ['dehradun', 'ddn', 'देहरादून', 'dehradoon', 'dehraddun', 'dehraduun', 'dehradun airport', 'jolly grant', 'jolly grant airport', 'clock tower dehradun', 'rajpur road', 'clement', 'clement town'] },
  { canonicalName: 'Haridwar', state: 'Uttarakhand', district: 'Haridwar', type: 'city', lat: 29.9457, lng: 78.1642, aliases: ['haridwar', 'hardwar', 'हरिद्वार', 'hariwar', 'haridwaar', 'har ki pauri', 'har ki paudi', 'laxman jhula', 'lakshman jhula', 'ram jhula', 'triveni ghat'] },
  { canonicalName: 'Rishikesh', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.0869, lng: 78.2676, aliases: ['rishikesh', 'risikesh', 'rishikes'] },
  { canonicalName: 'Mussoorie', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.4599, lng: 78.0664, aliases: ['mansuri', 'mansoori', 'mussoorie', 'masoori', 'mussorie', 'musoorie', 'mall road mussoorie', 'kempty falls', 'kempty fall', 'landour', 'landaur'] },
  { canonicalName: 'Nainital', state: 'Uttarakhand', district: 'Nainital', type: 'town', lat: 29.3919, lng: 79.4542, aliases: ['nainital', 'nanital', 'naintal', 'nanitaal', 'nainital lake', 'naini lake', 'naina devi', 'bhimtal', 'bhimtaal', 'sat tal', 'sattal', 'haldwani', 'haldvani', 'kathgodam', 'kathgodaam'] },
  { canonicalName: 'Almora', state: 'Uttarakhand', district: 'Almora', type: 'town', lat: 29.5971, lng: 79.6591, aliases: ['almora', 'almoda', 'almoraa', 'ranikhet', 'ranekhet'] },
  { canonicalName: 'Corbett', state: 'Uttarakhand', district: 'Nainital', type: 'town', lat: 29.5300, lng: 78.7740, aliases: ['corbett', 'jim corbett', 'corbett national park', 'jim corbett park', 'ramnagar', 'ramnaagar'] },
  { canonicalName: 'Pauri', state: 'Uttarakhand', district: 'Pauri Garhwal', type: 'town', lat: 30.1470, lng: 78.7760, aliases: ['pauri', 'paudi', 'pauri garhwal'] },
  { canonicalName: 'Rudraprayag', state: 'Uttarakhand', district: 'Rudraprayag', type: 'town', lat: 30.2849, lng: 78.9814, aliases: ['rudraprayag', 'rudraprayaag', 'rudrapryag', 'kedarnath', 'kedarnaath', 'kedrarnath', 'gaurikund', 'gowrikund'] },
  { canonicalName: 'Badrinath', state: 'Uttarakhand', district: 'Chamoli', type: 'town', lat: 30.7433, lng: 79.4938, aliases: ['badrinath', 'badrinaath', 'badreenaath', 'chamoli', 'chamolee', 'joshimath', 'joshimaath', 'auli', 'aulee', 'auli skiing'] },
  { canonicalName: 'Yamunotri', state: 'Uttarakhand', district: 'Uttarkashi', type: 'town', lat: 31.0150, lng: 78.4590, aliases: ['yamunotri', 'yamunotree', 'yamnotri'] },
  { canonicalName: 'Gangotri', state: 'Uttarakhand', district: 'Uttarkashi', type: 'town', lat: 30.9940, lng: 78.9390, aliases: ['gangotri', 'gangotree', 'gangotry', 'uttarkashi', 'uttarkasi'] },
  { canonicalName: 'Tehri', state: 'Uttarakhand', district: 'Tehri Garhwal', type: 'town', lat: 30.3780, lng: 78.4800, aliases: ['tehri', 'tehree', 'tehri dam', 'new tehri'] },
  { canonicalName: 'Pithoragarh', state: 'Uttarakhand', district: 'Pithoragarh', type: 'town', lat: 29.5830, lng: 80.2180, aliases: ['pithoragarh', 'pithoragad', 'pithoragaarh'] },
  { canonicalName: 'Bageshwar', state: 'Uttarakhand', district: 'Bageshwar', type: 'town', lat: 29.8360, lng: 79.7730, aliases: ['bageshwar', 'bagheswar', 'bageswar'] },
  { canonicalName: 'Champawat', state: 'Uttarakhand', district: 'Champawat', type: 'town', lat: 29.3340, lng: 80.0910, aliases: ['champawat', 'champavat', 'champawaat'] },
  { canonicalName: 'Rudrapur', state: 'Uttarakhand', district: 'Udham Singh Nagar', type: 'city', lat: 28.9800, lng: 79.4000, aliases: ['rudrapur', 'rudrapure', 'rudrapuur', 'kashipur', 'kashipure', 'kichha', 'kiccha'] },
  { canonicalName: 'Agra', state: 'Uttar Pradesh', district: 'Agra', type: 'city', lat: 27.1767, lng: 78.0081, aliases: ['agra', 'आगरा', 'aagra', 'taj mahal'] },
  { canonicalName: 'Mathura', state: 'Uttar Pradesh', district: 'Mathura', type: 'city', lat: 27.4924, lng: 77.6737, aliases: ['mathura', 'vrindavan', 'mathuara'] },
  { canonicalName: 'Jammu', state: 'Jammu and Kashmir', district: 'Jammu', type: 'city', lat: 32.7266, lng: 74.8570, aliases: ['jammu', 'जम्मू'] },
  { canonicalName: 'Katra', state: 'Jammu and Kashmir', district: 'Reasi', type: 'town', lat: 32.9917, lng: 74.9319, aliases: ['katra', 'vaishno devi', 'mata vaishno devi'] },
  // 2026-10-13 - in-region towns from the unresolved-city queue (manual backfill run 2).
  // Coords are approximate town centres. Ambiguous names skipped on purpose
  // (Talwandi, Mullanpur, Patti, Dharamkot, bare Sultanpur / Shahabad).
  { canonicalName: 'Doraha', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.7990, lng: 76.0230, aliases: ['doraha'] },
  { canonicalName: 'Sahnewal', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.8450, lng: 75.9700, aliases: ['sahnewal'] },
  { canonicalName: 'Raikot', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.6500, lng: 75.6000, aliases: ['raikot', 'raekot'] },
  { canonicalName: 'Machhiwara', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.9170, lng: 76.2000, aliases: ['machhiwara', 'machiwara', 'machhiwada'] },
  { canonicalName: 'Nakodar', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.1260, lng: 75.4750, aliases: ['nakodar', 'nokder', 'nakoder'] },
  { canonicalName: 'Phillaur', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.0190, lng: 75.7900, aliases: ['phillaur', 'philloar', 'phillor', 'phillour', 'philaur'] },
  { canonicalName: 'Adampur', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.4320, lng: 75.7150, aliases: ['adampur', 'admpur', 'adampur doaba', 'adampur airport'] },
  { canonicalName: 'Shahkot', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.0800, lng: 75.3400, aliases: ['shahkot'] },
  { canonicalName: 'Nurmahal', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.0950, lng: 75.5950, aliases: ['nurmahal', 'nurmehal', 'noormahal'] },
  { canonicalName: 'Goraya', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.1250, lng: 75.7700, aliases: ['goraya', 'guraya'] },
  { canonicalName: 'Bhogpur', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.5500, lng: 75.6450, aliases: ['bhogpur'] },
  { canonicalName: 'Sultanpur Lodhi', state: 'Punjab', district: 'Kapurthala', type: 'town', lat: 31.2150, lng: 75.2000, aliases: ['sultanpur lodhi', 'sultanpur lodi'] },
  { canonicalName: 'Dasuya', state: 'Punjab', district: 'Hoshiarpur', type: 'town', lat: 31.8170, lng: 75.6530, aliases: ['dasuya', 'dasuha'] },
  { canonicalName: 'Tanda', state: 'Punjab', district: 'Hoshiarpur', type: 'town', lat: 31.6700, lng: 75.6300, aliases: ['tanda', 'tanda urmar'] },
  { canonicalName: 'Garhshankar', state: 'Punjab', district: 'Hoshiarpur', type: 'town', lat: 31.2150, lng: 76.1400, aliases: ['garhshankar', 'garhshanker', 'garh shankar'] },
  { canonicalName: 'Mahilpur', state: 'Punjab', district: 'Hoshiarpur', type: 'town', lat: 31.3600, lng: 76.0400, aliases: ['mahilpur'] },
  { canonicalName: 'Balachaur', state: 'Punjab', district: 'SBS Nagar', type: 'town', lat: 31.0600, lng: 76.3000, aliases: ['balachaur', 'balachor'] },
  { canonicalName: 'Chamkaur Sahib', state: 'Punjab', district: 'Rupnagar', type: 'town', lat: 30.8900, lng: 76.4250, aliases: ['chamkaur sahib', 'chamkaur'] },
  { canonicalName: 'Amloh', state: 'Punjab', district: 'Fatehgarh Sahib', type: 'town', lat: 30.6100, lng: 76.2300, aliases: ['amloh', 'amlah'] },
  { canonicalName: 'Khamanon', state: 'Punjab', district: 'Fatehgarh Sahib', type: 'town', lat: 30.8200, lng: 76.3500, aliases: ['khamanon', 'khamano'] },
  { canonicalName: 'Ahmedgarh', state: 'Punjab', district: 'Malerkotla', type: 'town', lat: 30.6800, lng: 75.8300, aliases: ['ahmedgarh', 'ahmadgarh'] },
  { canonicalName: 'Patran', state: 'Punjab', district: 'Patiala', type: 'town', lat: 29.9600, lng: 76.0700, aliases: ['patran'] },
  { canonicalName: 'Bhadson', state: 'Punjab', district: 'Patiala', type: 'town', lat: 30.4500, lng: 76.1900, aliases: ['bhadson'] },
  { canonicalName: 'Bhawanigarh', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 30.2650, lng: 76.0400, aliases: ['bhawanigarh', 'bhawani garh'] },
  { canonicalName: 'Moonak', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 29.8200, lng: 75.8800, aliases: ['moonak', 'munak'] },
  { canonicalName: 'Lehragaga', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 29.9400, lng: 75.8800, aliases: ['lehragaga', 'lehra gaga'] },
  { canonicalName: 'Rampura Phul', state: 'Punjab', district: 'Bathinda', type: 'town', lat: 30.2720, lng: 75.2380, aliases: ['rampura phul', 'rampuraphul', 'rampuraful', 'rampurapull', 'rampura phool'] },
  { canonicalName: 'Bhikhi', state: 'Punjab', district: 'Mansa', type: 'town', lat: 30.0600, lng: 75.5400, aliases: ['bhikhi'] },
  { canonicalName: 'Goindwal Sahib', state: 'Punjab', district: 'Tarn Taran', type: 'town', lat: 31.3700, lng: 75.1500, aliases: ['goindwal sahib', 'goindwal'] },
  { canonicalName: 'Pehowa', state: 'Haryana', district: 'Kurukshetra', type: 'town', lat: 29.9800, lng: 76.5800, aliases: ['pehowa', 'pehova'] },
  { canonicalName: 'Shahabad Markanda', state: 'Haryana', district: 'Kurukshetra', type: 'town', lat: 30.1700, lng: 76.8700, aliases: ['shahabad markanda', 'shahbad markanda'] },
  { canonicalName: 'Samalkha', state: 'Haryana', district: 'Panipat', type: 'town', lat: 29.2350, lng: 77.0150, aliases: ['samalkha', 'smalkha'] },
  { canonicalName: 'Narwana', state: 'Haryana', district: 'Jind', type: 'town', lat: 29.6000, lng: 76.1200, aliases: ['narwana'] },
  { canonicalName: 'Tohana', state: 'Haryana', district: 'Fatehabad', type: 'town', lat: 29.7100, lng: 75.9000, aliases: ['tohana'] },
  { canonicalName: 'Naraingarh', state: 'Haryana', district: 'Ambala', type: 'town', lat: 30.4800, lng: 77.1300, aliases: ['naraingarh', 'narayangarh'] },
  { canonicalName: 'Cheeka', state: 'Haryana', district: 'Kaithal', type: 'town', lat: 30.0500, lng: 76.3400, aliases: ['cheeka', 'guhla cheeka', 'guhla'] },
  { canonicalName: 'Pinjore', state: 'Haryana', district: 'Panchkula', type: 'town', lat: 30.7980, lng: 76.9180, aliases: ['pinjore', 'pinjor', 'pinjaur'] },
  { canonicalName: 'Kalka', state: 'Haryana', district: 'Panchkula', type: 'town', lat: 30.8390, lng: 76.9400, aliases: ['kalka', 'kalka station', 'kalka railway station'] },
  { canonicalName: 'Kasol', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 32.0100, lng: 77.3150, aliases: ['kasol', 'kashol'] },
  { canonicalName: 'Bir', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 32.0450, lng: 76.7200, aliases: ['bir', 'bir billing'] },
  { canonicalName: 'Jibhi', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 31.5900, lng: 77.3700, aliases: ['jibhi', 'jahibi'] },
  { canonicalName: 'Bhuntar', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 31.8800, lng: 77.1500, aliases: ['bhuntar', 'bhunter'] },
  { canonicalName: 'Paonta Sahib', state: 'Himachal Pradesh', district: 'Sirmaur', type: 'town', lat: 30.4380, lng: 77.6240, aliases: ['paonta sahib', 'paonta', 'pontasahib', 'ponta sahib'] },
  { canonicalName: 'Kumarhatti', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8900, lng: 77.0500, aliases: ['kumarhatti'] },
  { canonicalName: 'Kandaghat', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9650, lng: 77.1150, aliases: ['kandaghat'] },
  { canonicalName: 'Baijnath', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 32.0500, lng: 76.6500, aliases: ['baijnath'] },
  { canonicalName: 'Gagret', state: 'Himachal Pradesh', district: 'Una', type: 'town', lat: 31.6600, lng: 76.0600, aliases: ['gagret'] },
  { canonicalName: 'Nadaun', state: 'Himachal Pradesh', district: 'Hamirpur', type: 'town', lat: 31.7800, lng: 76.3500, aliases: ['nadaun'] },
  { canonicalName: 'Chopal', state: 'Himachal Pradesh', district: 'Shimla', type: 'town', lat: 30.9500, lng: 77.5900, aliases: ['chopal', 'chaupal'] },
  { canonicalName: 'Roorkee', state: 'Uttarakhand', district: 'Haridwar', type: 'city', lat: 29.8540, lng: 77.8880, aliases: ['roorkee', 'rurki', 'roorki'] },
  { canonicalName: 'Kathua', state: 'Jammu and Kashmir', district: 'Kathua', type: 'town', lat: 32.3700, lng: 75.5200, aliases: ['kathua'] },
  { canonicalName: 'Udhampur', state: 'Jammu and Kashmir', district: 'Udhampur', type: 'town', lat: 32.9200, lng: 75.1400, aliases: ['udhampur'] },
  { canonicalName: 'Khatu Shyam', state: 'Rajasthan', district: 'Sikar', type: 'town', lat: 27.3640, lng: 75.4020, aliases: ['khatu shyam', 'khatushyam', 'khatushyamji', 'khatu shyam ji', 'khatu', 'khatu shayam'] },

  // 2026-10-17 — real towns from the unresolved queue (most frequent first per state).
  // Punjab
  { canonicalName: 'Samrala', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.8360, lng: 76.1900, aliases: ['samrala'] },
  { canonicalName: 'Mukerian', state: 'Punjab', district: 'Hoshiarpur', type: 'town', lat: 31.9520, lng: 75.6170, aliases: ['mukerian', 'mukeria'] },
  { canonicalName: 'Zira', state: 'Punjab', district: 'Firozpur', type: 'town', lat: 30.9690, lng: 74.9910, aliases: ['zira'] },
  { canonicalName: 'Makhu', state: 'Punjab', district: 'Firozpur', type: 'town', lat: 31.1030, lng: 74.9970, aliases: ['makhu', 'makhu mandi'] },
  { canonicalName: 'Jalalabad', state: 'Punjab', district: 'Fazilka', type: 'town', lat: 30.6060, lng: 74.2560, aliases: ['jalalabad'] },
  { canonicalName: 'Dinanagar', state: 'Punjab', district: 'Gurdaspur', type: 'town', lat: 32.1370, lng: 75.4730, aliases: ['dinanagar', 'dina nagar'] },
  { canonicalName: 'Kartarpur', state: 'Punjab', district: 'Jalandhar', type: 'town', lat: 31.4410, lng: 75.4980, aliases: ['kartarpur'] },
  { canonicalName: 'Begowal', state: 'Punjab', district: 'Kapurthala', type: 'town', lat: 31.6110, lng: 75.5220, aliases: ['begowal'] },
  { canonicalName: 'Bagha Purana', state: 'Punjab', district: 'Moga', type: 'town', lat: 30.6880, lng: 75.0980, aliases: ['bagha purana', 'baghapurana'] },
  { canonicalName: 'Dharamkot', state: 'Punjab', district: 'Moga', type: 'town', lat: 30.9460, lng: 75.2320, aliases: ['dharamkot', 'dharmkot'] },
  { canonicalName: 'Mullanpur Dakha', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.8640, lng: 75.6860, aliases: ['mullanpur dakha', 'mullapur dakha'] },
  { canonicalName: 'Halwara', state: 'Punjab', district: 'Ludhiana', type: 'town', lat: 30.7170, lng: 75.6380, aliases: ['halwara', 'halwara airport'] },
  { canonicalName: 'Talwandi Sabo', state: 'Punjab', district: 'Bathinda', type: 'town', lat: 29.9870, lng: 75.0820, aliases: ['talwandi sabo', 'damdama sahib'] },
  { canonicalName: 'Longowal', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 30.2100, lng: 75.6800, aliases: ['longowal'] },
  { canonicalName: 'Dirba', state: 'Punjab', district: 'Sangrur', type: 'town', lat: 30.0700, lng: 75.9900, aliases: ['dirba', 'dirbha', 'dhirba'] },
  { canonicalName: 'Mehal Kalan', state: 'Punjab', district: 'Barnala', type: 'town', lat: 30.4200, lng: 75.4100, aliases: ['mehal kalan', 'mahal kalan'] },
  { canonicalName: 'Shutrana', state: 'Punjab', district: 'Patiala', type: 'town', lat: 29.9100, lng: 76.1200, aliases: ['shutrana', 'shatrana'] },
  { canonicalName: 'Bareta', state: 'Punjab', district: 'Mansa', type: 'town', lat: 29.8700, lng: 75.7000, aliases: ['bareta'] },
  { canonicalName: 'Patti', state: 'Punjab', district: 'Tarn Taran', type: 'town', lat: 31.2800, lng: 74.8600, aliases: ['patti'] },
  { canonicalName: 'Apra', state: 'Punjab', district: 'Jalandhar', type: 'town', aliases: ['apra'] },
  { canonicalName: 'Tarsikka', state: 'Punjab', district: 'Amritsar', type: 'town', aliases: ['tarsikka'] },
  // Haryana
  { canonicalName: 'Ladwa', state: 'Haryana', district: 'Kurukshetra', type: 'town', lat: 29.9950, lng: 77.0450, aliases: ['ladwa'] },
  { canonicalName: 'Assandh', state: 'Haryana', district: 'Karnal', type: 'town', lat: 29.5200, lng: 76.6000, aliases: ['assandh', 'asandh'] },
  { canonicalName: 'Indri', state: 'Haryana', district: 'Karnal', type: 'town', lat: 29.8800, lng: 77.0600, aliases: ['indri'] },
  { canonicalName: 'Meham', state: 'Haryana', district: 'Rohtak', type: 'town', lat: 28.9700, lng: 76.3000, aliases: ['meham', 'mehem'] },
  { canonicalName: 'Tauru', state: 'Haryana', district: 'Nuh', type: 'town', lat: 28.2100, lng: 76.9500, aliases: ['tauru', 'taoru'] },
  { canonicalName: 'Murthal', state: 'Haryana', district: 'Sonipat', type: 'town', lat: 29.0300, lng: 77.0700, aliases: ['murthal'] },
  { canonicalName: 'Kundli', state: 'Haryana', district: 'Sonipat', type: 'town', lat: 28.8800, lng: 77.1200, aliases: ['kundli', 'kundli border'] },
  { canonicalName: 'Mullana', state: 'Haryana', district: 'Ambala', type: 'town', lat: 30.2800, lng: 77.0500, aliases: ['mullana'] },
  { canonicalName: 'Rania', state: 'Haryana', district: 'Sirsa', type: 'town', lat: 29.5300, lng: 74.8300, aliases: ['rania', 'ranian'] },
  { canonicalName: 'Mandi Dabwali', state: 'Haryana', district: 'Sirsa', type: 'town', lat: 29.9500, lng: 74.7300, aliases: ['mandi dabwali', 'dabwali'] },
  // Himachal Pradesh
  { canonicalName: 'Jwalamukhi', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 31.8760, lng: 76.3230, aliases: ['jwalamukhi', 'jawalamukhi', 'jwalaji', 'jawalaji', 'jwala ji', 'jwala', 'jawala', 'jawla'] },
  { canonicalName: 'Chintpurni', state: 'Himachal Pradesh', district: 'Una', type: 'town', lat: 31.8100, lng: 75.9800, aliases: ['chintpurni', 'chintapurni'] },
  { canonicalName: 'Sundar Nagar', state: 'Himachal Pradesh', district: 'Mandi', type: 'town', lat: 31.5300, lng: 76.8900, aliases: ['sundar nagar', 'sundarnagar', 'sunder nagar', 'sundernagar'] },
  { canonicalName: 'Ghumarwin', state: 'Himachal Pradesh', district: 'Bilaspur', type: 'town', lat: 31.4400, lng: 76.7100, aliases: ['ghumarwin', 'ghumarwi'] },
  { canonicalName: 'Sarkaghat', state: 'Himachal Pradesh', district: 'Mandi', type: 'town', lat: 31.7000, lng: 76.7300, aliases: ['sarkaghat'] },
  { canonicalName: 'Bharmour', state: 'Himachal Pradesh', district: 'Chamba', type: 'town', lat: 32.4400, lng: 76.5300, aliases: ['bharmour', 'bharmaur'] },
  { canonicalName: 'Narkanda', state: 'Himachal Pradesh', district: 'Shimla', type: 'town', lat: 31.2600, lng: 77.4600, aliases: ['narkanda'] },
  // Rajasthan
  { canonicalName: 'Sikar', state: 'Rajasthan', district: 'Sikar', type: 'city', lat: 27.6094, lng: 75.1399, aliases: ['sikar'] },
  { canonicalName: 'Churu', state: 'Rajasthan', district: 'Churu', type: 'city', lat: 28.2920, lng: 74.9500, aliases: ['churu'] },
  { canonicalName: 'Jhunjhunu', state: 'Rajasthan', district: 'Jhunjhunu', type: 'city', lat: 28.1289, lng: 75.3995, aliases: ['jhunjhunu', 'jhunjhunun', 'jhunjhnu'] },
  { canonicalName: 'Nagaur', state: 'Rajasthan', district: 'Nagaur', type: 'city', lat: 27.2020, lng: 73.7330, aliases: ['nagaur', 'nagour'] },
  { canonicalName: 'Ladnun', state: 'Rajasthan', district: 'Didwana-Kuchaman', type: 'town', lat: 27.6530, lng: 74.3960, aliases: ['ladnun', 'ladnu'] },
  { canonicalName: 'Sardarshahar', state: 'Rajasthan', district: 'Churu', type: 'town', lat: 28.4400, lng: 74.4900, aliases: ['sardarshahar', 'sardarshahr', 'sardar shahar'] },
  { canonicalName: 'Sujangarh', state: 'Rajasthan', district: 'Churu', type: 'town', lat: 27.7000, lng: 74.4700, aliases: ['sujangarh'] },
  { canonicalName: 'Taranagar', state: 'Rajasthan', district: 'Churu', type: 'town', lat: 28.6700, lng: 75.0400, aliases: ['taranagar'] },
  { canonicalName: 'Nohar', state: 'Rajasthan', district: 'Hanumangarh', type: 'town', lat: 29.1800, lng: 74.7700, aliases: ['nohar'] },
  { canonicalName: 'Nokha', state: 'Rajasthan', district: 'Bikaner', type: 'town', lat: 27.5600, lng: 73.4700, aliases: ['nokha'] },
  { canonicalName: 'Sawai Madhopur', state: 'Rajasthan', district: 'Sawai Madhopur', type: 'city', lat: 25.9928, lng: 76.3526, aliases: ['sawai madhopur', 'sawaimadhopur', 'ranthambore', 'ranthambhore'] },
  { canonicalName: 'Beawar', state: 'Rajasthan', district: 'Beawar', type: 'city', lat: 26.1010, lng: 74.3200, aliases: ['beawar', 'byawar'] },
  { canonicalName: 'Kishangarh', state: 'Rajasthan', district: 'Ajmer', type: 'city', lat: 26.5900, lng: 74.8600, aliases: ['kishangarh', 'kisangad', 'kishangadh'] },
  { canonicalName: 'Kekri', state: 'Rajasthan', district: 'Ajmer', type: 'town', lat: 25.9700, lng: 75.1500, aliases: ['kekri', 'kekdi'] },
  { canonicalName: 'Jaisalmer', state: 'Rajasthan', district: 'Jaisalmer', type: 'city', lat: 26.9157, lng: 70.9083, aliases: ['jaisalmer', 'jaisalmir'] },
  // Uttar Pradesh
  { canonicalName: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', type: 'metro', lat: 26.8467, lng: 80.9462, aliases: ['lucknow', 'lakhnow', 'lakhnau', 'lko'] },
  { canonicalName: 'Kanpur', state: 'Uttar Pradesh', district: 'Kanpur Nagar', type: 'metro', lat: 26.4499, lng: 80.3319, aliases: ['kanpur'] },
  { canonicalName: 'Varanasi', state: 'Uttar Pradesh', district: 'Varanasi', type: 'city', lat: 25.3176, lng: 82.9739, aliases: ['varanasi', 'banaras', 'benaras'] },
  { canonicalName: 'Prayagraj', state: 'Uttar Pradesh', district: 'Prayagraj', type: 'city', lat: 25.4358, lng: 81.8463, aliases: ['prayagraj', 'allahabad'] },
  { canonicalName: 'Ayodhya', state: 'Uttar Pradesh', district: 'Ayodhya', type: 'city', lat: 26.7922, lng: 82.1998, aliases: ['ayodhya', 'ayodhaya'] },
  { canonicalName: 'Gorakhpur', state: 'Uttar Pradesh', district: 'Gorakhpur', type: 'city', lat: 26.7606, lng: 83.3732, aliases: ['gorakhpur'] },
  { canonicalName: 'Bareilly', state: 'Uttar Pradesh', district: 'Bareilly', type: 'city', lat: 28.3670, lng: 79.4304, aliases: ['bareilly', 'bareli', 'barely', 'barielly'] },
  { canonicalName: 'Moradabad', state: 'Uttar Pradesh', district: 'Moradabad', type: 'city', lat: 28.8386, lng: 78.7733, aliases: ['moradabad', 'muradabad'] },
  { canonicalName: 'Aligarh', state: 'Uttar Pradesh', district: 'Aligarh', type: 'city', lat: 27.8974, lng: 78.0880, aliases: ['aligarh'] },
  { canonicalName: 'Sambhal', state: 'Uttar Pradesh', district: 'Sambhal', type: 'city', lat: 28.5904, lng: 78.5718, aliases: ['sambhal'] },
  { canonicalName: 'Muzaffarnagar', state: 'Uttar Pradesh', district: 'Muzaffarnagar', type: 'city', lat: 29.4727, lng: 77.7085, aliases: ['muzaffarnagar', 'muzafarnagar'] },
  { canonicalName: 'Shamli', state: 'Uttar Pradesh', district: 'Shamli', type: 'city', lat: 29.4500, lng: 77.3100, aliases: ['shamli'] },
  { canonicalName: 'Bijnor', state: 'Uttar Pradesh', district: 'Bijnor', type: 'city', lat: 29.3724, lng: 78.1358, aliases: ['bijnor'] },
  { canonicalName: 'Pilkhuwa', state: 'Uttar Pradesh', district: 'Hapur', type: 'town', lat: 28.7110, lng: 77.6560, aliases: ['pilkhuwa'] },
  { canonicalName: 'Gajraula', state: 'Uttar Pradesh', district: 'Amroha', type: 'town', lat: 28.8460, lng: 78.2370, aliases: ['gajraula'] },
  { canonicalName: 'Kasganj', state: 'Uttar Pradesh', district: 'Kasganj', type: 'town', lat: 27.8096, lng: 78.6458, aliases: ['kasganj'] },
  { canonicalName: 'Etah', state: 'Uttar Pradesh', district: 'Etah', type: 'town', lat: 27.5588, lng: 78.6626, aliases: ['etah'] },
  { canonicalName: 'Etawah', state: 'Uttar Pradesh', district: 'Etawah', type: 'city', lat: 26.7855, lng: 79.0150, aliases: ['etawah', 'etawa'] },
  { canonicalName: 'Kannauj', state: 'Uttar Pradesh', district: 'Kannauj', type: 'town', lat: 27.0514, lng: 79.9137, aliases: ['kannauj', 'kannoj'] },
  { canonicalName: 'Sitapur', state: 'Uttar Pradesh', district: 'Sitapur', type: 'city', lat: 27.5680, lng: 80.6790, aliases: ['sitapur'] },
  { canonicalName: 'Tundla', state: 'Uttar Pradesh', district: 'Firozabad', type: 'town', lat: 27.2070, lng: 78.2370, aliases: ['tundla', 'tundla station', 'tundla junction'] },
  // Bihar
  { canonicalName: 'Patna', state: 'Bihar', district: 'Patna', type: 'metro', lat: 25.5941, lng: 85.1376, aliases: ['patna', 'patna airport'] },
  { canonicalName: 'Muzaffarpur', state: 'Bihar', district: 'Muzaffarpur', type: 'city', lat: 26.1209, lng: 85.3647, aliases: ['muzaffarpur', 'muzafarpur'] },
  { canonicalName: 'Darbhanga', state: 'Bihar', district: 'Darbhanga', type: 'city', lat: 26.1542, lng: 85.8918, aliases: ['darbhanga'] },
  { canonicalName: 'Bhagalpur', state: 'Bihar', district: 'Bhagalpur', type: 'city', lat: 25.2425, lng: 86.9842, aliases: ['bhagalpur'] },
  { canonicalName: 'Siwan', state: 'Bihar', district: 'Siwan', type: 'town', lat: 26.2200, lng: 84.3600, aliases: ['siwan'] },
  { canonicalName: 'Sitamarhi', state: 'Bihar', district: 'Sitamarhi', type: 'town', lat: 26.5950, lng: 85.4800, aliases: ['sitamarhi'] },
  { canonicalName: 'Chhapra', state: 'Bihar', district: 'Saran', type: 'city', lat: 25.7800, lng: 84.7300, aliases: ['chhapra', 'chapra'] },
  { canonicalName: 'Bettiah', state: 'Bihar', district: 'West Champaran', type: 'town', lat: 26.8020, lng: 84.5030, aliases: ['bettiah', 'betiya'] },
  { canonicalName: 'Supaul', state: 'Bihar', district: 'Supaul', type: 'town', lat: 26.1230, lng: 86.6050, aliases: ['supaul'] },
  { canonicalName: 'Bodh Gaya', state: 'Bihar', district: 'Gaya', type: 'town', lat: 24.6961, lng: 84.9870, aliases: ['bodh gaya', 'bodhgaya'] },
  { canonicalName: 'Jogbani', state: 'Bihar', district: 'Araria', type: 'town', lat: 26.4000, lng: 87.2600, aliases: ['jogbani'] },
  // Madhya Pradesh
  { canonicalName: 'Indore', state: 'Madhya Pradesh', district: 'Indore', type: 'metro', lat: 22.7196, lng: 75.8577, aliases: ['indore'] },
  { canonicalName: 'Bhopal', state: 'Madhya Pradesh', district: 'Bhopal', type: 'metro', lat: 23.2599, lng: 77.4126, aliases: ['bhopal'] },
  { canonicalName: 'Ujjain', state: 'Madhya Pradesh', district: 'Ujjain', type: 'city', lat: 23.1765, lng: 75.7885, aliases: ['ujjain', 'ujain'] },
  { canonicalName: 'Gwalior', state: 'Madhya Pradesh', district: 'Gwalior', type: 'city', lat: 26.2183, lng: 78.1828, aliases: ['gwalior'] },
  { canonicalName: 'Omkareshwar', state: 'Madhya Pradesh', district: 'Khandwa', type: 'town', lat: 22.2457, lng: 76.1510, aliases: ['omkareshwar', 'omkareswar', 'onkareshwar'] },
  { canonicalName: 'Khandwa', state: 'Madhya Pradesh', district: 'Khandwa', type: 'city', lat: 21.8257, lng: 76.3526, aliases: ['khandwa'] },
  { canonicalName: 'Neemuch', state: 'Madhya Pradesh', district: 'Neemuch', type: 'city', lat: 24.4700, lng: 74.8700, aliases: ['neemuch', 'nimach'] },
  { canonicalName: 'Nagda', state: 'Madhya Pradesh', district: 'Ujjain', type: 'town', lat: 23.4500, lng: 75.4200, aliases: ['nagda'] },
  // Gujarat
  { canonicalName: 'Ahmedabad', state: 'Gujarat', district: 'Ahmedabad', type: 'metro', lat: 23.0225, lng: 72.5714, aliases: ['ahmedabad', 'ahemdabad', 'amdavad'] },
  { canonicalName: 'Surat', state: 'Gujarat', district: 'Surat', type: 'metro', lat: 21.1702, lng: 72.8311, aliases: ['surat'] },
  { canonicalName: 'Vadodara', state: 'Gujarat', district: 'Vadodara', type: 'city', lat: 22.3072, lng: 73.1812, aliases: ['vadodara', 'vadodra', 'baroda'] },
  { canonicalName: 'Rajkot', state: 'Gujarat', district: 'Rajkot', type: 'city', lat: 22.3039, lng: 70.8022, aliases: ['rajkot'] },
  { canonicalName: 'Bhavnagar', state: 'Gujarat', district: 'Bhavnagar', type: 'city', lat: 21.7645, lng: 72.1519, aliases: ['bhavnagar', 'bhavanagar'] },
  { canonicalName: 'Navsari', state: 'Gujarat', district: 'Navsari', type: 'city', lat: 20.9467, lng: 72.9520, aliases: ['navsari'] },
  { canonicalName: 'Mehsana', state: 'Gujarat', district: 'Mehsana', type: 'city', lat: 23.5880, lng: 72.3693, aliases: ['mehsana', 'mahesana'] },
  // Maharashtra / West Bengal
  { canonicalName: 'Mumbai', state: 'Maharashtra', district: 'Mumbai', type: 'metro', lat: 19.0760, lng: 72.8777, aliases: ['mumbai', 'bombay', 'mumbai airport'] },
  { canonicalName: 'Pune', state: 'Maharashtra', district: 'Pune', type: 'metro', lat: 18.5204, lng: 73.8567, aliases: ['pune', 'poona'] },
  { canonicalName: 'Nashik', state: 'Maharashtra', district: 'Nashik', type: 'city', lat: 19.9975, lng: 73.7898, aliases: ['nashik', 'nasik'] },
  { canonicalName: 'Beed', state: 'Maharashtra', district: 'Beed', type: 'city', lat: 18.9890, lng: 75.7600, aliases: ['beed'] },
  { canonicalName: 'Kolkata', state: 'West Bengal', district: 'Kolkata', type: 'metro', lat: 22.5726, lng: 88.3639, aliases: ['kolkata', 'calcutta'] },
  // J&K / Ladakh / Uttarakhand
  { canonicalName: 'Srinagar', state: 'Jammu and Kashmir', district: 'Srinagar', type: 'city', lat: 34.0837, lng: 74.7973, aliases: ['srinagar', 'shrinagar'] },
  { canonicalName: 'Kishtwar', state: 'Jammu and Kashmir', district: 'Kishtwar', type: 'town', lat: 33.3100, lng: 75.7700, aliases: ['kishtwar'] },
  { canonicalName: 'Leh', state: 'Ladakh', district: 'Leh', type: 'town', lat: 34.1526, lng: 77.5771, aliases: ['leh', 'leh ladakh'] },
  { canonicalName: 'Kotdwar', state: 'Uttarakhand', district: 'Pauri Garhwal', type: 'town', lat: 29.7460, lng: 78.5220, aliases: ['kotdwar', 'kotdwara'] },
  { canonicalName: 'Vikasnagar', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.4680, lng: 77.7740, aliases: ['vikasnagar', 'vikas nagar'] },
  { canonicalName: 'Doiwala', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.1760, lng: 78.1170, aliases: ['doiwala'] },
];

module.exports = { CITIES };
