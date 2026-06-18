// Localized city display names for the feed (#10), keyed by canonicalName.
// pa = Punjabi (Gurmukhi), hi = Hindi (Devanagari). en + hinglish render the
// canonical (Latin) name, so they are not stored here.
//
// Source: the 9 Gurmukhi / 22 Devanagari forms already present in cities.js
// aliases are used verbatim; the remainder are standard, well-established
// spellings for these PB/HR/Delhi-NCR corridor cities. Anything uncertain is
// omitted and the UI falls back to the English canonical name.
//
// To correct or add a name: edit the entry here and re-run `npm run db:seed`
// (idempotent — upserts the namePa/nameHi columns).

const CITY_NAMES = Object.freeze({
  // Chandigarh tricity + Punjab
  Chandigarh: { pa: 'ਚੰਡੀਗੜ੍ਹ', hi: 'चंडीगढ़' },
  Mohali: { pa: 'ਮੋਹਾਲੀ', hi: 'मोहाली' },
  Panchkula: { pa: 'ਪੰਚਕੂਲਾ', hi: 'पंचकूला' },
  Zirakpur: { pa: 'ਜ਼ੀਰਕਪੁਰ', hi: 'ज़ीरकपुर' },
  Kharar: { pa: 'ਖਰੜ', hi: 'खरड़' },
  Amritsar: { pa: 'ਅੰਮ੍ਰਿਤਸਰ', hi: 'अमृतसर' },
  Ludhiana: { pa: 'ਲੁਧਿਆਣਾ', hi: 'लुधियाना' },
  Jalandhar: { pa: 'ਜਲੰਧਰ', hi: 'जालंधर' },
  Patiala: { pa: 'ਪਟਿਆਲਾ', hi: 'पटियाला' },
  Bathinda: { pa: 'ਬਠਿੰਡਾ', hi: 'बठिंडा' },
  Hoshiarpur: { pa: 'ਹੁਸ਼ਿਆਰਪੁਰ', hi: 'होशियारपुर' },
  Pathankot: { pa: 'ਪਠਾਨਕੋਟ', hi: 'पठानकोट' },
  Batala: { pa: 'ਬਟਾਲਾ', hi: 'बटाला' },
  Moga: { pa: 'ਮੋਗਾ', hi: 'मोगा' },
  Abohar: { pa: 'ਅਬੋਹਰ', hi: 'अबोहर' },
  Malerkotla: { pa: 'ਮਲੇਰਕੋਟਲਾ', hi: 'मलेरकोटला' },
  Khanna: { pa: 'ਖੰਨਾ', hi: 'खन्ना' },
  Phagwara: { pa: 'ਫਗਵਾੜਾ', hi: 'फगवाड़ा' },
  Muktsar: { pa: 'ਮੁਕਤਸਰ', hi: 'मुक्तसर' },
  Barnala: { pa: 'ਬਰਨਾਲਾ', hi: 'बरनाला' },
  Rajpura: { pa: 'ਰਾਜਪੁਰਾ', hi: 'राजपुरा' },
  Firozpur: { pa: 'ਫ਼ਿਰੋਜ਼ਪੁਰ', hi: 'फिरोजपुर' },
  Kapurthala: { pa: 'ਕਪੂਰਥਲਾ', hi: 'कपूरथला' },
  Sangrur: { pa: 'ਸੰਗਰੂਰ', hi: 'संगरूर' },
  Fazilka: { pa: 'ਫਾਜ਼ਿਲਕਾ', hi: 'फाजिल्का' },
  Gurdaspur: { pa: 'ਗੁਰਦਾਸਪੁਰ', hi: 'गुरदासपुर' },
  'Mandi Gobindgarh': { pa: 'ਮੰਡੀ ਗੋਬਿੰਦਗੜ੍ਹ', hi: 'मंडी गोबिंदगढ़' },
  Mansa: { pa: 'ਮਾਨਸਾ', hi: 'मानसा' },
  Sunam: { pa: 'ਸੁਨਾਮ', hi: 'सुनाम' },
  Nabha: { pa: 'ਨਾਭਾ', hi: 'नाभा' },
  'Tarn Taran': { pa: 'ਤਰਨ ਤਾਰਨ', hi: 'तरन तारन' },
  Nawanshahr: { pa: 'ਨਵਾਂਸ਼ਹਿਰ', hi: 'नवांशहर' },
  Faridkot: { pa: 'ਫਰੀਦਕੋਟ', hi: 'फरीदकोट' },
  Nangal: { pa: 'ਨੰਗਲ', hi: 'नंगल' },
  'Anandpur Sahib': { pa: 'ਅਨੰਦਪੁਰ ਸਾਹਿਬ', hi: 'आनंदपुर साहिब' },
  Rupnagar: { pa: 'ਰੂਪਨਗਰ', hi: 'रूपनगर' },
  Dhuri: { pa: 'ਧੂਰੀ', hi: 'धूरी' },
  Jagraon: { pa: 'ਜਗਰਾਉਂ', hi: 'जगराओं' },
  Sirhind: { pa: 'ਸਰਹਿੰਦ', hi: 'सरहिंद' },
  Kotkapura: { pa: 'ਕੋਟਕਪੂਰਾ', hi: 'कोटकपूरा' },

  // Haryana
  Gurugram: { pa: 'ਗੁਰੂਗ੍ਰਾਮ', hi: 'गुरुग्राम' },
  Faridabad: { pa: 'ਫਰੀਦਾਬਾਦ', hi: 'फरीदाबाद' },
  Panipat: { pa: 'ਪਾਨੀਪਤ', hi: 'पानीपत' },
  Ambala: { pa: 'ਅੰਬਾਲਾ', hi: 'अंबाला' },
  Yamunanagar: { pa: 'ਯਮੁਨਾਨਗਰ', hi: 'यमुनानगर' },
  Rohtak: { pa: 'ਰੋਹਤਕ', hi: 'रोहतक' },
  Hisar: { pa: 'ਹਿਸਾਰ', hi: 'हिसार' },
  Karnal: { pa: 'ਕਰਨਾਲ', hi: 'करनाल' },
  Sonipat: { pa: 'ਸੋਨੀਪਤ', hi: 'सोनीपत' },
  Bhiwani: { pa: 'ਭਿਵਾਨੀ', hi: 'भिवानी' },
  Sirsa: { pa: 'ਸਿਰਸਾ', hi: 'सिरसा' },
  Bahadurgarh: { pa: 'ਬਹਾਦੁਰਗੜ੍ਹ', hi: 'बहादुरगढ़' },
  Jind: { pa: 'ਜੀਂਦ', hi: 'जींद' },
  Kurukshetra: { pa: 'ਕੁਰੂਕਸ਼ੇਤਰ', hi: 'कुरुक्षेत्र' },
  Kaithal: { pa: 'ਕੈਥਲ', hi: 'कैथल' },
  Rewari: { pa: 'ਰੇਵਾੜੀ', hi: 'रेवाड़ी' },
  Palwal: { pa: 'ਪਲਵਲ', hi: 'पलवल' },
  Hansi: { pa: 'ਹਾਂਸੀ', hi: 'हांसी' },
  Narnaul: { pa: 'ਨਾਰਨੌਲ', hi: 'नारनौल' },
  Fatehabad: { pa: 'ਫਤਿਹਾਬਾਦ', hi: 'फतेहाबाद' },
  'Charkhi Dadri': { pa: 'ਚਰਖੀ ਦਾਦਰੀ', hi: 'चरखी दादरी' },
  Jhajjar: { pa: 'ਝੱਜਰ', hi: 'झज्जर' },
  Mahendragarh: { pa: 'ਮਹਿੰਦਰਗੜ੍ਹ', hi: 'महेंद्रगढ़' },

  // Delhi
  Delhi: { pa: 'ਦਿੱਲੀ', hi: 'दिल्ली' },

  // Uttar Pradesh (NCR + west UP)
  Noida: { pa: 'ਨੋਇਡਾ', hi: 'नोएडा' },
  'Greater Noida': { pa: 'ਗ੍ਰੇਟਰ ਨੋਇਡਾ', hi: 'ग्रेटर नोएडा' },
  Ghaziabad: { pa: 'ਗਾਜ਼ੀਆਬਾਦ', hi: 'गाजियाबाद' },
  Meerut: { pa: 'ਮੇਰਠ', hi: 'मेरठ' },
  Hapur: { pa: 'ਹਾਪੁੜ', hi: 'हापुड़' },
  Bulandshahr: { pa: 'ਬੁਲੰਦਸ਼ਹਿਰ', hi: 'बुलंदशहर' },
  Baghpat: { pa: 'ਬਾਗਪਤ', hi: 'बागपत' },
  Saharanpur: { pa: 'ਸਹਾਰਨਪੁਰ', hi: 'सहारनपुर' },
  Agra: { pa: 'ਆਗਰਾ', hi: 'आगरा' },
  Mathura: { pa: 'ਮਥੁਰਾ', hi: 'मथुरा' },

  // Himachal Pradesh
  Shimla: { pa: 'ਸ਼ਿਮਲਾ', hi: 'शिमला' },
  Solan: { pa: 'ਸੋਲਨ', hi: 'सोलन' },
  Baddi: { pa: 'ਬੱਦੀ', hi: 'बद्दी' },
  Parwanoo: { pa: 'ਪਰਵਾਣੂ', hi: 'परवाणू' },
  Nalagarh: { pa: 'ਨਾਲਾਗੜ੍ਹ', hi: 'नालागढ़' },
  Una: { pa: 'ਊਨਾ', hi: 'ऊना' },
  Dharamshala: { pa: 'ਧਰਮਸ਼ਾਲਾ', hi: 'धर्मशाला' },
  Manali: { pa: 'ਮਨਾਲੀ', hi: 'मनाली' },
  Kullu: { pa: 'ਕੁੱਲੂ', hi: 'कुल्लू' },
  Mandi: { pa: 'ਮੰਡੀ', hi: 'मंडी' },
  'Bilaspur (HP)': { pa: 'ਬਿਲਾਸਪੁਰ', hi: 'बिलासपुर' },
  'Hamirpur (HP)': { pa: 'ਹਮੀਰਪੁਰ', hi: 'हमीरपुर' },
  Dalhousie: { pa: 'ਡਲਹੌਜ਼ੀ', hi: 'डलहौजी' },
  Kasauli: { pa: 'ਕਸੌਲੀ', hi: 'कसौली' },
  Kinnaur: { pa: 'ਕਿੰਨੌਰ', hi: 'किन्नौर' },
  Spiti: { pa: 'ਸਪੀਤੀ', hi: 'स्पीति' },
  Lahaul: { pa: 'ਲਾਹੌਲ', hi: 'लाहौल' },
  Sirmaur: { pa: 'ਸਿਰਮੌਰ', hi: 'सिरमौर' },
  Barog: { pa: 'ਬੜੋਗ', hi: 'बड़ोग' },
  Mashobra: { pa: 'ਮਸ਼ੋਬਰਾ', hi: 'मशोबरा' },
  'Rampur Bushahr': { pa: 'ਰਾਮਪੁਰ ਬੁਸ਼ਹਿਰ', hi: 'रामपुर बुशहर' },

  // Rajasthan
  Jaipur: { pa: 'ਜੈਪੁਰ', hi: 'जयपुर' },
  Jodhpur: { pa: 'ਜੋਧਪੁਰ', hi: 'जोधपुर' },
  Udaipur: { pa: 'ਉਦੈਪੁਰ', hi: 'उदयपुर' },
  Ajmer: { pa: 'ਅਜਮੇਰ', hi: 'अजमेर' },
  Bikaner: { pa: 'ਬੀਕਾਨੇਰ', hi: 'बीकानेर' },
  Kota: { pa: 'ਕੋਟਾ', hi: 'कोटा' },
  'Sri Ganganagar': { pa: 'ਸ੍ਰੀ ਗੰਗਾਨਗਰ', hi: 'श्री गंगानगर' },
  Hanumangarh: { pa: 'ਹਨੂਮਾਨਗੜ੍ਹ', hi: 'हनुमानगढ़' },
  Alwar: { pa: 'ਅਲਵਰ', hi: 'अलवर' },
  Bhiwadi: { pa: 'ਭਿਵਾੜੀ', hi: 'भिवाड़ी' },
  Pushkar: { pa: 'ਪੁਸ਼ਕਰ', hi: 'पुष्कर' },

  // Uttarakhand
  Dehradun: { pa: 'ਦੇਹਰਾਦੂਨ', hi: 'देहरादून' },
  Haridwar: { pa: 'ਹਰਿਦੁਆਰ', hi: 'हरिद्वार' },
  Rishikesh: { pa: 'ਰਿਸ਼ੀਕੇਸ਼', hi: 'ऋषिकेश' },
  Mussoorie: { pa: 'ਮਸੂਰੀ', hi: 'मसूरी' },
  Nainital: { pa: 'ਨੈਨੀਤਾਲ', hi: 'नैनीताल' },
  Almora: { pa: 'ਅਲਮੋੜਾ', hi: 'अल्मोड़ा' },
  Corbett: { pa: 'ਕਾਰਬੇਟ', hi: 'कॉर्बेट' },
  Pauri: { pa: 'ਪੌੜੀ', hi: 'पौड़ी' },
  Rudraprayag: { pa: 'ਰੁਦਰਪ੍ਰਯਾਗ', hi: 'रुद्रप्रयाग' },
  Badrinath: { pa: 'ਬਦਰੀਨਾਥ', hi: 'बद्रीनाथ' },
  Yamunotri: { pa: 'ਯਮੁਨੋਤਰੀ', hi: 'यमुनोत्री' },
  Gangotri: { pa: 'ਗੰਗੋਤਰੀ', hi: 'गंगोत्री' },
  Tehri: { pa: 'ਟਿਹਰੀ', hi: 'टिहरी' },
  Pithoragarh: { pa: 'ਪਿਥੌਰਾਗੜ੍ਹ', hi: 'पिथौरागढ़' },
  Bageshwar: { pa: 'ਬਾਗੇਸ਼ਵਰ', hi: 'बागेश्वर' },
  Champawat: { pa: 'ਚੰਪਾਵਤ', hi: 'चंपावत' },
  Rudrapur: { pa: 'ਰੁਦਰਪੁਰ', hi: 'रुद्रपुर' },

  // Jammu & Kashmir
  Jammu: { pa: 'ਜੰਮੂ', hi: 'जम्मू' },
  Katra: { pa: 'ਕਟੜਾ', hi: 'कटरा' },
});

module.exports = { CITY_NAMES };
