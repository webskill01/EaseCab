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

/** @type {Array<{canonicalName:string,state:string,district?:string,type:string,lat?:number,lng?:number,population?:number,aliases:string[]}>} */
const CITIES = [
  // ----------------------------- Chandigarh (UT) + Tricity -----------------------------
  { canonicalName: 'Chandigarh', state: 'Chandigarh', district: 'Chandigarh', type: 'metro', lat: 30.7333, lng: 76.7794, aliases: ['chandigarh', 'chd', 'chadigarh', 'chandighar', 'ਚੰਡੀਗੜ੍ਹ', 'चंडीगढ़'] },
  { canonicalName: 'Mohali', state: 'Punjab', district: 'SAS Nagar', type: 'city', lat: 30.7046, lng: 76.7179, aliases: ['mohali', 'sas nagar', 'sahibzada ajit singh nagar', 'mohli', 'ਮੋਹਾਲੀ'] },
  { canonicalName: 'Panchkula', state: 'Haryana', district: 'Panchkula', type: 'city', lat: 30.6942, lng: 76.8606, aliases: ['panchkula', 'panchkoola', 'पंचकूला'] },
  { canonicalName: 'Zirakpur', state: 'Punjab', district: 'SAS Nagar', type: 'town', lat: 30.6425, lng: 76.8173, aliases: ['zirakpur', 'zirkpur', 'jirakpur'] },
  { canonicalName: 'Kharar', state: 'Punjab', district: 'SAS Nagar', type: 'town', lat: 30.7460, lng: 76.6457, aliases: ['kharar', 'kharad'] },

  // ----------------------------- Punjab -----------------------------
  { canonicalName: 'Amritsar', state: 'Punjab', district: 'Amritsar', type: 'metro', lat: 31.6340, lng: 74.8723, aliases: ['amritsar', 'ammritsar', 'amritser', 'amrtsar', 'ਅੰਮ੍ਰਿਤਸਰ', 'अमृतसर'] },
  { canonicalName: 'Ludhiana', state: 'Punjab', district: 'Ludhiana', type: 'metro', lat: 30.9010, lng: 75.8573, aliases: ['ludhiana', 'ludhiyana', 'ludiana', 'ldh', 'ਲੁਧਿਆਣਾ', 'लुधियाना'] },
  { canonicalName: 'Jalandhar', state: 'Punjab', district: 'Jalandhar', type: 'metro', lat: 31.3260, lng: 75.5762, aliases: ['jalandhar', 'jullundur', 'jaландhar', 'jalndhar', 'ਜਲੰਧਰ', 'जालंधर'] },
  { canonicalName: 'Patiala', state: 'Punjab', district: 'Patiala', type: 'city', lat: 30.3398, lng: 76.3869, aliases: ['patiala', 'patiyala', 'ptiala', 'ਪਟਿਆਲਾ', 'पटियाला'] },
  { canonicalName: 'Bathinda', state: 'Punjab', district: 'Bathinda', type: 'city', lat: 30.2110, lng: 74.9455, aliases: ['bathinda', 'bhatinda', 'batinda', 'ਬਠਿੰਡਾ', 'बठिंडा'] },
  { canonicalName: 'Hoshiarpur', state: 'Punjab', district: 'Hoshiarpur', type: 'city', lat: 31.5320, lng: 75.9110, aliases: ['hoshiarpur', 'hoshiyarpur', 'hsp'] },
  { canonicalName: 'Pathankot', state: 'Punjab', district: 'Pathankot', type: 'city', lat: 32.2643, lng: 75.6421, aliases: ['pathankot', 'pathonkot', 'ਪਠਾਨਕੋਟ'] },
  { canonicalName: 'Batala', state: 'Punjab', district: 'Gurdaspur', type: 'city', lat: 31.8186, lng: 75.2028, aliases: ['batala', 'batla'] },
  { canonicalName: 'Moga', state: 'Punjab', district: 'Moga', type: 'city', lat: 30.8160, lng: 75.1717, aliases: ['moga'] },
  { canonicalName: 'Abohar', state: 'Punjab', district: 'Fazilka', type: 'city', lat: 30.1450, lng: 74.1995, aliases: ['abohar'] },
  { canonicalName: 'Malerkotla', state: 'Punjab', district: 'Malerkotla', type: 'city', lat: 30.5304, lng: 75.8800, aliases: ['malerkotla', 'maler kotla'] },
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

  // ----------------------------- Haryana -----------------------------
  { canonicalName: 'Gurugram', state: 'Haryana', district: 'Gurugram', type: 'metro', lat: 28.4595, lng: 77.0266, aliases: ['gurugram', 'gurgaon', 'ggn', 'गुड़गांव', 'गुरुग्राम'] },
  { canonicalName: 'Faridabad', state: 'Haryana', district: 'Faridabad', type: 'metro', lat: 28.4089, lng: 77.3178, aliases: ['faridabad', 'fbd', 'फरीदाबाद'] },
  { canonicalName: 'Panipat', state: 'Haryana', district: 'Panipat', type: 'city', lat: 29.3909, lng: 76.9635, aliases: ['panipat', 'पानीपत'] },
  { canonicalName: 'Ambala', state: 'Haryana', district: 'Ambala', type: 'city', lat: 30.3782, lng: 76.7767, aliases: ['ambala', 'umbala', 'ambala cantt', 'ambala city', 'अंबाला'] },
  { canonicalName: 'Yamunanagar', state: 'Haryana', district: 'Yamunanagar', type: 'city', lat: 30.1290, lng: 77.2674, aliases: ['yamunanagar', 'yamuna nagar', 'jagadhri'] },
  { canonicalName: 'Rohtak', state: 'Haryana', district: 'Rohtak', type: 'city', lat: 28.8955, lng: 76.6066, aliases: ['rohtak', 'रोहतक'] },
  { canonicalName: 'Hisar', state: 'Haryana', district: 'Hisar', type: 'city', lat: 29.1492, lng: 75.7217, aliases: ['hisar', 'hissar', 'हिसार'] },
  { canonicalName: 'Karnal', state: 'Haryana', district: 'Karnal', type: 'city', lat: 29.6857, lng: 76.9905, aliases: ['karnal', 'करनाल'] },
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
  { canonicalName: 'Delhi', state: 'Delhi', district: 'New Delhi', type: 'metro', lat: 28.6139, lng: 77.2090, aliases: ['delhi', 'new delhi', 'delhi ncr', 'ndls', 'दिल्ली', 'ਦਿੱਲੀ'] },
  { canonicalName: 'Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', type: 'city', lat: 28.5355, lng: 77.3910, aliases: ['noida'] },
  { canonicalName: 'Greater Noida', state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', type: 'city', lat: 28.4744, lng: 77.5040, aliases: ['greater noida', 'gr noida', 'greno'] },
  { canonicalName: 'Ghaziabad', state: 'Uttar Pradesh', district: 'Ghaziabad', type: 'city', lat: 28.6692, lng: 77.4538, aliases: ['ghaziabad', 'gzb'] },
  { canonicalName: 'Meerut', state: 'Uttar Pradesh', district: 'Meerut', type: 'city', lat: 28.9845, lng: 77.7064, aliases: ['meerut'] },
  { canonicalName: 'Hapur', state: 'Uttar Pradesh', district: 'Hapur', type: 'town', lat: 28.7300, lng: 77.7810, aliases: ['hapur'] },
  { canonicalName: 'Bulandshahr', state: 'Uttar Pradesh', district: 'Bulandshahr', type: 'town', lat: 28.4030, lng: 77.8580, aliases: ['bulandshahr', 'bulandshahar'] },
  { canonicalName: 'Baghpat', state: 'Uttar Pradesh', district: 'Baghpat', type: 'town', lat: 28.9440, lng: 77.2180, aliases: ['baghpat', 'bagpat'] },

  // ----------------------------- Himachal Pradesh (corridor drops) -----------------------------
  { canonicalName: 'Shimla', state: 'Himachal Pradesh', district: 'Shimla', type: 'city', lat: 31.1048, lng: 77.1734, aliases: ['shimla', 'simla', 'शिमला'] },
  { canonicalName: 'Solan', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9080, lng: 77.0990, aliases: ['solan'] },
  { canonicalName: 'Baddi', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.9580, lng: 76.7910, aliases: ['baddi'] },
  { canonicalName: 'Parwanoo', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 30.8370, lng: 76.9610, aliases: ['parwanoo'] },
  { canonicalName: 'Nalagarh', state: 'Himachal Pradesh', district: 'Solan', type: 'town', lat: 31.0410, lng: 76.7220, aliases: ['nalagarh'] },
  { canonicalName: 'Una', state: 'Himachal Pradesh', district: 'Una', type: 'town', lat: 31.4680, lng: 76.2700, aliases: ['una'] },
  { canonicalName: 'Dharamshala', state: 'Himachal Pradesh', district: 'Kangra', type: 'town', lat: 32.2190, lng: 76.3234, aliases: ['dharamshala', 'dharamsala', 'mcleodganj'] },
  { canonicalName: 'Manali', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 32.2396, lng: 77.1887, aliases: ['manali'] },
  { canonicalName: 'Kullu', state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 31.9580, lng: 77.1090, aliases: ['kullu'] },
  { canonicalName: 'Mandi', state: 'Himachal Pradesh', district: 'Mandi', type: 'town', lat: 31.7080, lng: 76.9320, aliases: ['mandi'] },
  { canonicalName: 'Bilaspur (HP)', state: 'Himachal Pradesh', district: 'Bilaspur', type: 'town', lat: 31.3300, lng: 76.7570, aliases: ['bilaspur hp', 'bilaspur himachal'] },
  { canonicalName: 'Hamirpur (HP)', state: 'Himachal Pradesh', district: 'Hamirpur', type: 'town', lat: 31.6840, lng: 76.5220, aliases: ['hamirpur hp', 'hamirpur himachal'] },

  // ----------------------------- Rajasthan (corridor drops) -----------------------------
  { canonicalName: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', type: 'metro', lat: 26.9124, lng: 75.7873, aliases: ['jaipur', 'jaypur', 'जयपुर'] },
  { canonicalName: 'Jodhpur', state: 'Rajasthan', district: 'Jodhpur', type: 'city', lat: 26.2389, lng: 73.0243, aliases: ['jodhpur'] },
  { canonicalName: 'Udaipur', state: 'Rajasthan', district: 'Udaipur', type: 'city', lat: 24.5854, lng: 73.7125, aliases: ['udaipur'] },
  { canonicalName: 'Ajmer', state: 'Rajasthan', district: 'Ajmer', type: 'city', lat: 26.4499, lng: 74.6399, aliases: ['ajmer'] },
  { canonicalName: 'Bikaner', state: 'Rajasthan', district: 'Bikaner', type: 'city', lat: 28.0229, lng: 73.3119, aliases: ['bikaner'] },
  { canonicalName: 'Kota', state: 'Rajasthan', district: 'Kota', type: 'city', lat: 25.2138, lng: 75.8648, aliases: ['kota'] },
  { canonicalName: 'Sri Ganganagar', state: 'Rajasthan', district: 'Sri Ganganagar', type: 'city', lat: 29.9094, lng: 73.8800, aliases: ['sri ganganagar', 'ganganagar'] },
  { canonicalName: 'Hanumangarh', state: 'Rajasthan', district: 'Hanumangarh', type: 'town', lat: 29.5810, lng: 74.3290, aliases: ['hanumangarh'] },
  { canonicalName: 'Alwar', state: 'Rajasthan', district: 'Alwar', type: 'city', lat: 27.5530, lng: 76.6346, aliases: ['alwar'] },
  { canonicalName: 'Bhiwadi', state: 'Rajasthan', district: 'Alwar', type: 'town', lat: 28.2100, lng: 76.8600, aliases: ['bhiwadi'] },
  { canonicalName: 'Pushkar', state: 'Rajasthan', district: 'Ajmer', type: 'town', lat: 26.4900, lng: 74.5510, aliases: ['pushkar'] },

  // ----------------------------- Common national drops (Uttarakhand / UP / J&K) -----------------------------
  { canonicalName: 'Dehradun', state: 'Uttarakhand', district: 'Dehradun', type: 'city', lat: 30.3165, lng: 78.0322, aliases: ['dehradun', 'ddn', 'देहरादून'] },
  { canonicalName: 'Haridwar', state: 'Uttarakhand', district: 'Haridwar', type: 'city', lat: 29.9457, lng: 78.1642, aliases: ['haridwar', 'hardwar', 'हरिद्वार'] },
  { canonicalName: 'Rishikesh', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.0869, lng: 78.2676, aliases: ['rishikesh'] },
  { canonicalName: 'Mussoorie', state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.4599, lng: 78.0664, aliases: ['mussoorie', 'masoori'] },
  { canonicalName: 'Nainital', state: 'Uttarakhand', district: 'Nainital', type: 'town', lat: 29.3919, lng: 79.4542, aliases: ['nainital'] },
  { canonicalName: 'Agra', state: 'Uttar Pradesh', district: 'Agra', type: 'city', lat: 27.1767, lng: 78.0081, aliases: ['agra', 'आगरा'] },
  { canonicalName: 'Mathura', state: 'Uttar Pradesh', district: 'Mathura', type: 'city', lat: 27.4924, lng: 77.6737, aliases: ['mathura', 'vrindavan'] },
  { canonicalName: 'Jammu', state: 'Jammu and Kashmir', district: 'Jammu', type: 'city', lat: 32.7266, lng: 74.8570, aliases: ['jammu', 'जम्मू'] },
  { canonicalName: 'Katra', state: 'Jammu and Kashmir', district: 'Reasi', type: 'town', lat: 32.9917, lng: 74.9319, aliases: ['katra', 'vaishno devi', 'mata vaishno devi'] },
];

module.exports = { CITIES };
