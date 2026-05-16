import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smartphone, Key, X, Loader2 } from 'lucide-react';
import { useDrive } from '../contexts/DriveContext';
import { cn } from '../lib/utils';

const countryCodes: Record<string, string> = {
  "+1": "USA / Canada",
  "+7": "Russia / Kazakhstan",
  "+20": "Egypt",
  "+27": "South Africa",
  "+30": "Greece",
  "+31": "Netherlands",
  "+32": "Belgium",
  "+33": "France",
  "+34": "Spain",
  "+36": "Hungary",
  "+39": "Italy",
  "+40": "Romania",
  "+41": "Switzerland",
  "+43": "Austria",
  "+44": "United Kingdom",
  "+45": "Denmark",
  "+46": "Sweden",
  "+47": "Norway",
  "+48": "Poland",
  "+49": "Germany",
  "+51": "Peru",
  "+52": "Mexico",
  "+53": "Cuba",
  "+54": "Argentina",
  "+55": "Brazil",
  "+56": "Chile",
  "+57": "Colombia",
  "+58": "Venezuela",
  "+60": "Malaysia",
  "+61": "Australia",
  "+62": "Indonesia",
  "+63": "Philippines",
  "+64": "New Zealand",
  "+65": "Singapore",
  "+66": "Thailand",
  "+77": "Kazakhstan",
  "+81": "Japan",
  "+82": "South Korea",
  "+84": "Vietnam",
  "+86": "China",
  "+90": "Turkey",
  "+91": "India",
  "+92": "Pakistan",
  "+93": "Afghanistan",
  "+94": "Sri Lanka",
  "+95": "Myanmar",
  "+98": "Iran",
  "+212": "Morocco",
  "+213": "Algeria",
  "+216": "Tunisia",
  "+218": "Libya",
  "+220": "Gambia",
  "+221": "Senegal",
  "+222": "Mauritania",
  "+223": "Mali",
  "+224": "Guinea",
  "+225": "Ivory Coast",
  "+226": "Burkina Faso",
  "+227": "Niger",
  "+228": "Togo",
  "+229": "Benin",
  "+230": "Mauritius",
  "+231": "Liberia",
  "+232": "Sierra Leone",
  "+233": "Ghana",
  "+234": "Nigeria",
  "+235": "Chad",
  "+236": "Central African Republic",
  "+237": "Cameroon",
  "+238": "Cape Verde",
  "+239": "Sao Tome and Principe",
  "+240": "Equatorial Guinea",
  "+241": "Gabon",
  "+242": "Republic of the Congo",
  "+243": "DR Congo",
  "+244": "Angola",
  "+245": "Guinea-Bissau",
  "+246": "British Indian Ocean Territory",
  "+247": "Ascension Island",
  "+248": "Seychelles",
  "+249": "Sudan",
  "+250": "Rwanda",
  "+251": "Ethiopia",
  "+252": "Somalia",
  "+253": "Djibouti",
  "+254": "Kenya",
  "+255": "Tanzania",
  "+256": "Uganda",
  "+257": "Burundi",
  "+258": "Mozambique",
  "+260": "Zambia",
  "+261": "Madagascar",
  "+262": "Reunion",
  "+263": "Zimbabwe",
  "+264": "Namibia",
  "+265": "Malawi",
  "+266": "Lesotho",
  "+267": "Botswana",
  "+268": "Eswatini",
  "+269": "Comoros",
  "+290": "Saint Helena",
  "+291": "Eritrea",
  "+297": "Aruba",
  "+298": "Faroe Islands",
  "+299": "Greenland",
  "+350": "Gibraltar",
  "+351": "Portugal",
  "+352": "Luxembourg",
  "+353": "Ireland",
  "+354": "Iceland",
  "+355": "Albania",
  "+356": "Malta",
  "+357": "Cyprus",
  "+358": "Finland",
  "+359": "Bulgaria",
  "+370": "Lithuania",
  "+371": "Latvia",
  "+372": "Estonia",
  "+373": "Moldova",
  "+374": "Armenia",
  "+375": "Belarus",
  "+376": "Andorra",
  "+377": "Monaco",
  "+378": "San Marino",
  "+380": "Ukraine",
  "+381": "Serbia",
  "+382": "Montenegro",
  "+383": "Kosovo",
  "+385": "Croatia",
  "+386": "Slovenia",
  "+387": "Bosnia and Herzegovina",
  "+389": "North Macedonia",
  "+420": "Czech Republic",
  "+421": "Slovakia",
  "+423": "Liechtenstein",
  "+500": "Falkland Islands",
  "+501": "Belize",
  "+502": "Guatemala",
  "+503": "El Salvador",
  "+504": "Honduras",
  "+505": "Nicaragua",
  "+506": "Costa Rica",
  "+507": "Panama",
  "+508": "Saint Pierre and Miquelon",
  "+509": "Haiti",
  "+590": "Guadeloupe",
  "+591": "Bolivia",
  "+592": "Guyana",
  "+593": "Ecuador",
  "+595": "Paraguay",
  "+596": "Martinique",
  "+597": "Suriname",
  "+598": "Uruguay",
  "+599": "Caribbean Netherlands",
  "+670": "East Timor",
  "+672": "Norfolk Island",
  "+673": "Brunei",
  "+674": "Nauru",
  "+675": "Papua New Guinea",
  "+676": "Tonga",
  "+677": "Solomon Islands",
  "+678": "Vanuatu",
  "+679": "Fiji",
  "+680": "Palau",
  "+681": "Wallis and Futuna",
  "+682": "Cook Islands",
  "+683": "Niue",
  "+685": "Samoa",
  "+686": "Kiribati",
  "+687": "New Caledonia",
  "+688": "Tuvalu",
  "+689": "French Polynesia",
  "+690": "Tokelau",
  "+691": "Micronesia",
  "+692": "Marshall Islands",
  "+850": "North Korea",
  "+852": "Hong Kong",
  "+853": "Macau",
  "+855": "Cambodia",
  "+856": "Laos",
  "+880": "Bangladesh",
  "+886": "Taiwan",
  "+960": "Maldives",
  "+961": "Lebanon",
  "+962": "Jordan",
  "+963": "Syria",
  "+964": "Iraq",
  "+965": "Kuwait",
  "+966": "Saudi Arabia",
  "+967": "Yemen",
  "+968": "Oman",
  "+970": "Palestine",
  "+971": "UAE",
  "+972": "Israel",
  "+973": "Bahrain",
  "+974": "Qatar",
  "+975": "Bhutan",
  "+976": "Mongolia",
  "+977": "Nepal",
  "+992": "Tajikistan",
  "+993": "Turkmenistan",
  "+994": "Azerbaijan",
  "+995": "Georgia",
  "+996": "Kyrgyzstan",
  "+998": "Uzbekistan"
};

export function TelegramLoginModal() {
  const { tgAuthStep, setTgAuthStep, sendTgCode, signInTg } = useDrive();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const getCountry = (phoneNumber: string) => {
    if (!phoneNumber.startsWith('+')) return null;
    for (let len = 4; len >= 2; len--) {
      const prefix = phoneNumber.substring(0, len);
      if (countryCodes[prefix]) return countryCodes[prefix];
    }
    return null;
  };

  const detectedCountry = getCountry(phone);

  if (tgAuthStep === 'none') return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendTgCode(phone);
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signInTg(code);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setTgAuthStep('none')}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10"
      >
        <button 
          onClick={() => setTgAuthStep('none')}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <Send className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {tgAuthStep === 'phone' ? 'Connect Telegram' : 'Enter One-Time Password'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {tgAuthStep === 'phone' 
              ? 'Enter your phone number to use your Telegram "Saved Messages" as cloud storage.' 
              : `We've sent a code to the Telegram account for ${phone}.`
            }
          </p>

          <form onSubmit={tgAuthStep === 'phone' ? handleSendCode : handleSignIn} className="space-y-4">
            {tgAuthStep === 'phone' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all outline-none"
                  required
                />
                {detectedCountry && (
                  <p className="text-[10px] text-blue-500 font-medium mt-1 ml-1">
                    🌍 Country: {detectedCountry}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  Write your full number including your country code (e.g., +8801XXXXXXXXX)
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter 5-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all outline-none text-center tracking-[0.5em] font-mono text-xl"
                  maxLength={5}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                tgAuthStep === 'phone' ? 'Send Code' : 'Confirm Login'
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-slate-400">
            By connecting, you agree to store files in your Telegram Saved Messages.
            Your login is handled securely via Telegram MTProto.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
