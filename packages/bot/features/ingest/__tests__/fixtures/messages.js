'use strict';

/**
 * Real "12.ALL AREA DUTY" WhatsApp samples (captured 2026-05-31), timestamps
 * stripped. Shared fixture for extractCities (T4), extractPhone (T5) and
 * isRideMessage (T6).
 *
 * Each entry:
 *   id       — stable index for failure messages
 *   text     — verbatim message body (newlines/emoji preserved)
 *   isRide   — expected isRideMessage() gate result (T6)
 *   phone    — expected primary 10-digit number from extractPhone() (T5), or null
 *   pickup   — RAW lowercase fragment extractCities() returns on the pickup side
 *              (pre-resolution; e.g. "nanital"/"dehli" — resolve() maps to canonical) (T4)
 *   drop     — RAW lowercase fragment extractCities() returns on the drop side (T4)
 *   note     — why it's classified this way (esp. rejects / edge cases)
 *
 * For rejects (isRide=false) the pickup/drop/phone fields are not asserted.
 */
const messages = [
  {
    id: 1,
    text: `an  with career

Shimla to delhi


Time - 11: 10 am


Call - 7082314741

Archna cab service`,
    isRide: true,
    phone: '7082314741',
    pickup: 'shimla',
    drop: 'delhi',
    note: 'plain "X to Y", garbled vehicle line ("an")',
  },
  {
    id: 2,
    text: `Ertiga  with career

Rate -

Shimla to dehradun

Time - 1:10 pm

Call - 7082314741

Archna cab service`,
    isRide: true,
    phone: '7082314741',
    pickup: 'shimla',
    drop: 'dehradun',
    note: 'Ertiga, empty Rate line',
  },
  {
    id: 3,
    text: `📢 Duty– Rehmat Travels

Need: Sedan

Pick Up : Shimla

Drop : Manali


Time: Current



Rehmat Travels, Kharar
📞 98555 11114`,
    isRide: true,
    phone: '9855511114',
    pickup: 'shimla',
    drop: 'manali',
    note: 'labeled Pick Up/Drop format, phone with space',
  },
  {
    id: 4,
    text: `Need Need Need
2 Ertiga with carer
1 Sadan with carer

Nanital To Delhi
Drop

Toll Extra

Today 03:00pm

9253074890`,
    isRide: true,
    phone: '9253074890',
    pickup: 'nanital',
    drop: 'delhi',
    note: 'misspelled "Nanital" -> resolve() maps raw "nanital" to Nainital; multi-vehicle',
  },
  {
    id: 5,
    text: `Need Need Need
Ertiga with carer

Jibi Himachal To Gurgaon

Today 06:00pm

9253074890`,
    isRide: true,
    phone: '9253074890',
    pickup: 'jibi',
    drop: 'gurgaon',
    note: 'pickup "Jibi/Jibhi" likely unseeded -> raw-store + null id path',
  },
  {
    id: 6,
    text: `Free Free Free Free

New Aura Permit  W/c  4.30 Pm  Gurgaon free ho jayengi ,
Kisi ke pass Sirsa  Side ka Drop ho  plz call me

Sonu Saini Begu
9991223977`,
    isRide: false,
    phone: null,
    pickup: null,
    drop: null,
    note: 'REJECT: empty-car ("free") supply post, no firm route',
  },
  {
    id: 7,
    text: `NEED NEED NEED

INNOVA CRYSTA (7+1 WITH CARRIER) CHANDIGARH TO DELHI DROP
TIME-03:00 PM

Rate - 6000/

MOB. 6284759622`,
    isRide: true,
    phone: '6284759622',
    pickup: 'chandigarh',
    drop: 'delhi',
    note: 'all-caps, Innova Crysta',
  },
  {
    id: 8,
    text: `Ertiga  with career

Rate - 4500

Palampur to Panchkula

Time - 2:40 pm

Call - 7082314741

Archna cab service`,
    isRide: true,
    phone: '7082314741',
    pickup: 'palampur',
    drop: 'panchkula',
    note: 'standard',
  },
  {
    id: 9,
    text: `https://www.instagram.com/hirecab24x7com?igsh=MWVncnNucjhjaWdlZw

kasol to Kharar drop

Cab type- Sedan WC

Time= 7-8 pm

Neat and clean cab

Date=31/5/2026

Rate =

Gst Bill Available

Hirecab24x7.com
Krishan Soni
9551933000`,
    isRide: true,
    phone: '9551933000',
    pickup: 'kasol',
    drop: 'kharar',
    note: 'leading instagram URL + website must not break extraction',
  },
  {
    id: 10,
    text: `Need need current

Sedan

Bhuntar (kullu)

To

Chandigarh

Current

3500

Mob :- 7901981005`,
    isRide: true,
    phone: '7901981005',
    pickup: 'bhuntar',
    drop: 'chandigarh',
    note: 'parenthetical "(kullu)", To on its own line',
  },
  {
    id: 11,
    text: `NEED SEDAN

CURRENT

CHANDIGARH AIRPORT

TO

LUDHIANA

9992211107`,
    isRide: true,
    phone: '9992211107',
    pickup: 'chandigarh',
    drop: 'ludhiana',
    note: 'airport landmark on pickup',
  },
  {
    id: 12,
    text: `Need sedan current elante mall chandigarh to lajpat nagar dehli 3000rs interested call now
9034293907`,
    isRide: true,
    phone: '9034293907',
    pickup: 'chandigarh',
    drop: 'dehli',
    note: 'single-line; landmarks elante mall / lajpat nagar; raw "dehli" -> resolve() maps to Delhi',
  },
  {
    id: 13,
    text: `🚖 FULL GUARANTEE (ਫੁੱਲ ਗਾਰੰਟੀ) 🟢
✨ Need Ertiga (With Carrier) ✨
📍 Route: Delhi Airport (T1) to Tonk, Rajasthan
📅 Date & Time: 31 May, 2026 @ 10:00 PM
💰 Rate: ₹4000 (All Inclusive)
📞 Contact: 9988243191
✍️ Karma
https://www.instagram.com/samar74airline?igsh=NGF2a2xuYjl3bnow&utm_source=qr`,
    isRide: true,
    phone: '9988243191',
    pickup: 'delhi',
    drop: 'tonk',
    note: 'Gurmukhi + emoji; drop "Tonk" likely unseeded; trailing URL',
  },
  {
    id: 14,
    text: `Need sedan cab
Chandigarh airport to banjar hp drop
pH 9467574586`,
    isRide: true,
    phone: '9467574586',
    pickup: 'chandigarh',
    drop: 'banjar',
    note: '"pH" phone label; drop "Banjar hp"',
  },
  {
    id: 15,
    text: `Drop drop drop drop
🌺🌺🌺🌺🌺🌺


Need ertiga w/c
Mohali to noida
Drop


Time  12:30pm


7009333529`,
    isRide: true,
    phone: '7009333529',
    pickup: 'mohali',
    drop: 'noida',
    note: 'emoji noise lines',
  },
  {
    id: 16,
    text: `PICK PICK SHIMLA NEAR LIFT PARKING TO ZIRAKPUR  NEED ETIOS /DZIRE TIME 12 PM ANY INTERESTED PLZ CALL ME NO.7973751768

MANDEEP🚘🚘`,
    isRide: true,
    phone: '7973751768',
    pickup: 'shimla',
    drop: 'zirakpur',
    note: 'phone glued to "NO." prefix; landmark "lift parking"',
  },
  {
    id: 17,
    text: `Barwala haryana
To
Firozpur
Small car
1.30 pm
9463216186
Gurdeep sangrur`,
    isRide: true,
    phone: '9463216186',
    pickup: 'barwala',
    drop: 'firozpur',
    note: '"small car" vehicle; trailing "Gurdeep sangrur" name+city must not become the drop',
  },
  {
    id: 18,
    text: `Zirakpur
To
Shimla

Eritga

Current

9896884839`,
    isRide: true,
    phone: '9896884839',
    pickup: 'zirakpur',
    drop: 'shimla',
    note: 'misspelled "Eritga"',
  },
  {
    id: 19,
    text: `https://www.bansalcabs.com

NAWANSHAHR TO GURUGRAM

DZIRE WC 08:00 AM


PLEASE CONTACT ME
BANSAL CABS MALOUT
* 7229800007
* 7814055554
 HTTPS://g.page/r/CcXWlrjAxtbBEBE/review`,
    isRide: true,
    phone: '7229800007',
    pickup: 'nawanshahr',
    drop: 'gurugram',
    note: 'two phone numbers -> primary is first; URLs around them',
  },
  {
    id: 20,
    text: `🙏JAI BABA BALAK NATH JI 🙏
✨ 𝐁𝐎𝐎𝐊𝐈𝐍𝐆 𝐁𝐎𝐎𝐊𝐈𝐍𝐆 ✨

             DROP

 *𝙲𝙰𝙱 𝚃𝚈𝙿𝙴 : *7 seater *

 *𝐏𝐈𝐂𝐊 𝐔𝐏 :- PALAMPUR

 *𝐃𝐑𝐎𝐏 :- DEHLI

 𝐃𝐀𝐓𝐄 :- 30/05/2026

 *𝐓𝐈𝐌𝐄 :- 08:30 PM

NOTE:GADDI NEAT &CLEAN,DUTY SHARE PLZ
नशा करके DRIVE ना करे🙏

  Rate ₹ >8000

ADVANCE paytm

 *𝙰𝙽𝚈𝙾𝙽𝙴 𝙸𝙽𝚃𝙴𝚁𝙴𝚂𝚃𝙴𝙳 𝙲𝙰𝙻𝙻 𝙼𝙴 𝙽𝙾𝚆.......

JARYAL TOURS AND TRAVELS*
 📲 7044679801`,
    isRide: true,
    phone: '7044679801',
    pickup: 'palampur',
    drop: 'dehli',
    note: 'mathematical-bold unicode letters + Devanagari; raw "dehli" -> resolve() maps to Delhi',
  },
  {
    id: 21,
    text: `Need Need Need Need
  Ertiga. Zrkpur to Noida
  Updown ⏰ 5:00 AM
🚘🚘🚘🚘🚘🚘🚘🚘

        Only Exchange
❌📵 without exchange

Free in Delhi ✈️✈️✈️
👉Crysta🚾 PB 01 🚩
👉Ertiga 🚾 PB 01 🚩

         ⏰ Current

  AUDI A6 AVAILABLE
  FOR WEDDING ALSO

  GST BILL AVAILABLE

       OFFICE NAME
 Singhpura taxi service

            OFFICE📍
Singhpura chownk zrk

 Kathuria'Z travel zirakpur
  Gourav Kathuria
📲8847610810`,
    isRide: true,
    phone: '8847610810',
    pickup: 'zrkpur',
    drop: 'noida',
    note: 'EDGE: real need ("Ertiga Zrkpur to Noida") buried in free-car advert noise (contains "Free in Delhi"); gate must still ACCEPT on the need; "Zrkpur" alias->Zirakpur',
  },
  {
    id: 22,
    text: `Free free 🆓 🆓

1.Kia carnes Sirsa free ✈️

2 .Dzire Patiala Free ✈️.
 3 . Aura Free Delhi Airport ✈️✈️

Current

Any drop
please call me
any side


9728573601
Virender Khinda(Billa)

Kamboj Travels Rania Sirsa ✈️🌍`,
    isRide: false,
    phone: null,
    pickup: null,
    drop: null,
    note: 'REJECT: empty-car list ("free", "any drop", "any side"), no firm single route',
  },
  {
    id: 23,
    text: `✈️ JAAT JII TOUR & TRAVELS✈️
            (SIRSA)
💫🚘 𝐁𝐎𝐎𝐊𝐈𝐍𝐆 𝐁𝐎𝐎𝐊𝐈𝐍𝐆 🚘💫
**
🚕 _CAB_ :- SEDAN NEAT &CLEAN
📍 𝐏𝐈𝐂𝐊𝐔𝐏 : *Dehradun✈️

📍 𝐃𝐑𝐎𝐏 :- Delhi Home
            **
🧳 𝐓𝐑𝐈𝐏 :-  ONE WAY

  💸  AMOUNT:- ?

📆 𝐃𝐀𝐓𝐄 :31-06-2026

⏰ 𝐓𝐈𝐌𝐄 :- 7 AM


 MUKESH JAAT 9996774444
 AMIT JAAT 8569846563`,
    isRide: true,
    phone: '9996774444',
    pickup: 'dehradun',
    drop: null,
    note: 'two phones -> primary first; "(SIRSA)" is agency origin not route. KNOWN LIMIT: drop "delhi" unresolved — the "DROP :- Delhi" value is itself followed by another ":-" label ("TRIP :-"), which the Pattern-5 terminator does not span. pickup captured correctly; per spec a null drop is acceptable (ride still written).',
  },
  {
    id: 24,
    text: `Ertiga  with career

Rate -

Chakrata to chakrata

Round trip

Time - 9:30 am

Call - 7082314741

Archna cab service`,
    isRide: true,
    phone: '7082314741',
    pickup: 'chakrata',
    drop: 'chakrata',
    note: 'EDGE: same pickup==drop (round trip)',
  },
  {
    id: 25,
    text: `Free Kia carans w/c

In gurgaon
Time 11.30 am

Any side drop
SIRSA RANIA DABWALI

Call 9996351777`,
    isRide: false,
    phone: null,
    pickup: null,
    drop: null,
    note: 'REJECT: empty-car ("free", "any side drop") supply post',
  },
  {
    id: 26,
    text: `Need Need Need
Ertiga with carer

9253074890




Need Ertiga or Kia Carens


Manali To Chandigarh or Delhi any option Drop




Time Current only interested person call





One way duty only





Note: Refrence or Google pay advance`,
    isRide: true,
    phone: '9253074890',
    pickup: 'manali',
    drop: 'chandigarh',
    note: 'EDGE: multi-drop option ("Chandigarh or Delhi"); phone appears before the route',
  },
  {
    id: 27,
    text: `Booking ID : 2728832
Pickup Date & Time: May 31, 2026 @ 09:39 AM
Pickup Location: Rishikesh
Vehicle : SUV
Booking Type : roundTrip
Booking Amount : 15000.0
Booking Commission : 500.0
Booking for No. of days: 3
Tour Description: rishikesh to Govardhan to Barsana to Vrindavan to Delhi to Rishikesh 850 kilometer limit extra ₹14 kilometer toll parking extra
Extra Requirement: All inclusive, Inc AC in plains
Booking Posted By : SMART RYDER
Contact Number : 9253074890`,
    isRide: true,
    phone: '9253074890',
    pickup: 'rishikesh',
    drop: 'delhi',
    note: 'EDGE: structured aggregator booking; multi-stop tour; "Contact Number :" label',
  },
  {
    id: 28,
    text: `Sedan`,
    isRide: false,
    phone: null,
    pickup: null,
    drop: null,
    note: 'REJECT: bare vehicle word, no route, no phone',
  },
];

module.exports = { messages };
