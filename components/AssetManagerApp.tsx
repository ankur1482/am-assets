"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  Home,
  KeyRound,
  LogOut,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UploadCloud,
  UserX,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_TYPES, MODULES, RELATIONS } from "@/lib/modules";
import {
  computeRecord,
  computeTotals,
  fixedIncomeMaturityDate,
  fixedIncomeMaturityValue,
  fmt,
  fmtInr,
  num,
  pct,
} from "@/lib/calculations";
import {
  mapImportedRow,
  parseDelimited,
  readRowsFromFile,
} from "@/lib/imports";

type Account = {
  id: string;
  user_id: string;
  name: string;
  relation: string;
  type: string;
  institution: string;
  notes: string;
};
type Rec = {
  id: string;
  user_id: string;
  module_key: string;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};
type Profile = {
  id: string;
  email: string;
  full_name: string;
  city: string;
  phone: string;
};
type Role = "admin" | "normal";
type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  city: string;
  phone: string;
  role: Role;
  created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  banned_until?: string;
  accounts_count: number;
  records_count: number;
  module_counts: Record<string, number>;
};
type AssetDoc = {
  id: string;
  user_id: string;
  record_id: string;
  module_key: string;
  file_name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  notes?: string;
  created_at?: string;
};
type PendingDoc = {
  file_name: string;
  file_path: string;
  mime_type?: string;
  file_size?: number;
  notes?: string;
};
type AiPortfolioReview = {
  headline: string;
  summary: string;
  answer: string;
  health_score: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
  strengths: string[];
  risks: string[];
  actions: string[];
  data_gaps: string[];
  disclaimer: string;
};
type AiReviewMeta = {
  model: string;
  generatedAt: string;
};
const views = [
  ["dashboard", "DB", "Dashboard"],
  ["accounts", "AC", "Accounts"],
  ["stocks", "ST", "Stocks"],
  ["mutualFunds", "MF", "Mutual Funds"],
  ["ulips", "UL", "ULIPs"],
  ["bullion", "GLD", "Gold/Silver"],
  ["nsel", "NS", "NSEL e-Series"],
  ["fixedIncome", "FI", "Fixed Income"],
  ["insurance", "IN", "Insurance"],
  ["property", "PR", "Property"],
  ["otherAssets", "OA", "Other Assets"],
  ["loans", "LN", "Loans"],
  ["borrowings", "BR", "Borrowings"],
  ["goals", "GO", "Goals"],
  ["recommendations", "AI", "Recommendations"],
  ["alerts", "AL", "Alerts"],
  ["documents", "DOC", "Documents"],
  ["shareList", "WL+", "Add Share List"],
  ["insights", "INS", "Insights"],
  ["settings", "SET", "Settings"],
];
const groups = [
  ["Core", ["dashboard", "accounts"]],
  [
    "Investments",
    [
      "stocks",
      "mutualFunds",
      "ulips",
      "bullion",
      "nsel",
      "fixedIncome",
      "insurance",
      "property",
      "otherAssets",
    ],
  ],
  ["Liabilities", ["loans", "borrowings"]],
  ["Planning", ["goals", "recommendations", "insights"]],
  ["Utility", ["documents", "shareList", "alerts", "settings"]],
  ["Admin", ["admin"]],
];
const allViews = [...views, ["admin", "Admin", "Admin Console"]];
const STOCKS = [
  ["Reliance Industries", "RELIANCE", "NSE", "Energy"],
  ["Tata Consultancy Services", "TCS", "NSE", "IT"],
  ["ICICI Bank", "ICICIBANK", "NSE", "Bank"],
  ["Infosys", "INFY", "NSE", "IT"],
  ["Bharti Airtel", "BHARTIARTL", "NSE", "Telecom"],
  ["Larsen & Toubro", "LT", "NSE", "Infrastructure"],
  ["ITC", "ITC", "NSE", "FMCG"],
  ["State Bank of India", "SBIN", "NSE", "Bank"],
  ["Axis Bank", "AXISBANK", "NSE", "Bank"],
  ["Tata Motors", "TATAMOTORS", "NSE", "Auto"],
  ["Tata Steel", "TATASTEEL", "NSE", "Metals"],
  ["UltraTech Cement", "ULTRACEMCO", "NSE", "Cement"],
  ["Sun Pharmaceutical", "SUNPHARMA", "NSE", "Pharma"],
  ["Titan Company", "TITAN", "NSE", "Consumer"],
  ["Zomato", "ZOMATO", "NSE", "Consumer Internet"],
  ["Adani Enterprises", "ADANIENT", "NSE", "Conglomerate"],
  ["Adani Ports and SEZ", "ADANIPORTS", "NSE", "Infrastructure"],
  ["Apollo Hospitals", "APOLLOHOSP", "NSE", "Healthcare"],
  ["Asian Paints", "ASIANPAINT", "NSE", "Paints"],
  ["Bajaj Auto", "BAJAJ-AUTO", "NSE", "Auto"],
  ["Bajaj Finance", "BAJFINANCE", "NSE", "Financial Services"],
  ["Bajaj Finserv", "BAJAJFINSV", "NSE", "Financial Services"],
  ["Bharat Electronics", "BEL", "NSE", "Defence"],
  ["Bharat Petroleum", "BPCL", "NSE", "Oil & Gas"],
  ["Cipla", "CIPLA", "NSE", "Pharma"],
  ["Coal India", "COALINDIA", "NSE", "Mining"],
  ["Dr Reddy Laboratories", "DRREDDY", "NSE", "Pharma"],
  ["Eicher Motors", "EICHERMOT", "NSE", "Auto"],
  ["Eternal", "ETERNAL", "NSE", "Consumer Internet"],
  ["Grasim Industries", "GRASIM", "NSE", "Cement"],
  ["HCL Technologies", "HCLTECH", "NSE", "IT"],
  ["Hero MotoCorp", "HEROMOTOCO", "NSE", "Auto"],
  ["Hindalco Industries", "HINDALCO", "NSE", "Metals"],
  ["Hindustan Unilever", "HINDUNILVR", "NSE", "FMCG"],
  ["Jio Financial Services", "JIOFIN", "NSE", "Financial Services"],
  ["JSW Steel", "JSWSTEEL", "NSE", "Metals"],
  ["Mahindra & Mahindra", "M&M", "NSE", "Auto"],
  ["Maruti Suzuki", "MARUTI", "NSE", "Auto"],
  ["Nestle India", "NESTLEIND", "NSE", "FMCG"],
  ["NTPC", "NTPC", "NSE", "Power"],
  ["Oil and Natural Gas Corporation", "ONGC", "NSE", "Oil & Gas"],
  ["Power Grid Corporation", "POWERGRID", "NSE", "Power"],
  ["SBI Life Insurance", "SBILIFE", "NSE", "Insurance"],
  ["Shriram Finance", "SHRIRAMFIN", "NSE", "Financial Services"],
  ["Tech Mahindra", "TECHM", "NSE", "IT"],
  ["Trent", "TRENT", "NSE", "Retail"],
  ["Wipro", "WIPRO", "NSE", "IT"],
].map(([name, ticker, exchange, category]) => ({
  name,
  ticker,
  exchange,
  category,
}));
const key = (v: string) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const findStock = (v: string) => {
  const k = key(v);
  return (
    ALL_STOCKS.find((s) => key(s.name) === k || key(s.ticker) === k) ||
    ALL_STOCKS.find(
      (s) => key(s.name).includes(k) || key(s.ticker).includes(k),
    ) ||
    null
  );
};
const stockMatches = (v: string) => {
  const k = key(v);
  if (k.length < 2) return [];
  return ALL_STOCKS.map((s) => ({
    s,
    score: key(s.ticker).startsWith(k)
      ? 0
      : key(s.name).startsWith(k)
        ? 1
        : key(s.ticker).includes(k)
          ? 2
          : key(s.name).includes(k)
            ? 3
            : 9,
  }))
    .filter((x) => x.score < 9)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.s.exchange.localeCompare(b.s.exchange) ||
        a.s.name.localeCompare(b.s.name),
    )
    .slice(0, 10)
    .map((x) => x.s);
};
const BSE_STOCKS = [
  ["Reliance Industries", "500325", "BSE", "Energy"],
  ["Tata Consultancy Services", "532540", "BSE", "IT"],
  ["ICICI Bank", "532174", "BSE", "Bank"],
  ["Infosys", "500209", "BSE", "IT"],
  ["Bharti Airtel", "532454", "BSE", "Telecom"],
  ["Larsen & Toubro", "500510", "BSE", "Infrastructure"],
  ["ITC", "500875", "BSE", "FMCG"],
  ["State Bank of India", "500112", "BSE", "Bank"],
  ["Axis Bank", "532215", "BSE", "Bank"],
  ["Tata Motors", "500570", "BSE", "Auto"],
  ["Tata Steel", "500470", "BSE", "Metals"],
  ["UltraTech Cement", "532538", "BSE", "Cement"],
  ["Sun Pharmaceutical", "524715", "BSE", "Pharma"],
  ["Titan Company", "500114", "BSE", "Consumer"],
  ["Asian Paints", "500820", "BSE", "Paints"],
  ["Bajaj Finance", "500034", "BSE", "Financial Services"],
  ["Hindustan Unilever", "500696", "BSE", "FMCG"],
  ["Mahindra & Mahindra", "500520", "BSE", "Auto"],
  ["Maruti Suzuki", "532500", "BSE", "Auto"],
  ["Wipro", "507685", "BSE", "IT"],
  ["HCL Technologies", "532281", "BSE", "IT"],
  ["Tech Mahindra", "532755", "BSE", "IT"],
  ["NTPC", "532555", "BSE", "Power"],
  ["Power Grid Corporation", "532898", "BSE", "Power"],
  ["Oil and Natural Gas Corporation", "500312", "BSE", "Oil & Gas"],
  ["Coal India", "533278", "BSE", "Mining"],
  ["Cipla", "500087", "BSE", "Pharma"],
  ["Dr Reddy Laboratories", "500124", "BSE", "Pharma"],
  ["Nestle India", "500790", "BSE", "FMCG"],
  ["Adani Enterprises", "512599", "BSE", "Conglomerate"],
  ["Adani Ports and SEZ", "532921", "BSE", "Infrastructure"],
  ["Bharat Petroleum", "500547", "BSE", "Oil & Gas"],
  ["Eicher Motors", "505200", "BSE", "Auto"],
  ["Grasim Industries", "500300", "BSE", "Cement"],
  ["Hindalco Industries", "500440", "BSE", "Metals"],
  ["JSW Steel", "500228", "BSE", "Metals"],
  ["Bharat Electronics", "500049", "BSE", "Defence"],
].map(([name, ticker, exchange, category]) => ({
  name,
  ticker,
  exchange,
  category,
}));
const ALL_STOCKS = [...STOCKS, ...BSE_STOCKS];
function moneycontrolHref(stock: any) {
  const params = new URLSearchParams({
    symbol: String(stock?.ticker_symbol || stock?.ticker || ""),
    name: String(stock?.security_name || stock?.name || ""),
  });
  return `/api/moneycontrol-detail?${params}`;
}
function bullionDisplayName(metal: any) {
  const rawName = String(
    metal?.security_name || metal?.category || metal?.name || "",
  ).trim();
  const name = rawName.replace(/\s*[-/]\s*mcx\s*$/i, "").trim();
  if (/silver/i.test(name)) return "Silver";
  if (/gold/i.test(name)) return "Gold";
  return !name || /^bullion$/i.test(name) ? "Gold" : name;
}
function moneycontrolCommodityHref(metal: any) {
  const asset = bullionDisplayName(metal);
  return `/api/moneycontrol-commodity?asset=${encodeURIComponent(asset)}`;
}
const SHARE_LIST_ALIASES: Record<string, { name: string; ticker: string; exchange: string; category: string }> = {
  divislabs: { name: "Divi's Laboratories", ticker: "DIVISLAB", exchange: "NSE", category: "Pharma" },
  dixontechnology: { name: "Dixon Technologies (India)", ticker: "DIXON", exchange: "NSE", category: "Consumer Electronics" },
  drreddyslabs: { name: "Dr. Reddy's Laboratories", ticker: "DRREDDY", exchange: "NSE", category: "Pharma" },
  hull: { name: "Hindustan Unilever", ticker: "HINDUNILVR", exchange: "NSE", category: "FMCG" },
  iciciprudentia: { name: "ICICI Prudential Life Insurance", ticker: "ICICIPRULI", exchange: "NSE", category: "Insurance" },
  interglobeavi: { name: "InterGlobe Aviation", ticker: "INDIGO", exchange: "NSE", category: "Aviation" },
  ltm: { name: "LTM", ticker: "LTM", exchange: "NSE", category: "IT" },
  ncc: { name: "NCC", ticker: "NCC", exchange: "NSE", category: "Construction" },
  one97paytm: { name: "One97 Communications", ticker: "PAYTM", exchange: "NSE", category: "Financial Services" },
  sterlingwilson: { name: "Sterling and Wilson Renewable Energy", ticker: "SWSOLAR", exchange: "NSE", category: "Renewable Energy" },
  tatamotorscom: { name: "Tata Motors Commercial Vehicles", ticker: "TMCV", exchange: "NSE", category: "Auto" },
  tmpv: { name: "Tata Motors Passenger Vehicles", ticker: "TMPV", exchange: "NSE", category: "Auto" },
};
const pretty = (v: string) =>
  v.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const DAILY_CHANGE_MODULES = new Set(["stocks", "mutualFunds", "bullion"]);
const showsDailyChange = (moduleKey: string) =>
  DAILY_CHANGE_MODULES.has(moduleKey);
const compactName = (value: any) => {
  const name = String(value || "").trim();
  if (!name) return "";
  const cleaned = name
    .replace(/\b(limited|ltd|private|pvt|industries|company)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || name;
};
const FIXED_INCOME_LABELS: Record<string, string> = {
  employee_contribution: "Employee Monthly",
  company_contribution: "Employer Monthly",
  broker: "Institution",
  purchase_date: "Start Date",
  interest_rate: "Int. Rate",
  current_value_today: "Value Before FY",
  interest_incurred_fy: "FY Interest",
  latest: "Current Worth",
  year_end_maturity_value: "Year-End Value",
  maturity_value: "Maturity Value",
  maturity_date: "Maturity Date",
};
const fixedIncomeColWidth = (col: string) =>
  col === "account_name"
    ? "92px"
    : col === "category"
      ? "86px"
      : ["employee_contribution", "company_contribution"].includes(col)
        ? "104px"
        : col === "broker"
          ? "104px"
          : col === "purchase_date"
            ? "86px"
            : col === "interest_rate"
              ? "72px"
              : col === "current_value_today"
                ? "118px"
                : col === "interest_incurred_fy"
                  ? "104px"
                  : col === "latest"
                    ? "116px"
                    : col === "year_end_maturity_value"
                      ? "116px"
                      : col === "maturity_value"
                        ? "116px"
                        : col === "maturity_date"
                          ? "96px"
                          : "96px";
const fieldLabel = (moduleKey: string, field: string) =>
  moduleKey === "property" && field === "broker"
    ? "Community"
    : moduleKey === "fixedIncome" && FIXED_INCOME_LABELS[field]
      ? FIXED_INCOME_LABELS[field]
    : moduleKey === "fixedIncome" && field === "broker"
      ? "Institution"
    : moduleKey === "fixedIncome" && field === "purchase_date"
      ? "Start Date"
    : moduleKey === "fixedIncome" && field === "interest_rate"
      ? "Int. Rate"
    : moduleKey === "stocks" && field === "inv_price"
      ? "Purchase Price"
    : moduleKey === "stocks" && field === "live_price"
      ? "Current Price"
    : moduleKey === "stocks" && field === "day_change"
      ? "Increase"
    : moduleKey === "stocks" && field === "day_high"
      ? "Day High"
    : moduleKey === "stocks" && field === "day_low"
      ? "Day Low"
    : moduleKey === "stocks" && field === "fifty_two_week_high"
      ? "52 Week High"
    : moduleKey === "stocks" && field === "fifty_two_week_low"
      ? "52 Week Low"
    : moduleKey === "insurance" && field === "lic_bonus"
      ? "Bonus Accrued Till Date"
    : moduleKey === "insurance" && field === "yearly_bonus"
      ? "Yearly Bonus (6% of Sum Assured)"
    : moduleKey === "insurance" && field === "premiums_paid_to_date"
      ? "Annual Premiums Paid Till Date"
    : moduleKey === "insurance" && field === "policy_years_paid"
      ? "Premium Years Paid"
    : moduleKey === "insurance" && field === "latest"
        ? "Dashboard Current Value"
      : moduleKey === "insurance" && field === "death_cover_value"
        ? "Sum Assured on Death After Closure"
    : moduleKey === "fixedIncome" && field === "interest_incurred_fy"
      ? "Interest Incurred This FY"
      : moduleKey === "fixedIncome" && field === "current_value_today"
        ? "Value Before FY Interest"
      : moduleKey === "fixedIncome" && field === "employee_contribution"
        ? "Monthly Contribution by Employee"
      : moduleKey === "fixedIncome" && field === "company_contribution"
        ? "Monthly Contribution by Employer"
      : moduleKey === "fixedIncome" && field === "latest"
        ? "Current Worth Till Date"
        : pretty(field);
const moneyCols = [
  "invested",
  "latest",
  "gain",
  "today_gain",
  "day_change",
  "previous_close",
  "best_bid",
  "best_ask",
  "bid_ask_spread",
  "base_price",
  "balance",
  "loan_amount",
  "loan_balance",
  "principal_paid",
  "interest_paid",
  "premium_amount",
  "purchase_price",
  "latest_value",
  "investment_amount",
  "initial_investment",
  "yearly_investment",
  "employee_contribution",
  "company_contribution",
  "gratuity_value",
  "maturity_value",
  "year_end_maturity_value",
  "current_value_today",
  "interest_incurred_fy",
  "worth_till_date",
  "sum_assured",
  "payout_value",
  "current_value_including_bonus",
  "lic_bonus",
  "yearly_bonus",
  "premiums_paid_to_date",
  "death_cover_value",
  "annual_premium",
  "current_value",
  "target_amount",
  "gap",
  "monthly_required",
  "amount",
  "target_price",
  "current_price",
  "emiFuture",
  "monthly_emi",
];
const priceCols = new Set([
  "live_price",
  "current_price",
  "day_high",
  "day_low",
  "fifty_two_week_high",
  "fifty_two_week_low",
]);
const fmtPrice = (v: any) => "\u20b9" + fmtInr(v, 2);
const fmtSignedPrice = (v: any) =>
  `${num(v) > 0 ? "+" : ""}${fmtPrice(v)}`;
function assignStockQuoteFields(data: any, quote: any, priceField = "live_price") {
  if (Number.isFinite(Number(quote.price)))
    data[priceField] = Number(quote.price).toFixed(2);
  if (Number.isFinite(Number(quote.previousClose)))
    data.previous_close = Number(quote.previousClose).toFixed(2);
  if (Number.isFinite(Number(quote.change)))
    data.day_change = Number(quote.change).toFixed(2);
  if (Number.isFinite(Number(quote.dayHigh)))
    data.day_high = Number(quote.dayHigh).toFixed(2);
  if (Number.isFinite(Number(quote.dayLow)))
    data.day_low = Number(quote.dayLow).toFixed(2);
  if (Number.isFinite(Number(quote.fiftyTwoWeekHigh)))
    data.fifty_two_week_high = Number(quote.fiftyTwoWeekHigh).toFixed(2);
  if (Number.isFinite(Number(quote.fiftyTwoWeekLow)))
    data.fifty_two_week_low = Number(quote.fiftyTwoWeekLow).toFixed(2);
}
const fixedIncomeCategoryLabel = (value: any) => {
  const category = String(value || "").trim();
  return /^pf$/i.test(category) ? "Company PF" : category;
};
const isCompanyPfType = (value: any) =>
  /^(companypf|pf)$/.test(key(String(value || "")));
const NET_WORTH_SNAPSHOT_MODULE = "netWorthSnapshot";
const LIVE_DISPLAY_REFRESH_MS = 60000;
const SAVED_RATE_REFRESH_MS = 60000;
function csvEscape(v: any) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function download(name: string, body: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);
const localIsoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDaysIso = (date: string, days: number) => {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return isoDate();
  d.setDate(d.getDate() + days);
  return isoDate(d);
};
const addMonthsIso = (date: string, months: number) => {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return isoDate();
  d.setMonth(d.getMonth() + months);
  return isoDate(d);
};
const nextAprilSecondIso = () => {
  const now = new Date(),
    d = new Date(now.getFullYear(), 3, 2);
  if (now > d) d.setFullYear(d.getFullYear() + 1);
  return isoDate(d);
};
const fixedIncomeReviewDue = (r: Rec) =>
  !r.data?.next_value_review_due ||
  new Date(String(r.data.next_value_review_due)) <= new Date(isoDate());
const fixedIncomeMaturityDue = (r: Rec) => {
  if (r.data?.maturity_reminder_resolved) return false;
  const c = computeRecord("fixedIncome", r.data),
    m = String(c.maturity_date || r.data?.maturity_date || "");
  if (!m) return false;
  const today = new Date(isoDate()),
    due = new Date(m);
  if (Number.isNaN(due.getTime()) || due < today) return false;
  const limit = new Date(today);
  limit.setMonth(limit.getMonth() + 3);
  const remind = String(r.data?.next_maturity_reminder_due || "");
  return due <= limit && (!remind || new Date(remind) <= today);
};
const numericFieldNames = new Set(
  moneyCols.concat([
    "interest_rate",
    "lock_in_years",
    "quantity",
    "inv_price",
    "live_price",
    "nav",
    "live_nav",
    "target_price",
    "current_price",
    "loan_interest_rate",
    "loan_tenure_months",
    "tenure_months",
    "emis_left",
    "emiFuture",
  ]),
);
const requiredReferenceDocModules = new Set<string>();
const requiresReferenceDoc = (moduleKey: string) =>
  requiredReferenceDocModules.has(moduleKey);
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-[#e3dccc] bg-[#fffdf8] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e3dccc] p-5">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#e3dccc] bg-white/60 p-10 text-center text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
}
export default function AssetManagerApp() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authMode, setAuthMode] = useState<"signin" | "signup">("signin"),
    [authMsg, setAuthMsg] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false),
    [phoneMode, setPhoneMode] = useState(false),
    [mobileAccountMenu, setMobileAccountMenu] = useState("");
  const [view, setView] = useState(() => {
      if (typeof window === "undefined") return "dashboard";
      const saved = localStorage.getItem("asset-manager-view") || "dashboard";
      return allViews.some((v) => v[0] === saved) ? saved : "dashboard";
    }),
    [query, setQuery] = useState(""),
    [profile, setProfile] = useState<Profile | null>(null),
    [role, setRole] = useState<Role>("normal"),
    [accounts, setAccounts] = useState<Account[]>([]),
    [records, setRecords] = useState<Rec[]>([]),
    [docs, setDocs] = useState<AssetDoc[]>([]),
    [toast, setToast] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]),
    [adminBusy, setAdminBusy] = useState(false),
    [resetLink, setResetLink] = useState(""),
    [autoRefresh, setAutoRefresh] = useState(false),
    [docUploadRecordId, setDocUploadRecordId] = useState(""),
    [docUploadModule, setDocUploadModule] = useState("documents"),
    [docUploadNotes, setDocUploadNotes] = useState(""),
    [docUploading, setDocUploading] = useState(false),
    [googleDriveConnected, setGoogleDriveConnected] = useState(false),
    [bullionMarket, setBullionMarket] = useState<any>(null),
    [marketToday, setMarketToday] = useState<any[]>([]);
  const [aiQuestion, setAiQuestion] = useState(
      "What are the main risks in my current portfolio and what should I review first?",
    ),
    [aiReview, setAiReview] = useState<AiPortfolioReview | null>(null),
    [aiReviewMeta, setAiReviewMeta] = useState<AiReviewMeta | null>(null),
    [aiReviewBusy, setAiReviewBusy] = useState(false),
    [aiReviewError, setAiReviewError] = useState("");
  const [editing, setEditing] = useState<{
      moduleKey: string;
      record?: Rec;
      defaults?: Record<string, any>;
    } | null>(null),
    [detail, setDetail] = useState<{
      moduleKey: string;
      record: Rec;
      computed: Record<string, any>;
      cols: string[];
      linkedProperty?: boolean;
    } | null>(null),
    [accModal, setAccModal] = useState<Account | null | "new">(null),
    [importPreview, setImportPreview] = useState<any[]>([]),
    [pasteTable, setPasteTable] = useState(""),
    [stockSearch, setStockSearch] = useState(""),
    [stockResults, setStockResults] = useState<typeof ALL_STOCKS>([]),
    [stockOpen, setStockOpen] = useState(false),
    [fixedIncomeType, setFixedIncomeType] = useState(""),
    [accountTabs, setAccountTabs] = useState<Record<string, string>>(() => {
      if (typeof window === "undefined") return {};
      try {
        return (
          JSON.parse(
            localStorage.getItem("asset-manager-account-tabs") || "{}",
          ) || {}
        );
      } catch {
        return {};
      }
    }),
    [expandedLots, setExpandedLots] = useState<Record<string, boolean>>(() => {
      if (typeof window === "undefined") return {};
      try {
        return (
          JSON.parse(
            localStorage.getItem("asset-manager-expanded-lots") || "{}",
          ) || {}
        );
      } catch {
        return {};
      }
    }),
    [detailTabs, setDetailTabs] = useState<Record<string, string>>(() => {
      const fallback = {
        dashboard: "summary",
        stocks: "holdings",
        bullion: "holdings",
      };
      if (typeof window === "undefined") return fallback;
      try {
        return {
          ...fallback,
          ...(JSON.parse(
            localStorage.getItem("asset-manager-detail-tabs") || "{}",
          ) || {}),
        };
      } catch {
        return fallback;
      }
    });
  const fileRef = useRef<HTMLInputElement | null>(null),
    docFilesRef = useRef<File[]>([]),
    snapshotRef = useRef(""),
    recordsRef = useRef<Rec[]>([]),
    user = session?.user,
    isAdmin = role === "admin";
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => l.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)"),
      sync = () => setPhoneMode(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);
  useEffect(() => {
    setAiReview(null);
    setAiReviewMeta(null);
    setAiReviewError("");
  }, [user?.id]);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);
  useEffect(() => {
    docFilesRef.current = [];
    setStockSearch(
      ["stocks", "watchlist"].includes(editing?.moduleKey || "")
        ? String(editing.record?.data?.security_name || "")
        : "",
    );
    setFixedIncomeType(
      editing?.moduleKey === "fixedIncome"
        ? fixedIncomeCategoryLabel(editing.record?.data?.category || "")
        : "",
    );
    setStockResults([]);
    setStockOpen(false);
  }, [editing]);
  useEffect(() => {
    if (
      !["stocks", "watchlist"].includes(editing?.moduleKey || "") ||
      key(stockSearch).length < 2
    ) {
      setStockResults([]);
      return;
    }
    const c = new AbortController(),
      t = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/stock-search?q=${encodeURIComponent(stockSearch)}`,
            { signal: c.signal },
          );
          const json = await res.json();
          if (Array.isArray(json.stocks)) setStockResults(json.stocks);
        } catch {}
      }, 180);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [stockSearch, editing?.moduleKey]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (
      !user?.id ||
      !autoRefresh ||
      editing ||
      detail ||
      accModal ||
      !["stocks", "bullion"].includes(view)
    )
      return;
    const t = setInterval(() => refreshModuleRates(view, true), SAVED_RATE_REFRESH_MS);
    return () => clearInterval(t);
  }, [user?.id, view, accountTabs, autoRefresh, editing, detail, accModal]);
  useEffect(() => {
    if (
      !user?.id ||
      !autoRefresh ||
      editing ||
      detail ||
      accModal ||
      !["dashboard", "stocks", "bullion"].includes(view)
    )
      return;
    let cancelled = false,
      busy = false;
    const run = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        if (view === "dashboard") {
          await Promise.all([refreshStockDisplay(true), refreshBullionMarket()]);
        } else if (view === "stocks") {
          await refreshStockDisplay();
        } else {
          await refreshBullionMarket();
        }
      } finally {
        busy = false;
      }
    };
    run();
    const t = setInterval(run, LIVE_DISPLAY_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [
    user?.id,
    view,
    accountTabs,
    autoRefresh,
    editing,
    detail,
    accModal,
  ]);
  useEffect(() => {
    if (!user?.id || !phoneMode || !autoRefresh || editing || detail || accModal) return;
    const t = setInterval(() => {
      refreshMarketToday();
      refreshBullionMarket();
    }, 60000);
    return () => clearInterval(t);
  }, [user?.id, phoneMode, autoRefresh, editing, detail, accModal]);
  useEffect(() => {
    if (
      !user?.id ||
      !phoneMode ||
      !autoRefresh ||
      editing ||
      detail ||
      accModal
    )
      return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refreshStocks(true, true);
      if (cancelled) return;
      await refreshWatchlist(true);
      if (cancelled) return;
      await refreshMetals("bullion", true, true);
    };
    run();
    const t = setInterval(run, SAVED_RATE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user?.id, phoneMode, autoRefresh, editing, detail, accModal]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-expanded-lots",
        JSON.stringify(expandedLots),
      );
    } catch {}
  }, [expandedLots]);
  useEffect(() => {
    try {
      localStorage.setItem("asset-manager-view", view);
    } catch {}
  }, [view]);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-account-tabs",
        JSON.stringify(accountTabs),
      );
    } catch {}
  }, [accountTabs]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-detail-tabs",
        JSON.stringify(detailTabs),
      );
    } catch {}
  }, [detailTabs]);
  useEffect(() => {
    if (view === "admin" && isAdmin) loadAdminUsers();
  }, [view, isAdmin]);
  useEffect(() => {
    if (user?.id) {
      refreshGoogleDriveStatus();
    }
  }, [user?.id]);
  useEffect(() => {
    if (view !== "bullion") return;
    refreshBullionMarket();
  }, [view]);
  useEffect(() => {
    if (view !== "stocks") return;
    refreshMarketToday();
  }, [view]);
  async function emailAuth() {
    setAuthMsg("");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return setAuthMsg("Enter a valid email address.");
    if (password.length < 6)
      return setAuthMsg("Password must be at least 6 characters.");
    const { error } =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: { email: cleanEmail } },
          })
        : await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
    if (error) setAuthMsg(error.message);
    else
      setAuthMsg(
        authMode === "signup"
          ? "Account created. Check your email if confirmation is enabled."
          : "Signed in.",
      );
  }
  async function loadAll(quiet = false) {
    if (!user) return;
    const sx = typeof window !== "undefined" ? window.scrollX : 0,
      sy = typeof window !== "undefined" ? window.scrollY : 0,
      active =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
    if (!quiet) setLoading(true);
    const [p, r, a, rec, doc] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("asset_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (p.data) setProfile(p.data as any);
    if (r.data) setRole((r.data as any).access_role);
    setAccounts((a.data || []) as any);
    setRecords((rec.data || []) as any);
    setDocs((doc.data || []) as any);
    if (!quiet) setLoading(false);
    if (quiet && typeof window !== "undefined")
      requestAnimationFrame(() => {
        window.scrollTo(sx, sy);
        if (active && document.contains(active))
          active.focus?.({ preventScroll: true } as any);
      });
  }
  async function captureDailyNetWorthSnapshot() {
    if (
      !user?.id ||
      loading ||
      snapshotRef.current === isoDate() ||
      (!records.some((r) => MODULES[r.module_key]) &&
        !totals.assets &&
        !totals.liabilities)
    )
      return;
    const today = isoDate(),
      exists = records.some(
        (r) =>
          r.module_key === NET_WORTH_SNAPSHOT_MODULE &&
          r.data?.snapshot_date === today,
      );
    if (exists) {
      snapshotRef.current = today;
      return;
    }
    snapshotRef.current = today;
    const data = withSystemDates({
      snapshot_date: today,
      assets: totals.assets,
      liabilities: totals.liabilities,
      net: totals.net,
      invested: totals.invested,
      gain: totals.gain,
      record_count: records.filter((r) => MODULES[r.module_key]).length,
      notes: "Automatic daily net worth snapshot",
    });
    const { error } = await supabase
      .from("records")
      .insert({
        user_id: user.id,
        module_key: NET_WORTH_SNAPSHOT_MODULE,
        data,
      });
    if (!error) await loadAll(true);
  }
  const totals = useMemo(
    () => computeLiveTotals(records),
    [records, bullionMarket],
  );
  useEffect(() => {
    captureDailyNetWorthSnapshot();
  }, [
    user?.id,
    records.length,
    totals.assets,
    totals.liabilities,
    totals.net,
    totals.invested,
  ]);
  const activeAccounts = useMemo(
    () => [
      ...new Map(
        accounts
          .filter((a) => a.name?.trim())
          .map((a) => [a.name.trim(), { ...a, name: a.name.trim() }]),
      ).values(),
    ],
    [accounts],
  );
  const accountTab = (k: string) => accountTabs[k] || "All";
  const inAccountTab = (k: string, r: Rec) =>
    accountTab(k) === "All" ||
    String(r.data?.account_name || "Unassigned") === accountTab(k);
  function editChallenge(action = "change data") {
    const token = String(Math.floor(1000 + Math.random() * 9000));
    const entered = prompt(
      `Security check: type this 4-digit code to ${action}.\n\n${token}`,
    );
    const ok = entered === token;
    if (!ok) setToast("Edit security check cancelled");
    return ok;
  }
  const requireAdmin = (a: string) => {
    if (isAdmin) return true;
    setToast(`Admin access required for ${a}`);
    return false;
  };
  const code = (a: string) => {
    const c = String(Math.floor(10000000 + Math.random() * 90000000));
    return prompt(`${a}\n\nType this 8-digit code:\n\n${c}`) === c;
  };
  function openModuleAll(k: string) {
    setAccountTabs((prev) => ({ ...prev, [k]: "All" }));
    setDetailTabs((prev) => ({ ...prev, [k]: "holdings" }));
    setView(k);
  }
  async function ensureAccount(name: string) {
    if (!user || !name?.trim() || accounts.some((a) => a.name === name.trim()))
      return;
    await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        relation: "Other",
        type: "Imported",
        institution: "",
        notes: "Auto-created",
      });
  }
  function fillStockTotals(form: HTMLFormElement | null) {
    if (!form) return;
    const get = (n: string) =>
        num((form.querySelector(`[name="${n}"]`) as HTMLInputElement)?.value),
      set = (n: string, v: number) => {
        const el = form.querySelector<HTMLInputElement>(`[name="${n}"]`);
        if (el) el.value = v ? String(v.toFixed(2)) : "";
      };
    const qty = get("quantity"),
      buy = get("inv_price"),
      price = get("live_price");
    set("investment_amount", qty && buy ? qty * buy : 0);
    set("latest_value", qty && price ? qty * price : 0);
  }
  function withSystemDates(data: any, existing?: Rec) {
    const now = new Date(),
      uploadedAt =
        existing?.data?.data_uploaded_at ||
        existing?.created_at ||
        now.toISOString(),
      uploadedDate =
        existing?.data?.data_uploaded_date ||
        String(uploadedAt).slice(0, 10) ||
        isoDate(now);
    return {
      ...data,
      data_uploaded_date: uploadedDate,
      data_uploaded_at: uploadedAt,
      last_updated_date: isoDate(now),
      last_updated_at: now.toISOString(),
    };
  }
  function computedData(moduleKey: string, data: any) {
    if (moduleKey === "fixedIncome") {
      const accrualData = {
          ...data,
          broker: isCompanyPfType(data.category) ? "Govt" : data.broker,
          fy_interest_basis: "value_before_fy_interest",
        },
        reviewed = isoDate(),
        maturity = fixedIncomeMaturityValue(accrualData),
        isAnnualReview = /ppf|sukanya/i.test(String(data.category || "")),
        companyPf = isCompanyPfType(accrualData.category);
      return {
        ...accrualData,
        maturity_date: companyPf
          ? ""
          : fixedIncomeMaturityDate(accrualData) || data.maturity_date,
        maturity_value: companyPf
          ? ""
          : maturity
            ? maturity.toFixed(2)
            : data.maturity_value,
        last_value_reviewed: reviewed,
        next_value_review_due: isAnnualReview
          ? nextAprilSecondIso()
          : addMonthsIso(reviewed, 3),
      };
    }
    if (!["stocks", "watchlist"].includes(moduleKey)) return data;
    const qty = num(data.quantity) || 1,
      buy = num(data.inv_price || data.base_price),
      price = num(data.live_price || data.current_price);
    return {
      ...data,
      current_price:
        moduleKey === "watchlist" && price
          ? price.toFixed(2)
          : data.current_price,
      investment_amount:
        qty && buy ? (qty * buy).toFixed(2) : data.investment_amount,
      latest_value: qty && price ? (qty * price).toFixed(2) : data.latest_value,
    };
  }
  async function captureWatchlistBasePrice(data: any, record?: Rec) {
    if (record?.data?.base_price) {
      return {
        ...data,
        base_price: record.data.base_price,
        base_price_date: record.data.base_price_date || data.base_price_date,
        base_price_captured_at:
          record.data.base_price_captured_at || data.base_price_captured_at,
        inv_price:
          data.inv_price || record.data.inv_price || record.data.base_price,
      };
    }
    const d = { ...data };
    let price = num(d.current_price || d.live_price);
    if (!price && d.ticker_symbol) {
      try {
          const res = await fetch(
            `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}`,
          ),
          q = await res.json();
        if (res.ok && Number.isFinite(Number(q.price))) {
          price = Number(q.price);
          assignStockQuoteFields(d, q, "current_price");
          d.live_price = d.current_price;
          d.last_synced = new Date().toLocaleString();
        }
      } catch {}
    }
    if (price) {
      d.base_price = price.toFixed(2);
      d.base_price_date ||= localIsoDate();
      d.base_price_captured_at = new Date().toISOString();
      if (!num(d.inv_price)) d.inv_price = d.base_price;
      if (!num(d.quantity)) d.quantity = 1;
    }
    return d;
  }
  function driveFolderParts(moduleKey: string, data: any = {}) {
    const section = [
        "stocks",
        "mutualFunds",
        "ulips",
        "bullion",
        "nsel",
        "fixedIncome",
        "insurance",
        "property",
        "otherAssets",
      ].includes(moduleKey)
        ? "Investments"
        : ["loans", "borrowings"].includes(moduleKey)
          ? "Liabilities"
          : ["goals"].includes(moduleKey)
            ? "Planning"
            : "Documents",
      moduleName = MODULES[moduleKey]?.title || moduleKey || "Documents",
      broker = String(
        data.broker || data.account_name || data.category || "Unassigned",
      ).trim(),
      asset = String(
        data.security_name ||
          data.location ||
          data.policy_name ||
          data.category ||
          data.name ||
          "General",
      ).trim();
    return [section, moduleName, broker, asset].filter(Boolean);
  }
  async function refreshGoogleDriveStatus() {
    try {
      const res = await fetch("/api/google-drive/status");
      const json = await res.json();
      setGoogleDriveConnected(!!json.connected);
    } catch {
      setGoogleDriveConnected(false);
    }
  }
  async function refreshBullionMarket() {
    try {
      const [goldRes, silverRes] = await Promise.all([
          fetch(`/api/market-rate?asset=gold&t=${Date.now()}`, {
            cache: "no-store",
          }),
          fetch(`/api/market-rate?asset=silver&t=${Date.now()}`, {
            cache: "no-store",
          }),
        ]),
        [gold, silver] = await Promise.all([goldRes.json(), silverRes.json()]);
      setBullionMarket({
        gold: goldRes.ok ? gold : null,
        silver: silverRes.ok ? silver : null,
        time: new Date().toLocaleTimeString(),
      });
    } catch {
      setBullionMarket({
        gold: null,
        silver: null,
        time: new Date().toLocaleTimeString(),
      });
    }
  }
  async function refreshMarketToday() {
    const indices = [
      ["SENSEX", "^BSESN"],
      ["NIFTY", "^NSEI"],
      ["CNX Midcap", "NIFTY_MIDCAP_100.NS"],
      ["NIFTY BANK", "^NSEBANK"],
    ];
    try {
      const indexRows = await Promise.all(
        indices.map(async ([name, symbol]) => {
          try {
            const res = await fetch(
                `/api/quote?symbol=${encodeURIComponent(symbol)}&exchange=INDEX&t=${Date.now()}`,
                { cache: "no-store" },
              ),
              q = await res.json();
            if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
            return {
              name,
              symbol,
              price: num(q.price),
              change: num(q.change),
              changePct: num(q.changePct),
              time: q.time,
              ok: true,
            };
          } catch {
            return {
              name,
              symbol,
              price: 0,
              change: 0,
              changePct: 0,
              ok: false,
            };
          }
        }),
      );
      const [goldRes, silverRes, crudeRes, usdRes] = await Promise.all([
        fetch(`/api/market-rate?asset=gold&t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(`/api/market-rate?asset=silver&t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(`/api/market-rate?asset=crude&t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/quote?symbol=${encodeURIComponent("USDINR=X")}&exchange=INDEX&t=${Date.now()}`,
          { cache: "no-store" },
        ),
      ]);
      const [gold, silver, crude, usd] = await Promise.all([
        goldRes.json().catch(() => ({})),
        silverRes.json().catch(() => ({})),
        crudeRes.json().catch(() => ({})),
        usdRes.json().catch(() => ({})),
      ]);
      const commodityRows = [
        {
          name: "Gold - 10 GM",
          symbol: "gold",
          price: num(gold?.ratePer10GramInr),
          change: num(gold?.changePerGramInr) * 10,
          changePct: num(gold?.ratePer10GramInr)
            ? ((num(gold?.changePerGramInr) * 10) /
                num(gold?.ratePer10GramInr)) *
              100
            : 0,
          ok: goldRes.ok && !!num(gold?.ratePer10GramInr),
          unit: "INR",
        },
        {
          name: "Silver - 1 KG",
          symbol: "silver",
          price: num(silver?.ratePerKgInr),
          change: num(silver?.changePerGramInr) * 1000,
          changePct: num(silver?.ratePerKgInr)
            ? ((num(silver?.changePerGramInr) * 1000) /
                num(silver?.ratePerKgInr)) *
              100
            : 0,
          ok: silverRes.ok && !!num(silver?.ratePerKgInr),
          unit: "INR",
        },
        {
          name: "Dollar / INR",
          symbol: "USDINR=X",
          price: num(usd?.price),
          change: num(usd?.change),
          changePct: num(usd?.changePct),
          ok: usdRes.ok && Number.isFinite(Number(usd?.price)),
          unit: "INR",
        },
        {
          name: "Crude $ / Barrel",
          symbol: "crude",
          price: num(crude?.usdPerBarrel),
          change: 0,
          changePct: 0,
          ok: crudeRes.ok && Number.isFinite(Number(crude?.usdPerBarrel)),
          unit: "USD",
        },
      ];
      setMarketToday([...indexRows, ...commodityRows]);
    } catch {
      setMarketToday([]);
    }
  }
  async function connectGoogleDrive() {
    if (googleDriveConnected) return true;
    if (
      !confirm(
        "Connect Google Drive now so documents can be stored and opened from your Drive?",
      )
    )
      return false;
    const popup = window.open(
      "",
      "google-drive-oauth",
      "width=520,height=720,menubar=no,toolbar=no,status=no",
    );
    try {
      const res = await fetch("/api/google-drive/auth-url", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error || "Could not start Google Drive connection",
        );
      if (!popup)
        throw new Error(
          "Popup was blocked. Allow popups for this site and try again.",
        );
      popup.location.href = json.authUrl;
      return await new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (ok: boolean, msg = "") => {
          if (done) return;
          done = true;
          window.removeEventListener("message", onMessage);
          clearInterval(timer);
          if (!popup.closed) popup.close();
          setGoogleDriveConnected(ok);
          if (msg) setToast(msg);
          resolve(ok);
        };
        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === "google-drive-connected")
            finish(true, "Google Drive connected");
          if (event.data?.type === "google-drive-error")
            finish(
              false,
              event.data?.message || "Google Drive connection failed",
            );
        };
        const timer = setInterval(() => {
          if (popup.closed) finish(false, "Google Drive connection was closed");
        }, 700);
        window.addEventListener("message", onMessage);
        setTimeout(
          () => finish(false, "Google Drive connection timed out"),
          120000,
        );
      });
    } catch (e: any) {
      if (popup && !popup.closed) popup.close();
      setToast(e?.message || "Could not connect Google Drive");
      return false;
    }
  }
  async function disconnectGoogleDrive() {
    await fetch("/api/google-drive/status", { method: "DELETE" });
    setGoogleDriveConnected(false);
    setToast("Google Drive disconnected");
  }
  async function uploadDocs(
    moduleKey: string,
    files: File[],
    folderParts: string[] = driveFolderParts(moduleKey),
  ) {
    if (!user || !files.length) return [] as PendingDoc[];
    if (!(await connectGoogleDrive())) return [] as PendingDoc[];
    const pending: PendingDoc[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("moduleKey", moduleKey);
        fd.append("folderParts", JSON.stringify(folderParts));
        fd.append("file", file);
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token || ""}` },
          body: fd,
        });
        const json = await res.json();
        if (res.status === 409 && json.code === "GOOGLE_DRIVE_NOT_CONNECTED") {
          setGoogleDriveConnected(false);
          if (await connectGoogleDrive())
            return uploadDocs(moduleKey, files, folderParts);
          throw new Error("Google Drive connection required");
        }
        if (!res.ok)
          throw new Error(json.error || "Google Drive upload failed");
        pending.push(json.document);
      } catch (e: any) {
        setToast(e?.message || "Google Drive upload failed");
      }
    }
    return pending;
  }
  async function attachDocs(
    recordId: string,
    moduleKey: string,
    pending: PendingDoc[],
    notes = "",
  ) {
    if (!user || !pending.length) return 0;
    const rows = pending.map((d) => ({
      user_id: user.id,
      record_id: recordId,
      module_key: moduleKey,
      file_name: d.file_name,
      file_path: d.file_path,
      mime_type: d.mime_type || "",
      file_size: d.file_size || 0,
      notes: [notes, d.notes || "Google Drive"].filter(Boolean).join(" | "),
    }));
    const { error } = await supabase.from("asset_documents").insert(rows);
    if (error) {
      setToast(error.message);
      return 0;
    }
    return rows.length;
  }
  async function saveRecord(
    moduleKey: string,
    data: any,
    record?: Rec,
    files: File[] = docFilesRef.current,
  ) {
    if (!user) return;
    if (!editChallenge(record ? "save edits" : "add this record")) return;
    if (moduleKey === "watchlist")
      data = await captureWatchlistBasePrice(data, record);
    if (moduleKey === "insurance") {
      const closed = String(data.status || "").toLowerCase() === "closed",
        wasClosed =
          String(record?.data?.status || "").toLowerCase() === "closed";
      if (closed && (!wasClosed || !data.death_cover_after_closure)) {
        const deathCoverActive = confirm(
          "This insurance policy is closed. Is the sum assured still payable on death?\n\nOK = Yes, keep death cover active.\nCancel = No, no death cover remains.",
        );
        data = {
          ...data,
          death_cover_after_closure: deathCoverActive ? "Yes" : "No",
        };
      } else if (!closed) {
        data = { ...data, death_cover_after_closure: "" };
      }
    }
    data = withSystemDates(computedData(moduleKey, data), record);
    const pending = files.length
      ? await uploadDocs(moduleKey, files, driveFolderParts(moduleKey, data))
      : [];
    if (files.length && !pending.length)
      return setToast("Google Drive upload failed. Record was not saved.");
    if (data.account_name) await ensureAccount(data.account_name);
    const res = record
      ? await supabase
          .from("records")
          .update({ data })
          .eq("id", record.id)
          .eq("user_id", user.id)
          .select("id")
          .single()
      : await supabase
          .from("records")
          .insert({ user_id: user.id, module_key: moduleKey, data })
          .select("id")
          .single();
    if (res.error) setToast(res.error.message);
    else {
      const recordId = (res.data as any)?.id || record?.id,
        uploaded = recordId
          ? await attachDocs(recordId, moduleKey, pending)
          : 0;
      docFilesRef.current = [];
      setToast(
        `${record ? "Updated" : "Saved"}${uploaded ? ` with ${uploaded} Google Drive document${uploaded > 1 ? "s" : ""}` : ""}`,
      );
      setEditing(null);
      await loadAll(true);
    }
  }
  async function markFixedIncomeReviewed(r: Rec) {
    if (!user) return;
    const reviewed = isoDate(),
      isAnnualReview = /ppf|sukanya/i.test(String(r.data?.category || "")),
      data = {
        ...r.data,
        last_value_reviewed: reviewed,
        next_value_review_due: isAnnualReview
          ? nextAprilSecondIso()
          : addMonthsIso(reviewed, 3),
      };
    const { error } = await supabase
      .from("records")
      .update({ data })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) setToast(error.message);
    else {
      setToast(
        isAnnualReview
          ? "Fixed income review moved to next 2 Apr"
          : "Fixed income review moved ahead 3 months",
      );
      await loadAll(true);
    }
  }
  async function snoozeFixedIncomeMaturity(r: Rec) {
    if (!user) return;
    const data = {
      ...r.data,
      next_maturity_reminder_due: addMonthsIso(isoDate(), 1),
      maturity_reminder_resolved: false,
    };
    const { error } = await supabase
      .from("records")
      .update({ data })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) setToast(error.message);
    else {
      setToast("Maturity reminder moved ahead 1 month");
      await loadAll(true);
    }
  }
  async function resolveFixedIncomeMaturity(r: Rec) {
    if (!user) return;
    const data = {
      ...r.data,
      maturity_reminder_resolved: true,
      next_maturity_reminder_due: "",
    };
    const { error } = await supabase
      .from("records")
      .update({ data })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) setToast(error.message);
    else {
      setToast("Maturity reminder resolved");
      await loadAll(true);
    }
  }
  async function delRecord(r: Rec) {
    if (!requireAdmin("record deletion")) return;
    if (!editChallenge("delete this record")) return;
    if (r.module_key !== "watchlist" && !code("Delete this record?"))
      return setToast("Deletion cancelled");
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) setToast(error.message);
    else {
      setToast("Deleted");
      await loadAll(true);
    }
  }
  async function saveAccount(payload: any, existing?: Account | null) {
    if (!user) return;
    if (!editChallenge(existing ? "save account edits" : "add account")) return;
    if (!payload.name?.trim()) return setToast("Account name required");
    if (existing) {
      const old = existing.name;
      const { error } = await supabase
        .from("accounts")
        .update(payload)
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (error) return setToast(error.message);
      if (old !== payload.name) {
        const linked = records.filter((r) => r.data?.account_name === old);
        await Promise.all(
          linked.map((r) =>
            supabase
              .from("records")
              .update({ data: { ...r.data, account_name: payload.name } })
              .eq("id", r.id)
              .eq("user_id", user.id),
          ),
        );
      }
    } else {
      const { error } = await supabase
        .from("accounts")
        .insert({ ...payload, user_id: user.id });
      if (error) return setToast(error.message);
    }
    setAccModal(null);
    setToast("Account saved");
    await loadAll(true);
  }
  async function delAccount(a: Account) {
    if (!requireAdmin("account deletion")) return;
    const linked = records.filter((r) => r.data?.account_name === a.name);
    if (
      !confirm(
        `Delete account "${a.name}"?\n\nThe account name will be removed from ${linked.length} linked records. Holdings remain.`,
      )
    )
      return;
    if (!code(`Final confirmation: delete account "${a.name}"`))
      return setToast("Cancelled");
    const updates = await Promise.all(
      linked.map((r) =>
        supabase
          .from("records")
          .update({ data: { ...r.data, account_name: "" } })
          .eq("id", r.id)
          .eq("user_id", user.id),
      ),
    );
    const updateError = updates.find((res) => res.error)?.error;
    if (updateError) return setToast(updateError.message);
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", a.id)
      .eq("user_id", user.id);
    if (error) return setToast(error.message);
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    setRecords((prev) =>
      prev.map((r) =>
        r.data?.account_name === a.name
          ? { ...r, data: { ...r.data, account_name: "" } }
          : r,
      ),
    );
    setToast("Account deleted and removed everywhere");
    await loadAll(true);
  }
  async function refreshStocks(silent = false, allAccounts = false) {
    const rows = recordsRef.current.filter(
      (r) =>
        r.module_key === "stocks" && (allAccounts || inAccountTab("stocks", r)),
    );
    let ok = 0,
      fail = 0;
    for (const r of rows) {
      const d = { ...r.data },
        s = findStock(d.security_name || d.ticker_symbol || "");
      if (s) {
        d.security_name ||= s.name;
        d.ticker_symbol ||= s.ticker;
        d.exchange ||= s.exchange;
        d.category ||= s.category;
      }
      if (!d.ticker_symbol) {
        fail++;
        continue;
      }
      try {
        const res = await fetch(
          `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}`,
        );
        const q = await res.json();
        if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
        assignStockQuoteFields(d, q);
        d.today_gain = (num(d.quantity) * num(d.day_change)).toFixed(2);
        d.latest_value = (num(d.quantity) * num(d.live_price)).toFixed(2);
        if (!num(d.investment_amount) && num(d.quantity) && num(d.inv_price))
          d.investment_amount = (num(d.quantity) * num(d.inv_price)).toFixed(2);
        d.last_synced = new Date().toLocaleString();
        await supabase
          .from("records")
          .update({ data: d })
          .eq("id", r.id)
          .eq("user_id", user.id);
        ok++;
      } catch {
        fail++;
      }
    }
    if (!silent)
      setToast(`Live prices: ${ok} updated${fail ? `, ${fail} failed` : ""}`);
    await loadAll(true);
  }
  async function refreshStockDisplay(allAccounts = false) {
    const rows = recordsRef.current.filter(
        (r) =>
          r.module_key === "stocks" &&
          (allAccounts || inAccountTab("stocks", r)),
      ),
      quotes = new Map<string, Promise<any>>(),
      updates = new Map<string, Record<string, any>>();
    const quoteFor = (symbol: string, exchange: string, name = "") => {
      const quoteKey = `${exchange}:${symbol}`;
      if (!quotes.has(quoteKey))
        quotes.set(
          quoteKey,
          fetch(
            `/api/quote?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&name=${encodeURIComponent(name)}&t=${Date.now()}`,
            { cache: "no-store" },
          ).then(async (res) => {
            const q = await res.json();
            if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
            return q;
          }),
        );
      return quotes.get(quoteKey)!;
    };
    await Promise.all(
      rows.map(async (r) => {
        const d = { ...r.data },
          s = findStock(d.security_name || d.ticker_symbol || "");
        if (s) {
          d.security_name ||= s.name;
          d.ticker_symbol ||= s.ticker;
          d.exchange ||= s.exchange;
          d.category ||= s.category;
        }
        if (!d.ticker_symbol) return;
        try {
          const q = await quoteFor(
            d.ticker_symbol,
            d.exchange || "NSE",
            d.security_name || "",
          );
          assignStockQuoteFields(d, q);
          d.today_gain = (num(d.quantity) * num(d.day_change)).toFixed(2);
          d.latest_value = (num(d.quantity) * num(d.live_price)).toFixed(2);
          d.last_synced = new Date().toLocaleString();
          updates.set(r.id, d);
        } catch {}
      }),
    );
    if (!updates.size) return;
    setRecords((prev) =>
      prev.map((r) =>
        updates.has(r.id) ? { ...r, data: updates.get(r.id)! } : r,
      ),
    );
  }
  async function refreshWatchlist(silent = false) {
    const rows = recordsRef.current.filter((r) => r.module_key === "watchlist");
    let ok = 0,
      fail = 0;
    for (const r of rows) {
      const d = { ...r.data },
        s = findStock(d.security_name || d.ticker_symbol || "");
      if (s) {
        d.security_name ||= s.name;
        d.ticker_symbol ||= s.ticker;
        d.exchange ||= s.exchange;
        d.category ||= s.category;
      }
      if (!d.ticker_symbol) {
        fail++;
        continue;
      }
      try {
        const res = await fetch(
          `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}`,
        );
        const q = await res.json();
        if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
        assignStockQuoteFields(d, q, "current_price");
        d.live_price = d.current_price;
        if (!num(d.base_price)) {
          d.base_price = d.current_price;
          d.base_price_date = localIsoDate();
          d.base_price_captured_at = new Date().toISOString();
          if (!num(d.inv_price)) d.inv_price = d.base_price;
        }
        const qty = num(d.quantity) || 1;
        d.today_gain = (qty * num(d.day_change)).toFixed(2);
        d.latest_value = (qty * num(d.current_price)).toFixed(2);
        if (num(d.inv_price))
          d.investment_amount = (qty * num(d.inv_price)).toFixed(2);
        d.last_synced = new Date().toLocaleString();
        await supabase
          .from("records")
          .update({ data: d })
          .eq("id", r.id)
          .eq("user_id", user.id);
        ok++;
      } catch {
        fail++;
      }
    }
    if (!silent)
      setToast(
        `Watchlist prices: ${ok} updated${fail ? `, ${fail} failed` : ""}`,
      );
    await loadAll(true);
  }
  async function refreshMutualFundNavs() {
    const rows = records.filter(
      (r) => r.module_key === "mutualFunds" && inAccountTab("mutualFunds", r),
    );
    let ok = 0,
      fail = 0;
    for (const r of rows) {
      const d = { ...r.data };
      if (!d.scheme_code) {
        fail++;
        continue;
      }
      try {
        const res = await fetch(
          `/api/nav?schemeCode=${encodeURIComponent(d.scheme_code)}`,
        );
        const q = await res.json();
        if (!res.ok || !Number.isFinite(Number(q.nav))) throw new Error();
        d.live_nav = Number(q.nav).toFixed(4);
        d.latest_value = (num(d.quantity) * num(d.live_nav)).toFixed(2);
        d.nav_date = q.navDate || new Date().toISOString().slice(0, 10);
        await supabase
          .from("records")
          .update({ data: d })
          .eq("id", r.id)
          .eq("user_id", user.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setToast(`NAV refreshed: ${ok} updated${fail ? `, ${fail} failed` : ""}`);
    await loadAll(true);
  }
  function metalAsset(d: any) {
    const s = String(d.security_name || d.category || "").toLowerCase();
    if (s.includes("silver")) return "silver";
    if (s.includes("platinum")) return "platinum";
    return "gold";
  }
  function metalUnitFactor(unit: any) {
    const u = String(unit || "").toLowerCase();
    if (u.includes("kg")) return 1000;
    if (u.includes("oz")) return 31.1034768;
    return 1;
  }
  async function refreshMetals(k: string, silent = false, allAccounts = false) {
    const rows = recordsRef.current.filter(
        (r) => r.module_key === k && (allAccounts || inAccountTab(k, r)),
      ),
      quotes = new Map<string, Promise<any>>();
    let ok = 0,
      fail = 0;
    const quoteFor = (asset: string) => {
      if (!quotes.has(asset))
        quotes.set(
          asset,
          fetch(
            `/api/market-rate?asset=${encodeURIComponent(asset)}&t=${Date.now()}`,
            { cache: "no-store" },
          ).then(async (res) => {
            const q = await res.json();
            if (!res.ok || !Number.isFinite(Number(q.ratePerGramInr)))
              throw new Error();
            return q;
          }),
        );
      return quotes.get(asset)!;
    };
    for (const r of rows) {
      const d = { ...r.data };
      try {
        const q = await quoteFor(metalAsset(d));
        const grams = num(d.quantity) * metalUnitFactor(d.unit),
          rate = Number(q.ratePerGramInr),
          asset = metalAsset(d),
          displayPrice =
            asset === "silver"
              ? Number(q.ratePerKgInr)
              : asset === "gold"
                ? Number(q.ratePer10GramInr)
                : rate,
          displayChange =
            asset === "silver"
              ? Number(q.changePerKgInr)
              : asset === "gold"
                ? Number(q.changePer10GramInr)
                : Number(q.changePerGramInr),
          value = grams * rate,
          storedRate = num(d.live_rate_per_gram || d.previous_rate_per_gram),
          apiChange = Number(q.changePerGramInr),
          changePerGram =
            Number.isFinite(apiChange) && apiChange !== 0
              ? apiChange
              : storedRate
                ? rate - storedRate
                : 0;
        d.latest_value = value.toFixed(2);
        d.today_gain = (grams * changePerGram).toFixed(2);
        d.security_name = bullionDisplayName(d);
        d.current_price = Number.isFinite(displayPrice)
          ? displayPrice.toFixed(2)
          : "";
        d.day_change = Number.isFinite(displayChange)
          ? displayChange.toFixed(2)
          : "";
        d.previous_rate_per_gram =
          Number.isFinite(Number(q.previousPerGramInr)) &&
          Number(q.previousPerGramInr) !== 0
            ? Number(q.previousPerGramInr).toFixed(2)
            : storedRate
              ? storedRate.toFixed(2)
              : "";
        d.live_rate_per_gram = rate.toFixed(2);
        d.rate_provider = q.provider || "";
        d.rate_source_url = q.sourceUrl || "";
        d.last_synced = new Date().toLocaleString();
        await supabase
          .from("records")
          .update({ data: d })
          .eq("id", r.id)
          .eq("user_id", user.id);
        ok++;
      } catch {
        fail++;
      }
    }
    if (!silent)
      setToast(
        `Bullion rates: ${ok} updated${fail ? `, ${fail} failed` : ""}`,
      );
    await refreshBullionMarket();
    await loadAll(true);
  }
  async function refreshModuleRates(k: string, silent = false) {
    if (k === "stocks") return refreshStocks(silent);
    if (k === "mutualFunds") return refreshMutualFundNavs();
    if (k === "bullion" || k === "nsel") return refreshMetals(k, silent);
    setToast(
      "Live market refresh is available for stocks, mutual funds, bullion and NSEL. Other assets need manual valuation.",
    );
  }
  async function applyFixedIncomeDefaults(
    form: HTMLFormElement | null,
    type: string,
  ) {
    if (!form || !type) return;
    try {
      const res = await fetch(
          `/api/fixed-income-defaults?type=${encodeURIComponent(type)}`,
        ),
        d = await res.json();
      if (!res.ok) throw new Error("No government default for this type");
      const set = (n: string, v: any) => {
        const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(
          `[name="${n}"]`,
        );
        if (el && v !== undefined && v !== null && v !== "")
          el.value = String(v);
      };
      set("interest_rate", d.rate);
      set(
        "lock_in_years",
        typeof d.lockInYears === "number"
          ? d.lockInYears.toFixed(d.lockInYears % 1 ? 2 : 0)
          : d.lockInYears,
      );
      set("rate_year", d.period);
      if (isCompanyPfType(type)) {
        set("broker", "Govt");
        const lock = form.querySelector<HTMLInputElement>(
          '[name="lock_in_years"]',
        );
        const maturityDate = form.querySelector<HTMLInputElement>(
          '[name="maturity_date"]',
        );
        const maturityValue = form.querySelector<HTMLInputElement>(
          '[name="maturity_value"]',
        );
        if (lock) lock.value = "";
        if (maturityDate) maturityDate.value = "";
        if (maturityValue) maturityValue.value = "";
      }
      recalcFixedIncomeMaturityDate(form);
      recalcFixedIncomeMaturity(form);
      setToast(`${d.label}: rate/lock-in fetched`);
    } catch (e: any) {
      setToast(e?.message || "Could not fetch fixed income defaults");
    }
  }
  function showFixedIncomeField(name: string) {
    const t = key(fixedIncomeType);
    if (
      isCompanyPfType(t) &&
      ["lock_in_years", "maturity_value", "maturity_date"].includes(name)
    )
      return false;
    if (name === "account_creation_date")
      return t === "ppf" || t === "sukanyasamriddhi";
    if (["employee_contribution", "company_contribution"].includes(name))
      return t === "epf" || t === "companypf" || t === "pf";
    if (name === "gratuity_value") return t === "gratuity";
    return true;
  }
  function fixedIncomeFormData(form: HTMLFormElement | null) {
    const get = (n: string) =>
        num((form?.querySelector(`[name="${n}"]`) as HTMLInputElement)?.value),
      text = (n: string) =>
        (
          form?.querySelector(`[name="${n}"]`) as
            | HTMLInputElement
            | HTMLSelectElement
        )?.value || "";
    return {
      category: text("category"),
      fy_interest_basis: "value_before_fy_interest",
      purchase_date: text("purchase_date"),
      account_creation_date: text("account_creation_date"),
      initial_investment: get("initial_investment"),
      investment_amount: get("investment_amount"),
      yearly_investment: get("yearly_investment"),
      employee_contribution: get("employee_contribution"),
      company_contribution: get("company_contribution"),
      current_value_today: get("current_value_today"),
      interest_rate: get("interest_rate"),
      lock_in_years: get("lock_in_years"),
      maturity_value: get("maturity_value"),
    };
  }
  function recalcFixedIncomeMaturityDate(form: HTMLFormElement | null) {
    if (!form) return;
    const el = form.querySelector<HTMLInputElement>('[name="maturity_date"]'),
      data = fixedIncomeFormData(form),
      v = fixedIncomeMaturityDate(data);
    if (el) el.value = isCompanyPfType(data.category) ? "" : v || el.value;
  }
  function recalcFixedIncomeMaturity(form: HTMLFormElement | null) {
    if (!form) return;
    const el = form.querySelector<HTMLInputElement>('[name="maturity_value"]'),
      data = fixedIncomeFormData(form),
      v = fixedIncomeMaturityValue(data);
    if (el) el.value = isCompanyPfType(data.category) ? "" : v ? fmtInr(v) : el.value;
  }
  async function normalizeWatchlistImport(data: any) {
    const input = String(data.security_name || data.ticker_symbol || "").trim(),
      exchange = String(data.exchange || "NSE").toUpperCase(),
      alias = SHARE_LIST_ALIASES[key(input)],
      localMatch =
        alias ||
        ALL_STOCKS.find(
          (s) =>
            s.exchange === exchange &&
            (key(s.name) === key(input) || key(s.ticker) === key(input)),
        ) ||
        findStock(input);
    let match: any = localMatch;
    if (!data.ticker_symbol && input && (!match || match.exchange !== exchange)) {
      try {
        const res = await fetch(
            `/api/stock-search?q=${encodeURIComponent(input)}`,
          ),
          json = await res.json(),
          options = Array.isArray(json.stocks) ? json.stocks : [];
        match =
          options.find((s: any) => s.exchange === exchange) ||
          options[0] ||
          match;
      } catch {}
    }
    const ticker =
      data.ticker_symbol ||
      match?.ticker ||
      (/^[A-Z0-9&.-]+$/i.test(input) ? input.toUpperCase() : "");
    return {
      ...data,
      security_name: match?.name || input,
      ticker_symbol: ticker,
      exchange: data.exchange || match?.exchange || "NSE",
      category: data.category || match?.category || "",
      quantity: num(data.quantity) || 1,
      notes: data.notes || "Added from share list",
    };
  }
  async function previewShareRows(rows: any[]) {
    const data: any[] = [];
    for (let i = 0; i < rows.length; i += 6) {
      data.push(
        ...(await Promise.all(
          rows
            .slice(i, i + 6)
            .map((row) =>
              normalizeWatchlistImport(mapImportedRow(row, "watchlist")),
            ),
        )),
      );
    }
    return data
      .filter((x) => x.security_name && x.security_name !== "Imported Item")
      .map((data) => ({ moduleKey: "watchlist", data }));
  }
  function pastedShareDate(value: string) {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!match) return value;
    const year = match[3]
      ? match[3].length === 2
        ? `20${match[3]}`
        : match[3]
      : String(new Date().getFullYear());
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  function rowsFromShareText(raw: string) {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return [];
    const firstColumns = lines[0].split(/[\t,;|]/).map((part) => part.trim()),
      hasHeaders =
        firstColumns.length > 1 &&
        firstColumns.some((part) =>
          /^(company|security(?: name)?|stock(?: name)?|share|name|ticker|symbol|exchange|current price|price)$/i.test(
            part,
          ),
        );
    if (hasHeaders) return parseDelimited(raw);
    return lines.map((line) => {
      const listed = line.match(
        /^(.*?)\s+-\s+(NSE|BSE)(?:\s+-\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+\([^)]*\))?)?\s*$/i,
      );
      if (listed)
        return {
          "security name": listed[1].trim(),
          exchange: listed[2].toUpperCase(),
          "date added": listed[3] ? pastedShareDate(listed[3]) : "",
        };
      const parts = line.split(/[\t,;|]/).map((part) => part.trim());
      return {
        "security name": parts[0],
        symbol: parts[1] || "",
        exchange: parts[2] || "",
      };
    });
  }
  async function handleImport(file: File | null) {
    if (!file) return;
    try {
      const rows = /\.(txt|csv|tsv)$/i.test(file.name)
          ? rowsFromShareText(await file.text())
          : await readRowsFromFile(file),
        preview = await previewShareRows(rows);
      setImportPreview(preview);
      const unresolved = preview.filter((r) => !r.data.ticker_symbol).length;
      setToast(
        `Watchlist preview ready: ${preview.length} shares${unresolved ? `, ${unresolved} need a ticker` : ""}`,
      );
    } catch (e: any) {
      setToast(e?.message || "Could not read share list");
    }
  }
  async function previewPastedTable() {
    try {
      const preview = await previewShareRows(rowsFromShareText(pasteTable));
      if (!preview.length) return setToast("Paste one or more shares first");
      setImportPreview(preview);
      const unresolved = preview.filter((r) => !r.data.ticker_symbol).length;
      setToast(
        `Watchlist preview ready: ${preview.length} shares${unresolved ? `, ${unresolved} need a ticker` : ""}`,
      );
    } catch (e: any) {
      setToast(e?.message || "Could not parse share list");
    }
  }
  async function importRows() {
    if (!user || !importPreview.length) return;
    const data = [];
    for (const r of importPreview) {
      const captured = await captureWatchlistBasePrice(r.data);
      data.push(withSystemDates(computedData("watchlist", captured)));
    }
    const { error } = await supabase
      .from("records")
      .insert(
        data.map((row) => ({
          user_id: user.id,
          module_key: "watchlist",
          data: row,
        })),
      );
    if (error) setToast(error.message);
    else {
      const added = importPreview.length;
      setImportPreview([]);
      setPasteTable("");
      setToast(`${added} share${added === 1 ? "" : "s"} added to watchlist`);
      await loadAll(true);
    }
  }
  function exportBackup() {
    download(
      "asset-manager-cloud-backup.json",
      JSON.stringify({ profile, role, accounts, records, docs }, null, 2),
    );
  }
  function exportModuleCsv(k: string) {
    const def = MODULES[k],
      systemCols = [
        "data_uploaded_date",
        "data_uploaded_at",
        "last_updated_date",
        "last_updated_at",
      ],
      rows = records
        .filter((r) => r.module_key === k)
        .map((r) => ({
          ...computeRecord(k, r.data),
          ...systemCols.reduce(
            (a, c) => ({ ...a, [c]: r.data?.[c] || "" }),
            {},
          ),
        })),
      heads = [
        ...new Set([
          ...def.fields.map((f) => f.name),
          ...def.cols,
          ...systemCols,
        ]),
      ],
      csv = [
        heads.join(","),
        ...rows.map((r) => heads.map((h) => csvEscape(r[h])).join(",")),
      ].join("\n");
    download(`${k}-export.csv`, csv, "text/csv");
  }
  async function saveProfile(fd: FormData) {
    if (!user) return;
    const payload = {
      id: user.id,
      email: user.email || "",
      full_name: String(fd.get("full_name") || ""),
      city: String(fd.get("city") || ""),
      phone: String(fd.get("phone") || user.phone || ""),
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) setToast(error.message);
    else {
      setToast("Profile saved");
      await loadAll(true);
    }
  }
  async function openDoc(doc: AssetDoc) {
    const win = window.open("", "_blank", "noopener,noreferrer");
    try {
      if (
        String(doc.file_path || "").startsWith("gdrive:") &&
        !googleDriveConnected
      ) {
        const ok = await connectGoogleDrive();
        if (!ok)
          throw new Error(
            "Google Drive connection required to open this document",
          );
      }
      const res = await fetch(
        `/api/documents?id=${encodeURIComponent(doc.id)}`,
        { headers: { Authorization: `Bearer ${session?.access_token || ""}` } },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (
          String(doc.file_path || "").startsWith("gdrive:") &&
          (json.error || "").includes("not connected")
        ) {
          setGoogleDriveConnected(false);
          if (await connectGoogleDrive()) return openDoc(doc);
        }
        throw new Error(json.error || "Could not open document");
      }
      const blob = await res.blob(),
        url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      if (win) win.close();
      setToast(e?.message || "Could not open document");
    }
  }
  function openMoneycontrolCommodity(metal: any) {
    window.open(
      moneycontrolCommodityHref(metal),
      "_blank",
      "noopener,noreferrer",
    );
  }
  async function deleteDoc(doc: AssetDoc) {
    if (!confirm(`Delete document "${doc.file_name}" from the repository?`))
      return;
    try {
      const res = await fetch(
        `/api/documents?id=${encodeURIComponent(doc.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token || ""}` },
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete document");
      setToast("Document deleted from repository");
      await loadAll(true);
    } catch (e: any) {
      setToast(e?.message || "Could not delete document");
    }
  }
  async function uploadRepositoryDocuments(filesLike: FileList | null) {
    const files = Array.from(filesLike || []);
    if (!user || !files.length) return;
    setDocUploading(true);
    try {
      let record = records.find((r) => r.id === docUploadRecordId),
        recordId = record?.id || "",
        moduleKey = record?.module_key || docUploadModule,
        folderParts = record
          ? driveFolderParts(record.module_key, record.data)
          : driveFolderParts(docUploadModule, {
              security_name: files.length === 1 ? files[0].name : "Repository",
              broker: docUploadNotes || "General",
            });
      if (!recordId) {
        const title =
          files.length === 1
            ? files[0].name
            : `${files.length} repository documents`;
        const created = await supabase
          .from("records")
          .insert({
            user_id: user.id,
            module_key: "documents",
            data: withSystemDates({
              security_name: title,
              category: MODULES[docUploadModule]?.title || "Repository",
              notes: docUploadNotes,
            }),
          })
          .select("id")
          .single();
        if (created.error) throw created.error;
        recordId = (created.data as any).id;
        moduleKey = "documents";
      }
      const pending = await uploadDocs(moduleKey, files, folderParts);
      if (!pending.length) throw new Error("Google Drive upload failed");
      const uploaded = await attachDocs(
        recordId,
        moduleKey,
        pending,
        docUploadNotes,
      );
      setToast(
        `Uploaded ${uploaded} Google Drive document${uploaded > 1 ? "s" : ""}`,
      );
      setDocUploadNotes("");
      await loadAll(true);
    } catch (e: any) {
      setToast(e?.message || "Could not upload documents");
    } finally {
      setDocUploading(false);
    }
  }
  const visibleGroups = groups
    .map(([g, ids]: any) => [
      g,
      ids.filter((id: string) => id !== "admin" || isAdmin),
    ])
    .filter(([, ids]: any) => ids.length);
  const navButton = (id: string, compact = false) => {
    const meta = allViews.find((v) => v[0] === id);
    return (
      <button
        key={id}
        onClick={() => setView(id)}
        className={
          compact
            ? `mobile-nav-item ${view === id ? "mobile-nav-active" : ""}`
            : `flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-bold transition ${view === id ? "bg-sage text-white shadow-md" : "hover:bg-[#eef5ee]"}`
        }
      >
        <span>{meta?.[2]}</span>
      </button>
    );
  };
  const mobileTabs = [
    ["dashboard", "Summary", Home],
    ["stocks", "Stocks", BarChart3],
    ["mutualFunds", "MF", BriefcaseBusiness],
    ["bullion", "Gold/Silver", BriefcaseBusiness],
    ["fixedIncome", "Fixed", FolderOpen],
  ] as const;
  const mobileInvestmentTabs = [
      ["stocks", "Stocks", BarChart3],
      ["mutualFunds", "MF", BriefcaseBusiness],
      ["bullion", "Gold/Silver", BriefcaseBusiness],
      ["fixedIncome", "Fixed", FolderOpen],
      ["property", "Property", Home],
      ["ulips", "ULIP", Shield],
      ["nsel", "NSEL", BriefcaseBusiness],
      ["otherAssets", "Other", FolderOpen],
    ] as const,
    mobileTabsByValue = [
      ["dashboard", "Summary", Home] as const,
      ...mobileInvestmentTabs
        .map((tab) => {
          const [id] = tab,
            value = records
              .filter((r) => r.module_key === id)
              .reduce(
                (s, r) => s + num(computeLiveRecord(id, r.data).latest),
                0,
              );
          return { tab, value };
        })
        .sort((a, b) => b.value - a.value)
        .map((x) => x.tab),
    ],
    mobileTabAccounts =
      mobileAccountMenu && MODULES[mobileAccountMenu]
        ? [
            "All",
            ...Array.from(
              new Set(
                records
                  .filter((r) => r.module_key === mobileAccountMenu)
                  .map((r) => String(r.data?.account_name || "Unassigned"))
                  .filter(Boolean),
              ),
            ),
          ]
        : [];
  function selectMobileTab(id: string) {
    setView(id);
    if (id === "dashboard") {
      setMobileAccountMenu("");
      setAccountTabs((p) => ({ ...p, __phone: "All" }));
      return;
    }
    setMobileAccountMenu((current) => (current === id ? "" : id));
  }
  async function adminFetch(body?: any) {
    if (!session?.access_token) throw new Error("Missing session");
    const res = await fetch("/api/admin/users", {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.code === "SUPABASE_ADMIN_ENV_MISSING")
        throw new Error(
          "Admin console needs SUPABASE_SERVICE_ROLE_KEY in the server environment. Add it in Vercel and redeploy.",
        );
      throw new Error(json.error || "Admin request failed");
    }
    return json;
  }
  async function loadAdminUsers() {
    if (!isAdmin) return;
    setAdminBusy(true);
    try {
      const json = await adminFetch();
      setAdminUsers(json.users || []);
    } catch (e: any) {
      setToast(e?.message || "Could not load admin users");
    } finally {
      setAdminBusy(false);
    }
  }
  async function adminAction(payload: any) {
    setAdminBusy(true);
    setResetLink("");
    try {
      const json = await adminFetch(payload);
      if (json.action_link) setResetLink(json.action_link);
      setToast(json.message || "Admin action completed");
      await loadAdminUsers();
    } catch (e: any) {
      setToast(e?.message || "Admin action failed");
    } finally {
      setAdminBusy(false);
    }
  }
  function saveAdminProfile(u: AdminUser) {
    const full_name = prompt("Full name", u.full_name || "");
    if (full_name === null) return;
    const city = prompt("City", u.city || "");
    if (city === null) return;
    const phone = prompt("Phone", u.phone || "");
    if (phone === null) return;
    adminAction({
      action: "updateProfile",
      userId: u.id,
      email: u.email,
      full_name,
      city,
      phone,
    });
  }
  function phoneStat(label: string, value: any, cls = "text-[#17382b]") {
    return (
      <div className="phone-stat">
        <div className="phone-stat-label">{label}</div>
        <div className={`phone-stat-value ${cls}`}>{value}</div>
      </div>
    );
  }
  function phoneRow(
    title: string,
    meta: string,
    value: any,
    items: any[],
    onClick?: () => void,
  ) {
    const visibleItems = items.filter(Boolean);
    return (
      <button
        key={`${title}|${meta}`}
        type="button"
        className="phone-row !block !w-full !max-w-full !overflow-hidden !rounded-none !border-x-0 !px-3 !py-2.5 text-left"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
        onClick={onClick}
      >
        <div
          className="phone-row-main !grid !w-full !max-w-full !grid-cols-[minmax(0,1fr)_auto] !items-start !gap-x-3 !gap-y-2"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
            alignItems: "start",
            columnGap: "0.75rem",
            rowGap: "0.5rem",
          }}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="phone-row-title block max-w-full truncate whitespace-nowrap">
              {title}
            </div>
            <div className="phone-row-meta block max-w-full truncate whitespace-nowrap">
              {meta}
            </div>
          </div>
          <div className="phone-row-value shrink-0 whitespace-nowrap text-right tabular-nums">
            {value}
          </div>
          {visibleItems.length > 0 && (
            <div
              className="col-span-2 grid min-w-0 grid-cols-3 gap-2 overflow-hidden pt-1"
              style={{ gridTemplateColumns: `repeat(${Math.min(visibleItems.length, 3)}, minmax(0, 1fr))` }}
            >
              {visibleItems.map(([k, v, cls]: any) => (
                <div className="phone-row-metric min-w-0 text-left" key={k}>
                  <div className="phone-mini-label truncate">{k}</div>
                  <div className={`phone-mini-value truncate tabular-nums ${cls || ""}`}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </button>
    );
  }
  function phoneMarketValue(x: any) {
    const price = num(x.price);
    if (!x.ok && !price) return "Loading";
    if (x.unit === "USD")
      return `$${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (x.name === "Dollar / INR")
      return price.toLocaleString("en-IN", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    if (["Gold - 10 GM", "Silver - 1 KG"].includes(String(x.name)))
      return fmt(price);
    return price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  function phoneView() {
    const selectedAccount = accountTab("__phone"),
      accountFiltered = (rs: Rec[]) =>
        selectedAccount === "All"
          ? rs
          : rs.filter(
              (r) =>
                String(r.data?.account_name || "Unassigned") ===
                selectedAccount,
            ),
      moduleDef = MODULES[view],
      phoneRecords = accountFiltered(records),
      assetRows = Object.entries(MODULES)
        .filter(([k, d]) => d.kind === "asset" || k === "insurance")
        .map(([k, d]) => {
          const rs = phoneRecords.filter((r) => r.module_key === k),
            cs = rs.map((r) => computeLiveRecord(k, r.data)),
            latest = cs.reduce((s, c) => s + num(c.latest), 0),
            invested = cs.reduce((s, c) => s + num(c.invested), 0),
            gain = cs.reduce((s, c) => s + num(c.gain), 0),
            today = showsDailyChange(k)
              ? rs.reduce((s, r) => s + todayGainFor(k, r), 0)
              : 0;
          return { k, d, rs, latest, invested, gain, today };
        })
        .filter((x) => x.latest || x.invested || x.rs.length)
        .sort((a, b) => b.latest - a.latest),
      liabilityRows = Object.entries(MODULES)
        .filter(([, d]) => d.kind === "liability")
        .map(([k, d]) => {
          const rs = phoneRecords.filter((r) => r.module_key === k),
            cs = rs.map((r) => computeLiveRecord(k, r.data)),
            linkedPropertyLoans =
              k === "loans"
                ? phoneRecords
                    .filter((r) => r.module_key === "property")
                    .reduce(
                      (s, r) =>
                        s + num(computeRecord("property", r.data).loan_balance),
                      0,
                    )
                : 0,
            latest =
              cs.reduce(
                (s, c) => s + num(c.latest || c.balance || c.loan_balance),
                0,
              ) + linkedPropertyLoans,
            invested = cs.reduce(
              (s, c) => s + num(c.invested || c.loan_amount),
              0,
            );
          return { k, d, rs, latest, invested, gain: 0, today: 0 };
        })
        .filter((x) => x.latest || x.invested || x.rs.length),
      rawModuleRows = moduleDef
        ? phoneRecords
            .filter((r) => r.module_key === view)
            .map((r) => {
              const c = computeLiveRecord(view, r.data),
                title = String(
                  c.security_name ||
                    c.category ||
                    c.location ||
                    c.policy_name ||
                    moduleDef.title,
                ),
                latest = num(
                  c.latest ||
                    c.balance ||
                    c.loan_balance ||
                    c.latest_value ||
                    c.current_value,
                ),
                invested = num(
                  c.invested ||
                    c.investment_amount ||
                    c.purchase_price ||
                    c.loan_amount,
                ),
                gain = num(c.gain),
                today = showsDailyChange(view) ? todayGainFor(view, r) : 0;
              return { r, c, title, latest, invested, gain, today };
            })
            .filter((x) =>
              JSON.stringify(x.c).toLowerCase().includes(query.toLowerCase()),
            )
        : [],
      moduleRows = Array.from(
        rawModuleRows
          .reduce((m, x) => {
            const id = key(
                `${x.title}|${x.c.ticker_symbol || x.c.scheme_code || x.c.category || ""}`,
              ),
              g = m.get(id) || { ...x, records: [] as Rec[], lots: 0 };
            g.records.push(x.r);
            g.lots += 1;
            g.latest += g.lots === 1 ? 0 : x.latest;
            g.invested += g.lots === 1 ? 0 : x.invested;
            g.gain += g.lots === 1 ? 0 : x.gain;
            g.today += g.lots === 1 ? 0 : x.today;
            g.c = {
              ...g.c,
              latest: g.latest,
              invested: g.invested,
              gain: g.gain,
              today_gain: g.today,
            };
            m.set(id, g);
            return m;
          }, new Map<string, any>())
          .values(),
      ).sort((a, b) => b.latest - a.latest),
      scopedTotals = computeLiveTotals(phoneRecords),
      todayTotal = assetRows
        .filter((x) => showsDailyChange(x.k))
        .reduce((s, x) => s + x.today, 0),
      market = marketToday.slice(0, 6),
      tabs = [
        "dashboard",
        "stocks",
        "mutualFunds",
        "bullion",
        "fixedIncome",
        "property",
      ].filter((id) => id === "dashboard" || MODULES[id]);
    const tabBar = (
        <div className="phone-tabs">
          {tabs.map((id) => (
            <button
              key={id}
              className={`phone-tab ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
            >
              {id === "dashboard" ? "Summary" : MODULES[id]?.title}
            </button>
          ))}
        </div>
      ),
      strip = (
        <div className="phone-market-strip">
          {(market.length
            ? market
            : assetRows
                .slice(0, 5)
                .map((x) => ({
                  name: x.d.title,
                  price: x.latest,
                  change: x.today,
                  ok: true,
                }))
          ).map((x: any) => (
            <span key={x.name} className="phone-chip">
              {x.name}{" "}
              <span className="phone-market-value">{phoneMarketValue(x)}</span>
            </span>
          ))}
        </div>
      );
    if (moduleDef && view !== "dashboard")
      return (
        <div className="phone-screen">
          {strip}
          <section
            className="phone-module-strip !grid !w-full !max-w-full !grid-cols-2 !gap-2 !overflow-hidden"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <div className="phone-module-main col-span-2 min-w-0 overflow-hidden">
              <div className="phone-eyebrow">{moduleDef.title}</div>
              <div className="phone-hero-value">
                {fmt(moduleRows.reduce((s, x) => s + x.latest, 0))}
              </div>
              <div className="phone-hero-sub flex flex-wrap gap-x-2 gap-y-1">
                <span>{moduleRows.length} names</span>
                <span>{rawModuleRows.length} lots</span>
                <span>
                  Invested {fmt(moduleRows.reduce((s, x) => s + x.invested, 0))}
                </span>
              </div>
            </div>
            {showsDailyChange(view) &&
              phoneStat(
                "Today",
                fmt(moduleRows.reduce((s, x) => s + x.today, 0)),
                moduleRows.reduce((s, x) => s + x.today, 0) >= 0
                  ? "phone-green"
                  : "phone-red",
              )}
            {phoneStat(
              "Gain",
              fmt(moduleRows.reduce((s, x) => s + x.gain, 0)),
              moduleRows.reduce((s, x) => s + x.gain, 0) >= 0
                ? "phone-green"
                : "phone-red",
            )}
          </section>
          <h3 className="phone-section-title">Consolidated Holdings</h3>
          <div className="phone-list">
            {moduleRows.length ? (
              moduleRows.map((x) =>
                phoneRow(
                  x.title,
                  `${String(x.c.broker || x.c.account_name || moduleDef.title)} | ${x.lots} lot${x.lots > 1 ? "s" : ""}`,
                  fmt(x.latest),
                  [
                    ["Invested", fmt(x.invested)],
                    ...(showsDailyChange(view)
                      ? [
                          [
                            "Today",
                            fmt(x.today),
                            x.today >= 0 ? "phone-green" : "phone-red",
                          ],
                        ]
                      : []),
                    [
                      "Gain",
                      fmt(x.gain),
                      x.gain >= 0 ? "phone-green" : "phone-red",
                    ],
                  ],
                  () =>
                    setDetail({
                      moduleKey: view,
                      record: x.records[0],
                      computed: x.c,
                      cols: moduleDef.cols || [],
                      linkedProperty: view === "property",
                    }),
                ),
              )
            ) : (
              <Empty text={`No ${moduleDef.title} records yet.`} />
            )}
          </div>
        </div>
      );
    return (
      <div className="phone-screen">
        {strip}
        <section className="phone-hero">
          <div className="phone-eyebrow">Portfolio</div>
          <div className="phone-hero-value">{fmt(scopedTotals.net)}</div>
          <div className="phone-hero-sub flex flex-wrap gap-x-2 gap-y-1">
            <span>Assets {fmt(scopedTotals.assets)}</span>
            <span>Liabilities {fmt(scopedTotals.liabilities)}</span>
          </div>
        </section>
        <div className="phone-stats">
          {phoneStat("Invested", fmt(scopedTotals.invested))}
          {phoneStat(
            "Today",
            fmt(todayTotal),
            todayTotal >= 0 ? "phone-green" : "phone-red",
          )}
          {phoneStat(
            "Overall Gain",
            fmt(scopedTotals.gain),
            scopedTotals.gain >= 0 ? "phone-green" : "phone-red",
          )}
          {phoneStat(
            "Records",
            phoneRecords.filter((r) => MODULES[r.module_key]).length,
          )}
        </div>
        <h3 className="phone-section-title">Assets</h3>
        <div className="phone-list">
          {assetRows.map((x) =>
            phoneRow(
              x.d.title,
              `${x.rs.length} rows`,
              fmt(x.latest),
              [
                ["Invested", fmt(x.invested)],
                ...(showsDailyChange(x.k)
                  ? [
                      [
                        "Today",
                        fmt(x.today),
                        x.today >= 0 ? "phone-green" : "phone-red",
                      ],
                    ]
                  : []),
                [
                  "Gain",
                  fmt(x.gain),
                  x.gain >= 0 ? "phone-green" : "phone-red",
                ],
              ],
              () => openModuleAll(x.k),
            ),
          )}
        </div>
        {liabilityRows.length > 0 && (
          <>
            <h3 className="phone-section-title">Liabilities</h3>
            <div className="phone-list">
              {liabilityRows.map((x) =>
                phoneRow(
                  x.d.title,
                  `${x.rs.length} rows`,
                  fmt(x.latest),
                  [
                    ["Amount", fmt(x.invested)],
                    ["Rows", x.rs.length],
                    ["Type", "Liability", "phone-red"],
                  ],
                  () => openModuleAll(x.k),
                ),
              )}
            </div>
          </>
        )}
      </div>
    );
  }
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-lg font-bold text-sage">
        Loading...
      </div>
    );
  if (!session)
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md p-6">
          <div className="mb-6">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-sage text-xl font-semibold text-white">
              PF
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Portfolio Cloud
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Email based access for your portfolio.
            </p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              emailAuth();
            }}
          >
            <div>
              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                autoComplete={
                  authMode === "signin" ? "current-password" : "new-password"
                }
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full">
              {authMode === "signin" ? "Sign in" : "Create account"}
            </button>
            <button
              type="button"
              className="btn w-full"
              onClick={() => {
                setAuthMode(authMode === "signin" ? "signup" : "signin");
                setAuthMsg("");
              }}
            >
              {authMode === "signin"
                ? "Create a new account"
                : "Use existing account"}
            </button>
            {authMsg && (
              <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                {authMsg}
              </p>
            )}
          </form>
        </div>
      </main>
    );
  return (
    <div className="app-shell grid min-h-screen grid-cols-[280px_1fr] max-lg:grid-cols-1">
      <aside className="desktop-sidebar sticky top-0 h-screen overflow-auto border-r border-[#e3dccc] bg-[#fffdf8]/90 p-4 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sage text-lg font-semibold text-white shadow-soft">
            PF
          </div>
          <div>
            <h1 className="font-semibold leading-none">Portfolio</h1>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {isAdmin ? "Admin access" : "Normal access"}
            </p>
          </div>
        </div>
        <nav className="space-y-4">
          {visibleGroups.map(([g, ids]: any) => (
            <div key={g}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-gray-500">
                {g}
              </div>
              <div className="space-y-1">
                {ids.map((id: string) => navButton(id))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 max-w-full overflow-hidden p-6 max-lg:p-0">
        <div className="mobile-appbar">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#4f675b]">
              Portfolio
            </div>
            <h2>{allViews.find((v) => v[0] === view)?.[2]}</h2>
          </div>
          <div className="flex gap-2">
            {MODULES[view] && view !== "dashboard" && (
              <button
                className="btn-primary phone-add-btn"
                onClick={() => setEditing({ moduleKey: view })}
              >
                <Plus size={14} /> Add
              </button>
            )}
            <button
              className="mobile-icon-btn"
              onClick={() => setView("shareList")}
              aria-label="Add share list"
            >
              <UploadCloud size={18} />
            </button>
            <button
              className="mobile-icon-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu-panel">
            {visibleGroups.map(([g, ids]: any) => (
              <section key={g}>
                <div className="mobile-menu-title">{g}</div>
                <div className="mobile-menu-grid">
                  {ids.map((id: string) => navButton(id, true))}
                </div>
              </section>
            ))}
            <div className="mobile-menu-actions">
              <button className="btn" onClick={exportBackup}>
                <Download size={16} /> Backup
              </button>
              <button className="btn" onClick={() => supabase.auth.signOut()}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        )}
        <div className="phone-content min-w-0 max-w-full overflow-hidden">
          {view === "shareList" ? shareListView() : phoneView()}
        </div>
        <div className="desktop-content">
          {view !== "stocks" && (
            <header className="desktop-header mb-5 flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {allViews.find((v) => v[0] === view)?.[2]}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Cloud synced through Supabase. Hosted on Vercel.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2 rounded-full border border-[#e3dccc] bg-white px-3 py-2">
                  <Search size={16} />
                  <input
                    className="w-56 bg-transparent text-sm outline-none"
                    placeholder="Search current screen"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button className="btn" onClick={exportBackup}>
                  <Download size={16} className="inline" /> Backup
                </button>
                <button className="btn" onClick={() => setView("shareList")}>
                  <UploadCloud size={16} className="inline" /> Add Share List
                </button>
                <button className="btn" onClick={() => supabase.auth.signOut()}>
                  <LogOut size={16} className="inline" /> Sign out
                </button>
              </div>
            </header>
          )}
          {view === "dashboard" && dashboardModern()}
          {view === "accounts" && accountsView()}
          {view === "documents" && documentsView()}
          {view === "shareList" && shareListView()}
          {view === "insights" && insights()}
          {view === "recommendations" && recommendationsView()}
          {view === "settings" && settings()}
          {view === "admin" && adminConsole()}
          {MODULES[view] &&
            ![
              "documents",
              "shareList",
              "insights",
              "recommendations",
              "watchlist",
              "settings",
              "admin",
            ].includes(view) &&
            moduleView(view)}
        </div>
        {detail && detailModal()}
        {editing && recordModal()}
        {accModal && accountModal()}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-sage px-5 py-3 text-sm font-bold text-white shadow-2xl">
            {toast}
          </div>
        )}
        {mobileTabAccounts.length > 0 && (
          <div className="mobile-tab-account-menu">
            {mobileTabAccounts.map((account) => (
              <button
                key={account}
                className={
                  accountTab("__phone") === account ? "active" : ""
                }
                onClick={() => {
                  setAccountTabs((p) => ({ ...p, __phone: account }));
                }}
              >
                {account === "All" ? "All" : account}
              </button>
            ))}
          </div>
        )}
        <nav className="mobile-tabbar">
          {mobileTabsByValue.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => selectMobileTab(id)}
              className={view === id ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
  function kpi(
    label: string,
    value: any,
    cls: string,
    note: string,
    icon?: any,
  ) {
    return (
      <div className="rounded-2xl border border-[#e0d8c8] bg-gradient-to-br from-white to-[#fbf8ef] p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
            <div className={`mt-2 truncate text-2xl font-semibold tracking-tight ${cls}`}>{value}</div>
            <div className="mt-1 text-xs font-normal leading-snug text-slate-500">{note}</div>
          </div>
          {icon && <div className="text-2xl opacity-40">{icon}</div>}
        </div>
      </div>
    );
  }
  function isCurrentMonth(v: any) {
    const raw = String(v || "");
    if (!raw) return false;
    const d = new Date(raw),
      now = new Date();
    return (
      !Number.isNaN(d.getTime()) &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }
  function monthlyGainFor(k: string, r: Rec) {
    const d = r.data || {},
      c = computeLiveRecord(k, d),
      direct = num(
        d.monthly_gain || d.month_gain || d.monthlyGain || d.monthly_gain_value,
      );
    if (direct) return direct;
    const baseline = num(
        d.month_start_value ||
          d.month_open_value ||
          d.month_start_latest_value ||
          d.month_start_current_value ||
          d.value_at_month_start,
      ),
      monthContrib = num(
        d.monthly_contribution ||
          d.month_contribution ||
          d.month_net_investment ||
          d.this_month_investment,
      );
    if (baseline) return num(c.latest) - baseline - monthContrib;
    const qty = num(d.quantity),
      startUnit = num(
        d.month_start_price ||
          d.month_start_rate ||
          d.month_start_nav ||
          d.month_open_price ||
          d.month_open_rate ||
          d.month_open_nav,
      );
    if (qty && startUnit) {
      const unit =
        k === "stocks"
          ? num(c.live_price || d.live_price)
          : k === "mutualFunds"
            ? num(c.live_nav || d.live_nav)
            : ["bullion", "nsel"].includes(k)
              ? num(c.live_rate_per_gram || d.live_rate_per_gram)
              : 0;
      if (unit)
        return (
          (unit - startUnit) *
          qty *
          (k === "bullion" ? metalUnitFactor(d.unit) : 1)
        );
    }
    if (isCurrentMonth(d.purchase_date || d.inv_date || r.created_at))
      return num(c.gain);
    if (k === "fixedIncome") {
      const rate = num(d.interest_rate) / 100,
        base = num(c.latest || c.invested);
      if (rate && base) return (base * rate) / 12;
    }
    return 0;
  }
  function aiActionFor(v: {
    invested: number;
    latest: number;
    today: number;
    monthly: number;
    score?: number;
    topPct?: number;
  }) {
    const gainPct = v.invested
      ? ((v.latest - v.invested) / v.invested) * 100
      : 0;
    if (v.topPct && v.topPct > 45) return "Sell / Reduce";
    if (
      gainPct <= -12 ||
      (v.monthly < 0 && v.today < 0) ||
      (v.score !== undefined && v.score < 45)
    )
      return "Sell / Reduce";
    return "Stay Invested";
  }
  function aiSignals(scopeKey?: string) {
    const scoped = !!(scopeKey && MODULES[scopeKey]?.kind === "asset"),
      scopeRows = scoped
        ? records.filter(
            (r) => r.module_key === scopeKey && inAccountTab(scopeKey, r),
          )
        : records.filter((r) => MODULES[r.module_key]?.kind === "asset"),
      scopeTotals = scoped ? computeModuleTotals(scopeKey!, scopeRows) : totals,
      assets = scopeRows.filter((r) => MODULES[r.module_key]?.kind === "asset"),
      gainPct = scopeTotals.invested
        ? (scopeTotals.gain / scopeTotals.invested) * 100
        : 0,
      debtPct = scoped
        ? 0
        : totals.assets
          ? (totals.liabilities / totals.assets) * 100
          : 0,
      missing = assets.filter(
        (r) => !num(computeLiveRecord(r.module_key, r.data).latest),
      ).length,
      top = assets
        .map((r) => ({ r, c: computeLiveRecord(r.module_key, r.data) }))
        .sort((a, b) => num(b.c.latest) - num(a.c.latest))[0],
      topPct =
        top && scopeTotals.assets
          ? (num(top.c.latest) / scopeTotals.assets) * 100
          : 0;
    const score = Math.max(
      0,
      Math.min(
        100,
        62 +
          (gainPct > 0 ? 10 : -8) -
          (debtPct > 35 ? 15 : debtPct / 4) -
          (topPct > 55 ? 10 : 0) -
          Math.min(12, missing * 2) +
          (assets.length >= 2 ? 6 : 0),
      ),
    );
    const daily = scopeRows.reduce(
      (s, r) =>
        showsDailyChange(r.module_key) ? s + todayGainFor(r.module_key, r) : s,
      0,
    );
    const monthly = assets.reduce(
        (s, r) => s + monthlyGainFor(r.module_key, r),
        0,
      ),
      action = aiActionFor({
        invested: scopeTotals.invested,
        latest: scopeTotals.assets,
        today: daily,
        monthly,
        score,
        topPct,
      });
    const name = scoped ? MODULES[scopeKey!].title : "Portfolio",
      scopeLabel = scoped ? `${accountTab(scopeKey!)} ${name}` : "Portfolio";
    const notes = [
      gainPct >= 15
        ? `${scopeLabel} has strong accumulated gains; protect concentration before adding risk.`
        : gainPct > 0
          ? `${scopeLabel} is profitable; new ideas can be staged instead of rushed.`
          : `${scopeLabel} gain is weak; prioritize cleanup and risk controls before fresh bets.`,
      scoped
        ? `${scopeLabel} signal uses only ${scopeRows.length} saved rows from this tab.`
        : debtPct > 35
          ? "Debt is high versus assets; new risk capital should be constrained."
          : "Debt load is not dominating the portfolio.",
      topPct > 55
        ? `Largest row concentration is high at ${pct(topPct)}.`
        : "Concentration is within a workable range.",
      missing
        ? `${missing} rows need current value cleanup for better signals.`
        : "Data coverage is good enough for signal scoring.",
    ];
    return {
      score,
      gainPct,
      debtPct,
      topPct,
      daily,
      monthly,
      action,
      notes,
      scoped,
      scopeKey,
      scopeLabel,
      rowCount: scopeRows.length,
    };
  }
  function aiPortfolioSnapshot() {
    const signal = aiSignals(),
      assetRows = records
        .filter(
          (r) =>
            MODULES[r.module_key]?.kind === "asset" ||
            r.module_key === "insurance",
        )
        .map((r) => {
          const c = computeLiveRecord(r.module_key, r.data),
            value = num(c.latest),
            invested = num(c.invested);
          return {
            name:
              r.module_key === "property"
                ? "Property holding"
                : String(
                    c.security_name ||
                      c.policy_name ||
                      c.category ||
                      MODULES[r.module_key]?.title ||
                      r.module_key,
                  ).slice(0, 90),
            assetClass: MODULES[r.module_key]?.title || r.module_key,
            value,
            invested,
            gain: value - invested,
            gainPct: invested ? ((value - invested) / invested) * 100 : 0,
            todayGain: showsDailyChange(r.module_key)
              ? todayGainFor(r.module_key, r)
              : 0,
            weightPct: totals.assets ? (value / totals.assets) * 100 : 0,
          };
        })
        .sort((a, b) => b.value - a.value),
      allocation = Object.entries(MODULES)
        .filter(([k, d]) => d.kind === "asset" || k === "insurance")
        .map(([k, d]) => {
          const value = records
            .filter((r) => r.module_key === k)
            .reduce(
              (sum, r) => sum + num(computeLiveRecord(k, r.data).latest),
              0,
            );
          return {
            assetClass: d.title,
            value,
            weightPct: totals.assets ? (value / totals.assets) * 100 : 0,
          };
        })
        .filter((row) => row.value)
        .sort((a, b) => b.value - a.value),
      liabilities = ["loans", "borrowings", "property"]
        .map((k) => ({
          kind: k === "property" ? "Property-linked loan" : MODULES[k]?.title || k,
          balance: records
            .filter((r) => r.module_key === k)
            .reduce(
              (sum, r) =>
                sum + num(computeLiveRecord(k, r.data).balance),
              0,
            ),
        }))
        .filter((row) => row.balance),
      goals = records
        .filter((r) => r.module_key === "goals")
        .map((r) => {
          const c = computeRecord("goals", r.data);
          return {
            name: String(c.name || c.category || "Goal").slice(0, 90),
            target: num(c.target_amount),
            current: num(c.current_value),
            gap: num(c.gap),
            targetDate: String(c.target_date || "").slice(0, 10),
          };
        });
    return {
      totals,
      metrics: {
        dailyGain: signal.daily,
        monthlyGain: signal.monthly,
        gainPct: signal.gainPct,
        debtPct: signal.debtPct,
        largestHoldingPct: assetRows[0]?.weightPct || 0,
        trackedRows: assetRows.length,
        missingValues: assetRows.filter((row) => !row.value).length,
      },
      allocation,
      holdings: assetRows,
      liabilities,
      goals,
    };
  }
  async function generateAiReview(question = aiQuestion) {
    const prompt = question.trim();
    if (!prompt) return setAiReviewError("Enter a question for the AI Analyst.");
    if (!session?.access_token)
      return setAiReviewError("Sign in before generating an AI review.");
    setAiQuestion(prompt);
    setAiReviewBusy(true);
    setAiReviewError("");
    try {
      const response = await fetch("/api/ai-advisor", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: prompt,
            snapshot: aiPortfolioSnapshot(),
          }),
        }),
        json = await response.json();
      if (!response.ok)
        throw new Error(json.error || "AI analysis could not be generated.");
      setAiReview(json.analysis);
      setAiReviewMeta({
        model: String(json.model || "AI"),
        generatedAt: String(json.generatedAt || new Date().toISOString()),
      });
    } catch (error: any) {
      setAiReviewError(error?.message || "AI analysis could not be generated.");
    } finally {
      setAiReviewBusy(false);
    }
  }
  function stockAiCandidates() {
    const owned = new Set(
        records
          .filter((r) => r.module_key === "stocks")
          .map((r) =>
            key(r.data?.ticker_symbol || r.data?.security_name || ""),
          ),
      ),
      watch = new Set(
        records
          .filter((r) => r.module_key === "watchlist")
          .map((r) =>
            key(r.data?.ticker_symbol || r.data?.security_name || ""),
          ),
      );
    const sectorBoost: Record<string, number> = {
      "Financial Services": 14,
      Bank: 10,
      IT: 9,
      Defence: 18,
      Infrastructure: 12,
      Metals: 8,
      "Consumer Internet": 16,
      Auto: 9,
      Pharma: 8,
      Power: 10,
      Telecom: 8,
    };
    return ALL_STOCKS.map((s) => {
      const base = 45 + (sectorBoost[s.category] || 5),
        fresh = owned.has(key(s.ticker)) ? -10 : 8,
        watched = watch.has(key(s.ticker)) ? 5 : 0,
        quality = s.exchange === "NSE" ? 4 : 0,
        volatility =
          /Adani|Zomato|Eternal|Tata Motors|Hindalco|JSW|BEL|Jio/i.test(s.name)
            ? 10
            : 3,
        score = Math.min(96, base + fresh + watched + quality + volatility);
      return {
        ...s,
        score,
        signal:
          score >= 82
            ? "Aggressive growth radar"
            : score >= 70
              ? "Accumulation watch"
              : "Research only",
        why: `${s.category} exposure, ${owned.has(key(s.ticker)) ? "already owned" : "not owned"}, momentum-sensitive business.`,
      };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }
  function aiCommandCenter() {
    const scoped = MODULES[view]?.kind === "asset" ? view : undefined,
      s = aiSignals(scoped);
    return (
      <section className="mb-5 rounded-2xl border border-[#cfe4d7] bg-[#f7fcf8] p-4">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          <div>
            <div className="stat-label">
              {s.scoped ? "AI Investment Engine" : "AI Portfolio Engine"}
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${s.score >= 70 ? "text-emerald-700" : s.score >= 45 ? "text-amber-700" : "text-red-700"}`}
            >
              {Math.round(s.score)}/100
            </div>
            <div className="stat-note">
              {s.scoped
                ? `${s.scopeLabel}: ${s.rowCount} rows, selected account only`
                : "Learns from gains, debt, concentration and data coverage"}
            </div>
          </div>
          <div>
            <div className="stat-label">Daily Gain</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.daily >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              {fmt(s.daily)}
            </div>
            <div className="stat-note">
              {s.scoped
                ? `Only ${s.scopeLabel} day movement`
                : "Stocks plus bullion day movement"}
            </div>
          </div>
          <div>
            <div className="stat-label">Monthly Gain</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.monthly >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              {fmt(s.monthly)}
            </div>
            <div className="stat-note">
              Saved, month-start, this-month, or accrual estimate
            </div>
          </div>
          <div>
            <div className="stat-label">AI Recommendation</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.action === "Stay Invested" ? "text-emerald-700" : "text-red-700"}`}
            >
              {s.action}
            </div>
            <div className="stat-note">
              {s.scoped
                ? "Uses only this investment tab data"
                : "Uses gain, monthly move, daily move and concentration"}
            </div>
          </div>
        </div>
      </section>
    );
  }
  function aiRecommendationPanel(scope: "dashboard" | "stocks" | "bullion") {
    const s = aiSignals(),
      stocks = stockAiCandidates().slice(0, 5),
      bullion = records
        .filter((r) => r.module_key === "bullion")
        .map((r) => ({
          r,
          c: computeLiveRecord("bullion", r.data),
          today: todayGainFor("bullion", r),
        }))
        .sort((a, b) => Math.abs(b.today) - Math.abs(a.today));
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Portfolio Signals</h3>
            <p className="text-sm text-gray-600">
              Instant local indicators from your records. Generate an AI
              review for deeper analysis.
            </p>
          </div>
          <button className="btn" onClick={() => setView("insights")}>
            Open Insights
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-1">
          <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
            <div className="stat-label">Daily Gain</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.daily >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              {fmt(s.daily)}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Refresh prices and compare today movement before adding risk.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
            <div className="stat-label">Monthly Gain</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.monthly >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              {fmt(s.monthly)}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Saved, month-start, this-month, or accrual estimate.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
            <div className="stat-label">Local Risk Signal</div>
            <div
              className={`mt-1 text-xl font-semibold ${s.action === "Stay Invested" ? "text-emerald-700" : "text-red-700"}`}
            >
              {s.action}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Stay invested unless losses and concentration trigger sell /
              reduce.
            </p>
          </div>
        </div>
        {scope !== "bullion" && (
          <div className="mt-4">
            {simpleTable(
              ["Stock Radar", "Sector", "AI Score", "Signal"],
              stocks.map((x) => [
                x.name,
                x.category,
                `${x.score}/100`,
                x.signal,
              ]),
            )}
          </div>
        )}
        {scope !== "stocks" && bullion.length > 0 && (
          <div className="mt-4">
            {simpleTable(
              ["Bullion Holding", "Today", "Current Value", "Signal"],
              bullion
                .slice(0, 5)
                .map((x) => [
                  x.c.security_name || "Bullion",
                  fmt(x.today),
                  fmt(x.c.latest),
                  x.today >= 0 ? "Momentum positive" : "Watch drawdown",
                ]),
            )}
          </div>
        )}
      </section>
    );
  }
  function aiAnalystPanel() {
    const quickQuestions = [
        "Where is my biggest concentration or debt risk?",
        "How are gold and silver affecting my portfolio today?",
        "What data is missing before I make decisions?",
        "How should I review my goals against current assets?",
      ],
      riskClass =
        aiReview?.risk_level === "Low"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : aiReview?.risk_level === "Moderate"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-700 border-red-200";
    return (
      <section className="card overflow-hidden border-[#bfd7c7]">
        <div className="border-b border-[#e3dccc] bg-[#f4faf5] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#17382b]">
                AI Portfolio Analyst
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Ask about risk, diversification, bullion movement, debt or
                goals using your current portfolio snapshot.
              </p>
            </div>
            <span className="rounded-full border border-[#cfe4d7] bg-white px-3 py-1 text-xs font-semibold text-[#376454]">
              Secure server analysis
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                className="rounded-full border border-[#d6e4d8] bg-white px-3 py-2 text-xs font-bold text-[#315c4d] transition hover:border-[#78b495]"
                disabled={aiReviewBusy}
                onClick={() => generateAiReview(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3 max-md:flex-col">
            <textarea
              className="field-input min-h-[84px] flex-1 resize-y"
              value={aiQuestion}
              maxLength={500}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask the AI Analyst a portfolio question..."
            />
            <button
              className="btn-primary self-end whitespace-nowrap"
              disabled={aiReviewBusy}
              onClick={() => generateAiReview()}
            >
              {aiReviewBusy ? "Analysing..." : "Generate AI Review"}
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            Sends summarized holdings and figures only. It does not send
            profile details, account names, notes or documents.
          </p>
        </div>
        {aiReviewError && (
          <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {aiReviewError}
          </div>
        )}
        {aiReviewBusy && (
          <div className="p-8 text-center text-sm font-bold text-[#376454]">
            Reviewing allocations, movements, liabilities and goals...
          </div>
        )}
        {!aiReviewBusy && aiReview && (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <h4 className="text-lg font-semibold">{aiReview.headline}</h4>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {aiReview.summary}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`rounded-xl border px-3 py-2 text-sm font-semibold ${riskClass}`}>
                  {aiReview.risk_level} Risk
                </span>
                <span className="rounded-xl border border-[#d8e4d9] bg-[#f7fbf5] px-3 py-2 text-sm font-semibold text-[#17382b]">
                  {aiReview.health_score}/100
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[#d8e4d9] bg-[#f7fbf5] p-4">
              <div className="stat-label">Answer To Your Question</div>
              <p className="mt-2 text-sm leading-6 text-[#17382b]">
                {aiReview.answer}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <h4 className="mb-2 font-semibold text-emerald-800">Strengths</h4>
                <ul className="space-y-2 text-sm text-emerald-950">
                  {aiReview.strengths.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                <h4 className="mb-2 font-semibold text-red-800">Risks</h4>
                <ul className="space-y-2 text-sm text-red-950">
                  {aiReview.risks.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
              <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
                <h4 className="mb-2 font-semibold">Actions To Review</h4>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
                  {aiReview.actions.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
                <h4 className="mb-2 font-semibold">Data Gaps</h4>
                {aiReview.data_gaps.length ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {aiReview.data_gaps.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">
                    No significant missing inputs identified in the snapshot.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-[#eee6d9] pt-4 text-xs font-semibold text-gray-500">
              <span>{aiReview.disclaimer}</span>
              {aiReviewMeta && (
                <span>
                  {aiReviewMeta.model} |{" "}
                  {new Date(aiReviewMeta.generatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
        {!aiReviewBusy && !aiReview && !aiReviewError && (
          <div className="p-5 text-sm text-gray-600">
            Select a question or write your own to generate an AI review. The
            local indicators below remain available without an AI connection.
          </div>
        )}
      </section>
    );
  }
  function marketTodayHeader() {
    const rows = marketToday.length
        ? marketToday
        : [
            { name: "SENSEX" },
            { name: "NIFTY" },
            { name: "CNX Midcap" },
            { name: "NIFTY BANK" },
            { name: "Gold - 10 GM" },
            { name: "Silver - 1 KG" },
            { name: "Dollar / INR" },
            { name: "Crude $ / Barrel" },
          ],
      inr = (v: number, d = 2) =>
        `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`,
      plain = (v: number, d = 2) =>
        Number(v).toLocaleString("en-IN", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        }),
      priceText = (x: any) =>
        x.unit === "USD"
          ? `$${plain(x.price, 2)}`
          : x.name === "Dollar / INR"
            ? plain(x.price, 4)
            : ["Gold - 10 GM", "Silver - 1 KG"].includes(x.name)
              ? inr(x.price, 2)
              : plain(x.price, 2),
      changeText = (x: any) => {
        const c = num(x.change),
          cp = num(x.changePct),
          prefix = c > 0 ? "+" : "";
        if (["Gold - 10 GM", "Silver - 1 KG"].includes(x.name))
          return `${prefix}${inr(c, 0)} (${cp > 0 ? "+" : ""}${cp.toFixed(2)}%)`;
        if (x.name === "Crude $ / Barrel")
          return `${c > 0 ? "+" : ""}$${plain(c, 2)} (${cp > 0 ? "+" : ""}${cp.toFixed(2)}%)`;
        return `${prefix}${plain(c, 2)} (${cp > 0 ? "+" : ""}${cp.toFixed(2)}%)`;
      },
      refreshText = autoRefresh ? "Auto refresh 60 sec" : "Auto refresh Off";
    return (
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3dccc] bg-[#fffdf8] px-5 py-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-lg font-semibold uppercase text-[#004080]">
              Market
            </h3>
            <span className="text-lg text-[#004080]">Today</span>
            <span className="text-xs font-semibold text-gray-500">
              {new Date().toLocaleDateString()}{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-[#d8e4d9] bg-white px-3 py-2 text-xs font-semibold text-[#4f675b] transition hover:bg-[#f7fbf5]"
              onClick={refreshMarketToday}
            >
              Manual refresh
            </button>
            <span className="rounded-full border border-[#d8e4d9] bg-[#f7fbf5] px-3 py-2 text-xs font-semibold text-[#4f675b]">
              {refreshText}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-8 divide-x divide-[#eef0e8] bg-white max-2xl:grid-cols-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
          {rows.map((x: any) => (
            <div
              key={x.name}
              className="min-w-0 px-4 py-4 transition hover:bg-[#f7fbf5]"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[#17382b]">
                {x.name}
              </div>
              <div className="mt-2 whitespace-nowrap text-2xl font-semibold leading-none tabular-nums text-black">
                {x.ok ? priceText(x) : "Loading"}
              </div>
              <div
                className={`mt-2 flex items-center gap-1 whitespace-nowrap text-xs font-semibold tabular-nums ${num(x.change) >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {x.ok && Number.isFinite(Number(x.change)) ? (
                  <>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${num(x.change) >= 0 ? "bg-emerald-600" : "bg-red-500"}`}
                    />
                    <span>{changeText(x)}</span>
                  </>
                ) : (
                  ""
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  function detailedMetrics() {
    const loanRecords = records
        .filter((r) => r.module_key === "loans")
        .map((r) => computeRecord("loans", r.data)),
      propertyLoans = records
        .filter((r) => r.module_key === "property")
        .map((r) => computeRecord("property", r.data))
        .filter((r) => num(r.loan_balance) > 0),
      totalLoanEmi = loanRecords.reduce(
        (s, r) =>
          s +
          num(r.balance ? (r.balance * num(r.interest_rate)) / 100 / 12 : 0),
        0,
      ),
      totalPropertyEmi = propertyLoans.reduce(
        (s, r) =>
          s + num(r.emiFuture ? r.emiFuture / num(r.emis_left || 1) : 0),
        0,
      ),
      monthlyObligation = totalLoanEmi + totalPropertyEmi;
    return (
      <section className="card-gradient p-6">
        <h3 className="mb-4 text-xl font-semibold">Financial Metrics</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="text-xs font-semibold uppercase text-gray-600">
              Monthly EMI
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {fmt(monthlyObligation)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Loan + Property EMI
            </div>
          </div>
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="text-xs font-semibold uppercase text-gray-600">
              Net Income Available
            </div>
            <div className="mt-2 text-2xl font-semibold text-blue-700">
              {fmt(totals.assets - totals.liabilities)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Assets - Liabilities
            </div>
          </div>
          <div className="rounded-2xl bg-white/60 p-4">
            <div className="text-xs font-semibold uppercase text-gray-600">
              Asset Turnover Ratio
            </div>
            <div className="mt-2 text-2xl font-semibold text-purple-700">
              {num(totals.invested) > 0
                ? (totals.assets / totals.invested).toFixed(2)
                : "0.00"}
              x
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Current value / Invested
            </div>
          </div>
        </div>
      </section>
    );
  }
  function simpleTable(headers: string[], rows: any[][]) {
    return rows.length ? (
      <div className="overflow-auto rounded-3xl border border-[#e3dccc] bg-white table-smooth">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  className="text-left text-xs uppercase tracking-widest"
                  key={h}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td className="text-sm" key={j}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty text="No data yet." />
    );
  }
  function liveMetalQuote(d: any) {
    const asset = metalAsset(d);
    return asset === "silver"
      ? bullionMarket?.silver
      : asset === "gold"
        ? bullionMarket?.gold
        : null;
  }
  function computeLiveRecord(k: string, d: any) {
    const c = computeRecord(k, d);
    if (k === "fixedIncome") {
      c.category = fixedIncomeCategoryLabel(c.category);
    }
    if (k === "bullion") {
      const asset = metalAsset(d),
        q = liveMetalQuote(d),
        rate = num(q?.ratePerGramInr),
        changePerGram = num(q?.changePerGramInr),
        currentPrice =
          asset === "silver"
            ? num(q?.ratePerKgInr)
            : asset === "gold"
              ? num(q?.ratePer10GramInr)
              : rate,
        dayChange =
          asset === "silver"
            ? num(q?.changePerKgInr)
            : asset === "gold"
              ? num(q?.changePer10GramInr)
              : changePerGram;
      Object.assign(c, { security_name: bullionDisplayName(d) });
      if (currentPrice) Object.assign(c, { current_price: currentPrice, day_change: dayChange });
      if (rate && num(d.quantity)) {
        const grams = num(d.quantity) * metalUnitFactor(d.unit),
          latest = grams * rate,
          invested = num(c.invested);
        Object.assign(c, {
          latest,
          latest_value: latest,
          live_rate_per_gram: rate,
          today_gain: grams * changePerGram,
          gain: latest - invested,
          gain_pct: invested ? ((latest - invested) / invested) * 100 : 0,
        });
      }
    }
    return c;
  }
  function computeLiveTotals(rs: Rec[]) {
    let assets = 0,
      liabilities = 0,
      invested = 0,
      gain = 0;
    rs.forEach((rec) => {
      const k = rec.module_key,
        c = computeLiveRecord(k, rec.data);
      if (
        [
          "stocks",
          "mutualFunds",
          "ulips",
          "bullion",
          "nsel",
          "fixedIncome",
          "property",
          "otherAssets",
        ].includes(k)
      ) {
        assets += num(c.latest);
        invested += num(c.invested);
        gain += num(c.gain);
      }
      if (k === "insurance") assets += num(c.latest);
      if (["loans", "borrowings"].includes(k)) liabilities += num(c.balance);
      if (k === "property") liabilities += num(c.balance);
    });
    return {
      assets,
      liabilities,
      net: assets - liabilities,
      invested,
      gain,
    };
  }
  function computeModuleTotals(k: string, rs: Rec[]) {
    if (k !== "bullion") return computeTotals(rs);
    let assets = 0,
      invested = 0;
    rs.forEach((r) => {
      const c = computeLiveRecord(k, r.data);
      assets += num(c.latest);
      invested += num(c.invested);
    });
    return {
      assets,
      liabilities: 0,
      net: assets,
      invested,
      gain: assets - invested,
    };
  }
  function todayGainFor(k: string, r: Rec) {
    const d = r.data || {},
      c = computeLiveRecord(k, d),
      direct = num(d.today_gain || d.todays_gain || d.day_gain);
    if (k === "bullion") {
      const grams = num(d.quantity) * metalUnitFactor(d.unit),
        q = liveMetalQuote(d),
        chg = num(q?.changePerGramInr);
      if (chg && grams) return chg * grams;
      const rate = num(q?.ratePerGramInr) || num(d.live_rate_per_gram),
        prevRate = num(q?.previousPerGramInr) || num(d.previous_rate_per_gram);
      if (rate && prevRate && grams) return (rate - prevRate) * grams;
    }
    if (direct) return direct;
    const dayChange = num(d.day_change || d.price_change || d.change);
    if (dayChange && num(d.quantity)) return dayChange * num(d.quantity);
    const prev = num(d.previous_close || d.prev_close || d.previous_price);
    if (prev && num(d.quantity) && (k === "stocks" || k === "mutualFunds"))
      return (num(c.live_price || c.live_nav) - prev) * num(d.quantity);
    return 0;
  }
  function dashboardTabs() {
    return (
      <div className="flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-white p-1">
        <button
          onClick={() => setDetailTabs((p) => ({ ...p, dashboard: "summary" }))}
          className="shrink-0 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-white"
        >
          Overall Dashboard
        </button>
      </div>
    );
  }
  function holdingBrokerTabs(k: string) {
    const selected = detailTabs[k] || "holdings";
    return (
      <div className="mb-4 flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-[#fffdf8] p-1">
        <button
          onClick={() => setDetailTabs((p) => ({ ...p, [k]: "holdings" }))}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${selected === "holdings" ? "bg-sage text-white" : "hover:bg-[#eef5ee]"}`}
        >
          Holdings
        </button>
        <button
          onClick={() => setDetailTabs((p) => ({ ...p, [k]: "brokers" }))}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${selected === "brokers" ? "bg-sage text-white" : "hover:bg-[#eef5ee]"}`}
        >
          Broker Details
        </button>
        {k === "stocks" && (
          <button
            onClick={() => setDetailTabs((p) => ({ ...p, [k]: "watchlist" }))}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${selected === "watchlist" ? "bg-sage text-white" : "hover:bg-[#eef5ee]"}`}
          >
            Watchlist
          </button>
        )}
      </div>
    );
  }
  function portfolioSummaryTable() {
    const investmentKeys = [
      "stocks",
      "mutualFunds",
      "ulips",
      "bullion",
      "nsel",
      "fixedIncome",
      "property",
      "otherAssets",
    ];
    const liabilityKeys = ["loans", "borrowings"];
    const investmentRows = investmentKeys
      .filter((k) => MODULES[k])
      .map((k) => {
        const def = MODULES[k],
          rs = records.filter((r) => r.module_key === k),
          invested = rs.reduce(
            (s, r) => s + num(computeLiveRecord(k, r.data).invested),
            0,
          ),
          latest = rs.reduce(
            (s, r) => s + num(computeLiveRecord(k, r.data).latest),
            0,
          ),
          interestIncurredFy =
            k === "fixedIncome"
              ? rs.reduce(
                  (s, r) =>
                    s + num(computeLiveRecord(k, r.data).interest_incurred_fy),
                  0,
                )
              : 0,
          gain = latest - invested,
          today = showsDailyChange(k)
            ? rs.reduce((s, r) => s + todayGainFor(k, r), 0)
            : 0;
        return {
          k,
          openKey: k,
          def,
          rs,
          invested,
          latest,
          gain,
          today,
          interestIncurredFy,
          deathCover: 0,
          liability: false,
          protection: false,
          synthetic: false,
        };
      });
    const insuranceRecords = records.filter((r) => r.module_key === "insurance");
    const insuranceRows = MODULES.insurance
      ? [
          {
            k: "insurance",
            openKey: "insurance",
            def: MODULES.insurance,
            rs: insuranceRecords,
            invested: insuranceRecords.reduce(
              (s, r) => s + num(computeLiveRecord("insurance", r.data).invested),
              0,
            ),
            latest: insuranceRecords.reduce(
              (s, r) => s + num(computeLiveRecord("insurance", r.data).latest),
              0,
            ),
            gain: 0,
            today: 0,
            interestIncurredFy: 0,
            deathCover: insuranceRecords.reduce(
              (s, r) =>
                s + num(computeLiveRecord("insurance", r.data).death_cover_value),
              0,
            ),
            liability: false,
            protection: true,
            synthetic: false,
          },
        ]
      : [];
    const propertyLoanRecords = records
        .filter((r) => r.module_key === "property")
        .map((r) => computeRecord("property", r.data))
        .filter((r) => num(r.loan_balance) > 0),
      propertyLoanBalance = propertyLoanRecords.reduce(
        (s, r) => s + num(r.loan_balance),
        0,
      );
    const liabilityRows = liabilityKeys
      .filter((k) => MODULES[k])
      .map((k) => {
        const def = MODULES[k],
          baseRs = records.filter((r) => r.module_key === k),
          rs =
            k === "loans"
              ? [
                  ...baseRs,
                  ...propertyLoanRecords.map((data: any) => ({
                    id: `property-loan-${data.location || data.security_name || Math.random()}`,
                    user_id: "",
                    module_key: "property",
                    data,
                  })),
                ]
              : baseRs,
          balance =
            baseRs.reduce(
              (s, r) => s + num(computeRecord(k, r.data).balance),
              0,
            ) + (k === "loans" ? propertyLoanBalance : 0);
        return {
          k,
          openKey: k,
          def,
          rs,
          invested: balance,
          latest: -balance,
          gain: 0,
          today: 0,
          interestIncurredFy: 0,
          deathCover: 0,
          liability: true,
          protection: false,
          synthetic: false,
        };
      });
    const rows = [...investmentRows, ...insuranceRows, ...liabilityRows].filter(
      (r) => r.rs.length || r.invested || r.latest || r.gain || r.today,
    );
    const todayTotal = rows
      .filter((r) => showsDailyChange(r.k))
      .reduce((s, r) => s + r.today, 0);
    const assetCurrent = rows
        .filter((r) => !r.liability)
        .reduce((s, r) => s + num(r.latest), 0),
      liabilityCurrent = rows
        .filter((r) => r.liability)
        .reduce((s, r) => s + Math.abs(num(r.latest)), 0),
      fixedIncomeCurrentWorth =
        rows.find((r) => r.k === "fixedIncome")?.latest || 0,
      fixedIncomeInterest =
        rows.find((r) => r.k === "fixedIncome")?.interestIncurredFy || 0;
    return (
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3dccc] bg-[#fffdf8] px-5 py-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Overall Dashboard</h3>
            <p className="mt-1 text-xs font-semibold text-gray-600">
              Assets {fmt(assetCurrent)} | Liabilities {fmt(liabilityCurrent)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#40584c]">
              Net Worth = Stocks + Mutual Funds + ULIPs + Bullion + NSEL
              e-Series + Fixed Income + Insurance + Property + Other Assets -
              Loans (incl. property-linked loans) - Borrowings ={" "}
              {fmt(assetCurrent - liabilityCurrent)}
            </p>
            {!!fixedIncomeCurrentWorth && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Fixed Income current worth {fmt(fixedIncomeCurrentWorth)} includes
                FY interest {fmt(fixedIncomeInterest)}
              </p>
            )}
          </div>
          <button className="btn" onClick={() => setView("shareList")}>
            <UploadCloud size={16} className="inline" /> Add Share List
          </button>
        </div>
        <div className="overflow-auto bg-white">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-[#efe9e1] text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#40584c]">
                  Particulars
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#40584c]">
                  Investments
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#40584c]">
                  Todays Gain
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#40584c]">
                  Overall Gain
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#40584c]">
                  Current Value
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasToday = showsDailyChange(row.k),
                  gainPct =
                    row.invested && !row.liability
                      ? (row.gain / row.invested) * 100
                      : 0,
                  todayPct = Math.abs(row.latest)
                    ? (row.today / Math.abs(row.latest)) * 100
                    : 0;
                return (
                  <tr
                    key={row.k}
                    className={`cursor-pointer border-t border-[#e7ebdf] transition hover:bg-[#f8fbf6] ${row.liability ? "bg-red-50/20" : ""}`}
                    onClick={() => openModuleAll(row.openKey)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold ${row.liability ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModuleAll(row.openKey);
                          }}
                        >
                          {row.def.emoji || row.def.title.slice(0, 2)}
                        </button>
                        <button
                          className="font-semibold text-[#004080] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModuleAll(row.openKey);
                          }}
                        >
                          {row.def.title}
                        </button>
                        <span className="text-xs font-semibold text-gray-500">
                          {row.rs.length} rows
                        </span>
                        <button
                          className="text-xs font-semibold text-blue-700 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModuleAll(row.openKey);
                          }}
                        >
                          All
                        </button>
                        {!row.liability && !row.synthetic && (
                          <button
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing({ moduleKey: row.openKey });
                            }}
                          >
                            Add
                          </button>
                        )}
                        {row.rs.length > 0 && !row.synthetic && (
                          <button
                            className="text-xs font-semibold text-blue-700 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModuleAll(row.openKey);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold tabular-nums">
                      {row.protection ? (
                        <>
                          {fmt(row.invested)}
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Premiums paid till date
                          </div>
                        </>
                      ) : (
                        fmt(row.invested)
                      )}
                    </td>
                    {row.protection ? (
                      <>
                        <td className="px-4 py-4 text-right text-gray-400">-</td>
                        <td className="px-4 py-4 text-right text-gray-400">-</td>
                      </>
                    ) : (
                      <>
                        {hasToday ? (
                          <td
                            className={`px-4 py-4 text-right tabular-nums ${row.today >= 0 ? "text-green-700" : "text-red-700"}`}
                          >
                            <span className="font-bold">{fmt(row.today)}</span>{" "}
                            <span className="text-xs text-[#17382b]">
                              ({pct(todayPct)})
                            </span>
                          </td>
                        ) : (
                          <td className="px-4 py-4 text-right text-gray-400">
                            -
                          </td>
                        )}
                        <td
                          className={`px-4 py-4 text-right tabular-nums ${row.gain >= 0 ? "text-green-700" : "text-red-700"}`}
                        >
                          <span className="font-bold">
                            {row.liability ? fmt(0) : fmt(row.gain)}
                          </span>{" "}
                          {!row.liability && (
                            <span className="text-xs text-[#17382b]">
                              ({pct(gainPct)})
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td
                      className={`px-4 py-4 text-right font-bold tabular-nums ${row.latest < 0 ? "text-red-700" : "text-[#17382b]"}`}
                    >
                      {fmt(row.latest)}
                      {row.protection && (
                        <>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Closed excluded; LIC: premiums paid + accrued yearly bonus
                          </div>
                          {!!row.deathCover && (
                            <div className="text-[10px] font-semibold text-blue-700">
                              Death cover retained {fmt(row.deathCover)} (not in net worth)
                            </div>
                          )}
                        </>
                      )}
                      {row.k === "fixedIncome" && (
                        <>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Current Worth Till Date
                          </div>
                          <div className="text-[10px] font-semibold text-emerald-700">
                            Includes FY interest {fmt(row.interestIncurredFy)}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[#78b495] bg-[#f7fbf5] font-semibold">
                <td className="px-4 py-3 text-[#004080]">My Networth</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {fmt(totals.invested)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${todayTotal >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {fmt(todayTotal)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${totals.gain >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {fmt(totals.gain)}{" "}
                  <span className="text-xs text-[#17382b]">
                    (
                    {pct(
                      totals.invested
                        ? (totals.gain / totals.invested) * 100
                        : 0,
                    )}
                    )
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {fmt(totals.net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  function dashboardFeaturePanels() {
    return (
      <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
        {dataFreshnessPanel()}
        {assetAllocationPanel()}
      </div>
    );
  }
  function recordFreshDate(r: Rec) {
    return String(
      r.data?.last_updated_at ||
        r.data?.data_uploaded_at ||
        r.updated_at ||
        r.created_at ||
        "",
    );
  }
  function ageDays(date: string) {
    const t = Date.parse(date);
    if (!t) return 9999;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  }
  function dataFreshnessPanel() {
    const keys = [
        "stocks",
        "bullion",
        "mutualFunds",
        "ulips",
        "nsel",
        "fixedIncome",
        "insurance",
        "property",
        "otherAssets",
        "loans",
        "borrowings",
      ],
      rows = keys
        .map((k) => {
          const rs = records.filter((r) => r.module_key === k),
            latest =
              rs.map(recordFreshDate).filter(Boolean).sort().at(-1) || "",
            days = ageDays(latest),
            status = !rs.length
              ? "No data"
              : days > 30
                ? "Stale"
                : days > 7
                  ? "Review"
                  : "Fresh";
          return { k, rs, latest, days, status };
        })
        .filter((x) => x.rs.length);
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <h3 className="text-xl font-semibold tracking-tight">Data Freshness</h3>
          <p className="mt-1 text-sm text-gray-600">
            Last uploaded or edited date by asset class.
          </p>
        </div>
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((x) => (
              <button
                key={x.k}
                onClick={() => openModuleAll(x.k)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e3dccc] bg-white px-3 py-2 text-left transition hover:border-[#78b495]"
              >
                <div>
                  <div className="font-semibold text-[#004080]">
                    {MODULES[x.k]?.title}
                  </div>
                  <div className="text-xs font-semibold text-gray-500">
                    {x.latest
                      ? new Date(x.latest).toLocaleDateString()
                      : "No date"}{" "}
                    | {x.rs.length} rows
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${x.status === "Fresh" ? "bg-emerald-50 text-emerald-700" : x.status === "Review" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                >
                  {x.status === "Fresh" ? "Fresh" : `${x.days} days`}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty text="No uploaded data yet." />
        )}
      </section>
    );
  }
  function netWorthSnapshots() {
    const raw = records
      .filter((r) => r.module_key === NET_WORTH_SNAPSHOT_MODULE)
      .map((r) => ({
        date: String(r.data?.snapshot_date || r.created_at || "").slice(0, 10),
        net: num(r.data?.net),
        assets: num(r.data?.assets),
        liabilities: num(r.data?.liabilities),
        gain: num(r.data?.gain),
      }))
      .filter((x) => x.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    const today = isoDate();
    if (!raw.some((x) => x.date === today))
      raw.push({
        date: today,
        net: totals.net,
        assets: totals.assets,
        liabilities: totals.liabilities,
        gain: totals.gain,
      });
    return raw.slice(-30);
  }
  function nearestSnapshot(snaps: any[], date: string) {
    return [...snaps].reverse().find((x) => x.date <= date) || snaps[0];
  }
  function netWorthHistoryPanel() {
    const snaps = netWorthSnapshots(),
      min = Math.min(...snaps.map((x) => x.net), totals.net),
      max = Math.max(...snaps.map((x) => x.net), totals.net),
      span = Math.max(1, max - min),
      first = snaps[0],
      last = snaps.at(-1),
      yesterday = nearestSnapshot(snaps, addDaysIso(isoDate(), -1)),
      monthStart = nearestSnapshot(
        snaps,
        isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      ),
      yearStart = nearestSnapshot(
        snaps,
        isoDate(new Date(new Date().getFullYear(), 0, 1)),
      ),
      totalMove = (last?.net || 0) - (first?.net || 0);
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Net Worth History</h3>
            <p className="mt-1 text-sm text-gray-600">
              Automatic daily snapshots, starting now.
            </p>
          </div>
          <span
            className={`pill ${totalMove >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {fmt(totalMove)}
          </span>
        </div>
        <div className="flex h-36 items-end gap-2 rounded-2xl border border-[#e3dccc] bg-white p-3">
          {snaps.map((x) => (
            <div
              key={x.date}
              title={`${x.date}: ${fmt(x.net)}`}
              className="flex min-w-5 flex-1 items-end"
            >
              <div
                className={`w-full rounded-t-lg ${x.net >= 0 ? "bg-[#78b495]" : "bg-red-300"}`}
                style={{
                  height: `${Math.max(8, ((x.net - min) / span) * 100)}%`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 max-md:grid-cols-1">
          {kpi(
            "Daily Trend",
            fmt((last?.net || 0) - (yesterday?.net || last?.net || 0)),
            (last?.net || 0) >= (yesterday?.net || last?.net || 0)
              ? "text-emerald-700"
              : "text-red-700",
            "Latest snapshot move",
          )}
          {kpi(
            "Monthly Trend",
            fmt((last?.net || 0) - (monthStart?.net || last?.net || 0)),
            (last?.net || 0) >= (monthStart?.net || last?.net || 0)
              ? "text-emerald-700"
              : "text-red-700",
            "Since month start",
          )}
          {kpi(
            "Yearly Trend",
            fmt((last?.net || 0) - (yearStart?.net || last?.net || 0)),
            (last?.net || 0) >= (yearStart?.net || last?.net || 0)
              ? "text-emerald-700"
              : "text-red-700",
            "Since year start",
          )}
        </div>
      </section>
    );
  }
  function assetAllocationPanel() {
    const assetKeys = [
        "stocks",
        "bullion",
        "mutualFunds",
        "ulips",
        "nsel",
        "fixedIncome",
        "insurance",
        "property",
        "otherAssets",
      ],
      liabilityKeys = ["loans", "borrowings"],
      propertyLoanBalance = records
        .filter((r) => r.module_key === "property")
        .reduce(
          (s, r) => s + num(computeRecord("property", r.data).loan_balance),
          0,
        ),
      rows = [
        ...assetKeys.map((k) => {
          const latest = records
            .filter((r) => r.module_key === k)
            .reduce((s, r) => s + num(computeLiveRecord(k, r.data).latest), 0);
          return {
            k,
            title: MODULES[k]?.title || k,
            value: latest,
            liability: false,
          };
        }),
        ...liabilityKeys.map((k) => {
          const value =
            records
              .filter((r) => r.module_key === k)
              .reduce((s, r) => s + num(computeRecord(k, r.data).balance), 0) +
            (k === "loans" ? propertyLoanBalance : 0);
          return { k, title: MODULES[k]?.title || k, value, liability: true };
        }),
      ].filter((x) => x.value),
      total = rows.reduce((s, x) => s + Math.abs(x.value), 0),
      colors = [
        "#115c45",
        "#d4a017",
        "#2f6fb0",
        "#9c5a8f",
        "#4f7c59",
        "#7c6f57",
        "#b95c2b",
        "#6b7280",
        "#b91c1c",
        "#c2410c",
      ];
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <h3 className="text-xl font-semibold tracking-tight">Asset Allocation</h3>
          <p className="mt-1 text-sm text-gray-600">
            Assets and liabilities by current value.
          </p>
        </div>
        {rows.length ? (
          <>
            <div className="mb-4 flex h-5 overflow-hidden rounded-full bg-[#eef5ee]">
              {rows.map((x, i) => (
                <div
                  key={x.k}
                  className={x.liability ? "opacity-80" : ""}
                  style={{
                    width: `${Math.max(2, (Math.abs(x.value) / total) * 100)}%`,
                    backgroundColor: colors[i % colors.length],
                  }}
                  title={`${x.title}: ${pct((Math.abs(x.value) / total) * 100)}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              {rows.map((x, i) => (
                <div
                  key={x.k}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                    <span className="font-semibold">{x.title}</span>
                    {x.liability && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        Liability
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${x.liability ? "text-red-700" : "text-[#17382b]"}`}
                    >
                      {fmt(x.liability ? -x.value : x.value)}
                    </div>
                    <div className="text-xs font-semibold text-gray-500">
                      {pct((Math.abs(x.value) / total) * 100)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty text="No allocation data yet." />
        )}
      </section>
    );
  }
  function riskOpportunityPanel() {
    const assetRows = records
        .filter((r) => MODULES[r.module_key]?.kind === "asset")
        .map((r) => {
          const c = computeLiveRecord(r.module_key, r.data);
          return {
            r,
            c,
            weight: totals.assets ? (num(c.latest) / totals.assets) * 100 : 0,
            gain: num(c.gain),
          };
        }),
      top = [...assetRows].sort((a, b) => b.weight - a.weight)[0],
      debtPct = totals.assets ? (totals.liabilities / totals.assets) * 100 : 0,
      missing = records
        .filter(
          (r) =>
            MODULES[r.module_key]?.kind === "asset" &&
            (!r.data?.purchase_date ||
              !num(computeLiveRecord(r.module_key, r.data).latest)),
        )
        .slice(0, 5),
      performers = [...assetRows]
        .filter((x) => num(x.c.invested))
        .sort((a, b) => b.gain - a.gain),
      alerts = [
        top && top.weight > 50
          ? `${MODULES[top.r.module_key]?.title} concentration is high at ${pct(top.weight)}.`
          : "Largest asset class concentration is manageable.",
        debtPct > 35
          ? `Debt-to-asset ratio is elevated at ${pct(debtPct)}.`
          : `Debt-to-asset ratio is ${pct(debtPct)}.`,
        missing.length
          ? `${missing.length} visible records need purchase date or current value cleanup.`
          : "No major missing-data issues detected.",
      ];
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4">
          <h3 className="text-xl font-semibold tracking-tight">Risk & Performers</h3>
          <p className="mt-1 text-sm text-gray-600">
            Concentration, debt and best / worst movers.
          </p>
        </div>
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={a}
              className={`rounded-2xl border px-3 py-2 text-sm font-bold ${(i === 0 && top?.weight > 50) || (i === 1 && debtPct > 35) || (i === 2 && missing.length) ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
            >
              {a}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <div>
            {simpleTable(
              ["Best", "Gain"],
              performers
                .slice(0, 3)
                .map((x) => [
                  x.c.security_name ||
                    x.c.category ||
                    MODULES[x.r.module_key]?.title,
                  fmt(x.gain),
                ]),
            )}
          </div>
          <div>
            {simpleTable(
              ["Worst", "Gain"],
              performers
                .slice(-3)
                .reverse()
                .map((x) => [
                  x.c.security_name ||
                    x.c.category ||
                    MODULES[x.r.module_key]?.title,
                  fmt(x.gain),
                ]),
            )}
          </div>
        </div>
      </section>
    );
  }
  function brokerDetailsTable(
    title: string,
    moduleKeys: string[],
    sourceRecords?: Rec[],
  ) {
    const source =
        sourceRecords ||
        records.filter((r) => moduleKeys.includes(r.module_key)),
      groups = new Map<
        string,
        {
          moduleKey: string;
          broker: string;
          holding: string;
          records: Rec[];
          invested: number;
          latest: number;
          today: number;
          computed: Record<string, any>;
        }
      >();
    source.forEach((r) => {
      const broker =
          String(
            r.data?.broker || r.data?.source || r.data?.vault || "Unassigned",
          ).trim() || "Unassigned",
        holding =
          r.module_key === "bullion"
            ? bullionDisplayName(r.data)
            : String(
                r.data?.security_name ||
                  r.data?.category ||
                  r.data?.location ||
                  MODULES[r.module_key]?.title ||
                  "Holding",
              ),
        id = `${r.module_key}|${broker}|${key(holding)}|${key(r.data?.ticker_symbol || r.data?.unit || "")}`,
        c = computeLiveRecord(r.module_key, r.data),
        g = groups.get(id) || {
          moduleKey: r.module_key,
          broker,
          holding,
          records: [],
          invested: 0,
          latest: 0,
          today: 0,
          computed: { ...c },
        };
      g.records.push(r);
      g.invested += num(c.invested);
      g.latest += num(c.latest);
      g.today += todayGainFor(r.module_key, r);
      g.computed = {
        ...g.computed,
        broker,
        security_name: holding,
        invested: g.invested,
        latest: g.latest,
        gain: g.latest - g.invested,
        gain_pct: g.invested ? ((g.latest - g.invested) / g.invested) * 100 : 0,
        today_gain: g.today,
      };
      groups.set(id, g);
    });
    const rows = Array.from(groups.values()).sort(
      (a, b) => a.broker.localeCompare(b.broker) || b.latest - a.latest,
    );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <h3 className="mb-3 text-xl font-semibold">{title}</h3>
        {rows.length ? (
          <div className="overflow-auto rounded-2xl border border-[#e3dccc] bg-white">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3">Broker / Source</th>
                  <th>Holding</th>
                  <th>Section</th>
                  <th className="text-right">Invested</th>
                  <th className="text-right">Todays Gain</th>
                  <th className="text-right">Overall Gain</th>
                  <th className="text-right">Current Value</th>
                  <th className="p-3">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const gain = row.latest - row.invested,
                    gainPct = row.invested ? (gain / row.invested) * 100 : 0,
                    cols = [
                      ...new Set([
                        ...(MODULES[row.moduleKey]?.cols || []),
                        "broker",
                        "today_gain",
                      ]),
                    ];
                  return (
                    <tr
                      key={`${row.moduleKey}-${row.broker}-${row.holding}`}
                      className="cursor-pointer border-t border-[#eee6d9] hover:bg-[#f7faf6]"
                      onClick={() =>
                        setDetail({
                          moduleKey: row.moduleKey,
                          record: row.records[0],
                          computed: row.computed,
                          cols,
                        })
                      }
                    >
                      <td className="p-3 font-semibold">{row.broker}</td>
                      <td>
                        <button
                          className="font-semibold text-[#004080]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail({
                              moduleKey: row.moduleKey,
                              record: row.records[0],
                              computed: row.computed,
                              cols,
                            });
                          }}
                        >
                          {row.holding}
                        </button>
                      </td>
                      <td>{MODULES[row.moduleKey]?.title || row.moduleKey}</td>
                      <td className="text-right font-bold">
                        {fmt(row.invested)}
                      </td>
                      <td
                        className={`text-right ${row.today >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {fmt(row.today)}
                      </td>
                      <td
                        className={`text-right ${gain >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {fmt(gain)}{" "}
                        <span className="text-xs text-[#17382b]">
                          ({pct(gainPct)})
                        </span>
                      </td>
                      <td className="text-right font-bold">
                        {fmt(row.latest)}
                      </td>
                      <td className="p-3">
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail({
                              moduleKey: row.moduleKey,
                              record: row.records[0],
                              computed: row.computed,
                              cols,
                            });
                          }}
                      >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No broker details yet." />
        )}
      </section>
    );
  }
  function stockBrokerDetailsTable(title: string, sourceRecords: Rec[]) {
    const q = query.toLowerCase(),
      rows = sourceRecords
        .map((r) => {
          const broker =
              String(
                r.data?.broker ||
                  r.data?.source ||
                  r.data?.vault ||
                  "Unassigned",
              ).trim() || "Unassigned",
            holding = String(r.data?.security_name || "Holding"),
            purchaseDate = String(r.data?.purchase_date || ""),
            quantity = String(r.data?.quantity ?? ""),
            lastTradeTime = String(r.data?.last_trade_time || ""),
            lastTradeQuantity = String(r.data?.last_trade_quantity ?? ""),
            bestBid = String(r.data?.best_bid ?? ""),
            bestAsk = String(r.data?.best_ask ?? ""),
            bestBidQuantity = String(r.data?.best_bid_quantity ?? ""),
            bestAskQuantity = String(r.data?.best_ask_quantity ?? ""),
            spread = String(r.data?.bid_ask_spread ?? ""),
            c = computeRecord("stocks", r.data),
            today = todayGainFor("stocks", r);
          return {
            r,
            broker,
            holding,
            purchaseDate,
            quantity,
            lastTradeTime,
            lastTradeQuantity,
            bestBid,
            bestAsk,
            bestBidQuantity,
            bestAskQuantity,
            spread,
            c,
            today,
          };
        })
        .filter((row) =>
          JSON.stringify({
            broker: row.broker,
            holding: row.holding,
            purchase_date: row.purchaseDate,
            quantity: row.quantity,
            last_trade_time: row.lastTradeTime,
            last_trade_quantity: row.lastTradeQuantity,
            best_bid: row.bestBid,
            best_ask: row.bestAsk,
            bid_ask_spread: row.spread,
            ...row.r.data,
          })
            .toLowerCase()
            .includes(q),
        )
        .sort((a, b) => {
          const bc = a.broker.localeCompare(b.broker);
          if (bc) return bc;
          const hc = a.holding.localeCompare(b.holding);
          if (hc) return hc;
          const ad = a.purchaseDate,
            bd = b.purchaseDate,
            ha = !!ad,
            hb = !!bd;
          if (ha !== hb) return ha ? -1 : 1;
          const dc = ad.localeCompare(bd);
          if (dc) return dc;
          return num(b.c.latest) - num(a.c.latest);
        });
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <h3 className="mb-3 text-xl font-semibold">{title}</h3>
        {rows.length ? (
          <div className="overflow-auto rounded-2xl border border-[#e3dccc] bg-white">
            <table className="w-full min-w-[1720px] border-collapse text-sm">
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3">Broker / Source</th>
                  <th className="p-3">Holding</th>
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Live Price</th>
                  <th className="p-3 text-right">Today Change</th>
                  <th className="p-3 text-right">Day High / Low</th>
                  <th className="p-3 text-right">52 Week High / Low</th>
                  <th className="p-3 text-right">Bid / Ask</th>
                  <th className="p-3">Last Trade</th>
                  <th className="p-3 text-right">Invested</th>
                  <th className="p-3 text-right">Todays Gain</th>
                  <th className="p-3 text-right">Overall Gain</th>
                  <th className="p-3 text-right">Current Value</th>
                  <th className="p-3">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const gain = num(row.c.gain),
                    gainPct = num(row.c.gain_pct),
                    cols = [
                      ...new Set([
                        ...(MODULES.stocks?.cols || []),
                        "today_gain",
                        "day_change",
                        "day_high",
                        "day_low",
                        "fifty_two_week_high",
                        "fifty_two_week_low",
                        "previous_close",
                        "last_trade_time",
                        "last_trade_quantity",
                        "best_bid",
                        "best_ask",
                        "bid_ask_spread",
                      ]),
                    ],
                    computed = {
                      ...row.c,
                      today_gain: row.today,
                      broker: row.broker,
                      security_name: row.holding,
                    };
                  return (
                    <tr
                      key={row.r.id}
                      className="cursor-pointer border-t border-[#eee6d9] hover:bg-[#f7faf6]"
                      onClick={() =>
                        setDetail({
                          moduleKey: "stocks",
                          record: row.r,
                          computed,
                          cols,
                        })
                      }
                    >
                      <td className="p-3 font-semibold">{row.broker}</td>
                      <td className="p-3">
                        <a
                          className="font-semibold text-[#004080]"
                          href={moneycontrolHref(computed)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {row.holding}
                        </a>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs font-semibold text-gray-600">
                        {row.purchaseDate}
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums">
                        {row.quantity}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {fmtPrice(row.c.live_price)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {stockChangeBadge(row.c.day_change)}
                      </td>
                      <td className="p-3 text-right text-xs tabular-nums">
                        {num(row.c.day_high) || num(row.c.day_low) ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            {stockPricePill(row.c.day_high, "high")}
                            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gray-500">
                              <span>Low</span>
                              {stockPricePill(row.c.day_low, "low")}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-right text-xs tabular-nums">
                        {num(row.c.fifty_two_week_high) ||
                        num(row.c.fifty_two_week_low) ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            {stockPricePill(row.c.fifty_two_week_high, "rangeHigh")}
                            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gray-500">
                              <span>Low</span>
                              {stockPricePill(row.c.fifty_two_week_low, "rangeLow")}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-right text-xs tabular-nums">
                        {row.bestBid && row.bestAsk ? (
                          <>
                            <div className="font-semibold text-gray-700">
                              {row.bestBid} / {row.bestAsk}
                            </div>
                            <div className="text-gray-500">
                              Qty {row.bestBidQuantity || "-"} / {row.bestAskQuantity || "-"}
                              {row.spread ? ` | Spread ${row.spread}` : ""}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs">
                        <div className="font-semibold text-gray-700">
                          {row.lastTradeTime || "-"}
                        </div>
                        {row.lastTradeQuantity && (
                          <div className="text-gray-500">
                            Trade qty: {row.lastTradeQuantity}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {fmt(row.c.invested)}
                      </td>
                      <td
                        className={`p-3 text-right ${row.today >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {movementValue(row.today)}
                      </td>
                      <td
                        className={`p-3 text-right ${gain >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {movementValue(gain)}{" "}
                        <span className="text-xs">
                          {movementValue(gainPct, `(${pct(gainPct)})`, true)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {fmt(row.c.latest)}
                      </td>
                      <td className="p-3">
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail({
                              moduleKey: "stocks",
                              record: row.r,
                              computed,
                              cols,
                            });
                          }}
                      >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No broker details yet." />
        )}
      </section>
    );
  }
  function stockWatchlistTable() {
    const q = query.toLowerCase(),
      rows = records
        .filter((r) => r.module_key === "watchlist")
        .map((r) => {
          const d = r.data || {},
            match = findStock(d.security_name || d.ticker_symbol || ""),
            qty = num(d.quantity) || 1,
            live = num(d.current_price || d.live_price),
            change = num(d.day_change),
            base = num(d.base_price || d.inv_price || d.target_price),
            latest = live * qty,
            invested = base * qty,
            dayGain = change * qty,
            overall = latest - invested,
            dayPct = live ? (change / live) * 100 : 0,
            overallPct = invested ? (overall / invested) * 100 : 0,
            sector = d.category || match?.category || "",
            exchange = d.exchange || match?.exchange || "NSE",
            symbol = d.ticker_symbol || match?.ticker || "",
            baseDate =
              d.base_price_date ||
              d.data_uploaded_date ||
              String(r.created_at || "").slice(0, 10);
          return {
            r,
            d,
            qty,
            live,
            change,
            base,
            baseDate,
            latest,
            invested,
            dayGain,
            overall,
            dayPct,
            overallPct,
            sector,
            exchange,
            symbol,
            name: d.security_name || match?.name || "Watch item",
          };
        })
        .filter((x) =>
          JSON.stringify({
            ...x.d,
            name: x.name,
            sector: x.sector,
            symbol: x.symbol,
          })
            .toLowerCase()
            .includes(q),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    const total = rows.reduce(
      (a, x) => ({
        invested: a.invested + x.invested,
        latest: a.latest + x.latest,
        day: a.day + x.dayGain,
        overall: a.overall + x.overall,
      }),
      { invested: 0, latest: 0, day: 0, overall: 0 },
    );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Stocks Watchlist</h3>
            <p className="text-sm text-gray-600">
              Saved stock ideas with date added, added price, current price,
              movement and paper gain tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => refreshWatchlist()}>
              <RefreshCw size={16} className="inline" /> Refresh Watchlist
            </button>
            <button className="btn" onClick={() => setView("shareList")}>
              <FileUp size={16} className="inline" /> Add Share List
            </button>
            <button
              className="btn-primary"
              onClick={() =>
                setEditing({
                  moduleKey: "watchlist",
                  defaults: { exchange: "NSE", quantity: 1 },
                })
              }
            >
              <Plus size={16} className="inline" /> Add Watch Item
            </button>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Added Value",
            fmt(total.invested),
            "text-[#17382b]",
            "Watchlist added price x quantity",
          )}
          {kpi(
            "Day Gain",
            fmt(total.day),
            total.day >= 0 ? "text-emerald-700" : "text-red-700",
            "Quantity x day change",
          )}
          {kpi(
            "Overall Gain",
            fmt(total.overall),
            total.overall >= 0 ? "text-emerald-700" : "text-red-700",
            "Latest value - base value",
          )}
          {kpi(
            "Latest Value",
            fmt(total.latest),
            "text-emerald-700",
            "Live price x quantity",
          )}
        </div>
        {rows.length ? (
          <div className="overflow-auto rounded-2xl border border-[#9bb4d8] bg-white">
            <table className="w-full min-w-[1220px] border-collapse text-sm">
              <thead className="bg-[#eaf0f7] text-left text-black">
                <tr>
                  <th className="p-3">
                    Company
                    <br />
                    Sector
                  </th>
                  <th className="p-3 text-right">Current Price</th>
                  <th className="p-3 text-right">Change</th>
                  <th className="p-3 text-right">
                    Added Price
                    <br />
                    Date Added
                  </th>
                  <th className="p-3 text-right">
                    Day's Gain
                    <br />% Change
                  </th>
                  <th className="p-3 text-right">
                    Overall Gain
                    <br />% Change
                  </th>
                  <th className="p-3 text-right">Added Value</th>
                  <th className="p-3">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const cols = [
                    "security_name",
                    "ticker_symbol",
                    "exchange",
                    "category",
                    "quantity",
                    "current_price",
                    "day_change",
                    "previous_close",
                    "base_price",
                    "base_price_date",
                    "investment_amount",
                    "latest_value",
                    "target_price",
                    "today_gain",
                    "notes",
                  ];
                  const computed = {
                    ...x.d,
                    security_name: x.name,
                    ticker_symbol: x.symbol,
                    exchange: x.exchange,
                    category: x.sector,
                    quantity: x.qty,
                    current_price: x.live,
                    live_price: x.live,
                    day_change: x.change,
                    base_price: x.base,
                    base_price_date: x.baseDate,
                    inv_price: x.base,
                    investment_amount: x.invested,
                    latest_value: x.latest,
                    today_gain: x.dayGain,
                    gain: x.overall,
                    gain_pct: x.overallPct,
                  };
                  return (
                    <tr
                      key={x.r.id}
                      className="cursor-pointer border-t border-[#9bb4d8]/70 align-top hover:bg-[#f7faf6]"
                      onClick={() =>
                        setDetail({
                          moduleKey: "watchlist",
                          record: x.r,
                          computed,
                          cols,
                        })
                      }
                    >
                      <td className="p-3">
                        <a
                          className="font-semibold text-[#004080] underline decoration-[#004080]/40"
                          href={moneycontrolHref(computed)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {x.name}
                        </a>
                        <div className="mt-1 text-sm text-black">
                          {x.sector}
                        </div>
                        <span className="mt-1 inline-flex rounded border border-[#9bb4d8] px-1 text-[10px] font-medium text-[#17382b]">
                          {x.exchange}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {x.live ? x.live.toFixed(2) : ""}
                      </td>
                      <td
                        className={`p-3 text-right tabular-nums ${x.change >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {movementValue(
                          x.change,
                          `${x.change > 0 ? "+" : ""}${x.change ? x.change.toFixed(2) : "0.00"}`,
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <div>
                          {x.base
                            ? x.base.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })
                            : ""}
                        </div>
                        <div className="text-xs font-semibold text-gray-500">
                          {x.baseDate}
                        </div>
                      </td>
                      <td
                        className={`p-3 text-right tabular-nums ${x.dayGain >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        <div>
                          {movementValue(
                            x.dayGain,
                            Math.round(x.dayGain).toLocaleString("en-IN"),
                          )}
                        </div>
                        <div>
                          {movementValue(
                            x.dayPct,
                            `${x.dayPct > 0 ? "+" : ""}${pct(x.dayPct)}`,
                          )}
                        </div>
                      </td>
                      <td
                        className={`p-3 text-right tabular-nums ${x.overall >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        <div>
                          {movementValue(
                            x.overall,
                            Math.round(x.overall).toLocaleString("en-IN"),
                          )}
                        </div>
                        <div>{movementValue(x.overallPct, pct(x.overallPct))}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {Math.round(x.invested).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3">
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail({
                              moduleKey: "watchlist",
                              record: x.r,
                              computed,
                              cols,
                            });
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No watchlist rows yet. Add stock ideas from the Watchlist tab inside Stocks." />
        )}
      </section>
    );
  }
  function bullionBrokerDetailsTable(title: string, sourceRecords: Rec[]) {
    const q = query.toLowerCase(),
      rows = sourceRecords
        .map((r) => {
          const broker =
              String(
                r.data?.broker ||
                  r.data?.source ||
                  r.data?.vault ||
                  "Unassigned",
              ).trim() || "Unassigned",
            holding = bullionDisplayName(r.data),
            c = computeLiveRecord("bullion", r.data),
            today = todayGainFor("bullion", r);
          return { r, broker, holding, c, today };
        })
        .filter((row) =>
          JSON.stringify({
            broker: row.broker,
            holding: row.holding,
            ...row.r.data,
          })
            .toLowerCase()
            .includes(q),
        )
        .sort(
          (a, b) =>
            a.broker.localeCompare(b.broker) ||
            a.holding.localeCompare(b.holding) ||
            num(b.c.latest) - num(a.c.latest),
        );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <h3 className="mb-3 text-xl font-semibold">{title}</h3>
        {rows.length ? (
          <div className="overflow-auto rounded-2xl border border-[#e3dccc] bg-white">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3">Broker / Source</th>
                  <th>Holding</th>
                  <th className="text-right">Invested</th>
                  <th className="text-right">Todays Gain</th>
                  <th className="text-right">Overall Gain</th>
                  <th className="text-right">Current Value</th>
                  <th className="p-3">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const gain = num(row.c.gain),
                    gainPct = num(row.c.gain_pct),
                    cols = [
                      ...new Set([
                        ...(MODULES.bullion?.cols || []),
                        "today_gain",
                      ]),
                    ],
                    computed = {
                      ...row.c,
                      today_gain: row.today,
                      broker: row.broker,
                      security_name: row.holding,
                    };
                  return (
                <tr
                  key={row.r.id}
                  className={`cursor-pointer border-t border-[#eee6d9] transition ${marketRowClass("bullion", computed)}`}
                  onClick={() => openMoneycontrolCommodity(computed)}
                >
                      <td className="p-3 font-semibold">{row.broker}</td>
                      <td>
                        <button
                          className="font-semibold text-[#004080]"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMoneycontrolCommodity(computed);
                          }}
                        >
                          {row.holding}
                        </button>
                      </td>
                      <td className="text-right font-bold">
                        {fmt(row.c.invested)}
                      </td>
                      <td
                        className={`text-right ${row.today >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {movementValue(row.today)}
                      </td>
                      <td
                        className={`text-right ${gain >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {movementValue(gain)}{" "}
                        <span className="text-xs">
                          {movementValue(gainPct, `(${pct(gainPct)})`, true)}
                        </span>
                      </td>
                      <td className="text-right font-bold">
                        {fmt(row.c.latest)}
                      </td>
                      <td className="p-3">
                        <button
                          className="btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetail({
                              moduleKey: "bullion",
                              record: row.r,
                              computed,
                              cols,
                            });
                          }}
                      >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No broker details yet." />
        )}
      </section>
    );
  }
  function dashboardModern() {
    const assetRows = Object.entries(MODULES)
        .filter(([k, d]) => d.kind === "asset" || k === "insurance")
        .map(([k, d]) => {
          const rows = records
              .filter((r) => r.module_key === k)
              .map((r) => computeLiveRecord(k, r.data)),
            latest = rows.reduce((s, r) => s + num(r.latest), 0),
            invested = rows.reduce((s, r) => s + num(r.invested), 0),
            gain = rows.reduce((s, r) => s + num(r.gain), 0);
          return {
            key: k,
            title: d.title,
            latest,
            invested,
            gain,
            count: rows.length,
          };
        })
        .filter((r) => r.latest || r.invested),
      assetRecords = records.filter(
        (r) => MODULES[r.module_key]?.kind === "asset",
      ),
      todayGain = assetRecords.reduce(
        (s, r) =>
          showsDailyChange(r.module_key) ? s + todayGainFor(r.module_key, r) : s,
        0,
      ),
      monthlyGain = assetRecords.reduce(
        (s, r) => s + monthlyGainFor(r.module_key, r),
        0,
      ),
      yearlyGain = totals.gain;
    return (
      <div className="space-y-5">
        {dashboardTabs()}
        <div className="grid grid-cols-5 gap-4 max-2xl:grid-cols-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Invested",
            fmt(totals.invested),
            "text-[#17382b]",
            "Portfolio cost basis",
          )}
          {kpi(
            "Today Gain",
            fmt(todayGain),
            todayGain >= 0 ? "text-emerald-700" : "text-red-700",
            "Calculated from investment rows",
          )}
          {kpi(
            "Monthly Gain",
            fmt(monthlyGain),
            monthlyGain >= 0 ? "text-emerald-700" : "text-red-700",
            "Saved, month-start, this-month, or accrual estimate",
          )}
          {kpi(
            "Yrly Gain",
            fmt(yearlyGain),
            yearlyGain >= 0 ? "text-emerald-700" : "text-red-700",
            "Current value - invested",
          )}
          {kpi(
            "Current Net Worth",
            fmt(totals.net),
            totals.net >= 0 ? "text-emerald-700" : "text-red-700",
            "Assets incl. Insurance - Loans incl. linked Property - Borrowings",
          )}
        </div>
        {portfolioSummaryTable()}
        {dashboardFeaturePanels()}
        <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Current Value Composition</h3>
            {simpleTable(
              ["Module", "Current Value", "Invested", "Gain", "Weight"],
              assetRows.map((r) => [
                r.title,
                fmt(r.latest),
                r.key === "insurance" ? "-" : fmt(r.invested),
                r.key === "insurance" ? "-" : fmt(r.gain),
                totals.assets ? pct((r.latest / totals.assets) * 100) : "0.00%",
              ]),
            )}
          </section>
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Growth Leaders</h3>
            {simpleTable(
              ["Module", "Gain", "Gain %"],
              [...assetRows]
                .filter((r) => r.key !== "insurance" && r.invested)
                .sort((a, b) => b.gain / b.invested - a.gain / a.invested)
                .slice(0, 5)
                .map((r) => [
                  r.title,
                  fmt(r.gain),
                  pct((r.gain / r.invested) * 100),
                ]),
            )}
          </section>
        </div>
      </div>
    );
  }
  function fixedIncomeDashboard() {
    const rows = records
        .filter((r) => r.module_key === "fixedIncome")
        .map((r) => computeRecord("fixedIncome", r.data)),
      current = rows.reduce((s, r) => s + num(r.latest), 0),
      interest = rows.reduce((s, r) => s + num(r.interest_incurred_fy), 0),
      yearEnd = rows.reduce((s, r) => s + num(r.year_end_maturity_value), 0),
      maturity = rows.reduce((s, r) => s + num(r.maturity_value), 0);
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <h3 className="mb-3 text-xl font-semibold">Fixed Income Dashboard</h3>
        <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-1">
          {kpi(
            "Current Worth",
            fmt(current),
            "text-emerald-700",
            "Value including FY interest",
          )}
          {kpi(
            "Interest This FY",
            fmt(interest),
            "text-emerald-700",
            "Accrued till date",
          )}
          {kpi(
            "FY End Value",
            fmt(yearEnd),
            "text-[#17382b]",
            "Projected value on 31 March",
          )}
          {kpi(
            "Maturity Value",
            fmt(maturity),
            "text-amber-700",
            "Projected value on maturity",
          )}
        </div>
      </section>
    );
  }
  function loanFutureDashboard() {
    const propertyLoans = records
        .filter((r) => r.module_key === "property")
        .map((r) => computeRecord("property", r.data))
        .filter((r) => num(r.loan_balance) > 0),
      loanBalance = propertyLoans.reduce((s, r) => s + num(r.loan_balance), 0),
      emiFuture = propertyLoans.reduce((s, r) => s + num(r.emiFuture), 0),
      emisLeft = propertyLoans.reduce((s, r) => s + num(r.emis_left), 0);
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <h3 className="mb-3 text-xl font-semibold">Property Loan Future</h3>
        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
          {kpi(
            "Loan Balance",
            fmt(loanBalance),
            "text-red-700",
            "Current outstanding balance",
          )}
          {kpi(
            "EMI Future",
            fmt(emiFuture),
            "text-amber-700",
            "Total future EMI payments",
          )}
          {kpi(
            "EMIs Left",
            Math.round(emisLeft),
            "text-[#17382b]",
            "Total EMI months remaining",
          )}
        </div>
      </section>
    );
  }
  function liabilitiesDashboard() {
    const loans = records
        .filter((r) => r.module_key === "loans")
        .map((r) => computeRecord("loans", r.data)),
      borrowings = records
        .filter((r) => r.module_key === "borrowings")
        .map((r) => computeRecord("borrowings", r.data)),
      propertyLoans = records
        .filter((r) => r.module_key === "property")
        .map((r) => computeRecord("property", r.data))
        .filter((r) => num(r.loan_balance) > 0),
      loanTotal = loans.reduce((s, r) => s + num(r.balance), 0),
      borrowingTotal = borrowings.reduce((s, r) => s + num(r.balance), 0),
      propertyLoanTotal = propertyLoans.reduce(
        (s, r) => s + num(r.loan_balance),
        0,
      ),
      totalLiability = loanTotal + borrowingTotal + propertyLoanTotal,
      liabilityPercentage = totals.assets
        ? ((totalLiability / totals.assets) * 100).toFixed(2)
        : "0.00";
    return (
      <section className="card-gradient p-6">
        <h3 className="mb-5 text-xl font-semibold flex items-center gap-2">
          Liabilities Overview
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-4">
            <div className="text-xs font-semibold uppercase text-red-700">
              Bank Loans
            </div>
            <div className="mt-2 text-2xl font-semibold text-red-700">
              {fmt(loanTotal)}
            </div>
            <div className="text-xs text-red-600 mt-2">
              {loans.length} records
            </div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4">
            <div className="text-xs font-semibold uppercase text-orange-700">
              Borrowings
            </div>
            <div className="mt-2 text-2xl font-semibold text-orange-700">
              {fmt(borrowingTotal)}
            </div>
            <div className="text-xs text-orange-600 mt-2">
              {borrowings.length} records
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4">
            <div className="text-xs font-semibold uppercase text-amber-700">
              Property-Linked Loans
            </div>
            <div className="mt-2 text-2xl font-semibold text-amber-700">
              {fmt(propertyLoanTotal)}
            </div>
            <div className="text-xs text-amber-600 mt-2">
              {propertyLoans.length} properties
            </div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-100 to-red-200/50 p-4">
            <div className="text-xs font-semibold uppercase text-red-800">
              Total Liabilities
            </div>
            <div className="mt-2 text-2xl font-semibold text-red-800">
              {fmt(totalLiability)}
            </div>
            <div className="text-xs text-red-700 mt-2">
              {liabilityPercentage}% of assets
            </div>
          </div>
        </div>
      </section>
    );
  }
  function dashboard() {
    const assetRows = Object.entries(MODULES)
        .filter(([k, d]) => d.kind === "asset" || k === "insurance")
        .map(([k, d]) => {
          const rows = records
              .filter((r) => r.module_key === k)
              .map((r) => computeRecord(k, r.data)),
            latest = rows.reduce((s, r) => s + num(r.latest), 0),
            invested = rows.reduce((s, r) => s + num(r.invested), 0),
            gain = rows.reduce((s, r) => s + num(r.gain), 0);
          return {
            key: k,
            title: d.title,
            latest,
            invested,
            gain,
            count: rows.length,
          };
        })
        .filter((r) => r.latest || r.invested),
      assets = assetRows.map((r) => [
        r.title,
        fmt(r.latest),
        fmt(r.invested),
        fmt(r.gain),
        totals.assets ? pct((r.latest / totals.assets) * 100) : "0.00%",
      ]),
      top = [...assetRows].sort((a, b) => b.latest - a.latest)[0],
      gainers = [...assetRows]
        .filter((r) => r.invested)
        .sort((a, b) => b.gain / b.invested - a.gain / a.invested)
        .slice(0, 5),
      accountsSummary = activeAccounts
        .map((a) => {
          const rs = records.filter((r) => r.data?.account_name === a.name),
            t = computeTotals(rs);
          return [
            a.name,
            fmt(t.assets),
            fmt(t.invested),
            fmt(t.gain),
            rs.length,
          ];
        })
        .filter((r) => r[4]),
      debtRatio = totals.assets
        ? (totals.liabilities / totals.assets) * 100
        : 0,
      spread = assetRows.length,
      topShare = top && totals.assets ? (top.latest / totals.assets) * 100 : 0,
      health = Math.max(
        0,
        Math.min(
          100,
          100 -
            (debtRatio > 35 ? 20 : debtRatio / 2) -
            (topShare > 45 ? 20 : topShare / 3) +
            (spread >= 4 ? 8 : 0) +
            (totals.gain > 0 ? 8 : -8),
        ),
      ),
      notes = [
        topShare > 45
          ? `High concentration in ${top?.title}: ${pct(topShare)} of assets.`
          : `Spread looks reasonable across ${spread} asset classes.`,
        debtRatio > 35
          ? `Debt ratio is elevated at ${pct(debtRatio)}.`
          : `Debt ratio is controlled at ${pct(debtRatio)}.`,
        totals.gain > 0
          ? `Portfolio is currently in profit by ${fmt(totals.gain)}.`
          : `Portfolio is below invested value by ${fmt(Math.abs(totals.gain))}.`,
        records.some(
          (r) =>
            MODULES[r.module_key]?.kind === "asset" &&
            !num(computeRecord(r.module_key, r.data).latest),
        )
          ? "Some assets need current value cleanup."
          : "Tracked assets have current values.",
      ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Net Worth",
            fmt(totals.net),
            totals.net >= 0 ? "text-emerald-700" : "text-red-700",
            "Assets incl. Insurance - Loans incl. linked Property - Borrowings",
          )}
          {kpi(
            "Total Assets",
            fmt(totals.assets),
            "text-emerald-700",
            "All investment particulars current value",
          )}
          {kpi(
            "Portfolio Health",
            `${Math.round(health)}/100`,
            health > 70
              ? "text-emerald-700"
              : health > 45
                ? "text-amber-700"
                : "text-red-700",
            "Spread, debt, gain and concentration",
          )}
          {kpi(
            "Top Exposure",
            top ? `${top.title} ${pct(topShare)}` : "None",
            topShare > 45 ? "text-red-700" : "text-emerald-700",
            "Largest asset-class weight",
          )}
        </div>
        {detailedMetrics()}
        <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Investment Spread</h3>
            {simpleTable(
              ["Module", "Current Value", "Invested", "Gain", "Weight"],
              assets,
            )}
          </section>
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">AI Attributes</h3>
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              {kpi(
                "Spread",
                spread,
                "text-emerald-700",
                "Active asset classes",
              )}
              {kpi(
                "Debt Ratio",
                pct(debtRatio),
                debtRatio > 35 ? "text-red-700" : "text-emerald-700",
                "Liability / assets",
              )}
              {kpi(
                "Growth",
                pct(
                  totals.invested ? (totals.gain / totals.invested) * 100 : 0,
                ),
                totals.gain >= 0 ? "text-emerald-700" : "text-red-700",
                "Gain on invested",
              )}
              {kpi(
                "Accounts",
                accountsSummary.length,
                "text-emerald-700",
                "Accounts with holdings",
              )}
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Growth Leaders</h3>
            {simpleTable(
              ["Module", "Gain", "Gain %"],
              gainers.map((r) => [
                r.title,
                fmt(r.gain),
                pct((r.gain / r.invested) * 100),
              ]),
            )}
          </section>
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Account Spread</h3>
            {simpleTable(
              ["Account", "Current Value", "Invested", "Gain", "Rows"],
              accountsSummary,
            )}
          </section>
        </div>
      </div>
    );
  }
  function accountsView() {
    const rows = accounts.filter((a) =>
      JSON.stringify(a).toLowerCase().includes(query.toLowerCase()),
    );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Accounts</h3>
            <p className="text-sm text-gray-600">
              No primary account. Deleting clears the name from all linked
              records.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setAccModal("new")}>
            <Plus size={16} className="inline" /> Add Account
          </button>
        </div>
        {rows.length ? (
          <div className="overflow-auto rounded-3xl border border-[#e3dccc] bg-white">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3">Name</th>
                  <th>Relation</th>
                  <th>Type</th>
                  <th>Institution</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr className="border-t border-[#eee6d9]" key={a.id}>
                    <td className="p-3 font-bold">{a.name}</td>
                    <td>{a.relation}</td>
                    <td>{a.type}</td>
                    <td>{a.institution}</td>
                    <td className="space-x-2">
                      <button className="btn" onClick={() => setAccModal(a)}>
                        Edit
                      </button>
                      {isAdmin ? (
                        <button
                          className="btn-danger"
                          onClick={() => delAccount(a)}
                        >
                          <Trash2 size={14} className="inline" /> Delete
                        </button>
                      ) : (
                        <span className="pill">Normal access</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No accounts yet." />
        )}
      </section>
    );
  }
  function recordTitle(r?: Rec) {
    if (!r) return "Unlinked";
    const c = computeLiveRecord(r.module_key, r.data);
    return String(
      c.security_name ||
        c.category ||
        c.location ||
        c.policy_name ||
        c.name ||
        MODULES[r.module_key]?.title ||
        r.module_key,
    );
  }
  function docRows(list: AssetDoc[]) {
    return list.length ? (
      <div className="overflow-auto rounded-3xl border border-[#e3dccc] bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
            <tr>
              <th className="p-3">Document</th>
              <th>Repository</th>
              <th>Asset</th>
              <th>Section</th>
              <th>Uploaded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => {
              const r = records.find((x) => x.id === d.record_id),
                drive = String(d.file_path || "").startsWith("gdrive:");
              return (
                <tr key={d.id} className="border-t border-[#eee6d9]">
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <FileText size={16} />
                      {d.file_name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {d.file_size
                        ? `${(d.file_size / 1024).toFixed(1)} KB`
                        : ""}
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        drive ? "pill bg-emerald-50 text-emerald-700" : "pill"
                      }
                    >
                      {drive ? "Google Drive" : "Supabase"}
                    </span>
                  </td>
                  <td>{recordTitle(r)}</td>
                  <td>{MODULES[d.module_key]?.title || d.module_key}</td>
                  <td className="text-xs">
                    {d.created_at
                      ? new Date(d.created_at).toLocaleString()
                      : ""}
                  </td>
                  <td className="space-x-2">
                    <button className="btn" onClick={() => openDoc(d)}>
                      <Eye size={14} className="inline" /> Open
                    </button>
                    <button className="btn-danger" onClick={() => deleteDoc(d)}>
                      <Trash2 size={14} className="inline" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty text="No documents uploaded yet." />
    );
  }
  function documentsView() {
    const rows = docs.filter((d) =>
        JSON.stringify({
          ...d,
          asset: recordTitle(records.find((r) => r.id === d.record_id)),
        })
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
      driveDocs = docs.filter((d) =>
        String(d.file_path || "").startsWith("gdrive:"),
      ).length,
      linkableRecords = records.filter((r) => r.module_key !== "documents"),
      folderModules = [
        ["documents", { title: "Documents" }] as any,
        ...Object.entries(MODULES).filter(([, d]) =>
          ["asset", "liability", "utility"].includes(d.kind),
        ),
      ];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Documents",
            docs.length,
            "text-[#17382b]",
            "Tracked references",
            <FileText />,
          )}
          {kpi(
            "Google Drive",
            driveDocs,
            "text-emerald-700",
            "Repository files",
          )}
          {kpi(
            "Storage Used",
            `${(docs.reduce((s, d) => s + Number(d.file_size || 0), 0) / 1024 / 1024).toFixed(2)} MB`,
            "text-amber-700",
            "Document total",
          )}
          {kpi(
            "Sections",
            new Set(docs.map((d) => d.module_key)).size,
            "text-[#17382b]",
            "Asset sections",
          )}
        </div>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Upload Documents</h3>
              <p className="text-sm text-gray-600">
                Upload files to Google Drive and link them to an existing asset,
                or keep them as repository documents.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={
                  googleDriveConnected
                    ? "pill bg-emerald-50 text-emerald-700"
                    : "btn"
                }
                onClick={connectGoogleDrive}
              >
                {googleDriveConnected
                  ? "Google Drive connected"
                  : "Connect Google Drive"}
              </button>
              {googleDriveConnected && (
                <button className="btn" onClick={disconnectGoogleDrive}>
                  Disconnect
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
            <div>
              <label className="field-label">Link To Asset</label>
              <select
                className="field-input"
                value={docUploadRecordId}
                onChange={(e) => setDocUploadRecordId(e.target.value)}
                disabled={docUploading}
              >
                <option value="">Repository document</option>
                {linkableRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {MODULES[r.module_key]?.title || r.module_key}:{" "}
                    {recordTitle(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Drive Folder</label>
              <select
                className="field-input"
                value={docUploadModule}
                onChange={(e) => setDocUploadModule(e.target.value)}
                disabled={docUploading || !!docUploadRecordId}
              >
                {folderModules.map(([k, d]: any) => (
                  <option key={k} value={k}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input
                className="field-input"
                value={docUploadNotes}
                onChange={(e) => setDocUploadNotes(e.target.value)}
                disabled={docUploading}
                placeholder="Optional reference notes"
              />
            </div>
            <div>
              <label className="field-label">Files</label>
              <label
                className={`btn-primary flex cursor-pointer items-center justify-center gap-2 ${docUploading ? "opacity-60" : ""}`}
              >
                <UploadCloud size={16} />
                {docUploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  disabled={docUploading}
                  onChange={(e) => {
                    uploadRepositoryDocuments(e.currentTarget.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </section>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Document Repository</h3>
              <p className="text-sm text-gray-600">
                New asset references are stored in Google Drive and linked back
                to each asset here.
              </p>
            </div>
            <button className="btn" onClick={() => loadAll(true)}>
              <RefreshCw size={16} className="inline" /> Refresh
            </button>
          </div>
          {docRows(rows)}
        </section>
      </div>
    );
  }
  function adminConsole() {
    const q = query.toLowerCase(),
      rows = adminUsers.filter((u) =>
        JSON.stringify(u).toLowerCase().includes(q),
      ),
      active = adminUsers.filter((u) => !u.banned_until).length,
      admins = adminUsers.filter((u) => u.role === "admin").length;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Users",
            adminUsers.length,
            "text-[#17382b]",
            "Total Supabase Auth users",
            <Users />,
          )}
          {kpi("Active", active, "text-emerald-700", "Not disabled")}
          {kpi("Admins", admins, "text-amber-700", "Can manage users")}
          {kpi(
            "Records",
            adminUsers.reduce((s, u) => s + u.records_count, 0),
            "text-[#17382b]",
            "All user records",
          )}
        </div>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Admin Console</h3>
              <p className="text-sm text-gray-600">
                Manage user IDs, roles, password resets, disabled accounts and
                deletion.
              </p>
            </div>
            <button
              className="btn"
              onClick={loadAdminUsers}
              disabled={adminBusy}
            >
              <RefreshCw size={16} className="inline" /> Refresh
            </button>
          </div>
          {resetLink && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-1 font-semibold">Password reset link</div>
              <input
                className="field-input font-mono text-xs"
                readOnly
                value={resetLink}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}
          {adminBusy && (
            <div className="mb-3 rounded-2xl bg-[#eef5ee] p-3 text-sm font-bold text-[#17382b]">
              Working...
            </div>
          )}
          {rows.length ? (
            <div className="overflow-auto rounded-3xl border border-[#e3dccc] bg-white">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3">User</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Last Sign In</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-[#eee6d9] align-top"
                    >
                      <td className="p-3">
                        <div className="font-semibold">
                          {u.full_name || "Unnamed"}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {[u.city, u.phone].filter(Boolean).join(" | ")}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">{u.id}</td>
                      <td>
                        <span
                          className={
                            u.role === "admin"
                              ? "pill bg-amber-50 text-amber-800"
                              : "pill"
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.banned_until ? (
                          <span className="pill bg-red-50 text-red-700">
                            Disabled
                          </span>
                        ) : (
                          <span className="pill bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          {u.email_confirmed_at
                            ? "Email confirmed"
                            : "Email pending"}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold">
                          {u.accounts_count} accounts
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.records_count} records
                        </div>
                      </td>
                      <td className="text-xs">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="space-y-2 p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn"
                            onClick={() => saveAdminProfile(u)}
                          >
                            Edit Profile
                          </button>
                          <button
                            className="btn"
                            onClick={() =>
                              adminAction({
                                action: "setRole",
                                userId: u.id,
                                role: u.role === "admin" ? "normal" : "admin",
                              })
                            }
                          >
                            <Shield size={14} className="inline" />{" "}
                            {u.role === "admin" ? "Make Normal" : "Make Admin"}
                          </button>
                          <button
                            className="btn"
                            onClick={() =>
                              adminAction({
                                action: "resetPassword",
                                userId: u.id,
                                email: u.email,
                              })
                            }
                          >
                            <KeyRound size={14} className="inline" /> Reset
                          </button>
                          {u.banned_until ? (
                            <button
                              className="btn"
                              onClick={() =>
                                adminAction({
                                  action: "unbanUser",
                                  userId: u.id,
                                })
                              }
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              className="btn"
                              onClick={() =>
                                adminAction({ action: "banUser", userId: u.id })
                              }
                            >
                              <UserX size={14} className="inline" /> Disable
                            </button>
                          )}
                          <button
                            className="btn-danger"
                            onClick={() => {
                              if (
                                !code(
                                  `Delete user ${u.email}? This removes auth, profile, accounts and records.`,
                                )
                              )
                                return setToast("User deletion cancelled");
                              adminAction({
                                action: "deleteUser",
                                userId: u.id,
                              });
                            }}
                          >
                            <Trash2 size={14} className="inline" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={adminBusy ? "Loading users..." : "No users found."} />
          )}
        </section>
      </div>
    );
  }
  function groupKey(k: string, r: Rec) {
    const d = r.data || {},
      acct = accountTab(k) === "All" ? "" : key(d.account_name || ""),
      category =
        k === "fixedIncome" ? fixedIncomeCategoryLabel(d.category) : d.category,
      holdingName = k === "bullion" ? bullionDisplayName(d) : d.security_name;
    return [
      acct,
      key(
        d.ticker_symbol ||
          d.scheme_code ||
          holdingName ||
          category ||
          "item",
      ),
      key(d.exchange || ""),
      key(d.unit || ""),
    ].join("|");
  }
  function aggregateGroup(k: string, items: Rec[]) {
    const first = items[0],
      base = { ...first.data },
      accounts = [
        ...new Set(
          items
            .map((r) => String(r.data?.account_name || "Unassigned"))
            .filter(Boolean),
        ),
      ],
      names = items
        .map((r) =>
          String(k === "bullion" ? bullionDisplayName(r.data) : r.data?.security_name || ""),
        )
        .filter(Boolean)
        .sort((a, b) => b.length - a.length),
      data: any = {
        ...base,
        account_name: accounts.length === 1 ? accounts[0] : "Multiple",
        security_name: names[0] || base.security_name,
      };
    if (k === "stocks") {
      let qty = 0,
        invested = 0,
        latest = 0;
      items.forEach((r) => {
        const d = r.data,
          c = computeLiveRecord(k, d);
        qty += num(d.quantity);
        invested += num(c.invested);
        latest += num(c.latest);
      });
      Object.assign(data, {
        quantity: qty,
        investment_amount: invested.toFixed(2),
        latest_value: latest.toFixed(2),
        inv_price: qty ? (invested / qty).toFixed(2) : "",
        live_price: qty ? (latest / qty).toFixed(2) : "",
      });
    } else if (k === "mutualFunds") {
      let qty = 0,
        invested = 0,
        latest = 0;
      items.forEach((r) => {
        const d = r.data,
          c = computeLiveRecord(k, d);
        qty += num(d.quantity);
        invested += num(c.invested);
        latest += num(c.latest);
      });
      Object.assign(data, {
        quantity: qty,
        investment_amount: invested.toFixed(2),
        latest_value: latest.toFixed(2),
        nav: qty ? (invested / qty).toFixed(4) : "",
        live_nav: qty ? (latest / qty).toFixed(4) : "",
      });
    } else if (k === "fixedIncome") {
      let current = 0,
        interest = 0,
        yearEnd = 0,
        maturity = 0,
        latest = 0,
        invested = 0,
        employeeContribution = 0,
        companyContribution = 0;
      items.forEach((r) => {
        const c = computeLiveRecord(k, r.data);
        current += num(c.current_value_today);
        interest += num(c.interest_incurred_fy);
        yearEnd += num(c.year_end_maturity_value);
        maturity += num(c.maturity_value);
        latest += num(c.latest);
        invested += num(c.invested);
        employeeContribution += num(c.employee_contribution);
        companyContribution += num(c.company_contribution);
      });
      Object.assign(data, {
        category: fixedIncomeCategoryLabel(data.category),
        employee_contribution: employeeContribution.toFixed(2),
        company_contribution: companyContribution.toFixed(2),
        current_value_today: current.toFixed(2),
        interest_incurred_fy: interest.toFixed(2),
        worth_till_date: latest.toFixed(2),
        year_end_maturity_value: yearEnd.toFixed(2),
        maturity_value: maturity.toFixed(2),
        latest_value: latest.toFixed(2),
        investment_amount: invested.toFixed(2),
      });
    } else if (k === "property") {
      let invested = 0,
        latest = 0,
        loanBalance = 0,
        emiFuture = 0,
        emisLeft = 0;
      items.forEach((r) => {
        const d = r.data,
          c = computeLiveRecord(k, d);
        invested += num(c.invested) || num(d.purchase_price);
        latest += num(c.latest) || num(d.latest_value);
        loanBalance += num(c.loan_balance);
        emiFuture += num(c.emiFuture);
        emisLeft += num(c.emis_left);
      });
      Object.assign(data, {
        investment_amount: invested
          ? invested.toFixed(2)
          : base.investment_amount,
        purchase_price: invested ? invested.toFixed(2) : base.purchase_price,
        latest_value: latest ? latest.toFixed(2) : base.latest_value,
        loan_balance: loanBalance ? loanBalance.toFixed(2) : base.loan_balance,
        emiFuture: emiFuture ? emiFuture.toFixed(2) : "0",
        emis_left: emisLeft,
      });
    } else {
      let invested = 0,
        latest = 0,
        balance = 0,
        qty = 0;
      items.forEach((r) => {
        const d = r.data,
          c = computeLiveRecord(k, d);
        invested +=
          num(c.invested) || num(d.investment_amount) || num(d.purchase_price);
        latest += num(c.latest) || num(d.latest_value);
        balance += num(c.balance);
        qty += num(d.quantity);
      });
      Object.assign(data, {
        quantity: qty || base.quantity,
        investment_amount: invested
          ? invested.toFixed(2)
          : base.investment_amount,
        purchase_price: invested ? invested.toFixed(2) : base.purchase_price,
        latest_value: latest ? latest.toFixed(2) : base.latest_value,
        loan_balance: balance ? balance.toFixed(2) : base.loan_balance,
      });
    }
    const synced = items
      .map((r) => String(r.data?.last_synced || ""))
      .filter(Boolean)
      .sort()
      .at(-1);
    if (synced) data.last_synced = synced;
    const computed =
      ["bullion", "fixedIncome"].includes(k)
        ? computeLiveRecord(k, data)
        : computeRecord(k, data);
    if (k === "fixedIncome")
      Object.assign(computed, {
        current_value_today: data.current_value_today,
        interest_incurred_fy: data.interest_incurred_fy,
        worth_till_date: data.worth_till_date,
        year_end_maturity_value: data.year_end_maturity_value,
        maturity_value: data.maturity_value,
        latest: num(data.latest_value),
        invested: num(data.investment_amount),
        gain: num(data.latest_value) - num(data.investment_amount),
        gain_pct: num(data.investment_amount)
          ? ((num(data.latest_value) - num(data.investment_amount)) /
              num(data.investment_amount)) *
            100
          : 0,
      });
    return {
      key: `${k}|${groupKey(k, first)}`,
      records: items,
      r: first,
      c: computed,
    };
  }
  function groupedRows(k: string, rs: Rec[]) {
    const m = new Map<string, Rec[]>();
    rs.forEach((r) => {
      const id = groupKey(k, r);
      m.set(id, [...(m.get(id) || []), r]);
    });
    return Array.from(m.values()).map((g) => aggregateGroup(k, g));
  }
  function propertyLoanLiabilityRecords(): Rec[] {
    return records
      .filter((r) => r.module_key === "property")
      .map((r) => {
        const c = computeRecord("property", r.data);
        return {
          ...r,
          module_key: "loans",
          data: {
            ...r.data,
            security_name: `Property Loan - ${r.data?.location || r.data?.security_name || "Property"}`,
            loan_amount: c.loan_amount,
            interest_rate: c.loan_interest_rate,
            tenure_months: c.loan_tenure_months,
            loan_balance: c.loan_balance,
            emis_left: c.emis_left,
            principal_paid: c.principal_paid,
            interest_paid: c.interest_paid,
            broker: r.data?.broker || "",
            category: "Property-Linked Loan",
            source_module: "property",
          },
        };
      })
      .filter((r) => num(r.data.loan_balance) > 0);
  }
  function stockMove(c: any) {
    const direct = num(c.day_change || c.price_change || c.change);
    if (direct) return direct;
    const live = num(c.live_price),
      prev = num(c.previous_close || c.prev_close || c.previous_price);
    return live && prev ? live - prev : 0;
  }
  function marketMove(k: string, c: any) {
    return k === "stocks" ? stockMove(c) : num(c.day_change);
  }
  function marketRowClass(k: string, c: any) {
    if (!["stocks", "bullion"].includes(k)) return "hover:bg-[#f7faf6]";
    const move = marketMove(k, c);
    if (move > 0) return "bg-emerald-50/40 hover:bg-emerald-50";
    if (move < 0) return "bg-red-50/40 hover:bg-red-50";
    return "hover:bg-[#f7faf6]";
  }
  function movementValue(value: any, formatted = fmt(value), mutedText = false) {
    const move = num(value),
      Arrow = move > 0 ? ArrowUp : move < 0 ? ArrowDown : null,
      cls =
        move > 0
          ? "text-emerald-700"
          : move < 0
            ? "text-red-700"
            : mutedText
              ? "text-[#17382b]"
              : "";
    return (
      <span className={`inline-flex items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums ${cls}`}>
        {Arrow && <Arrow size={14} strokeWidth={3} />}
        {formatted}
      </span>
    );
  }
  function stockColWidth(col: string) {
    if (col === "account_name") return "82px";
    if (col === "security_name") return "126px";
    if (col === "quantity") return "58px";
    if (col === "inv_price") return "92px";
    if (col === "live_price") return "108px";
    if (col === "day_change") return "96px";
    if (
      ["day_low", "day_high", "fifty_two_week_low", "fifty_two_week_high"].includes(
        col,
      )
    )
      return "104px";
    if (col === "gain_pct") return "78px";
    if (["invested", "latest"].includes(col)) return "96px";
    if (col === "gain") return "104px";
    return "92px";
  }
  function stockCellClass(moduleKey: string, col: string) {
    if (moduleKey === "bullion") {
      if (["account_name", "security_name"].includes(col))
        return "text-left whitespace-nowrap";
      if (col === "unit") return "text-center whitespace-nowrap";
      return "text-right whitespace-nowrap tabular-nums";
    }
    if (moduleKey === "fixedIncome") {
      if (["account_name", "category", "broker", "purchase_date", "maturity_date"].includes(col))
        return "text-left whitespace-nowrap";
      return "text-right whitespace-nowrap tabular-nums";
    }
    if (moduleKey !== "stocks") return "";
    const numeric = col !== "account_name" && col !== "security_name";
    return `${numeric ? "text-right" : "text-left"} ${col === "security_name" ? "max-w-0" : "whitespace-nowrap"}`;
  }
  function stockChangeBadge(value: any) {
    const move = num(value),
      positive = move > 0,
      negative = move < 0,
      cls = positive
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : negative
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-gray-200 bg-gray-50 text-gray-700",
      Arrow = positive ? ArrowUp : negative ? ArrowDown : null;
    return (
      <span
        className={`inline-flex w-full max-w-[6.5rem] items-center justify-end gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm ${cls}`}
      >
        {Arrow && <Arrow size={14} strokeWidth={3} />}
        {fmtSignedPrice(move)}
      </span>
    );
  }
  function stockPricePill(value: any, tone: "high" | "low" | "rangeHigh" | "rangeLow") {
    const v = num(value);
    if (!v) return <span className="text-gray-400">-</span>;
    const cls =
      tone === "high"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "low"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : tone === "rangeHigh"
            ? "border-sky-200 bg-sky-50 text-sky-900"
            : "border-slate-200 bg-slate-50 text-slate-800";
    return (
      <span
        className={`inline-flex w-full max-w-[6rem] justify-end rounded-lg border px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}
      >
        {fmtPrice(v)}
      </span>
    );
  }
  function stockRangeBox(value: any, tone: "dayLow" | "dayHigh" | "rangeLow" | "rangeHigh") {
    const v = num(value);
    if (!v)
      return (
        <div className="stock-range-box border-gray-200 bg-gray-50 text-gray-400">
          -
        </div>
      );
    const cls =
      tone === "dayLow"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : tone === "dayHigh"
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : tone === "rangeLow"
            ? "border-slate-300 bg-slate-50 text-slate-900"
            : "border-sky-300 bg-sky-50 text-sky-950";
    return <div className={`stock-range-box ${cls}`}>{fmtPrice(v)}</div>;
  }
  function formatModuleCell(moduleKey: string, col: string, c: any) {
    if (moduleKey === "stocks" && col === "security_name") {
      const fullName = String(c[col] || ""),
        shortName = compactName(fullName);
      return (
        <a
          className="block leading-tight text-[#004080] underline decoration-[#004080]/40"
          href={moneycontrolHref(c)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={fullName}
        >
          <span className="block truncate font-semibold">{shortName}</span>
          {shortName !== fullName && (
            <span className="block truncate text-[10px] font-medium text-[#6d7c73] no-underline">
              {fullName}
            </span>
          )}
        </a>
      );
    }
    if (moduleKey === "stocks" && col === "live_price") {
      const move = stockMove(c),
        cls =
          move > 0
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : move < 0
              ? "bg-red-100 text-red-800 border-red-200"
              : "bg-gray-100 text-gray-700 border-gray-200";
      return (
        <span
          className={`inline-flex w-full items-center justify-end gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}
        >
          {move > 0 ? (
            <ArrowUp size={14} strokeWidth={3} />
          ) : move < 0 ? (
            <ArrowDown size={14} strokeWidth={3} />
          ) : null}
          {fmtPrice(c[col])}
        </span>
      );
    }
    if (moduleKey === "bullion" && col === "current_price") {
      const move = num(c.day_change),
        positive = move > 0,
        cls =
          positive
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : move < 0
              ? "bg-red-100 text-red-800 border-red-200"
              : "bg-gray-100 text-gray-700 border-gray-200";
      return (
        <span
          className={`bullion-price-pill inline-grid w-full justify-items-end rounded-xl border px-3 py-1.5 text-sm font-semibold tabular-nums ${cls}`}
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            {positive ? (
              <ArrowUp size={14} strokeWidth={3} />
            ) : move < 0 ? (
              <ArrowDown size={14} strokeWidth={3} />
            ) : null}
            {fmtPrice(c[col])}
          </span>
          {!!move && (
            <span className="whitespace-nowrap text-[11px] font-medium opacity-80">
              {positive ? "+" : ""}
              {fmt(move)}
            </span>
          )}
        </span>
      );
    }
    if (
      ["stocks", "bullion"].includes(moduleKey) &&
      ["gain", "gain_pct", "today_gain", "day_change"].includes(col)
    ) {
      const move = num(c[col]);
      if (moduleKey === "stocks" && col === "day_change")
        return stockChangeBadge(move);
      return movementValue(
        move,
        col === "gain_pct"
          ? pct(move)
          : col === "day_change"
            ? fmtSignedPrice(move)
            : fmt(move),
      );
    }
    if (moduleKey === "stocks" && col === "day_low")
      return stockRangeBox(c[col], "dayLow");
    if (moduleKey === "stocks" && col === "day_high")
      return stockRangeBox(c[col], "dayHigh");
    if (moduleKey === "stocks" && col === "fifty_two_week_low")
      return stockRangeBox(c[col], "rangeLow");
    if (moduleKey === "stocks" && col === "fifty_two_week_high")
      return stockRangeBox(c[col], "rangeHigh");
    if (col === "security_name") {
      const fullName = String(c[col] || ""),
        shortName = compactName(fullName);
      return (
        <div className="leading-tight" title={fullName}>
          <div className="truncate font-semibold text-[#17382b]">{shortName}</div>
          {shortName !== fullName && (
            <div className="truncate text-[10px] font-medium text-gray-500">
              {fullName}
            </div>
          )}
        </div>
      );
    }
    return formatCell(col, c[col]);
  }
  function moduleView(k: string) {
    const def = MODULES[k],
      moduleRecords =
        k === "loans"
          ? [
              ...records.filter((r) => r.module_key === k),
              ...propertyLoanLiabilityRecords(),
            ]
          : records.filter((r) => r.module_key === k),
      tabs = [
        "All",
        ...Array.from(
          new Set(
            moduleRecords.map((r) =>
              String(r.data?.account_name || "Unassigned"),
            ),
          ),
        ),
      ],
      selected = tabs.includes(accountTab(k)) ? accountTab(k) : "All",
      filtered = moduleRecords.filter(
        (r) =>
          selected === "All" ||
          String(r.data?.account_name || "Unassigned") === selected,
      ),
      tabTotals = computeModuleTotals(k, filtered),
      rows = groupedRows(k, filtered).filter((x) =>
        JSON.stringify(x.c).toLowerCase().includes(query.toLowerCase()),
      ),
      isInvestment = [
        "stocks",
        "mutualFunds",
        "ulips",
        "bullion",
        "nsel",
        "fixedIncome",
        "property",
        "otherAssets",
      ].includes(k),
      hasAccountTabs = isInvestment || k === "insurance" || k === "loans",
      mode = detailTabs[k] || "holdings",
      reviewRows =
        k === "fixedIncome" ? filtered.filter(fixedIncomeReviewDue) : [],
      maturityRows =
        k === "fixedIncome" ? filtered.filter(fixedIncomeMaturityDue) : [];
    const fixedTotals =
      k === "fixedIncome"
        ? rows.reduce(
            (a, x) => ({
              current: a.current + num(x.c.latest),
              interest: a.interest + num(x.c.interest_incurred_fy),
              yearEnd: a.yearEnd + num(x.c.year_end_maturity_value),
              maturity: a.maturity + num(x.c.maturity_value),
            }),
            { current: 0, interest: 0, yearEnd: 0, maturity: 0 },
          )
        : null;
    const hasDailyChange = showsDailyChange(k),
      monthlyGain = filtered.reduce((s, r) => s + monthlyGainFor(k, r), 0),
      moduleToday = hasDailyChange
        ? filtered.reduce((s, r) => s + todayGainFor(k, r), 0)
        : 0;
    const visibleCols =
      k === "stocks"
        ? def.cols.filter(
            (c) => !["ticker_symbol", "exchange", "last_synced"].includes(c),
          )
        : k === "bullion"
        ? def.cols.filter((c) => c !== "last_synced")
        : def.cols;
    const lastSynced =
      filtered
        .map((r) => String(r.data?.last_synced || ""))
        .filter(Boolean)
        .sort()
        .at(-1) || "";
    const lotRows = (lots: Rec[], groupKey: string) =>
      lots.map((lot, i) => {
        const c = computeLiveRecord(k, lot.data),
          linkedProperty = lot.data?.source_module === "property";
        return (
          <tr
            onClick={() => {
              if (k === "bullion") {
                openMoneycontrolCommodity(c);
                return;
              }
              setDetail({
                moduleKey: k,
                record: lot,
                computed: c,
                cols: visibleCols,
                linkedProperty,
              });
            }}
            style={{
              backgroundColor:
                ["stocks", "bullion"].includes(k)
                  ? undefined
                  : ["#fff7ed", "#f0fdf4", "#eff6ff", "#fdf2f8", "#fefce8"][
                      i % 5
                    ],
              borderLeft: `6px solid ${["stocks", "bullion"].includes(k) ? (marketMove(k, c) > 0 ? "#16a34a" : marketMove(k, c) < 0 ? "#dc2626" : "#d1d5db") : ["#fb923c", "#22c55e", "#3b82f6", "#ec4899", "#eab308"][i % 5]}`,
            }}
            className={`cursor-pointer border-t border-[#eee6d9] transition hover:brightness-[0.98] ${marketRowClass(k, c)}`}
            key={`${groupKey}-lot-${lot.id}`}
          >
            <td className="p-3 text-xs font-medium text-gray-500">
              {lot.data?.account_name || `Lot ${i + 1}`}
            </td>
            {visibleCols.slice(1).map((col) => (
              <td className="p-3" key={col}>
                {formatModuleCell(k, col, c)}
              </td>
            ))}
            <td className="p-3 text-right">
              <button
                className="btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetail({
                    moduleKey: k,
                    record: lot,
                    computed: c,
                    cols: visibleCols,
                    linkedProperty,
                  });
                }}
            >
                Manage
              </button>
            </td>
          </tr>
        );
      });
    if (k === "stocks" && mode === "watchlist")
      return (
        <div className="space-y-5">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{def.title}</h3>
                <p className="text-sm text-gray-600">{def.desc}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-[#e1d8c8] bg-[#fffdf8] px-3 py-1.5 text-xs font-medium text-[#37534a] shadow-none"
                  onClick={() => setAutoRefresh((v) => !v)}
                >
                  Auto refresh: {autoRefresh ? "On" : "Off"}
                  {editing || detail || accModal
                    ? " | Paused while editing"
                    : ""}
                  {lastSynced ? ` | Last sync: ${lastSynced}` : ""}
                </button>
                <button className="btn" onClick={() => refreshStocks()}>
                  <RefreshCw size={16} className="inline" /> Refresh Holdings
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setEditing({ moduleKey: "stocks" })}
                >
                  <Plus size={16} className="inline" /> Add Stock
                </button>
              </div>
            </div>
            {holdingBrokerTabs(k)}
          </section>
          {marketTodayHeader()}
          {stockWatchlistTable()}
        </div>
      );
    if (k === "stocks" && mode === "brokers")
      return (
        <div className="space-y-5">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{def.title}</h3>
                <p className="text-sm text-gray-600">{def.desc}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-[#e1d8c8] bg-[#fffdf8] px-3 py-1.5 text-xs font-medium text-[#37534a] shadow-none"
                  onClick={() => setAutoRefresh((v) => !v)}
                >
                  Auto refresh: {autoRefresh ? "On" : "Off"}
                  {editing || detail || accModal
                    ? " | Paused while editing"
                    : ""}
                  {lastSynced ? ` | Last sync: ${lastSynced}` : ""}
                </button>
                <button className="btn" onClick={() => refreshModuleRates(k)}>
                  <RefreshCw size={16} className="inline" /> Refresh Current
                  Rates
                </button>
                <button className="btn" onClick={() => exportModuleCsv(k)}>
                  Export CSV
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setEditing({ moduleKey: k })}
                >
                  <Plus size={16} className="inline" /> Add
                </button>
              </div>
            </div>
            {holdingBrokerTabs(k)}
            {hasAccountTabs && tabs.length > 1 && (
              <div className="mb-4 flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-[#fffdf8] p-1">
                {tabs.map((t) => {
                  const count =
                    t === "All"
                      ? moduleRecords.length
                      : moduleRecords.filter(
                          (r) =>
                            String(r.data?.account_name || "Unassigned") === t,
                        ).length;
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setAccountTabs((prev) => ({ ...prev, [k]: t }))
                      }
                      className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${selected === t ? "bg-sage text-white shadow-sm" : "text-[#17382b] hover:bg-[#eef5ee]"}`}
                    >
                      {t} <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
              {kpi(
                "Invested",
                fmt(tabTotals.invested),
                "text-[#17382b]",
                "Cost basis",
              )}
              {kpi(
                "Today Gain",
                fmt(moduleToday),
                moduleToday >= 0 ? "text-emerald-700" : "text-red-700",
                "Calculated from this investment tab",
              )}
              {kpi(
                "Monthly Gain",
                fmt(monthlyGain),
                monthlyGain >= 0 ? "text-emerald-700" : "text-red-700",
                "Saved, month-start, this-month, or accrual estimate",
              )}
              {kpi(
                "Overall Gain",
                fmt(tabTotals.gain),
                tabTotals.gain >= 0 ? "text-emerald-700" : "text-red-700",
                "Current value - invested",
              )}
              {kpi(
                "Current Value",
                fmt(tabTotals.assets),
                "text-emerald-700",
                `${selected} investment particulars: ${filtered.length} rows / ${rows.length} grouped`,
              )}
            </div>
          </section>
          {marketTodayHeader()}
          {stockBrokerDetailsTable(`${def.title} Broker Details`, filtered)}
        </div>
      );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{def.title}</h3>
            <p className="text-sm text-gray-600">{def.desc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(k === "stocks" || k === "bullion") && (
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-[#e1d8c8] bg-[#fffdf8] px-3 py-1.5 text-xs font-medium text-[#37534a] shadow-none"
                onClick={() => setAutoRefresh((v) => !v)}
              >
                Auto refresh: {autoRefresh ? "On" : "Off"}
                {editing || detail || accModal ? " | Paused while editing" : ""}
                {lastSynced ? ` | Last sync: ${lastSynced}` : ""}
              </button>
            )}
            {isInvestment && (
              <button className="btn" onClick={() => refreshModuleRates(k)}>
                <RefreshCw size={16} className="inline" /> Refresh Current Rates
              </button>
            )}
            <button className="btn" onClick={() => exportModuleCsv(k)}>
              Export CSV
            </button>
            <button
              className="btn-primary"
              onClick={() => setEditing({ moduleKey: k })}
            >
              <Plus size={16} className="inline" /> Add
            </button>
          </div>
        </div>
        {k === "stocks" && holdingBrokerTabs(k)}
        {hasAccountTabs && tabs.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-[#fffdf8] p-1">
            {tabs.map((t) => {
              const count =
                t === "All"
                  ? moduleRecords.length
                  : moduleRecords.filter(
                      (r) => String(r.data?.account_name || "Unassigned") === t,
                    ).length;
              return (
                <button
                  key={t}
                  onClick={() =>
                    setAccountTabs((prev) => ({ ...prev, [k]: t }))
                  }
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${selected === t ? "bg-sage text-white shadow-sm" : "text-[#17382b] hover:bg-[#eef5ee]"}`}
                >
                  {t} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}
        {k === "stocks" && <div className="mb-4">{marketTodayHeader()}</div>}
        {isInvestment && (
          <div className="mb-4 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            {k === "fixedIncome" && fixedTotals ? (
              <>
                {kpi(
                  "Invested",
                  fmt(tabTotals.invested),
                  "text-[#17382b]",
                  "Cost basis",
                )}
                {kpi(
                  "Interest This FY",
                  fmt(fixedTotals.interest),
                  "text-emerald-700",
                  "Accrued till date from FY start or investment date",
                )}
                {kpi(
                  "Monthly Gain",
                  fmt(monthlyGain),
                  monthlyGain >= 0 ? "text-emerald-700" : "text-red-700",
                  "Saved, month-start, this-month, or accrual estimate",
                )}
                {kpi(
                  "Overall Gain",
                  fmt(tabTotals.gain),
                  tabTotals.gain >= 0 ? "text-emerald-700" : "text-red-700",
                  "Current value - invested",
                )}
                {kpi(
                  "Current Worth",
                  fmt(fixedTotals.current),
                  "text-emerald-700",
                  "Value including interest incurred this FY",
                )}
              </>
            ) : (
              <>
                {kpi(
                  "Invested",
                  fmt(tabTotals.invested),
                  "text-[#17382b]",
                  "Cost basis",
                )}
                {hasDailyChange &&
                  kpi(
                    "Today Gain",
                    fmt(moduleToday),
                    moduleToday >= 0 ? "text-emerald-700" : "text-red-700",
                    "Calculated from this investment tab",
                  )}
                {kpi(
                  "Monthly Gain",
                  fmt(monthlyGain),
                  monthlyGain >= 0 ? "text-emerald-700" : "text-red-700",
                  "Saved, month-start, this-month, or accrual estimate",
                )}
                {kpi(
                  "Overall Gain",
                  fmt(tabTotals.gain),
                  tabTotals.gain >= 0 ? "text-emerald-700" : "text-red-700",
                  "Current value - invested",
                )}
                {kpi(
                  "Current Value",
                  fmt(tabTotals.assets),
                  "text-emerald-700",
                  `${selected} investment particulars: ${filtered.length} rows / ${rows.length} grouped`,
                )}
              </>
            )}
          </div>
        )}
        {k === "fixedIncome" && reviewRows.length > 0 && (
          <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Bell size={16} /> Quarterly value review due
            </div>
            <div className="grid gap-2">
              {reviewRows.slice(0, 6).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">
                      {fixedIncomeCategoryLabel(r.data?.category) ||
                        "Fixed income item"}
                    </span>
                    <span className="ml-2 text-gray-500">
                      Update current value, rate, monthly contributions or
                      gratuity if changed.
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => setEditing({ moduleKey: k, record: r })}
                    >
                      Update
                    </button>
                    <button
                      className="btn"
                      onClick={() => markFixedIncomeReviewed(r)}
                    >
                      <CheckCircle2 size={14} className="inline" /> Reviewed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {k === "fixedIncome" && maturityRows.length > 0 && (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-900">
              <Bell size={16} /> Maturity due in next 3 months
            </div>
            <div className="grid gap-2">
              {maturityRows.slice(0, 8).map((r) => {
                const c = computeRecord("fixedIncome", r.data);
                return (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold">
                        {fixedIncomeCategoryLabel(r.data?.category) ||
                          "Fixed income item"}
                      </span>
                      <span className="ml-2 text-gray-500">
                        Maturity date{" "}
                        {String(c.maturity_date || r.data?.maturity_date || "")}
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn"
                        onClick={() => snoozeFixedIncomeMaturity(r)}
                      >
                        Remind me again
                      </button>
                      <button
                        className="btn"
                        onClick={() => resolveFixedIncomeMaturity(r)}
                      >
                        <CheckCircle2 size={14} className="inline" /> Resolved
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {rows.length ? (
          <div
            className={`overflow-auto rounded-[22px] border border-[#ded6c4] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] investment-table ${k === "stocks" ? "stock-holdings-table" : ""} ${k === "bullion" ? "bullion-holdings-table" : ""} ${k === "fixedIncome" ? "fixed-income-table" : ""}`}
          >
            <table
              className={`border-collapse text-sm ${
                k === "stocks"
                  ? "w-[1360px] table-fixed"
                    : k === "fixedIncome"
                      ? "w-[1330px] table-fixed"
                    : k === "bullion"
                      ? "w-[1160px] table-fixed"
                    : "w-full min-w-[760px] table-fixed"
              }`}
            >
              {k === "stocks" && (
                <colgroup>
                  {visibleCols.map((c) => (
                    <col key={c} style={{ width: stockColWidth(c) }} />
                  ))}
                  <col style={{ width: "88px" }} />
                </colgroup>
              )}
              {k === "fixedIncome" && (
                <colgroup>
                  {visibleCols.map((c) => (
                    <col
                      key={c}
                      style={{
                        width: fixedIncomeColWidth(c),
                      }}
                    />
                  ))}
                  <col style={{ width: "92px" }} />
                </colgroup>
              )}
              {k === "bullion" && (
                <colgroup>
                  {visibleCols.map((c) => (
                    <col
                      key={c}
                      style={{
                        width:
                          c === "account_name"
                            ? "110px"
                            : c === "security_name"
                              ? "150px"
                              : c === "quantity"
                                ? "90px"
                                : c === "unit"
                                  ? "80px"
                                  : c === "current_price"
                                    ? "170px"
                                    : c === "today_gain"
                                      ? "130px"
                                      : ["invested", "latest", "gain"].includes(c)
                                        ? "135px"
                                        : c === "gain_pct"
                                          ? "90px"
                                          : "100px",
                      }}
                    />
                  ))}
                  <col style={{ width: "92px" }} />
                </colgroup>
              )}
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  {visibleCols.map((c) => (
                    <th className={`p-3 ${stockCellClass(k, c)}`} key={c}>
                      {fieldLabel(k, c)}
                    </th>
                  ))}
                  <th className={k === "stocks" ? "text-right" : ""}>
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(({ r, c, records: lots, key }) => {
                  const open = !!expandedLots[key];
                  return [
                    <tr
                      onClick={() => {
                        if (k === "bullion") {
                          openMoneycontrolCommodity(c);
                          return;
                        }
                        setDetail({
                          moduleKey: k,
                          record: r,
                          computed: c,
                          cols: visibleCols,
                          linkedProperty: r.data?.source_module === "property",
                        });
                      }}
                      className={`cursor-pointer border-t border-[#eee6d9] transition ${marketRowClass(k, c)}`}
                      key={key}
                    >
                      {visibleCols.map((col) => (
                        <td className={`p-3 ${stockCellClass(k, col)}`} key={col}>
                          {formatModuleCell(k, col, c)}
                        </td>
                      ))}
                      <td className="space-x-2 p-3 text-right">
                        {lots.length === 1 && (
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetail({
                                moduleKey: k,
                                record: r,
                                computed: c,
                                cols: visibleCols,
                                linkedProperty:
                                  r.data?.source_module === "property",
                              });
                            }}
                          >
                            Manage
                          </button>
                        )}
                        {lots.length > 1 && (
                          <button
                            className="pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLots((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }));
                            }}
                          >
                            {open ? "Hide" : "Show"} {lots.length} lots
                          </button>
                        )}
                      </td>
                    </tr>,
                    ...(open ? lotRows(lots, key) : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text={`No ${def.title} records yet.`} />
        )}
      </section>
    );
  }
  function shareListView() {
    return (
      <section className="grid grid-cols-[1.2fr_.8fr] gap-4 max-xl:grid-cols-1">
        <div className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold tracking-tight">Add Share List To Watchlist</h3>
          <p className="mt-1 text-sm text-gray-600">
            Paste share names or symbols, or upload a spreadsheet. Every row
            will be added to your watchlist with the available current price.
          </p>
          <div className="mt-5 grid gap-3">
            <div className="col-span-2 max-md:col-span-1">
              <label className="field-label">Paste Shares</label>
              <textarea
                className="field-input min-h-56 font-mono text-xs"
                value={pasteTable}
                onChange={(e) => setPasteTable(e.target.value)}
                placeholder={
                  "One symbol per line:\nRELIANCE\nINFY\nTCS\n\nOr table columns: Company, Symbol, Exchange, Quantity"
                }
              />
            </div>
            <div className="col-span-2 max-md:col-span-1">
              <label className="field-label">
                Or Upload Excel / CSV / JSON
              </label>
              <input
                ref={fileRef}
                type="file"
                className="field-input"
                accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
                onChange={(e) => handleImport(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" onClick={previewPastedTable}>
              <FileUp size={16} className="inline" /> Preview Share List
            </button>
            <button
              className="btn-primary"
              onClick={importRows}
              disabled={!importPreview.length}
            >
              Add To Watchlist
            </button>
            <button
              className="btn"
              onClick={() => {
                setImportPreview([]);
                setPasteTable("");
              }}
            >
              Clear
            </button>
          </div>
          <div className="mt-5">
            {importPreview.length ? (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="pill">
                    Watchlist: {String(importPreview.length)}
                  </span>
                </div>
                {simpleTable(
                  ["Company", "Symbol", "Exchange", "Date Added", "Quantity"],
                  importPreview
                    .slice(0, 25)
                    .map((r) => [
                      r.data.security_name || "",
                      r.data.ticker_symbol || "",
                      r.data.exchange || "",
                      r.data.base_price_date || "",
                      r.data.quantity || 1,
                    ]),
                )}
              </>
            ) : (
              <Empty text="No preview yet. Paste shares or upload a file." />
            )}
          </div>
        </div>
        <div className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold tracking-tight">Paste Format</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Paste one NSE symbol or known company name on each line.</li>
            <li>Alternatively upload an Excel or CSV file with share columns.</li>
            <li>Click Preview Share List and verify the mapped symbols.</li>
            <li>Click Add To Watchlist to save all listed shares.</li>
          </ol>
        </div>
      </section>
    );
  }
  function insights() {
    const s = aiSignals(),
      stocks = stockAiCandidates(),
      assets = records
        .filter((r) => MODULES[r.module_key]?.kind === "asset")
        .map((r) => {
          const c = computeLiveRecord(r.module_key, r.data);
          return {
            r,
            c,
            weight: totals.assets ? (num(c.latest) / totals.assets) * 100 : 0,
            today: showsDailyChange(r.module_key)
              ? todayGainFor(r.module_key, r)
              : 0,
          };
        })
        .sort((a, b) => b.weight - a.weight);
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
          {kpi(
            "Local Health Signal",
            `${Math.round(s.score)}/100`,
            s.score > 70
              ? "text-emerald-700"
              : s.score > 45
                ? "text-amber-700"
                : "text-red-700",
            "Calculated from portfolio data",
          )}
          {kpi(
            "Daily Gain",
            fmt(s.daily),
            s.daily >= 0 ? "text-emerald-700" : "text-red-700",
            "Stocks and bullion movement",
          )}
          {kpi(
            "Monthly Gain",
            fmt(s.monthly),
            s.monthly >= 0 ? "text-emerald-700" : "text-red-700",
            "Saved, month-start, this-month, or accrual estimate",
          )}
          {kpi(
            "Local Risk Signal",
            s.action,
            s.action === "Stay Invested" ? "text-emerald-700" : "text-red-700",
            "Stay invested or sell / reduce",
          )}
        </div>
        {aiAnalystPanel()}
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold tracking-tight">Local Signal Notes</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
            {s.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>
              Signals are generated from your saved values, price refresh fields
              and concentration, not from a guaranteed prediction model.
            </li>
          </ul>
        </section>
        <div className="grid grid-cols-2 gap-5 max-xl:grid-cols-1">
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Allocation Risk</h3>
            {simpleTable(
              ["Holding", "Section", "Weight", "Today"],
              assets
                .slice(0, 8)
                .map((x) => [
                  x.c.security_name ||
                    x.c.category ||
                    MODULES[x.r.module_key]?.title,
                  MODULES[x.r.module_key]?.title,
                  pct(x.weight),
                  fmt(x.today),
                ]),
            )}
          </section>
          <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h3 className="mb-3 text-xl font-semibold">Growth Stock Radar</h3>
            {simpleTable(
              ["Candidate", "Sector", "Score", "Why"],
              stocks
                .slice(0, 8)
                .map((x) => [x.name, x.category, `${x.score}/100`, x.why]),
            )}
          </section>
        </div>
      </div>
    );
  }
  function recommendationsView() {
    return (
      <div className="space-y-5">
        {aiAnalystPanel()}
        {aiRecommendationPanel("dashboard")}
      </div>
    );
  }
  function watchlistView() {
    const saved = records.filter((r) => r.module_key === "watchlist"),
      candidates = stockAiCandidates(),
      rows = saved
        .map((r) => {
          const c = computeRecord("watchlist", r.data),
            match = ALL_STOCKS.find(
              (s) =>
                key(s.ticker) === key(r.data?.ticker_symbol) ||
                key(s.name) === key(r.data?.security_name),
            ),
            score = match
              ? candidates.find(
                  (x) =>
                    x.ticker === match.ticker && x.exchange === match.exchange,
                )?.score || 68
              : 55;
          return { r, c, score, match };
        })
        .sort((a, b) => b.score - a.score);
    return (
      <div className="space-y-5">
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">AI Watchlist</h3>
              <p className="text-sm text-gray-600">
                Growth candidates are ranked by sector momentum, ownership gap,
                exchange quality and volatility sensitivity.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => setEditing({ moduleKey: "watchlist" })}
            >
              <Plus size={16} className="inline" /> Add Watch Item
            </button>
          </div>
          {simpleTable(
            ["Candidate", "Sector", "AI Score", "Signal"],
            candidates.map((x) => [
              x.name,
              x.category,
              `${x.score}/100`,
              x.signal,
            ]),
          )}
        </section>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="mb-3 text-xl font-semibold">Saved Watchlist</h3>
          {rows.length ? (
            <div className="overflow-auto rounded-2xl border border-[#e3dccc] bg-white">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-3">Name</th>
                    <th>Symbol</th>
                    <th>Date Added</th>
                    <th>Added Price</th>
                    <th>Current Price</th>
                    <th>Target</th>
                    <th>AI Score</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.r.id} className="border-t border-[#eee6d9]">
                      <td className="p-3 font-semibold">
                        {x.r.data?.security_name}
                      </td>
                      <td>{x.r.data?.ticker_symbol}</td>
                      <td>
                        {x.r.data?.base_price_date ||
                          x.r.data?.data_uploaded_date ||
                          String(x.r.created_at || "").slice(0, 10)}
                      </td>
                      <td>{fmt(x.r.data?.base_price || x.r.data?.inv_price)}</td>
                      <td>{fmtPrice(x.r.data?.current_price)}</td>
                      <td>{fmt(x.r.data?.target_price)}</td>
                      <td>
                        <span
                          className={
                            x.score >= 80
                              ? "pill bg-emerald-50 text-emerald-700"
                              : "pill"
                          }
                        >
                          {x.score}/100
                        </span>
                      </td>
                      <td className="space-x-2 p-3">
                        <button
                          className="btn"
                          onClick={() =>
                            setDetail({
                              moduleKey: "watchlist",
                              record: x.r,
                              computed: x.c,
                              cols: MODULES.watchlist?.cols || [],
                            })
                          }
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No saved watchlist yet. Use Add Watch Item or research the AI candidates above." />
          )}
        </section>
      </div>
    );
  }
  function settings() {
    return (
      <div className="grid grid-cols-[1.1fr_.9fr] gap-4 max-xl:grid-cols-1">
        <div className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold tracking-tight">Profile</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile(new FormData(e.currentTarget));
            }}
            className="mt-4 grid grid-cols-2 gap-3 max-md:grid-cols-1"
          >
            <div>
              <label className="field-label">Name</label>
              <input
                name="full_name"
                className="field-input"
                defaultValue={profile?.full_name || ""}
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                className="field-input"
                value={profile?.email || user?.email || ""}
                readOnly
              />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input
                name="phone"
                className="field-input"
                defaultValue={profile?.phone || ""}
              />
            </div>
            <div>
              <label className="field-label">City</label>
              <input
                name="city"
                className="field-input"
                defaultValue={profile?.city || ""}
              />
            </div>
            <div>
              <label className="field-label">Access Role</label>
              <input
                className="field-input"
                value={isAdmin ? "Admin" : "Normal"}
                readOnly
              />
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full">Save Profile</button>
            </div>
          </form>
          <p className="mt-4 rounded-2xl bg-[#eef5ee] p-3 text-sm text-gray-700">
            <Shield size={16} className="mr-1 inline" /> Admin can delete
            accounts/records. Normal can add/edit but destructive actions are
            blocked.
          </p>
        </div>
        <div className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold tracking-tight">Backup</h3>
          <div className="mt-4 space-y-3">
            <button className="btn w-full" onClick={exportBackup}>
              Download JSON Backup
            </button>
            <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              Data is stored in Supabase with RLS policies.
            </p>
          </div>
        </div>
      </div>
    );
  }
  function detailModal() {
    const d = detail!,
      def = MODULES[d.moduleKey],
      title = d.computed.security_name || d.computed.category || def.title,
      systemData = {
        data_uploaded_date:
          d.record.data?.data_uploaded_date ||
          String(d.record.created_at || "").slice(0, 10),
        data_uploaded_at:
          d.record.data?.data_uploaded_at || d.record.created_at,
        last_updated_date: d.record.data?.last_updated_date,
        last_updated_at: d.record.data?.last_updated_at,
      },
      computed = { ...d.computed, ...systemData },
      fields = [
        ...new Set([
          ...d.cols,
          ...def.fields.map((f) => f.name),
          "data_uploaded_date",
          "data_uploaded_at",
          "last_updated_date",
          "last_updated_at",
          "notes",
        ]),
      ].filter(
        (f) =>
          computed[f] !== undefined &&
          computed[f] !== "" &&
          computed[f] !== null,
      ),
      linkedDocs = docs.filter((x) => x.record_id === d.record.id);
    return (
      <Modal title={`${def.title}: ${title}`} onClose={() => setDetail(null)}>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {fields.map((f) => (
            <div
              key={f}
              className={f === "notes" ? "col-span-2 max-md:col-span-1" : ""}
            >
              <div className="field-label">{fieldLabel(d.moduleKey, f)}</div>
              <div className="rounded-2xl border border-[#e3dccc] bg-white px-3 py-2 text-sm font-semibold text-[#17382b]">
                {formatCell(f, computed[f])}
              </div>
            </div>
          ))}
          <div className="col-span-2 max-md:col-span-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Paperclip size={16} /> Documents
            </div>
            {docRows(linkedDocs)}
          </div>
          <div className="col-span-2 mt-2 flex justify-end gap-2 pb-16 max-md:col-span-1">
            {["stocks", "watchlist"].includes(d.moduleKey) && (
              <a
                className="btn"
                href={moneycontrolHref(computed)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Moneycontrol
              </a>
            )}
            <button className="btn" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <div className="fixed bottom-5 right-5 z-[70] flex gap-2 rounded-full border border-[#e3dccc] bg-[#fffdf8]/95 p-2 shadow-2xl backdrop-blur">
            <button
              className="btn-primary"
              onClick={() => {
                setDetail(null);
                setEditing({
                  moduleKey: d.linkedProperty ? "property" : d.moduleKey,
                  record: d.record,
                });
              }}
            >
              Edit
            </button>
            {isAdmin && !d.linkedProperty && (
              <button
                className="btn-danger"
                onClick={async () => {
                  setDetail(null);
                  await delRecord(d.record);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </Modal>
    );
  }
  function recordModal() {
    const def = MODULES[editing!.moduleKey],
      raw = editing!.record?.data || editing!.defaults || {},
      cur = ["stocks", "watchlist"].includes(editing!.moduleKey)
        ? computedData(editing!.moduleKey, raw)
        : editing!.moduleKey === "fixedIncome"
          ? computeRecord("fixedIncome", raw)
          : raw,
      matches = stockOpen
        ? stockResults.length
          ? stockResults
          : stockMatches(stockSearch)
        : [],
      fields =
        editing!.moduleKey === "fixedIncome"
          ? def.fields.filter((f) => showFixedIncomeField(f.name))
          : def.fields;
    return (
      <Modal
        title={`${editing!.record ? "Edit" : "Add"} ${def.title}`}
        onClose={() => setEditing(null)}
      >
        <form
          className="grid grid-cols-2 gap-3 max-md:grid-cols-1"
          autoComplete="off"
          onInput={(e) => {
            if (editing!.moduleKey === "stocks")
              fillStockTotals(e.currentTarget);
            const t = e.target as HTMLInputElement | HTMLSelectElement;
            if (editing!.moduleKey === "fixedIncome") {
              if (t.name === "category") {
                setFixedIncomeType(t.value);
                applyFixedIncomeDefaults(e.currentTarget, t.value);
              } else if (
                ["purchase_date", "account_creation_date", "lock_in_years"].includes(t.name)
              ) {
                recalcFixedIncomeMaturityDate(e.currentTarget);
                recalcFixedIncomeMaturity(e.currentTarget);
              } else if (
                [
                  "initial_investment",
                  "investment_amount",
                  "yearly_investment",
                  "employee_contribution",
                  "company_contribution",
                  "current_value_today",
                  "interest_rate",
                ].includes(t.name)
              )
                recalcFixedIncomeMaturity(e.currentTarget);
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget),
              data: any = {};
            def.fields.forEach((f) => {
              const v = fd.get(f.name) || "";
              data[f.name] = numericFieldNames.has(f.name) ? num(v) : v;
            });
            if (editing!.moduleKey === "fixedIncome") {
              data.category = fixedIncomeCategoryLabel(data.category);
              if (isCompanyPfType(data.category)) {
                data.broker = "Govt";
                data.lock_in_years = "";
                data.maturity_date = "";
                data.maturity_value = "";
              }
            }
            saveRecord(editing!.moduleKey, data, editing!.record);
          }}
        >
          {fields.map((f) => (
            <div
              key={f.name}
              className={
                f.type === "textarea" ? "col-span-2 max-md:col-span-1" : ""
              }
            >
              <label className="field-label">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  className="field-input min-h-24"
                  defaultValue={cur[f.name] || ""}
                />
              ) : f.type === "select" ? (
                <select
                  name={f.name}
                  className="field-input"
                  defaultValue={
                    editing!.moduleKey === "fixedIncome" &&
                    f.name === "category"
                      ? fixedIncomeCategoryLabel(cur[f.name])
                      : cur[f.name] || ""
                  }
                  onChange={(e) => {
                    if (
                      editing!.moduleKey === "fixedIncome" &&
                      f.name === "category"
                    ) {
                      setFixedIncomeType(e.currentTarget.value);
                      applyFixedIncomeDefaults(
                        e.currentTarget.form,
                        e.currentTarget.value,
                      );
                    }
                  }}
                >
                  <option value="">Select</option>
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === "account" ? (
                <input
                  name={f.name}
                  className="field-input"
                  list="account-list"
                  autoComplete="off"
                  defaultValue={cur[f.name] || ""}
                />
              ) : f.name === "security_name" &&
                ["stocks", "watchlist"].includes(editing!.moduleKey) ? (
                <div className="relative">
                  <input
                    name={f.name}
                    className="field-input"
                    autoComplete="off"
                    value={stockSearch}
                    onFocus={() => setStockOpen(true)}
                    onChange={(e) => {
                      setStockSearch(e.target.value);
                      setStockOpen(true);
                    }}
                    onBlur={(e) =>
                      setTimeout(() => {
                        setStockOpen(false);
                        autoFillStock(
                          e.currentTarget.form,
                          e.currentTarget.value,
                        );
                      }, 160)
                    }
                  />
                  {matches.length > 0 && (
                    <div className="absolute z-[60] mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-[#e3dccc] bg-white shadow-xl">
                      {matches.map((s) => (
                        <button
                          key={`${s.exchange}-${s.ticker}`}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-[#f1eadf] px-3 py-2 text-left text-sm hover:bg-[#eef5ee]"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            const form = e.currentTarget.form;
                            setStockSearch(s.name);
                            setStockOpen(false);
                            applyStock(form, s);
                          }}
                        >
                          <span>
                            <span className="font-semibold">{s.name}</span>
                            <span className="block text-xs text-gray-500">
                              {s.category}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-[#f5efe3] px-2 py-1 text-xs font-semibold">
                            {s.exchange}: {s.ticker}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  name={f.name}
                  type={f.type === "number" ? "text" : f.type || "text"}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  className="field-input"
                  autoComplete="off"
                  defaultValue={
                    f.type === "number"
                      ? fmtInr(cur[f.name])
                      : cur[f.name] || ""
                  }
                  readOnly={
                    editing!.moduleKey === "fixedIncome" &&
                    f.name === "maturity_value"
                  }
                />
              )}
            </div>
          ))}
          <div className="col-span-2 max-md:col-span-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="field-label m-0">
                Documents (Google Drive)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={
                    googleDriveConnected
                      ? "pill bg-emerald-50 text-emerald-700"
                      : "btn"
                  }
                  onClick={connectGoogleDrive}
                >
                  {googleDriveConnected
                    ? "Google Drive connected"
                    : "Connect Google Drive"}
                </button>
                {googleDriveConnected && (
                  <button
                    type="button"
                    className="btn"
                    onClick={disconnectGoogleDrive}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
            <input
              name="documents"
              type="file"
              multiple
              className="field-input"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={(e) => {
                docFilesRef.current = Array.from(e.currentTarget.files || []);
              }}
            />
            <p className="mt-2 text-xs font-semibold text-gray-500">
              Optional files upload to Google Drive and are linked to this asset
              as repository references.
            </p>
            {editing!.record &&
              docs.filter((d) => d.record_id === editing!.record?.id).length >
                0 && (
                <div className="mt-3">
                  {docRows(
                    docs.filter((d) => d.record_id === editing!.record?.id),
                  )}
                </div>
              )}
          </div>
          <datalist id="account-list">
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.name} />
            ))}
          </datalist>
          <datalist id="stock-list">
            {ALL_STOCKS.map((s) => (
              <option key={`${s.exchange}-${s.ticker}`} value={s.name}>
                {s.exchange}: {s.ticker} - {s.category}
              </option>
            ))}
          </datalist>
          <div className="sticky bottom-0 col-span-2 flex justify-end gap-2 border-t border-[#e3dccc] bg-[#fffdf8]/95 py-3 backdrop-blur max-md:col-span-1">
            <button
              type="button"
              className="btn"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    );
  }
  async function applyStock(
    form: HTMLFormElement | null,
    s: (typeof ALL_STOCKS)[number],
  ) {
    if (!form) return;
    const set = (n: string, v: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[name="${n}"]`,
      );
      if (el) el.value = v;
    };
    set("security_name", s.name);
    set("ticker_symbol", s.ticker);
    set("exchange", s.exchange);
    set("category", s.category);
    try {
      const res = await fetch(
        `/api/quote?symbol=${encodeURIComponent(s.ticker)}&exchange=${encodeURIComponent(s.exchange)}&name=${encodeURIComponent(s.name)}`,
      );
      const q = await res.json();
      if (Number.isFinite(Number(q.price))) {
        const d: Record<string, any> = {};
        assignStockQuoteFields(d, q);
        set("live_price", d.live_price || "");
        set("current_price", d.live_price || "");
        set("previous_close", d.previous_close || "");
        set("day_change", d.day_change || "");
        set("day_high", d.day_high || "");
        set("day_low", d.day_low || "");
        set("fifty_two_week_high", d.fifty_two_week_high || "");
        set("fifty_two_week_low", d.fifty_two_week_low || "");
        const qty =
          num(
            (form.querySelector('[name=\"quantity\"]') as HTMLInputElement)
              ?.value,
          ) || 1;
        const buy = num(
          (form.querySelector('[name=\"inv_price\"]') as HTMLInputElement)
            ?.value,
        );
        if (qty && buy) set("investment_amount", (qty * buy).toFixed(2));
        if (qty) set("latest_value", (qty * Number(q.price)).toFixed(2));
        set("today_gain", (qty * num(q.change)).toFixed(2));
        set("last_synced", new Date().toLocaleString());
      }
    } catch {
      setToast("Could not fetch price. Enter manually.");
    }
  }
  async function autoFillStock(form: HTMLFormElement | null, value: string) {
    const s = findStock(value);
    if (!s) return;
    await applyStock(form, s);
  }
  function accountModal() {
    const a = accModal === "new" ? null : (accModal as Account);
    return (
      <Modal
        title={a ? "Edit Account" : "Add Account"}
        onClose={() => setAccModal(null)}
      >
        <form
          className="grid grid-cols-2 gap-3 max-md:grid-cols-1"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveAccount(
              {
                name: String(fd.get("name") || ""),
                relation: String(fd.get("relation") || "Other"),
                type: String(fd.get("type") || "Other"),
                institution: String(fd.get("institution") || ""),
                notes: String(fd.get("notes") || ""),
              },
              a,
            );
          }}
        >
          <div>
            <label className="field-label">Account Name</label>
            <input
              name="name"
              className="field-input"
              required
              defaultValue={a?.name || ""}
            />
          </div>
          <div>
            <label className="field-label">Relation</label>
            <select
              name="relation"
              className="field-input"
              defaultValue={a?.relation || "Other"}
            >
              {RELATIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Type</label>
            <select
              name="type"
              className="field-input"
              defaultValue={a?.type || "Other"}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Institution</label>
            <input
              name="institution"
              className="field-input"
              defaultValue={a?.institution || ""}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <label className="field-label">Notes</label>
            <textarea
              name="notes"
              className="field-input min-h-24"
              defaultValue={a?.notes || ""}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2 max-md:col-span-1">
            <button
              type="button"
              className="btn"
              onClick={() => setAccModal(null)}
            >
              Cancel
            </button>
            <button className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    );
  }
  function formatCell(k: string, v: any) {
    if (k === "day_change")
      return movementValue(v, fmtSignedPrice(v));
    if (priceCols.has(k))
      return (
        <span className="font-bold tabular-nums">
          {fmtPrice(v)}
        </span>
      );
    if (moneyCols.includes(k))
      return (
        <span className={num(v) < 0 ? "font-bold text-red-700" : "font-bold"}>
          {fmt(v)}
        </span>
      );
    if (k.includes("pct") || k.includes("interest_rate"))
      return <span>{pct(v)}</span>;
    return <span>{String(v ?? "")}</span>;
  }
}
