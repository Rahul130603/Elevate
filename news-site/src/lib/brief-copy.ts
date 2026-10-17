import type { Locale } from "./i18n";

type BriefCopy = {
  aiBrief: string;
  aiLabel: string;
  disclaimer: string;
  readFull: string;
  back: string;
  unavailable: string;
  unavailableBody: string;
  quotaBody: string;
};

const copy: Record<Locale, BriefCopy> = {
  en: {
    aiBrief: "Quick brief",
    aiLabel: "AI-generated summary",
    disclaimer: "This brief may contain errors. Check the original report for full context.",
    readFull: "Read full story",
    back: "Back to news",
    unavailable: "Brief unavailable",
    unavailableBody: "The AI brief could not be generated right now. You can still read the original report.",
    quotaBody: "This site's daily AI limit has been reached. Briefs will return once the limit resets — the original report is linked below.",
  },
  hi: {
    aiBrief: "संक्षिप्त खबर",
    aiLabel: "AI से तैयार सारांश",
    disclaimer: "इस सारांश में त्रुटियाँ हो सकती हैं। पूरी जानकारी के लिए मूल रिपोर्ट देखें।",
    readFull: "पूरी खबर पढ़ें",
    back: "खबरों पर वापस जाएँ",
    unavailable: "सारांश उपलब्ध नहीं है",
    unavailableBody: "अभी AI सारांश तैयार नहीं हो सका। आप मूल रिपोर्ट पढ़ सकते हैं।",
    quotaBody: "इस साइट की दैनिक AI सीमा पूरी हो गई है। सीमा रीसेट होने पर सारांश फिर मिलेगा — मूल रिपोर्ट नीचे दी गई है।",
  },
  ta: {
    aiBrief: "சுருக்கமான செய்தி",
    aiLabel: "AI உருவாக்கிய சுருக்கம்",
    disclaimer: "இந்தச் சுருக்கத்தில் தவறுகள் இருக்கலாம். முழு விவரத்திற்கு அசல் செய்தியைப் பார்க்கவும்.",
    readFull: "முழுச் செய்தியைப் படிக்க",
    back: "செய்திகளுக்குத் திரும்பு",
    unavailable: "சுருக்கம் கிடைக்கவில்லை",
    unavailableBody: "AI சுருக்கத்தை இப்போது உருவாக்க முடியவில்லை. அசல் செய்தியைப் படிக்கலாம்.",
    quotaBody: "இந்தத் தளத்தின் தினசரி AI வரம்பு முடிந்துவிட்டது. வரம்பு மீட்டமைந்ததும் சுருக்கம் மீண்டும் கிடைக்கும் — அசல் செய்தி கீழே இணைக்கப்பட்டுள்ளது.",
  },
  bn: {
    aiBrief: "সংক্ষিপ্ত খবর",
    aiLabel: "AI-তৈরি সারাংশ",
    disclaimer: "এই সারাংশে ভুল থাকতে পারে। সম্পূর্ণ তথ্যের জন্য মূল প্রতিবেদন দেখুন।",
    readFull: "সম্পূর্ণ খবর পড়ুন",
    back: "খবরে ফিরে যান",
    unavailable: "সারাংশ পাওয়া যায়নি",
    unavailableBody: "এখন AI সারাংশ তৈরি করা যায়নি। মূল প্রতিবেদনটি পড়তে পারেন।",
    quotaBody: "এই সাইটের দৈনিক AI সীমা শেষ হয়েছে। সীমা রিসেট হলে সারাংশ আবার পাওয়া যাবে — মূল প্রতিবেদন নিচে দেওয়া আছে।",
  },
  ml: {
    aiBrief: "ചുരുക്ക വാർത്ത",
    aiLabel: "AI തയ്യാറാക്കിയ സംഗ്രഹം",
    disclaimer: "ഈ സംഗ്രഹത്തിൽ പിശകുകൾ ഉണ്ടാകാം. പൂർണ്ണ വിവരങ്ങൾക്ക് യഥാർത്ഥ റിപ്പോർട്ട് പരിശോധിക്കുക.",
    readFull: "മുഴുവൻ വാർത്ത വായിക്കുക",
    back: "വാർത്തകളിലേക്ക് മടങ്ങുക",
    unavailable: "സംഗ്രഹം ലഭ്യമല്ല",
    unavailableBody: "AI സംഗ്രഹം ഇപ്പോൾ തയ്യാറാക്കാനായില്ല. യഥാർത്ഥ റിപ്പോർട്ട് വായിക്കാം.",
    quotaBody: "ഈ സൈറ്റിന്റെ ദൈനംദിന AI പരിധി തീർന്നു. പരിധി പുനഃസജ്ജമാകുമ്പോൾ സംഗ്രഹം വീണ്ടും ലഭ്യമാകും — യഥാർത്ഥ റിപ്പോർട്ട് താഴെ നൽകിയിട്ടുണ്ട്.",
  },
  gu: {
    aiBrief: "ટૂંકા સમાચાર",
    aiLabel: "AI દ્વારા તૈયાર સારાંશ",
    disclaimer: "આ સારાંશમાં ભૂલો હોઈ શકે છે. સંપૂર્ણ માહિતી માટે મૂળ અહેવાલ જુઓ.",
    readFull: "સંપૂર્ણ સમાચાર વાંચો",
    back: "સમાચાર પર પાછા જાઓ",
    unavailable: "સારાંશ ઉપલબ્ધ નથી",
    unavailableBody: "હમણાં AI સારાંશ બનાવી શકાયો નથી. તમે મૂળ અહેવાલ વાંચી શકો છો.",
    quotaBody: "આ સાઇટની દૈનિક AI મર્યાદા પૂરી થઈ છે. મર્યાદા રીસેટ થતાં સારાંશ ફરી મળશે — મૂળ અહેવાલ નીચે આપેલો છે.",
  },
  mr: {
    aiBrief: "थोडक्यात बातमी",
    aiLabel: "AI ने तयार केलेला सारांश",
    disclaimer: "या सारांशात चुका असू शकतात. संपूर्ण माहितीसाठी मूळ वृत्त पाहा.",
    readFull: "संपूर्ण बातमी वाचा",
    back: "बातम्यांकडे परत जा",
    unavailable: "सारांश उपलब्ध नाही",
    unavailableBody: "AI सारांश सध्या तयार करता आला नाही. तुम्ही मूळ वृत्त वाचू शकता.",
    quotaBody: "या साइटची दैनिक AI मर्यादा संपली आहे. मर्यादा रीसेट झाल्यावर सारांश पुन्हा मिळेल — मूळ वृत्त खाली दिले आहे.",
  },
};

export function getBriefCopy(locale: Locale): BriefCopy {
  return copy[locale];
}
