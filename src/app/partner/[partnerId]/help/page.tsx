import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { HelpAccordion } from "./HelpAccordion";
import { env } from "@/lib/env";
import type { SupportLanguage } from "@/lib/i18n/supportLanguages";

/** `en` required, other languages optional — falls back to English per item until translated. Same pattern as supportAutoReply.ts's rules. */
type LocalizedText = Partial<Record<SupportLanguage, string>> & { en: string };

registerPage({
  id: "platform.partner-help",
  moduleSlug: "platform",
  title: "Help & Tutorials",
  path: "/partner/[partnerId]/help",
  kind: "other",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Static written help center covering this app's own features (Workorders/Service Centre, Brands/Models/Solutions, Service Centre BOM, Customers, Billing & Invoices, Settings, Telegram Alerts) — an accordion of Q&A entries grouped by topic (HelpAccordion.tsx, a small Client Component so each answer can expand/collapse), no database/model behind it, no tutorial videos yet. Written fresh for My Biz Flow's actual feature set; not a port of any other AN Group product's help content. Reached from the Partner Admin nav group (buildPartnerAdminNavGroups, src/lib/designer/partnerAdminNav.ts) alongside Settings and Subscription.",
  sourceFile: "src/app/partner/[partnerId]/help/page.tsx",
});

export type HelpSection = {
  title: string;
  items: { q: LocalizedText; a: LocalizedText }[];
};

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting started",
    items: [
      {
        q: {
          en: "What's the overall shape of this app?",
          hi: "इस ऐप की पूरी बनावट क्या है?",
        },
        a: {
          en: "You pick which modules you use (Service Centre, Billing, and whatever else you've enabled) from the Common/Partner Admin nav on the left. Each module has its own records — workorders, invoices, customers — and its own list/detail/document pages, but they all share one Settings, one numbering scheme, and one Telegram alert channel underneath.",
          hi: "आप बाईं ओर के Common/Partner Admin नेविगेशन से चुनते हैं कि कौन-कौन से मॉड्यूल इस्तेमाल करने हैं (Service Centre, Billing, और जो भी आपने चालू किया है)। हर मॉड्यूल के अपने रिकॉर्ड होते हैं — workorders, invoices, customers — और अपने list/detail/document पेज, लेकिन नीचे सबकी एक ही Settings, एक ही numbering scheme, और एक ही Telegram अलर्ट चैनल होती है।",
        },
      },
      {
        q: {
          en: "Where do I set up my business details before printing anything?",
          hi: "कुछ भी प्रिंट करने से पहले अपनी बिज़नेस डिटेल्स कहाँ सेट करूँ?",
        },
        a: {
          en: "Settings > Business Profile. Fill in your business name, address, GSTIN, phone, and upload your logo there — every printed Job Card, Estimate, Service Record, and Invoice pulls those fields (and your uploaded logo, once set) directly, so this is worth doing before your first print.",
          hi: "Settings > Business Profile में। वहाँ अपना बिज़नेस नाम, पता, GSTIN, फ़ोन भरें और लोगो अपलोड करें — हर प्रिंट होने वाला Job Card, Estimate, Service Record, और Invoice इन्हीं फ़ील्ड्स (और लोगो, सेट होने पर) को सीधे इस्तेमाल करता है, इसलिए पहला प्रिंट लेने से पहले यह कर लेना बेहतर है।",
        },
      },
      {
        q: {
          en: "Can I add my own bank details or UPI ID so customers can pay me directly?",
          hi: "क्या मैं अपने बैंक डिटेल्स या UPI ID जोड़ सकता हूँ ताकि कस्टमर सीधे भुगतान कर सकें?",
        },
        a: {
          en: "Yes — Settings > Bank Details for account/IFSC info, and Settings > Config for your UPI VPA. Once a UPI ID is set, invoices print a scannable payment QR automatically; bank details print in a dedicated block on the invoice when filled in.",
          hi: "हाँ — अकाउंट/IFSC जानकारी के लिए Settings > Bank Details, और UPI VPA के लिए Settings > Config। एक बार UPI ID सेट हो जाए तो इनवॉइस पर स्कैन करने योग्य पेमेंट QR अपने आप प्रिंट होता है; बैंक डिटेल्स भरने पर इनवॉइस पर एक अलग ब्लॉक में प्रिंट होते हैं।",
        },
      },
    ],
  },
  {
    title: "Workorders (Service Centre)",
    items: [
      {
        q: {
          en: "How do I create a new repair job?",
          hi: "नई रिपेयर जॉब कैसे बनाऊँ?",
        },
        a: {
          en: "Service Centre > New. Enter the customer's details and the device (Brand/Model — pick from your saved list or type a new one on the fly), then save. The workorder record stays open on one detail page through intake, repair, and closure — you don't move between separate screens for each stage.",
          hi: "Service Centre > New में जाएँ। कस्टमर की डिटेल्स और डिवाइस (Brand/Model — अपनी सेव लिस्ट से चुनें या नया टाइप करें) भरें, फिर सेव करें। इनटेक, रिपेयर और क्लोज़र — तीनों के लिए workorder record एक ही डिटेल पेज पर खुला रहता है, हर स्टेज के लिए अलग स्क्रीन पर जाने की ज़रूरत नहीं।",
        },
      },
      {
        q: {
          en: "What's the difference between the Job Card, Estimate, and Service Record documents?",
          hi: "Job Card, Estimate, और Service Record डॉक्यूमेंट्स में क्या फ़र्क़ है?",
        },
        a: {
          en: "All three print from the same workorder but serve different moments: the Job Card is the intake receipt (what was handed in, and its condition). The Estimate is a pre-repair quote for the customer to approve before work starts. The Service Record is the post-repair summary of exactly what was done. Each has its own print page (buttons on the workorder detail screen) and its own document number.",
          hi: "तीनों एक ही workorder से प्रिंट होते हैं लेकिन अलग-अलग मौकों पर काम आते हैं: Job Card इनटेक रसीद है (क्या जमा हुआ और किस हालत में)। Estimate काम शुरू होने से पहले कस्टमर से मंज़ूरी के लिए दिया गया अनुमानित रेट है। Service Record रिपेयर के बाद यह बताता है कि वास्तव में क्या किया गया। हर एक का अपना प्रिंट पेज (workorder डिटेल स्क्रीन पर बटन) और अपना डॉक्यूमेंट नंबर होता है।",
        },
      },
      {
        q: {
          en: "Where do parts and labour charges on a job come from?",
          hi: "जॉब पर पार्ट्स और लेबर चार्ज कहाँ से आते हैं?",
        },
        a: {
          en: "From your Service Centre BOM (Bill of Materials) price list — a catalog of parts/services with rate, HSN code, and tax rate you maintain per Brand/Model (or mark Universal to apply to every device). When you add a line item to a workorder, it suggests entries from that list, or lets you type a brand-new one that gets saved back to the BOM.",
          hi: "आपकी Service Centre BOM (Bill of Materials) प्राइस लिस्ट से — पार्ट्स/सर्विसेज़ का एक कैटलॉग जिसमें रेट, HSN कोड, और टैक्स रेट होता है, जिसे आप हर Brand/Model के लिए मेंटेन करते हैं (या Universal मार्क करके हर डिवाइस पर लागू करें)। जब आप workorder में लाइन आइटम जोड़ते हैं, तो यह उस लिस्ट से सुझाव देता है, या नया टाइप करने पर वह BOM में वापस सेव हो जाता है।",
        },
      },
      {
        q: {
          en: "How do I close a job and turn it into an invoice?",
          hi: "जॉब को बंद करके इनवॉइस में कैसे बदलूँ?",
        },
        a: {
          en: "Once repair is complete and the customer has been informed, use the Close action on the workorder. It generates a GST tax invoice (or a plain Bill, if the job carried no tax) from the same parts/labour lines already on the record — you don't re-enter anything.",
          hi: "जब रिपेयर पूरी हो जाए और कस्टमर को बता दिया जाए, तो workorder पर Close एक्शन इस्तेमाल करें। यह उसी रिकॉर्ड पर मौजूद पार्ट्स/लेबर लाइनों से GST टैक्स इनवॉइस (या अगर टैक्स नहीं है तो सादा Bill) बना देता है — दोबारा कुछ भरने की ज़रूरत नहीं।",
        },
      },
    ],
  },
  {
    title: "Brands, Models, Solutions & Fault/Symptom Codes",
    items: [
      {
        q: {
          en: "What are these four masters actually for?",
          hi: "ये चारों मास्टर असल में किस लिए हैं?",
        },
        a: {
          en: "Brands and Models describe the devices you service (e.g. Brand: Samsung, Model: Galaxy A14) and are what your BOM parts and workorder intake are filed under. Solutions are your library of standard repair procedures/fixes you can attach to a job. Fault Codes and Symptom Codes are short, reusable labels for what's wrong with a device and what the customer reported — using them consistently is what makes your Reports and Analytics meaningful over time, instead of every technician typing something different for the same issue.",
          hi: "Brands और Models उन डिवाइसों को बताते हैं जिनकी आप सर्विस करते हैं (जैसे Brand: Samsung, Model: Galaxy A14) और इन्हीं के नीचे आपके BOM पार्ट्स और workorder इनटेक दर्ज होते हैं। Solutions आपकी स्टैंडर्ड रिपेयर प्रक्रियाओं/फिक्स की लाइब्रेरी है जिसे आप जॉब से जोड़ सकते हैं। Fault Codes और Symptom Codes छोटे, दोबारा इस्तेमाल होने वाले लेबल हैं कि डिवाइस में क्या ख़राबी है और कस्टमर ने क्या बताया — इन्हें लगातार एक जैसे इस्तेमाल करने से ही आपकी Reports और Analytics समय के साथ मतलब की बनती हैं, वरना हर टेक्निशियन एक ही समस्या के लिए अलग-अलग कुछ भी टाइप कर देता है।",
        },
      },
      {
        q: {
          en: "Do I have to pre-create a Brand/Model before I can use it on a workorder?",
          hi: "क्या workorder में इस्तेमाल करने से पहले Brand/Model पहले से बनाना ज़रूरी है?",
        },
        a: {
          en: "No — the workorder intake form lets you type a new Brand/Model directly and it gets added to your saved list automatically. Pre-creating them is only useful if you want to attach BOM parts or Solutions to that Brand/Model ahead of time.",
          hi: "नहीं — workorder इनटेक फॉर्म में आप नया Brand/Model सीधे टाइप कर सकते हैं और वह अपने आप आपकी सेव लिस्ट में जुड़ जाता है। पहले से बनाना तभी काम आता है जब आप उस Brand/Model से पहले ही BOM पार्ट्स या Solutions जोड़ना चाहें।",
        },
      },
    ],
  },
  {
    title: "Customers",
    items: [
      {
        q: {
          en: "Do I need to create a Customer record before starting a workorder?",
          hi: "क्या workorder शुरू करने से पहले Customer रिकॉर्ड बनाना ज़रूरी है?",
        },
        a: {
          en: "No — the workorder intake form captures the customer's name, phone, and address inline, and a returning customer's details autofill from workorder history. The standalone Customers list is for browsing/searching everyone who's ever brought in a device and their full job history, not a gate you must pass through first.",
          hi: "नहीं — workorder इनटेक फॉर्म में ही कस्टमर का नाम, फ़ोन, और पता भर लिया जाता है, और पुराने कस्टमर की डिटेल्स workorder history से अपने आप भर जाती हैं। अलग Customers लिस्ट सिर्फ़ उन सभी को ब्राउज़/खोजने के लिए है जो कभी डिवाइस लेकर आए हैं और उनकी पूरी जॉब हिस्ट्री देखने के लिए, यह कोई पहले पार करने वाला चरण नहीं है।",
        },
      },
    ],
  },
  {
    title: "Billing & Invoices",
    items: [
      {
        q: {
          en: "What's the difference between an Estimate, an Invoice, and a Credit/Debit Note?",
          hi: "Estimate, Invoice, और Credit/Debit Note में क्या फ़र्क़ है?",
        },
        a: {
          en: "An Estimate is a pre-work price quote, not a billing document. An Invoice is the actual tax document raised once work is done (from Service Centre, generated on Close, or created directly from the Billing module for non-repair sales). A Credit Note reduces what a customer owes (a refund/correction); a Debit Note increases it (an additional charge after the fact).",
          hi: "Estimate काम शुरू होने से पहले का रेट कोटेशन है, यह बिलिंग डॉक्यूमेंट नहीं है। Invoice असली टैक्स डॉक्यूमेंट है जो काम पूरा होने पर बनता है (Service Centre से Close पर, या गैर-रिपेयर बिक्री के लिए सीधे Billing मॉड्यूल से)। Credit Note कस्टमर की देनदारी घटाता है (रिफंड/सुधार); Debit Note उसे बढ़ाता है (बाद में अतिरिक्त चार्ज)।",
        },
      },
      {
        q: {
          en: "Why does an invoice show CGST+SGST on one job and IGST on another?",
          hi: "एक जॉब पर इनवॉइस में CGST+SGST और दूसरे पर IGST क्यों दिखता है?",
        },
        a: {
          en: "It's based on place of supply: if the customer's state matches your own business state (set in Settings), the invoice splits GST into CGST+SGST at half the rate each. If the customer is in a different state, the whole rate is charged as IGST instead. This is computed automatically from your Settings state and the customer's state on the record.",
          hi: "यह place of supply पर निर्भर करता है: अगर कस्टमर का राज्य आपके बिज़नेस के राज्य (Settings में सेट) से मिलता है, तो इनवॉइस GST को CGST+SGST में आधे-आधे रेट पर बाँट देता है। अगर कस्टमर किसी दूसरे राज्य में है, तो पूरा रेट IGST के रूप में लगता है। यह आपकी Settings में सेट राज्य और रिकॉर्ड पर कस्टमर के राज्य से अपने आप गिना जाता है।",
        },
      },
      {
        q: {
          en: "Why did an invoice print as a plain 'BILL' instead of a 'TAX INVOICE'?",
          hi: "इनवॉइस 'TAX INVOICE' की जगह सादा 'BILL' बनकर क्यों प्रिंट हुआ?",
        },
        a: {
          en: "Any invoice that carries zero tax (e.g. a fully warranty/no-charge job) prints as a plain Bill rather than a Tax Invoice — labelling a zero-tax document as a tax invoice would be inaccurate.",
          hi: "जिस भी इनवॉइस पर टैक्स शून्य होता है (जैसे पूरी वारंटी/बिना चार्ज वाली जॉब), वह Tax Invoice की जगह सादा Bill बनकर प्रिंट होता है — शून्य-टैक्स डॉक्यूमेंट को Tax Invoice कहना ग़लत होगा।",
        },
      },
      {
        q: {
          en: "How do I get my logo, bank details, or a UPI QR to show up on invoices?",
          hi: "इनवॉइस पर अपना लोगो, बैंक डिटेल्स, या UPI QR कैसे दिखाऊँ?",
        },
        a: {
          en: "All three come from Settings: upload your logo under Business Profile, bank details under Bank Details, and your UPI VPA under Config. Each only prints when you've actually filled it in — nothing shows a placeholder value.",
          hi: "तीनों Settings से आते हैं: Business Profile के नीचे लोगो अपलोड करें, Bank Details के नीचे बैंक डिटेल्स, और Config के नीचे अपना UPI VPA। हर एक तभी प्रिंट होता है जब आपने उसे वाकई भरा हो — कोई प्लेसहोल्डर वैल्यू नहीं दिखती।",
        },
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        q: {
          en: "What lives under Settings?",
          hi: "Settings के नीचे क्या-क्या है?",
        },
        a: {
          en: "Business Profile (name/address/GSTIN/logo/timezone/currency), Bank Details (for invoices), Config (default labour charge, UPI VPA, Terms & Conditions text), and Numbering (how each document type's number/prefix is generated). If you have the Service Centre module, there's also a read-only summary tab linking back to your Service Centre-specific setup and Telegram connection status.",
          hi: "Business Profile (नाम/पता/GSTIN/लोगो/टाइमज़ोन/करेंसी), Bank Details (इनवॉइस के लिए), Config (डिफ़ॉल्ट लेबर चार्ज, UPI VPA, Terms & Conditions टेक्स्ट), और Numbering (हर डॉक्यूमेंट टाइप का नंबर/प्रीफ़िक्स कैसे बनता है)। अगर आपके पास Service Centre मॉड्यूल है, तो एक read-only सारांश टैब भी है जो आपके Service Centre सेटअप और Telegram कनेक्शन स्टेटस से जुड़ता है।",
        },
      },
      {
        q: {
          en: "Can I customize the numbering format for invoices vs job cards?",
          hi: "क्या मैं invoices और job cards के लिए अलग नंबरिंग फ़ॉर्मैट सेट कर सकता हूँ?",
        },
        a: {
          en: "Yes — Settings > Numbering lets you override the prefix, starting number, and format per document type (e.g. INV- for B2B invoices, BILL- for B2C, JC- for job cards) instead of using the platform-wide default scheme.",
          hi: "हाँ — Settings > Numbering में आप हर डॉक्यूमेंट टाइप के लिए प्रीफ़िक्स, शुरुआती नंबर, और फ़ॉर्मैट (जैसे B2B इनवॉइस के लिए INV-, B2C के लिए BILL-, job cards के लिए JC-) प्लेटफ़ॉर्म की डिफ़ॉल्ट स्कीम की जगह सेट कर सकते हैं।",
        },
      },
    ],
  },
  {
    title: "Telegram Alerts",
    items: [
      {
        q: {
          en: "What do Telegram Alerts actually do?",
          hi: "Telegram Alerts असल में क्या करते हैं?",
        },
        a: {
          en: "Once you link your Telegram chat (Service Centre > Telegram, generate a code and open it in Telegram), this app can push notifications there — new workorders, status changes, and other events relevant to your business — without needing a dedicated mobile app.",
          hi: "एक बार आपका Telegram चैट लिंक हो जाए (Service Centre > Telegram, कोड जनरेट करें और उसे Telegram में खोलें), तो यह ऐप वहाँ नोटिफिकेशन भेज सकता है — नए workorders, स्टेटस बदलाव, और आपके बिज़नेस से जुड़ी दूसरी घटनाएँ — बिना किसी अलग मोबाइल ऐप के।",
        },
      },
    ],
  },
];

export default function HelpPage({ params }: { params: { partnerId: string } }) {
  void params;
  const telegramBotUsername = env.telegramBotUsername();
  const telegramChatLink = telegramBotUsername ? `https://t.me/${telegramBotUsername}` : null;
  const whatsappNumber = env.platformSupportWhatsappNumber();
  const whatsappChatLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        "Hi, I have a question about my My Biz Flow account."
      )}`
    : null;

  return (
    <AppShell topbarTitle="Help & Tutorials">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Help &amp; Tutorials</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Written guides covering how each part of My Biz Flow actually works. Click a question to
          expand its answer.
        </p>

        {(telegramChatLink || whatsappChatLink) && (
          <div className="mt-4 rounded-lg border border-border bg-bg-raised p-4">
            <h2 className="font-display text-sm font-bold text-text">Still stuck? Chat with us</h2>
            <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
              Prefer talking to a person? Reach My Biz Flow support directly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {telegramChatLink && (
                <a href={telegramChatLink} target="_blank" rel="noopener noreferrer" className="btn-accent">
                  Chat with us on Telegram
                </a>
              )}
              {whatsappChatLink && (
                <a href={whatsappChatLink} target="_blank" rel="noopener noreferrer" className="btn-outline">
                  Chat with us on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        <HelpAccordion sections={HELP_SECTIONS} />
      </div>
    </AppShell>
  );
}
