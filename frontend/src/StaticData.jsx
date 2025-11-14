
import { pdfjs } from "react-pdf";

const jurisdictions = [
  "European Patent Office (EPO)",
  "US Patent & Trademark Office (USPTO)",
  "Japan Patent Office (JPO)",
  "Korean Intellectual Property Office (KIPO)",
  "Chinese National Intellectual Property Administration (CNIPA)",
];

const jurisdictionPrompts = new Map([
  [
    "Chinese National Intellectual Property Administration (CNIPA)",
    "You are an expert Chinese patent translator with extensive experience in CNIPA filing procedures. Your task is to translate a foreign language patent specification into Chinese for filing with the China National Intellectual Property Administration (CNIPA, [translate:中国国家知识产权局]). Your translation must be technically precise, legally sound, and adhere strictly to Chinese patent practice and the conventions of the Chinese Patent Law ([translate:专利法]).",
  ],
  [
    "Korean Intellectual Property Office (KIPO)",
    "You are an expert Korean patent translator (변리사 or patent translator with extensive KIPO experience). Your task is to translate a foreign language patent specification into Korean for filing with the Korean Intellectual Property Office (KIPO). Your translation must be technically precise, legally sound, and adhere strictly to Korean patent practice and conventions.",
  ],
  [
    "Japan Patent Office (JPO)",
    "You are an expert Japanese patent translator (弁理士 or patent translator with extensive JPO experience). Your task is to translate a foreign language patent specification into Japanese for filing with the Japan Patent Office (JPO). Your translation must be technically precise, legally sound, and adhere strictly to Japanese patent practice and conventions.",
  ],
  [
    "US Patent & Trademark Office (USPTO)",
    "You are an expert US patent translator with extensive experience in USPTO filing procedures. Your task is to translate a patent specification into English for filing with the United States Patent and Trademark Office (USPTO). Your translation must be technically precise, legally sound, and adhere strictly to US patent practice and conventions.",
  ],
  [
    "European Patent Office (EPO)",
    "You are an expert European patent translator with extensive experience in EPO filing procedures. Your task is to translate a patent specification into English, French, or German for filing with the European Patent Office (EPO). Your translation must be technically precise, legally sound, and adhere strictly to the conventions of European patent practice under the European Patent Convention (EPC). Produce a filing-ready European patent specification that is a faithful and literal translation of the source text, preserving the exact scope of the invention, particularly in the claims. When translating repeated instances of a word in the source text, the same instance of the translated word should be used unless there is a compelling reason not to, in order to maintain consistent terminology.",
  ],
]);

const legendData = [
  {
    id: 'red',
    color: '#FF0000',
    label: 'Incorrect Context',
    description: 'Terms translated but wrong context (e.g. "Data" instead of "Fecha" for date)'
  },
  {
    id: 'pink',
    color: '#EC4899',
    label: 'Incorrect Translation',
    description: 'Mistranslations, non-existent words (e.g. "Partenero" instead of "Socio")'
  },
  {
    id: 'yellow',
    color: '#EAB308',
    label: 'Citation Issues',
    description: 'Corrupted Citations (e.g. "Cit0a0d44743" instead of "$[insert amount]")'
  },
  {
    id: 'bright_green',
    color: '#006400',
    label: 'Inline Correct',
    description: 'Special characters/numbers correctly preserved'
  },
  {
    id: 'turquoise',
    color: '#14B8A6',
    label: 'Font/Size Changes',
    description: 'Inappropriate font or formatting changes'
  },
  {
    id: 'dark_red',
    color: '#991B1B',
    label: 'Corrupted Text',
    description: 'Garbled text, missing spaces (e.g. "negocio.Como")'
  },
  {
    id: 'orange',
    color: '#F97316',
    label: 'Non-Translated',
    description: 'English text not translated to target language'
  }
];

const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  enableXfa: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  useOnlyCssZoom: true,
  textLayerMode: 2,
  annotationMode: 2,
  verbosity: 1,
};

const fileTypeOptions = {
  Translation: [],
  File_Converter: [
    { value: "pdf", label: "PDF", icon: "📄" },
    { value: "docx", label: "Word (DOCX)", icon: "📝" },
  ],
  Timesheet: [],
  Matters: [],
  Entries: [],
};

export {jurisdictions, jurisdictionPrompts, legendData, pdfOptions, fileTypeOptions}