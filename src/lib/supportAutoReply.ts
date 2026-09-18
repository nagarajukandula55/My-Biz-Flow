/**
 * Instant, no-human-needed replies for the Support Widget live chat
 * (src/components/SupportWidget.tsx / src/lib/supportTickets.ts). Keyword-
 * matched against a partner's own message — first rule whose keywords
 * appear (case-insensitive, substring match) wins, so order rules
 * most-specific-first. Deliberately NOT an LLM call: no AI API key is
 * configured anywhere in this app today, and a fixed rule set is instant,
 * free, and fully predictable — the honest tradeoff is it only covers what
 * it's explicitly told to, so a genuinely novel question still needs a
 * human reply via the ops Telegram thread as before (this never replaces
 * that path, only runs alongside it — see sendPartnerSupportMessage).
 *
 * `reply` carries one string per supported language (src/lib/i18n/
 * supportLanguages.ts); `en` is always present, other languages fall back
 * to English if that rule hasn't been translated yet — a rule can be added
 * in English only and translated later without breaking anything. This
 * ONLY covers fixed, pre-written auto-reply text — the live human<->partner
 * chat itself stays English-only by explicit product decision (see
 * supportLanguages.ts's header for why).
 *
 * Every `link` below points at REAL content already in this app — the
 * partner Help & Tutorials accordion (helpSectionSlug'd anchors, see
 * HelpAccordion.tsx), the public FAQ/module guide, or the Downloads page —
 * not invented URLs. SupportWidget.tsx linkifies these into clickable text.
 *
 * Extend by adding a rule here; no other file needs to change.
 */
import { helpSectionSlug } from "@/lib/helpSlug";
import type { SupportLanguage } from "@/lib/i18n/supportLanguages";

export type AutoReplyRule = {
  /** Any of these appearing in the message (case-insensitive) matches this rule. */
  keywords: string[];
  reply: Partial<Record<SupportLanguage, string>> & { en: string };
  /** Optional real path this reply points to — `{partnerId}` is substituted if present. */
  link?: string;
  linkLabel?: string;
};

function helpLink(sectionTitle: string): string {
  return `/partner/{partnerId}/help#${helpSectionSlug(sectionTitle)}`;
}

export const SUPPORT_AUTO_REPLY_RULES: AutoReplyRule[] = [
  {
    keywords: ["human", "agent", "real person", "talk to someone", "talk to a person"],
    reply: {
      en: "Got it — connecting you with our team now. Someone will reply here shortly.",
      hi: "ठीक है — आपको हमारी टीम से जोड़ रहे हैं। कोई जल्द ही यहाँ जवाब देगा।",
      te: "సరే — మిమ్మల్ని మా టీమ్‌తో కలుపుతున్నాము. త్వరలో ఎవరైనా ఇక్కడ సమాధానం ఇస్తారు.",
      ta: "சரி — உங்களை எங்கள் குழுவுடன் இணைக்கிறோம். சிறிது நேரத்தில் இங்கே பதில் வரும்.",
      kn: "ಸರಿ — ನಿಮ್ಮನ್ನು ನಮ್ಮ ತಂಡಕ್ಕೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇವೆ. ಶೀಘ್ರದಲ್ಲೇ ಇಲ್ಲಿ ಉತ್ತರ ಸಿಗುತ್ತದೆ.",
    },
  },
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
    reply: {
      en: "Hi! 👋 Thanks for reaching out to My Biz Flow support. Tell us what you need help with, or check our Getting Started guide below while you wait for a reply.",
      hi: "नमस्ते! 👋 My Biz Flow सपोर्ट से संपर्क करने के लिए धन्यवाद। बताएं आपको किस चीज़ में मदद चाहिए, या जवाब का इंतज़ार करते हुए नीचे दी गई Getting Started गाइड देखें।",
      te: "నమస్తే! 👋 My Biz Flow సపోర్ట్‌ను సంప్రదించినందుకు ధన్యవాదాలు. మీకు ఏమి సహాయం కావాలో చెప్పండి, లేదా సమాధానం కోసం వేచి ఉండగా క్రింద ఉన్న Getting Started గైడ్‌ను చూడండి.",
      ta: "வணக்கம்! 👋 My Biz Flow ஆதரவைத் தொடர்பு கொண்டதற்கு நன்றி. உங்களுக்கு என்ன உதவி தேவை என்று சொல்லுங்கள், அல்லது பதிலுக்காக காத்திருக்கும்போது கீழே உள்ள Getting Started வழிகாட்டியைப் பாருங்கள்.",
      kn: "ನಮಸ್ಕಾರ! 👋 My Biz Flow ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು ಎಂದು ತಿಳಿಸಿ, ಅಥವಾ ಉತ್ತರಕ್ಕಾಗಿ ಕಾಯುತ್ತಿರುವಾಗ ಕೆಳಗಿನ Getting Started ಗೈಡ್ ನೋಡಿ.",
    },
    link: helpLink("Getting started"),
    linkLabel: "Getting Started guide",
  },
  {
    keywords: ["how does this work", "what is my biz flow", "new here", "just signed up", "getting started"],
    reply: {
      en: "Here's our Getting Started guide covering the overall shape of the app — modules, Settings, and where to start.",
      hi: "यह रही हमारी Getting Started गाइड — इसमें ऐप की पूरी बनावट, मॉड्यूल्स, सेटिंग्स और शुरुआत कहाँ से करें, सब कवर है।",
      te: "ఇదిగో మా Getting Started గైడ్ — యాప్ మొత్తం ఆకృతి, మాడ్యూల్స్, సెట్టింగ్స్, ఎక్కడ నుండి ప్రారంభించాలో అన్నీ ఇందులో ఉన్నాయి.",
      ta: "இதோ எங்கள் Getting Started வழிகாட்டி — ஆப்பின் ஒட்டுமொத்த அமைப்பு, தொகுதிகள், அமைப்புகள், எங்கிருந்து தொடங்குவது என்பதை உள்ளடக்கியது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Getting Started ಗೈಡ್ — ಆ್ಯಪ್‌ನ ಒಟ್ಟಾರೆ ರಚನೆ, ಮಾಡ್ಯೂಲ್‌ಗಳು, ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ಎಲ್ಲಿಂದ ಪ್ರಾರಂಭಿಸಬೇಕು ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Getting started"),
    linkLabel: "Getting Started guide",
  },
  {
    keywords: [
      "invoice",
      "billing",
      "gst",
      "tax invoice",
      "cgst",
      "sgst",
      "igst",
      "credit note",
      "debit note",
      "upi",
      "payment qr",
    ],
    reply: {
      en: "Here's our Billing & Invoices guide — covers GST/CGST/SGST/IGST, Estimate vs Invoice vs Credit/Debit Note, and getting your logo/bank details/UPI QR onto invoices.",
      hi: "यह रही हमारी Billing & Invoices गाइड — इसमें GST/CGST/SGST/IGST, Estimate बनाम Invoice बनाम Credit/Debit Note, और इनवॉइस पर लोगो/बैंक डिटेल्स/UPI QR कैसे लगाएं, सब बताया गया है।",
      te: "ఇదిగో మా Billing & Invoices గైడ్ — GST/CGST/SGST/IGST, Estimate vs Invoice vs Credit/Debit Note, మరియు మీ లోగో/బ్యాంక్ వివరాలు/UPI QR ఇన్వాయిస్‌పై ఎలా పెట్టాలో ఇందులో ఉంది.",
      ta: "இதோ எங்கள் Billing & Invoices வழிகாட்டி — GST/CGST/SGST/IGST, Estimate vs Invoice vs Credit/Debit Note, மற்றும் உங்கள் லோகோ/வங்கி விவரங்கள்/UPI QR-ஐ இன்வாய்ஸில் சேர்ப்பது பற்றி விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Billing & Invoices ಗೈಡ್ — GST/CGST/SGST/IGST, Estimate vs Invoice vs Credit/Debit Note, ಮತ್ತು ನಿಮ್ಮ ಲೋಗೋ/ಬ್ಯಾಂಕ್ ವಿವರ/UPI QR ಅನ್ನು ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿ ಸೇರಿಸುವುದು ಹೇಗೆ ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Billing & Invoices"),
    linkLabel: "Billing & Invoices guide",
  },
  {
    keywords: ["cost", "how much", "upgrade", "plan", "tier", "subscription price"],
    reply: {
      en: "Here's our module-by-module pricing/tier breakdown.",
      hi: "यह रहा हमारा मॉड्यूल-वार प्राइसिंग/टियर विवरण।",
      te: "ఇదిగో మా మాడ్యూల్ వారీగా ప్రైసింగ్/టియర్ వివరాలు.",
      ta: "இதோ எங்கள் தொகுதி வாரியான விலை/அடுக்கு விவரங்கள்.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ ಮಾಡ್ಯೂಲ್‌ವಾರು ಬೆಲೆ/ಹಂತದ ವಿವರ.",
    },
    link: "/help/modules",
    linkLabel: "Module pricing guide",
  },
  {
    keywords: ["job card", "estimate", "service record", "bom", "bill of materials", "close a job", "close workorder"],
    reply: {
      en: "Here's our Workorders guide — covers creating a job, the Job Card/Estimate/Service Record documents, where BOM pricing comes from, and closing a job into an invoice.",
      hi: "यह रही हमारी Workorders गाइड — इसमें जॉब बनाना, Job Card/Estimate/Service Record डॉक्यूमेंट्स, BOM प्राइसिंग कहाँ से आती है, और जॉब बंद करके इनवॉइस बनाना, सब बताया गया है।",
      te: "ఇదిగో మా Workorders గైడ్ — జాబ్ క్రియేట్ చేయడం, Job Card/Estimate/Service Record డాక్యుమెంట్స్, BOM ప్రైసింగ్ ఎక్కడ నుండి వస్తుంది, జాబ్ క్లోజ్ చేసి ఇన్వాయిస్‌గా మార్చడం ఇందులో ఉన్నాయి.",
      ta: "இதோ எங்கள் Workorders வழிகாட்டி — வேலையை உருவாக்குவது, Job Card/Estimate/Service Record ஆவணங்கள், BOM விலை எங்கிருந்து வருகிறது, மற்றும் வேலையை மூடி இன்வாய்ஸாக மாற்றுவது பற்றி விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Workorders ಗೈಡ್ — ಜಾಬ್ ರಚಿಸುವುದು, Job Card/Estimate/Service Record ದಾಖಲೆಗಳು, BOM ಬೆಲೆ ಎಲ್ಲಿಂದ ಬರುತ್ತದೆ, ಮತ್ತು ಜಾಬ್ ಮುಚ್ಚಿ ಇನ್‌ವಾಯ್ಸ್ ಮಾಡುವುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Workorders (Service Centre)"),
    linkLabel: "Workorders guide",
  },
  {
    keywords: ["new repair", "new workorder", "repair job", "device", "workorder"],
    reply: {
      en: "Here's our Workorders guide covering how to create and manage a repair job end to end.",
      hi: "यह रही हमारी Workorders गाइड, जिसमें बताया गया है कि रिपेयर जॉब शुरू से आखिर तक कैसे बनाएं और मैनेज करें।",
      te: "ఇదిగో మా Workorders గైడ్ — రిపేర్ జాబ్‌ను ఆద్యంతం ఎలా క్రియేట్ చేయాలో, మేనేజ్ చేయాలో ఇందులో ఉంది.",
      ta: "இதோ எங்கள் Workorders வழிகாட்டி — ஒரு பழுதுபார்ப்பு வேலையை முதல் முதல் முதல் இறுதி வரை எப்படி உருவாக்குவது, நிர்வகிப்பது என்பதை விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Workorders ಗೈಡ್ — ರಿಪೇರಿ ಜಾಬ್ ಅನ್ನು ಆರಂಭದಿಂದ ಕೊನೆಯವರೆಗೆ ಹೇಗೆ ರಚಿಸುವುದು, ನಿರ್ವಹಿಸುವುದು ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Workorders (Service Centre)"),
    linkLabel: "Workorders guide",
  },
  {
    keywords: ["brand", "model list", "solution", "fault code", "symptom code"],
    reply: {
      en: "Here's our guide to Brands, Models, Solutions & Fault/Symptom Codes and what each is for.",
      hi: "यह रही हमारी Brands, Models, Solutions & Fault/Symptom Codes गाइड, जिसमें हर एक का उपयोग बताया गया है।",
      te: "ఇదిగో మా Brands, Models, Solutions & Fault/Symptom Codes గైడ్ — ప్రతి దాని ఉపయోగం ఏమిటో ఇందులో ఉంది.",
      ta: "இதோ எங்கள் Brands, Models, Solutions & Fault/Symptom Codes வழிகாட்டி — ஒவ்வொன்றும் எதற்காக என்பதை விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Brands, Models, Solutions & Fault/Symptom Codes ಗೈಡ್ — ಪ್ರತಿಯೊಂದೂ ಯಾವುದಕ್ಕಾಗಿ ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Brands, Models, Solutions & Fault/Symptom Codes"),
    linkLabel: "Brands/Models/Solutions guide",
  },
  {
    keywords: ["customer record", "customer list", "customer history"],
    reply: {
      en: "Here's our Customers guide — how customer records work and when you'd need one.",
      hi: "यह रही हमारी Customers गाइड — कस्टमर रिकॉर्ड कैसे काम करते हैं और कब ज़रूरत पड़ती है।",
      te: "ఇదిగో మా Customers గైడ్ — కస్టమర్ రికార్డులు ఎలా పని చేస్తాయో, ఎప్పుడు అవసరమో ఇందులో ఉంది.",
      ta: "இதோ எங்கள் Customers வழிகாட்டி — வாடிக்கையாளர் பதிவுகள் எப்படி வேலை செய்கின்றன, எப்போது தேவை என்பதை விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Customers ಗೈಡ್ — ಗ್ರಾಹಕ ದಾಖಲೆಗಳು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ, ಯಾವಾಗ ಬೇಕಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Customers"),
    linkLabel: "Customers guide",
  },
  {
    keywords: ["numbering", "invoice number", "prefix", "business profile", "logo", "bank details", "timezone", "currency"],
    reply: {
      en: "Here's our Settings guide — Business Profile, Bank Details, Config, and customizing document numbering.",
      hi: "यह रही हमारी Settings गाइड — Business Profile, Bank Details, Config, और डॉक्यूमेंट नंबरिंग कस्टमाइज़ करना, सब इसमें है।",
      te: "ఇదిగో మా Settings గైడ్ — Business Profile, Bank Details, Config, మరియు డాక్యుమెంట్ నంబరింగ్ కస్టమైజ్ చేయడం ఇందులో ఉంది.",
      ta: "இதோ எங்கள் Settings வழிகாட்டி — Business Profile, Bank Details, Config, மற்றும் ஆவண எண்ணிடலை தனிப்பயனாக்குவது பற்றி விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Settings ಗೈಡ್ — Business Profile, Bank Details, Config, ಮತ್ತು ದಾಖಲೆ ಸಂಖ್ಯೆ ಕಸ್ಟಮೈಸ್ ಮಾಡುವುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: helpLink("Settings"),
    linkLabel: "Settings guide",
  },
  {
    keywords: ["telegram", "whatsapp alert", "notification not received", "not receiving", "alert not working"],
    reply: {
      en: "Here's our Telegram Alerts guide for connecting/troubleshooting notifications. If it still looks broken after checking that, describe the issue and our team will dig in.",
      hi: "नोटिफिकेशन कनेक्ट/ठीक करने के लिए यह रही हमारी Telegram Alerts गाइड। अगर उसके बाद भी दिक्कत बनी रहे, तो समस्या बताएं और हमारी टीम देखेगी।",
      te: "నోటిఫికేషన్లను కనెక్ట్ చేయడానికి/సరిచేయడానికి ఇదిగో మా Telegram Alerts గైడ్. అయినా సమస్య ఉంటే, వివరించండి, మా టీమ్ చూస్తుంది.",
      ta: "அறிவிப்புகளை இணைக்க/சரிசெய்ய இதோ எங்கள் Telegram Alerts வழிகாட்டி. அதன் பிறகும் சரியில்லை என்றால், சிக்கலை விவரிக்கவும், எங்கள் குழு பார்க்கும்.",
      kn: "ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಂಪರ್ಕಿಸಲು/ಸರಿಪಡಿಸಲು ಇಲ್ಲಿದೆ ನಮ್ಮ Telegram Alerts ಗೈಡ್. ಅದಾದರೂ ಸಮಸ್ಯೆ ಇದ್ದರೆ, ವಿವರಿಸಿ, ನಮ್ಮ ತಂಡ ನೋಡುತ್ತದೆ.",
    },
    link: helpLink("Telegram Alerts"),
    linkLabel: "Telegram Alerts guide",
  },
  {
    keywords: ["reset password", "forgot password", "can't log in", "cant log in", "login issue"],
    reply: {
      en: "Use \"Forgot password\" on the login page to reset it yourself — that's the fastest fix. If that doesn't work, let us know here and our team will help.",
      hi: "खुद पासवर्ड रीसेट करने के लिए लॉगिन पेज पर \"Forgot password\" का उपयोग करें — यह सबसे तेज़ तरीका है। अगर यह काम न करे, तो यहाँ बताएं, हमारी टीम मदद करेगी।",
      te: "మీ పాస్‌వర్డ్‌ను మీరే రీసెట్ చేసుకోవడానికి లాగిన్ పేజీలో \"Forgot password\" వాడండి — ఇది వేగవంతమైన మార్గం. అది పనిచేయకపోతే, ఇక్కడ తెలియజేయండి, మా టీమ్ సహాయం చేస్తుంది.",
      ta: "உங்கள் கடவுச்சொல்லை நீங்களே மீட்டமைக்க உள்நுழைவு பக்கத்தில் \"Forgot password\"-ஐப் பயன்படுத்தவும் — இதுவே வேகமான வழி. அது வேலை செய்யவில்லை என்றால், இங்கே தெரிவிக்கவும், எங்கள் குழு உதவும்.",
      kn: "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ನೀವೇ ಮರುಹೊಂದಿಸಲು ಲಾಗಿನ್ ಪುಟದಲ್ಲಿ \"Forgot password\" ಬಳಸಿ — ಇದು ಅತ್ಯಂತ ವೇಗದ ಮಾರ್ಗ. ಅದು ಕೆಲಸ ಮಾಡದಿದ್ದರೆ, ಇಲ್ಲಿ ತಿಳಿಸಿ, ನಮ್ಮ ತಂಡ ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    },
  },
  {
    keywords: ["install app", "mobile app", "add to home screen", "download app", "pwa"],
    reply: {
      en: "Here's our Downloads page with install guides for the Service Centre, Telecalling and Field Force apps.",
      hi: "यह रहा हमारा Downloads पेज, जिसमें Service Centre, Telecalling और Field Force ऐप्स के इंस्टॉल गाइड हैं।",
      te: "ఇదిగో మా Downloads పేజీ — Service Centre, Telecalling మరియు Field Force యాప్‌ల ఇన్‌స్టాల్ గైడ్‌లు ఇందులో ఉన్నాయి.",
      ta: "இதோ எங்கள் Downloads பக்கம் — Service Centre, Telecalling மற்றும் Field Force ஆப்களுக்கான நிறுவல் வழிகாட்டிகள் இதில் உள்ளன.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ Downloads ಪುಟ — Service Centre, Telecalling ಮತ್ತು Field Force ಆ್ಯಪ್‌ಗಳ ಇನ್‌ಸ್ಟಾಲ್ ಗೈಡ್‌ಗಳನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: "/downloads",
    linkLabel: "Downloads",
  },
  {
    keywords: ["custom field", "add a field", "hide a field", "designer", "admin page", "module admin"],
    reply: {
      en: "Here's our FAQ — covers custom fields, module admin pages, and how the Designer works.",
      hi: "यह रहा हमारा FAQ — इसमें कस्टम फील्ड्स, मॉड्यूल एडमिन पेजेस, और Designer कैसे काम करता है, सब बताया गया है।",
      te: "ఇదిగో మా FAQ — కస్టమ్ ఫీల్డ్స్, మాడ్యూల్ అడ్మిన్ పేజీలు, Designer ఎలా పని చేస్తుందో ఇందులో ఉంది.",
      ta: "இதோ எங்கள் FAQ — தனிப்பயன் புலங்கள், தொகுதி நிர்வாக பக்கங்கள், Designer எப்படி வேலை செய்கிறது என்பதை விளக்குகிறது.",
      kn: "ಇಲ್ಲಿದೆ ನಮ್ಮ FAQ — ಕಸ್ಟಮ್ ಫೀಲ್ಡ್‌ಗಳು, ಮಾಡ್ಯೂಲ್ ಅಡ್ಮಿನ್ ಪುಟಗಳು, Designer ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂಬುದನ್ನು ಒಳಗೊಂಡಿದೆ.",
    },
    link: "/help",
    linkLabel: "FAQ",
  },
];

/** Returns the first matching rule (reply in the requested language + resolved link), or null if nothing matched. */
export function matchAutoReply(
  message: string,
  partnerId: string,
  language: SupportLanguage = "en"
): { text: string; link?: string; linkLabel?: string } | null {
  const lower = message.toLowerCase();
  for (const rule of SUPPORT_AUTO_REPLY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return {
        text: rule.reply[language] ?? rule.reply.en,
        link: rule.link?.replace("{partnerId}", partnerId),
        linkLabel: rule.linkLabel,
      };
    }
  }
  return null;
}
