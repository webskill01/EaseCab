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
  { canonicalName: 'Chandigarh', state: 'Chandigarh', district: 'Chandigarh', type: 'metro', lat: 30.7333, lng: 76.7794, aliases: ['chandigarh', 'chd', 'chadigarh', 'chandighar', 'ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़', 'chandi', 'chandhigarh', 'chandigrah', 'chandiarh', 'chandigad', 'chandigarh airport', 'chandigarh sector', 'isbt 17', 'isbt 43', 'isbt chandigarh', 'sector 17', 'sector 35', '43 bus stand', '43 isbt', 'bus stand 43', 'chandigarh 43', 'pgi', 'pgimer'] },
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
  { canonicalName: 'Parwanoo', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8370, lng: 76.9610, aliases: ['parwanoo', 'parwanu', 'parvanu'] },
  { canonicalName: 'Nalagarh', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 31.0410, lng: 76.7220, aliases: ['nalagarh'] },
  { canonicalName: 'Una', state: 'Himachal Pradesh', district: 'Una', type: 'town', lat: 31.4680, lng: 76.2700, aliases: ['una', 'unna'] },
  { canonicalName: 'Dharamshala', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 32.2190, lng: 76.3234, aliases: ['dharamshala', 'dharamsala', 'mcleodganj', 'dharmshala', 'dhramshala', 'dharmsala', 'dharamshala airport', 'gaggal airport', 'mcleod ganj', 'mcleodgunj', 'mcleodgng', 'mcleod', 'dal lake dharamshala', 'bhagsu waterfall', 'bhagsu', 'bhagsunag', 'triund', 'triyund', 'kangra', 'kangara', 'palampur', 'palampure'] },
  { canonicalName: 'Manali', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 32.2396, lng: 77.1887, aliases: ['manali', 'manaali', 'manalli', 'manal', 'manali airport', 'bhuntar airport', 'kullu manali', 'rohtang', 'rohtang pass', 'rohtang la', 'rothang', 'solang', 'solang valley', 'solang nala', 'sollang', 'old manali', 'mall road manali', 'vashisht', 'vashisth', 'vasisth', 'naggar', 'naggr', 'naggar castle'] },
  { canonicalName: 'Kullu', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 31.9580, lng: 77.1090, aliases: ['kullu', 'kulloo', 'kulu'] },
  { canonicalName: 'Mandi', state: 'Himachal Pradesh', district: 'Mandi', type: 'town', lat: 31.7080, lng: 76.9320, aliases: ['mandi', 'mandee', 'mandhi'] },
  { canonicalName: 'Bilaspur (HP)', state: 'Himachal Pradesh', district: 'Bilaspur', type: 'town', lat: 31.3300, lng: 76.7570, aliases: ['bilaspur hp', 'bilaspur himachal', 'bilaspure'] },
  { canonicalName: 'Hamirpur (HP)', state: 'Himachal Pradesh', district: 'Hamirpur', type: 'town', lat: 31.6840, lng: 76.5220, aliases: ['hamirpur hp', 'hamirpur himachal', 'hamipur', 'hamirpure'] },
  { canonicalName: 'Dalhousie', state: 'Himachal Pradesh', district: 'Chamba', type: 'town', lat: 32.5389, lng: 75.9773, aliases: ['dalhousie', 'dalhosie', 'dalhousee', 'dalhausie', 'khajjiar', 'khajjar', 'khajiar', 'mini switzerland', 'chamba'] },
  { canonicalName: 'Kasauli', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8990, lng: 76.9640, aliases: ['kasauli', 'kasaulee', 'kasoli'] },
  { canonicalName: 'Kinnaur', state: 'Himachal Pradesh', district: 'Kinnaur', type: 'town', lat: 31.5920, lng: 78.4390, aliases: ['kinnaur', 'kinnor', 'kinnauar'] },
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
  { canonicalName: 'Mussoorie', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.4599, lng: 78.0664, aliases: ['mussoorie', 'masoori', 'mussorie', 'musoorie', 'mall road mussoorie', 'kempty falls', 'kempty fall', 'landour', 'landaur'] },
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
];

module.exports = { CITIES };
