"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  GitBranch,
  Home,
  KeyRound,
  Layers,
  LogOut,
  Menu,
  MoreHorizontal,
  Paperclip,
  PieChart,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  UploadCloud,
  UserX,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_TYPES, MODULES, RELATIONS } from "@/lib/modules";
import {
  calculateIndianGratuity,
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
import {
  insurancePolicyType,
  normalizeInsurancePolicy,
  validateInsurancePolicy,
} from "@/lib/insurance";

type Account = {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  relation: string;
  type: string;
  institution: string;
  notes: string;
};
type Rec = {
  id: string;
  user_id: string;
  workspace_id?: string;
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
  workspace_id?: string;
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
type WorkspaceAccess = {
  member_role: "owner" | "editor" | "viewer" | "custom";
  status: "active" | "suspended";
  all_modules: boolean;
  modules: string[];
  can_edit: boolean;
  can_delete: boolean;
  can_manage_members: boolean;
  can_view_documents: boolean;
  can_upload_documents: boolean;
};
type Workspace = {
  id: string;
  owner_user_id: string;
  name: string;
  access: WorkspaceAccess;
};
type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  member_role: WorkspaceAccess["member_role"];
  status: WorkspaceAccess["status"];
  permissions: Omit<WorkspaceAccess, "member_role" | "status">;
  profile?: { email?: string; full_name?: string };
};
const views = [
  ["dashboard", "DB", "Dashboard"],
  ["allInvestments", "AI", "All Investments"],
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
  ["futureWealth", "FW", "Future Wealth"],
  ["watchlist", "WL", "Watchlist"],
  ["alerts", "AL", "Alerts"],
  ["purchaseCalculator", "CALC", "Purchase Calculator"],
  ["household", "HH", "Household Access"],
  ["settings", "SET", "Settings"],
];
const groups = [
  ["Core", ["dashboard"]],
  [
    "Investments",
    [
      "allInvestments",
      "stocks",
      "property",
      "bullion",
      "fixedIncome",
      "insurance",
      "mutualFunds",
      "ulips",
      "otherAssets",
      "nsel",
    ],
  ],
  ["Liabilities", ["loans", "borrowings"]],
  ["Planning", ["goals", "futureWealth"]],
  ["Utility", ["watchlist", "purchaseCalculator", "alerts", "household", "settings"]],
  ["Admin", ["admin"]],
];
const allViews = [...views, ["admin", "Admin", "Admin Console"]];
const INVESTMENT_SOURCE_OPTIONS: Record<string, { label: string; value: string; note: string }[]> = {
  stocks: [
    { label: "Auto fallback", value: "auto", note: "Configured order, then Yahoo" },
    { label: "Twelve Data", value: "twelvedata", note: "Quote API, often EOD for India" },
    { label: "Alpha Vantage", value: "alphavantage", note: "Global quote endpoint" },
    { label: "Polygon", value: "polygon", note: "US markets only" },
    { label: "Yahoo", value: "yahoo", note: "Fallback quote feed" },
  ],
  mutualFunds: [
    { label: "AMFI NAVAll", value: "amfi", note: "Official India mutual fund NAV text feed" },
  ],
  bullion: [
    {
      label: "Automatic",
      value: "auto",
      note: "Official MCX first, then Moneycontrol MCX backup",
    },
    {
      label: "MCX only",
      value: "mcx",
      note: "Official nearest active FUTCOM contract only",
    },
    {
      label: "Moneycontrol MCX",
      value: "moneycontrol",
      note: "Active MCX futures contract backup feed",
    },
  ],
  fixedIncome: [
    { label: "DEA defaults", value: "dea", note: "Small-savings defaults plus manual entries" },
    { label: "Manual", value: "manual", note: "Use only entered values" },
  ],
  ulips: [{ label: "Manual", value: "manual", note: "Policy/provider statement values" }],
  nsel: [{ label: "Bullion source", value: "bullion", note: "Uses the official MCX market watch feed" }],
  insurance: [{ label: "Manual", value: "manual", note: "Policy statement and entered bonus values" }],
  property: [{ label: "Manual", value: "manual", note: "Entered valuation and linked loan data" }],
  otherAssets: [{ label: "Manual", value: "manual", note: "Entered valuation" }],
};
const DEFAULT_SOURCE_PREFS = Object.fromEntries(
  Object.entries(INVESTMENT_SOURCE_OPTIONS).map(([key, options]) => [
    key,
    options[0]?.value || "manual",
  ]),
) as Record<string, string>;
const APP_THEMES = [
  {
    id: "amazon",
    name: "Marketplace",
    note: "Amazon.in-inspired navy, search orange and action yellow",
    swatches: ["#131921", "#232F3E", "#FF9900", "#FFD814"],
  },
  {
    id: "plum",
    name: "Plum Reserve",
    note: "Premium burgundy and champagne",
    swatches: ["#FFF7ED", "#4B082A", "#C69632"],
  },
  {
    id: "neo",
    name: "Kotak Neo",
    note: "Clean broker terminal with blue actions and red brand accent",
    swatches: ["#FFFFFF", "#004B8D", "#ED1C24"],
  },
  {
    id: "studio",
    name: "Studio Store",
    note: "Elegant product-gallery calm with soft gray, white and blue",
    swatches: ["#F5F5F7", "#FFFFFF", "#0071E3"],
  },
];
const APP_FONTS = [
  { label: "Arial", value: "Arial, Helvetica, ui-sans-serif, system-ui, sans-serif" },
  { label: "Inter", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "System", value: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, 'Times New Roman', serif" },
  { label: "Mono", value: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
];
const DEFAULT_APPEARANCE = {
  theme: "amazon",
  font: "Arial, Helvetica, ui-sans-serif, system-ui, sans-serif",
  fontSize: 16,
};
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
  asset_type: "Stock",
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
  asset_type: "Stock",
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
function mcxCommodityHref() {
  return "https://www.mcxindia.com/market-data/market-watch";
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
  yearly_total_value: "Yearly Total Value",
  rent_agreement_start_date: "Agreement Start Date",
  rentee_name: "Rentee Name",
  rentee_phone: "Rentee Phone",
  last_working_date: "Last Working Date",
  calculation_date: "Calculation Date",
  total_service: "Total Service",
  eligible_years: "Eligible Years Used",
  salary_basis: "Monthly Basic + DA Used",
  gratuity_per_year: "Gratuity Per Completed Year",
  gratuity_value: "Total Gratuity Payable",
  tax_exempt_gratuity: "Tax-Exempt Gratuity",
  taxable_gratuity: "Taxable Gratuity",
  monthly_ctc_gratuity: "Monthly Gratuity CTC Accrual",
  annual_ctc_gratuity: "Annual Gratuity CTC Accrual",
  eligibility_message: "Eligibility",
};
const INSURANCE_LABELS: Record<string, string> = {
  account_name: "Account / Life Insured", category: "Policy Type",
  security_name: "Policy Name", broker: "Insurer", annual_premium: "Annual Premium",
  premium_frequency: "Frequency", premium_years_paid: "Years Paid",
  premium_end_date: "Premium End", policy_end_date: "Cover End",
  death_cover: "Death Cover", health_cover: "Health Cover",
  critical_illness_cover: "Critical Illness", latest: "Current Value",
  bonus_accrued_till_date: "Bonus Accrued", money_back_received: "Money Back",
  maturity_value: "Maturity Value", next_premium_due_date: "Next Premium Due",
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
const insuranceColWidth = (col: string) =>
  ["account_name", "category", "security_name", "broker"].includes(col)
    ? "125px"
    : ["annual_premium", "death_cover", "health_cover", "critical_illness_cover", "latest", "bonus_accrued_till_date", "money_back_received", "maturity_value"].includes(col)
      ? "120px"
      : ["premium_end_date", "policy_end_date", "next_premium_due_date"].includes(col)
        ? "105px"
        : "92px";
const fieldLabel = (moduleKey: string, field: string) =>
  moduleKey === "property" && field === "broker"
    ? "Community"
    : moduleKey === "bullion" && field === "current_price"
      ? "MCX / Moneycontrol Price"
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
    : moduleKey === "insurance" && INSURANCE_LABELS[field]
      ? INSURANCE_LABELS[field]
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
  "metal_cost",
  "making_charges",
  "gst_paid",
  "other_costs",
  "local_premium_per_gram",
  "latest_value",
  "investment_amount",
  "initial_investment",
  "yearly_investment",
  "employee_contribution",
  "company_contribution",
  "monthly_basic_salary",
  "monthly_da",
  "salary_basis",
  "gratuity_per_year",
  "tax_exempt_gratuity",
  "taxable_gratuity",
  "monthly_ctc_gratuity",
  "annual_ctc_gratuity",
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
  "premium_amount",
  "sum_assured",
  "additional_rider_cover",
  "base_health_cover",
  "super_topup_cover",
  "no_claim_bonus",
  "deductible",
  "accidental_death_cover",
  "permanent_disability_cover",
  "temporary_disability_cover",
  "critical_illness_cover",
  "maturity_sum_assured",
  "bonus_accrued_till_date",
  "final_additional_bonus",
  "money_back_received",
  "next_money_back_amount",
  "surrender_value",
  "fund_value",
  "death_cover",
  "health_cover",
  "maturity_value",
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
  if (priceField === "live_price") {
    const adjusted = computeRecord("stocks", data);
    if (adjusted.corporate_action_applied && Number.isFinite(Number(adjusted.day_change))) {
      data.previous_close = Number(adjusted.previous_close || data.previous_close || 0).toFixed(2);
      data.day_change = Number(adjusted.day_change).toFixed(2);
    }
  }
}
const fixedIncomeCategoryLabel = (value: any) => {
  const category = String(value || "").trim();
  return /^pf$/i.test(category) ? "Company PF" : category;
};
const isCompanyPfType = (value: any) =>
  /^(companypf|pf)$/.test(key(String(value || "")));
const NET_WORTH_SNAPSHOT_MODULE = "netWorthSnapshot";
const INVESTMENT_PERIOD_SNAPSHOT_MODULE = "investmentPeriodSnapshot";
const AUTO_REFRESH_MS = 60 * 1000;
const LIVE_DISPLAY_REFRESH_MS = AUTO_REFRESH_MS;
const SAVED_RATE_REFRESH_MS = AUTO_REFRESH_MS;
const IST_TIME_ZONE = "Asia/Kolkata";
function istCalendar(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = Number(value("year")),
    month = Number(value("month")),
    day = Number(value("day"));
  return {
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year,
    month,
    day,
    weekday: value("weekday"),
    lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}
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
    "premium_paying_years",
    "premium_paying_till_age",
    "premium_years_paid",
    "bonus_rate",
    "co_pay",
    "units",
    "nav",
    "latitude",
    "longitude",
  ]),
);
const requiredReferenceDocModules = new Set<string>();
const requiresReferenceDoc = (moduleKey: string) =>
  requiredReferenceDocModules.has(moduleKey);
const Modal = memo(function Modal({
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
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-[#e3dccc] bg-[#FFFFFF] shadow-2xl"
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
});
const Empty = memo(function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#e3dccc] bg-white/60 p-10 text-center text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
});
export default function AssetManagerApp() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authMode, setAuthMode] = useState<"signin" | "signup">("signin"),
    [authMsg, setAuthMsg] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false),
    [globalRefreshing, setGlobalRefreshing] = useState(false),
    [phoneMode, setPhoneMode] = useState(false),
    [mobileAccountMenu, setMobileAccountMenu] = useState(""),
    [mobileNavMode, setMobileNavMode] = useState<"main" | "investments">("main");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem("asset-manager-sidebar-collapsed") === "true";
    }),
    [sidebarWidth, setSidebarWidth] = useState(() => {
      if (typeof window === "undefined") return 280;
      const saved = Number(localStorage.getItem("asset-manager-sidebar-width"));
      return Number.isFinite(saved) ? Math.min(420, Math.max(220, saved)) : 280;
    });
  const [view, setView] = useState(() => {
      if (typeof window === "undefined") return "dashboard";
      const saved = localStorage.getItem("asset-manager-view") || "dashboard";
      if (saved === "accounts") return "settings";
      return allViews.some((v) => v[0] === saved) ? saved : "dashboard";
    }),
    [settingsTab, setSettingsTab] = useState<"profile" | "accounts">(() => {
      if (typeof window === "undefined") return "profile";
      if (localStorage.getItem("asset-manager-view") === "accounts")
        return "accounts";
      return localStorage.getItem("asset-manager-settings-tab") === "accounts"
        ? "accounts"
        : "profile";
    }),
    debouncedQuery = "",
    [selectedWatchlistId, setSelectedWatchlistId] = useState(""),
    [watchlistAssetTab, setWatchlistAssetTab] = useState<"Stock" | "ETF">("Stock"),
    [watchlistSort, setWatchlistSort] = useState<{
      key:
        | "name"
        | "live"
        | "dayLow"
        | "dayHigh"
        | "change"
        | "base"
        | "dayGain"
        | "overall";
      direction: "asc" | "desc";
    }>({ key: "name", direction: "asc" }),
    [stockHoldingsSort, setStockHoldingsSort] = useState<{
      key: string;
      direction: "asc" | "desc";
    }>({ key: "security_name", direction: "asc" }),
    [allInvestmentsSort, setAllInvestmentsSort] = useState<{
      key: "name" | "type" | "account" | "invested" | "latest" | "gain" | "gain_pct";
      direction: "asc" | "desc";
    }>({ key: "latest", direction: "desc" }),
    [allInvestmentsType, setAllInvestmentsType] = useState("All"),
    [profile, setProfile] = useState<Profile | null>(null),
    [role, setRole] = useState<Role>("normal"),
    [accounts, setAccounts] = useState<Account[]>([]),
    [records, setRecords] = useState<Rec[]>([]),
    [docs, setDocs] = useState<AssetDoc[]>([]),
    [toast, setToast] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]),
    [activeWorkspaceId, setActiveWorkspaceId] = useState(""),
    [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]),
    [householdBusy, setHouseholdBusy] = useState(false),
    [householdSetupRequired, setHouseholdSetupRequired] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]),
    [adminBusy, setAdminBusy] = useState(false),
    [sourcePrefs, setSourcePrefs] = useState<Record<string, string>>(() => {
      if (typeof window === "undefined") return DEFAULT_SOURCE_PREFS;
      try {
        return {
          ...DEFAULT_SOURCE_PREFS,
          ...(JSON.parse(
            localStorage.getItem("asset-manager-source-prefs") || "{}",
          ) || {}),
        };
      } catch {
        return DEFAULT_SOURCE_PREFS;
      }
    }),
    [appearance, setAppearance] = useState(() => {
      if (typeof window === "undefined") return DEFAULT_APPEARANCE;
      try {
        const saved =
          JSON.parse(localStorage.getItem("asset-manager-appearance") || "{}") ||
          {};
        return {
          ...DEFAULT_APPEARANCE,
          ...saved,
          // Retire removed themes safely; existing users land on Marketplace.
          theme: APP_THEMES.some((theme) => theme.id === saved.theme)
            ? saved.theme
            : "amazon",
        };
      } catch {
        return DEFAULT_APPEARANCE;
      }
    }),
    [resetLink, setResetLink] = useState(""),
    [docUploadRecordId, setDocUploadRecordId] = useState(""),
    [docUploadModule, setDocUploadModule] = useState("documents"),
    [docUploadNotes, setDocUploadNotes] = useState(""),
    [docUploading, setDocUploading] = useState(false),
    [googleDriveConnected, setGoogleDriveConnected] = useState(false),
    [bullionMarket, setBullionMarket] = useState<any>(null),
    [localBullionRate, setLocalBullionRate] = useState<any>(null),
    [bullionPriceStatus, setBullionPriceStatus] = useState<
      "idle" | "loading" | "ready" | "error"
    >("idle"),
    [bullionLocating, setBullionLocating] = useState(false),
    [performanceFrom, setPerformanceFrom] = useState(() =>
      `${new Date().getFullYear()}-01-01`,
    ),
    [performanceTo, setPerformanceTo] = useState(() => isoDate()),
    [performanceView, setPerformanceView] = useState<
      "weekly" | "monthly" | "ytd"
    >("weekly"),
    [performanceModule, setPerformanceModule] = useState("all"),
    [projectionYears, setProjectionYears] = useState(10),
    [projectionMonthlyInput, setProjectionMonthlyInput] = useState(""),
    [projectionReturnInput, setProjectionReturnInput] = useState(""),
    [projectionYearlyInput, setProjectionYearlyInput] = useState(""),
    [projectionOtherIncomeInput, setProjectionOtherIncomeInput] = useState(""),
    [projectionCurrentAge, setProjectionCurrentAge] = useState(""),
    [projectionRetireAge, setProjectionRetireAge] = useState(""),
    [projectionMonthlyUntilAge, setProjectionMonthlyUntilAge] = useState(""),
    [projectionYearlyUntilAge, setProjectionYearlyUntilAge] = useState(""),
    [projectionOtherIncomeUntilAge, setProjectionOtherIncomeUntilAge] = useState(""),
    [projectionHistoryRates, setProjectionHistoryRates] = useState({ shares: 12, gold: 10, loaded: false }),
    [historicalPerformance, setHistoricalPerformance] = useState<
      { date: string; invested: number; current: number; type: string }[]
    >([]),
    [historyBusy, setHistoryBusy] = useState(false),
    [calculatorMetal, setCalculatorMetal] = useState<"gold" | "silver">("gold"),
    [calculatorRateOverrides, setCalculatorRateOverrides] = useState<
      Record<"gold" | "silver", string>
    >({ gold: "", silver: "" }),
    [calculatorWeight, setCalculatorWeight] = useState(10),
    [calculatorWastage, setCalculatorWastage] = useState(2),
    [calculatorGst, setCalculatorGst] = useState(3),
    [calculatorPurchaseDate, setCalculatorPurchaseDate] = useState(() =>
      isoDate(),
    ),
    [calculatorVendor, setCalculatorVendor] = useState(""),
    [calculatorInvoice, setCalculatorInvoice] = useState(""),
    [calculatorRecords, setCalculatorRecords] = useState<any[]>([]),
    [invoiceFolderHandle, setInvoiceFolderHandle] = useState<any>(null),
    [marketToday, setMarketToday] = useState<any[]>([]),
    [marketTodayUpdatedAt, setMarketTodayUpdatedAt] = useState("");
  const [aiQuestion, setAiQuestion] = useState(
      "What are the main risks in my current portfolio and what should I review first?",
    ),
    [aiReview, setAiReview] = useState<AiPortfolioReview | null>(null),
    [aiReviewMeta, setAiReviewMeta] = useState<AiReviewMeta | null>(null),
    [aiReviewBusy, setAiReviewBusy] = useState(false),
    [aiReviewError, setAiReviewError] = useState(""),
    [wealthForecast, setWealthForecast] = useState<any>(null),
    [wealthForecastMeta, setWealthForecastMeta] = useState<{ model: string; generatedAt: string } | null>(null),
    [wealthForecastBusy, setWealthForecastBusy] = useState(false),
    [wealthForecastError, setWealthForecastError] = useState("");
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
    [corporateAction, setCorporateAction] = useState<Rec | null>(null),
    [accModal, setAccModal] = useState<Account | null | "new">(null),
    [importPreview, setImportPreview] = useState<any[]>([]),
    [pasteTable, setPasteTable] = useState(""),
    [stockSearch, setStockSearch] = useState(""),
    [stockResults, setStockResults] = useState<typeof ALL_STOCKS>([]),
    [stockOpen, setStockOpen] = useState(false),
    [fixedIncomeType, setFixedIncomeType] = useState(""),
    [insuranceType, setInsuranceType] = useState(""),
    [insurancePremiumFrequency, setInsurancePremiumFrequency] = useState(""),
    [insurancePremiumTerm, setInsurancePremiumTerm] = useState(""),
    [insuranceReturnPremium, setInsuranceReturnPremium] = useState(""),
    [gratuityPreview, setGratuityPreview] = useState<any>(null),
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
      const fallback = { dashboard: "summary" };
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
    foregroundRefreshRef = useRef(0),
    recordsRef = useRef<Rec[]>([]),
    loadEpochRef = useRef(0),
    user = session?.user,
    isAdmin = role === "admin",
    activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId),
    workspaceAccess: WorkspaceAccess =
      activeWorkspace?.access || {
        member_role: "owner",
        status: "active",
        all_modules: true,
        modules: [],
        can_edit: true,
        can_delete: true,
        can_manage_members: true,
        can_view_documents: true,
        can_upload_documents: true,
      };
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
    const mq = window.matchMedia("(max-width: 1024px)"),
      sync = () => setPhoneMode(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", sync);
      else mq.removeListener(sync);
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const cagr = (points: any[]) => {
      const first = points?.[0], last = points?.[points.length - 1];
      const years = first && last ? (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 86400000) : 0;
      return years > 0 && first.value > 0 && last.value > 0 ? (Math.pow(last.value / first.value, 1 / years) - 1) * 100 : 0;
    };
    Promise.all([
      fetch("/api/market-trend?asset=shares-history&range=10y").then((r) => r.ok ? r.json() : Promise.reject()),
      fetch("/api/market-trend?asset=gold-history&range=10y").then((r) => r.ok ? r.json() : Promise.reject()),
    ]).then(([shares, gold]) => {
      if (cancelled) return;
      setProjectionHistoryRates({
        shares: Math.max(-10, Math.min(25, cagr(shares.points) || 12)),
        gold: Math.max(-10, Math.min(25, cagr(gold.points) || 10)),
        loaded: true,
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [session]);
  useEffect(() => {
    if (user?.id) loadHousehold();
    else {
      setWorkspaces([]);
      setActiveWorkspaceId("");
      setWorkspaceMembers([]);
    }
  }, [user?.id]);
  useEffect(() => {
    if (user?.id && (activeWorkspaceId || householdSetupRequired)) loadAll();
  }, [user?.id, activeWorkspaceId, householdSetupRequired]);
  useEffect(() => {
    if (!user?.id || (!activeWorkspaceId && !householdSetupRequired)) return;
    const refreshForegroundData = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - foregroundRefreshRef.current < 1500) return;
      foregroundRefreshRef.current = now;
      void loadAll(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshForegroundData();
    };
    window.addEventListener("focus", refreshForegroundData);
    window.addEventListener("online", refreshForegroundData);
    window.addEventListener("pageshow", refreshForegroundData);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshForegroundData);
      window.removeEventListener("online", refreshForegroundData);
      window.removeEventListener("pageshow", refreshForegroundData);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, activeWorkspaceId, householdSetupRequired]);
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
    if (editing?.moduleKey === "insurance") {
      const policy = normalizeInsurancePolicy(
        editing.record?.data || editing.defaults || {},
      );
      setInsuranceType(policy.category || "");
      setInsurancePremiumFrequency(policy.premium_frequency || "Yearly");
      setInsurancePremiumTerm(
        String(policy.premium_paying_term_type || "Till Maturity"),
      );
      setInsuranceReturnPremium(String(policy.return_of_premium || "No"));
    } else {
      setInsuranceType("");
      setInsurancePremiumFrequency("");
      setInsurancePremiumTerm("");
      setInsuranceReturnPremium("");
    }
    setStockResults([]);
    setStockOpen(false);
    if (
      editing?.moduleKey === "fixedIncome" &&
      key(editing.record?.data?.category || "") === "gratuity"
    ) {
      try {
        setGratuityPreview(
          calculateIndianGratuity({
            dateOfJoining: editing.record?.data?.purchase_date || "",
            calculationDate:
              editing.record?.data?.last_working_date || undefined,
            monthlyBasicSalary:
              editing.record?.data?.monthly_basic_salary,
            monthlyDA: editing.record?.data?.monthly_da,
            coveredUnderAct:
              editing.record?.data?.covered_under_gratuity_act || "Yes",
          }),
        );
      } catch (error: any) {
        setGratuityPreview({
          error: error?.message || "Enter gratuity details.",
        });
      }
    } else setGratuityPreview(null);
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
      phoneMode ||
      editing ||
      detail ||
      accModal ||
      !["stocks", "bullion"].includes(view)
    )
      return;
    const t = setInterval(() => {
      refreshModuleRates(view, true);
    }, SAVED_RATE_REFRESH_MS);
    return () => clearInterval(t);
  }, [
    user?.id,
    phoneMode,
    view,
    accountTabs,
    editing,
    detail,
    accModal,
  ]);
  useEffect(() => {
    if (
      !user?.id ||
      phoneMode ||
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
          await Promise.all([
            refreshStockDisplay(true),
            refreshMarketToday(),
            refreshBullionMarket(),
          ]);
        } else if (view === "stocks") {
          await Promise.all([refreshStockDisplay(), refreshMarketToday()]);
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
    phoneMode,
    view,
    accountTabs,
    editing,
    detail,
    accModal,
  ]);
  useEffect(() => {
    if (!user?.id || !phoneMode || editing || detail || accModal) return;
    const t = setInterval(() => {
      refreshMarketToday();
      refreshBullionMarket();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [user?.id, phoneMode, editing, detail, accModal]);
  useEffect(() => {
    if (
      !user?.id ||
      !phoneMode ||
      editing ||
      detail ||
      accModal
    )
      return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await Promise.allSettled([
        refreshStocks(true, true),
        refreshWatchlist(true),
        refreshMetals("bullion", true, true),
      ]);
    };
    run();
    const t = setInterval(run, SAVED_RATE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user?.id, phoneMode, editing, detail, accModal]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-expanded-lots",
        JSON.stringify(expandedLots),
      );
    } catch {}
  }, [expandedLots]);
  useEffect(() => {
    if (view !== "accounts") return;
    setSettingsTab("accounts");
    setView("settings");
  }, [view]);
  useEffect(() => {
    try {
      localStorage.setItem("asset-manager-view", view);
    } catch {}
  }, [view]);
  useEffect(() => {
    try {
      localStorage.setItem("asset-manager-settings-tab", settingsTab);
    } catch {}
  }, [settingsTab]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-sidebar-collapsed",
        String(sidebarCollapsed),
      );
      localStorage.setItem("asset-manager-sidebar-width", String(sidebarWidth));
    } catch {}
  }, [sidebarCollapsed, sidebarWidth]);
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
    try {
      localStorage.setItem(
        "asset-manager-source-prefs",
        JSON.stringify(sourcePrefs),
      );
    } catch {}
  }, [sourcePrefs]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "asset-manager-appearance",
        JSON.stringify(appearance),
      );
    } catch {}
  }, [appearance]);
  useEffect(() => {
    if (view === "admin" && isAdmin) loadAdminUsers();
  }, [view, isAdmin]);
  useEffect(() => {
    if (user?.id) {
      refreshGoogleDriveStatus();
    }
  }, [user?.id]);
  useEffect(() => {
    if (!["bullion", "purchaseCalculator"].includes(view)) return;
    refreshBullionMarket();
  }, [view, sourcePrefs.bullion]);
  useEffect(() => {
    if (view !== "stocks") return;
    refreshMarketToday();
  }, [view]);
  useEffect(() => {
    if (!user?.id || !records.length) return;
    const today = localIsoDate(),
      storageKey = `asset-manager-rent-reminder-${today}`;
    let shownToday: string[] = [];
    try {
      shownToday = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {}
    const due = records.filter((r) => {
      if (r.module_key !== "property") return false;
      const d = r.data || {};
      if (String(d.is_rented || "").toLowerCase() !== "yes") return false;
      const end = String(d.rent_agreement_end_date || "");
      if (!end) return false;
      const daysLeft = Math.round(
        (new Date(end).getTime() - new Date(today).getTime()) / 86400000,
      );
      // 11-month agreements: nag daily once inside the last month (from the end of month 10 onward), including if already overdue.
      return daysLeft <= 31;
    });
    const fresh = due.filter((r) => !shownToday.includes(r.id));
    if (fresh.length) {
      const lines = fresh.map((r) => {
        const d = r.data || {},
          end = String(d.rent_agreement_end_date || ""),
          daysLeft = Math.round(
            (new Date(end).getTime() - new Date(today).getTime()) / 86400000,
          ),
          label = d.security_name || d.location || "Property";
        return `${label}: rent agreement ${daysLeft < 0 ? `expired ${-daysLeft}d ago` : `ends in ${daysLeft}d`} (${d.rentee_name || "tenant"})`;
      });
      setToast(`Rent agreement renewal due — ${lines.join(" · ")}`);
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify([...shownToday, ...fresh.map((r) => r.id)]),
        );
      } catch {}
    }
  }, [user?.id, records]);
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
  async function householdRequest(body?: Record<string, any>, workspaceId = activeWorkspaceId) {
    if (!session?.access_token) throw new Error("Missing session");
    const endpoint = body
      ? "/api/household"
      : `/api/household${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`;
    const response = await fetch(endpoint, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify({ ...body, workspaceId }) : undefined,
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const failure: any = new Error(json.error || "Household request failed");
      failure.code = json.code;
      throw failure;
    }
    return json;
  }
  async function loadHousehold(preferredId = activeWorkspaceId) {
    if (!user?.id) return;
    try {
      const json = await householdRequest(undefined, preferredId);
      const available = (json.workspaces || []) as Workspace[];
      setHouseholdSetupRequired(false);
      setWorkspaces(available);
      setActiveWorkspaceId(json.active?.id || available[0]?.id || "");
      setWorkspaceMembers((json.members || []) as WorkspaceMember[]);
    } catch (caught: any) {
      if (caught?.code === "HOUSEHOLD_SCHEMA_REQUIRED") {
        setHouseholdSetupRequired(true);
        setActiveWorkspaceId("");
        setWorkspaces([]);
        setWorkspaceMembers([]);
      } else {
        setToast(caught?.message || "Could not load household access");
        setLoading(false);
      }
    }
  }
  async function loadAll(quiet = false) {
    if (!user) return;
    // Several independent code paths (manual refresh, scheduled intervals,
    // refreshStocks' own post-save reload) can each call loadAll around the
    // same time. Their responses aren't guaranteed to land in request order,
    // so an older in-flight call finishing last would otherwise silently
    // overwrite freshly-saved data with a stale snapshot. Discard any
    // response that isn't from the most recently started call.
    const epoch = ++loadEpochRef.current;
    const sx = typeof window !== "undefined" ? window.scrollX : 0,
      sy = typeof window !== "undefined" ? window.scrollY : 0,
      active =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
    if (!quiet) setLoading(true);
    const accountQuery = supabase.from("accounts").select("*"),
      recordQuery = supabase.from("records").select("*"),
      documentQuery = supabase.from("asset_documents").select("*"),
      scopeColumn = activeWorkspaceId ? "workspace_id" : "user_id",
      scopeValue = activeWorkspaceId || user.id;
    const [p, r, a, rec, doc] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      accountQuery.eq(scopeColumn, scopeValue).order("created_at", { ascending: false }),
      recordQuery.eq(scopeColumn, scopeValue).order("created_at", { ascending: false }),
      documentQuery.eq(scopeColumn, scopeValue).order("created_at", { ascending: false }),
    ]);
    if (epoch !== loadEpochRef.current) {
      if (!quiet) setLoading(false);
      return;
    }
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
  async function saveRecordData(recordId: string, data: Record<string, any>) {
    if (!user?.id) throw new Error("Not signed in");
    const { error } = await supabase
      .from("records")
      .update({ data })
      .eq("id", recordId);
    if (error) throw error;
    const apply = (r: Rec) => (r.id === recordId ? { ...r, data } : r);
    recordsRef.current = recordsRef.current.map(apply);
    setRecords((prev) => prev.map(apply));
  }
  async function saveCorporateAction(record: Rec, payload: Record<string, any>) {
    if (!editChallenge("save corporate action")) return;
    const actionType = String(payload.corporate_action_type || ""),
      data = withSystemDates(
        {
          ...record.data,
          corporate_action_type: actionType,
          corporate_action_ratio: payload.corporate_action_ratio || "",
          corporate_action_ex_date: payload.corporate_action_ex_date || "",
          ex_base_price: payload.ex_base_price || "",
        },
        record,
      );
    if (!actionType) {
      data.corporate_action_ratio = "";
      data.corporate_action_ex_date = "";
      data.ex_base_price = "";
    }
    try {
      await saveRecordData(record.id, data);
      setCorporateAction(null);
      setToast(actionType ? "Corporate action saved" : "Corporate action cleared");
      await loadAll(true);
    } catch (error: any) {
      setToast(error?.message || "Could not save corporate action");
    }
  }
  async function captureInvestmentPeriodSnapshots() {
    if (
      !user?.id ||
      !canEditModule("dashboard") ||
      loading ||
      (!records.some((r) => MODULES[r.module_key]) &&
        !totals.assets &&
        !totals.liabilities)
    )
      return;
    const calendar = istCalendar(),
      assetRecords = records.filter(
        (r) => MODULES[r.module_key]?.kind === "asset",
      ),
      accountMap = new Map<
        string,
        { account_name: string; invested: number; current: number }
      >(),
      moduleMap = new Map<
        string,
        { module_key: string; invested: number; current: number }
      >();
    assetRecords.forEach((record) => {
      const computed = computeLiveRecord(record.module_key, record.data),
        accountName = String(record.data?.account_name || "Unassigned"),
        current = accountMap.get(accountName) || {
          account_name: accountName,
          invested: 0,
          current: 0,
        },
        moduleTotal = moduleMap.get(record.module_key) || {
          module_key: record.module_key,
          invested: 0,
          current: 0,
        };
      current.invested += num(computed.invested);
      current.current += num(computed.latest);
      accountMap.set(accountName, current);
      moduleTotal.invested += num(computed.invested);
      moduleTotal.current += num(computed.latest);
      moduleMap.set(record.module_key, moduleTotal);
    });
    const accountTotals = [...accountMap.values()].sort((a, b) =>
        a.account_name.localeCompare(b.account_name),
      ),
      moduleTotals = [...moduleMap.values()].sort((a, b) =>
        a.module_key.localeCompare(b.module_key),
      ),
      invested = accountTotals.reduce((sum, item) => sum + item.invested, 0),
      current = accountTotals.reduce((sum, item) => sum + item.current, 0),
      overallTotals = computeLiveTotals(
        records.filter(
          (record) =>
            record.module_key !== "watchlist" && !!MODULES[record.module_key],
        ),
      ),
      monthKey = `${calendar.year}-${String(calendar.month).padStart(2, "0")}`,
      periods: {
        type: "weekly" | "monthly" | "month_start";
        key: string;
        date: string;
      }[] = [
        {
          type: "month_start",
          key: monthKey,
          date: calendar.iso,
        },
      ];
    if (["Fri", "Sat", "Sun"].includes(calendar.weekday)) {
      const daysUntilSunday =
        calendar.weekday === "Fri" ? 2 : calendar.weekday === "Sat" ? 1 : 0;
      periods.push({
        type: "weekly",
        key: addDaysIso(calendar.iso, daysUntilSunday),
        date: calendar.iso,
      });
    }
    if (calendar.day === calendar.lastDay)
      periods.push({
        type: "monthly",
        key: monthKey,
        date: calendar.iso,
      });
    let changed = false;
    for (const period of periods) {
      const snapshotKey = `${activeWorkspaceId || user.id}:${period.type}:${period.key}`,
        existing = records.find(
          (record) =>
            record.module_key === INVESTMENT_PERIOD_SNAPSHOT_MODULE &&
            record.data?.snapshot_type === period.type &&
            record.data?.period_key === period.key,
        );
      if (period.type === "month_start" && existing) continue;
      if (
        snapshotRef.current === snapshotKey &&
        existing?.data?.account_totals?.length === accountTotals.length &&
        existing?.data?.module_totals?.length === moduleTotals.length &&
        num(existing?.data?.current) === current &&
        num(existing?.data?.invested) === invested
      )
        continue;
      snapshotRef.current = snapshotKey;
      const data = withSystemDates(
        {
          ...(existing?.data || {}),
          snapshot_type: period.type,
          period_key: period.key,
          snapshot_date: period.date,
          invested,
          current,
          gain: current - invested,
          ...(period.type === "month_start"
            ? {
                assets: overallTotals.assets,
                liabilities: overallTotals.liabilities,
                net: overallTotals.net,
                portfolio_invested: overallTotals.invested,
                portfolio_gain: overallTotals.gain,
                excludes_watchlist: true,
              }
            : {}),
          account_totals: accountTotals,
          module_totals: moduleTotals,
          record_count: assetRecords.length,
          notes:
            period.type === "weekly"
              ? "Automatic weekly investment close captured Friday-Sunday"
              : period.type === "monthly"
                ? "Automatic month-end investment close"
                : "First available monthly portfolio baseline; watchlist excluded",
        },
        existing,
      );
      const { error } = existing
        ? await supabase.from("records").update({ data }).eq("id", existing.id)
        : await supabase.from("records").insert({
            user_id: user.id,
            ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
            module_key: INVESTMENT_PERIOD_SNAPSHOT_MODULE,
            data,
          });
      if (!error) changed = true;
    }
    if (changed) await loadAll(true);
  }
  const totals = useMemo(
    () => computeLiveTotals(records),
    [records, bullionMarket],
  );
  useEffect(() => {
    captureInvestmentPeriodSnapshots();
  }, [
    user?.id,
    activeWorkspaceId,
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
  const canViewModule = (moduleKey: string) =>
    ["dashboard", "purchaseCalculator", "household", "settings"].includes(
      moduleKey,
    ) ||
    workspaceAccess.all_modules ||
    workspaceAccess.modules.includes(moduleKey);
  const canEditModule = (moduleKey: string) =>
    workspaceAccess.can_edit && canViewModule(moduleKey);
  function editChallenge(action = "change data") {
    const moduleKey = editing?.moduleKey || detail?.moduleKey || "";
    if (moduleKey && !canEditModule(moduleKey)) {
      setToast("This household access is read-only for the selected module");
      return false;
    }
    const token = String(Math.floor(1000 + Math.random() * 9000));
    const entered = prompt(
      `Security check: type this 4-digit code to ${action}.\n\n${token}`,
    );
    const ok = entered === token;
    if (!ok) setToast("Edit security check cancelled");
    return ok;
  }
  const requireAdmin = (a: string) => {
    if (isAdmin || workspaceAccess.can_delete) return true;
    setToast(`Delete permission required for ${a}`);
    return false;
  };
  const sourceFor = (moduleKey: string) =>
    sourcePrefs[moduleKey] || DEFAULT_SOURCE_PREFS[moduleKey] || "manual";
  const quoteProviderParam = () => {
    const provider = sourceFor("stocks");
    return provider && provider !== "auto"
      ? `&provider=${encodeURIComponent(provider)}`
      : "";
  };
  const quoteFetch = (url: string) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    });
  const bullionSourceParam = () =>
    `&source=${encodeURIComponent(sourceFor("bullion"))}`;
  const setSourcePref = (moduleKey: string, source: string) =>
    setSourcePrefs((prev) => ({ ...prev, [moduleKey]: source }));
  const setAppearancePref = (patch: Partial<typeof DEFAULT_APPEARANCE>) =>
    setAppearance((prev) => ({ ...prev, ...patch }));
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
        ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
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
  function fillBullionCosts(form: HTMLFormElement | null) {
    if (!form) return;
    const get = (name: string) =>
        num(form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value),
      total =
        get("metal_cost") +
        get("making_charges") +
        get("gst_paid") +
        get("other_costs"),
      target = form.querySelector<HTMLInputElement>('[name="purchase_price"]');
    if (target && total) target.value = total.toFixed(2);
  }
  async function detectCurrentBullionCity(form: HTMLFormElement | null) {
    if (!form || !navigator.geolocation) {
      setToast("Location is not available in this browser.");
      return;
    }
    setBullionLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const set = (name: string, value: string) => {
          const input = form.querySelector<HTMLInputElement>(
            `[name="${name}"]`,
          );
          if (input) input.value = value;
        };
        set("latitude", coords.latitude.toFixed(6));
        set("longitude", coords.longitude.toFixed(6));
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}&localityLanguage=en`,
          );
          const location = await response.json();
          const city = String(
            location.city ||
              location.locality ||
              location.principalSubdivision ||
              profile?.city ||
              "",
          );
          set("city", city);
          setToast(city ? `Current city set to ${city}.` : "Coordinates saved.");
        } catch {
          set("city", profile?.city || "");
          setToast("Coordinates saved. Enter the city if it was not detected.");
        } finally {
          setBullionLocating(false);
        }
      },
      (error) => {
        setBullionLocating(false);
        setToast(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not detect the current location.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
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
          const res = await quoteFetch(
            `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}${quoteProviderParam()}`,
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
      const res = await fetch("/api/google-drive/status", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json();
      setGoogleDriveConnected(!!json.connected);
    } catch {
      setGoogleDriveConnected(false);
    }
  }
  async function refreshBullionMarket() {
    setBullionPriceStatus("loading");
    const city =
      recordsRef.current
        .filter((record) => record.module_key === "bullion")
        .map((record) => String(record.data?.city || "").trim())
        .find(Boolean) ||
      profile?.city ||
      "";
    try {
      const [goldRes, silverRes, localRes] = await Promise.all([
          fetch(`/api/market-rate?asset=gold${bullionSourceParam()}`),
          fetch(`/api/market-rate?asset=silver${bullionSourceParam()}`),
          city
            ? fetch(
                `/api/local-bullion-rate?city=${encodeURIComponent(city)}`,
              )
            : Promise.resolve(null),
        ]),
        [gold, silver, local] = await Promise.all([
          goldRes.json(),
          silverRes.json(),
          localRes?.json().catch(() => null) ?? null,
        ]);
      setBullionMarket({
        gold: goldRes.ok ? gold : null,
        silver: silverRes.ok ? silver : null,
        time: new Date().toLocaleTimeString(),
      });
      setLocalBullionRate(localRes?.ok ? local : null);
      setBullionPriceStatus(goldRes.ok || silverRes.ok ? "ready" : "error");
      if (!goldRes.ok && !silverRes.ok) {
        setToast(
          gold?.error || silver?.error || "Could not refresh gold/silver rates",
        );
      }
    } catch (e: any) {
      setBullionMarket({
        gold: null,
        silver: null,
        time: new Date().toLocaleTimeString(),
      });
      setLocalBullionRate(null);
      setBullionPriceStatus("error");
      setToast(e?.message || "Could not refresh gold/silver rates");
    }
  }
  async function refreshMarketToday() {
    const indices = [
      ["SENSEX", "^BSESN"],
      ["NIFTY", "^NSEI"],
      ["NIFTY BANK", "^NSEBANK"],
      ["NASDAQ", "^IXIC"],
    ];
    try {
      const indexRows = [];
      for (const [name, symbol] of indices) {
        try {
          const res = await quoteFetch(
              `/api/quote?symbol=${encodeURIComponent(symbol)}&exchange=INDEX${quoteProviderParam()}`,
            ),
            q = await res.json();
          if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
          indexRows.push({
            name,
            symbol,
            price: num(q.price),
            change: num(q.change),
            changePct: num(q.changePct),
            time: q.time,
            ok: true,
          });
        } catch {
          indexRows.push({
            name,
            symbol,
            price: 0,
            change: 0,
            changePct: 0,
            ok: false,
          });
        }
      }
      const [goldRes, silverRes, crudeRes, usdRes] = await Promise.all([
        fetch(`/api/market-rate?asset=gold${bullionSourceParam()}`),
        fetch(`/api/market-rate?asset=silver${bullionSourceParam()}`),
        fetch(`/api/market-rate?asset=crude`),
        quoteFetch(
          `/api/quote?symbol=${encodeURIComponent("USDINR=X")}&exchange=INDEX${quoteProviderParam()}`,
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
      const nextRows = [...indexRows, ...commodityRows];
      setMarketToday((prev) =>
        nextRows.map((row) => {
          const previous = prev.find((x) => x.name === row.name);
          return row.ok || !previous ? row : { ...previous, stale: true };
        }),
      );
      setMarketTodayUpdatedAt(new Date().toISOString());
    } catch {
      setMarketTodayUpdatedAt(new Date().toISOString());
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
    await fetch("/api/google-drive/status", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token || ""}` },
    });
    setGoogleDriveConnected(false);
    setToast("Google Drive disconnected");
  }

  async function refreshAllData() {
    if (globalRefreshing) return;
    setGlobalRefreshing(true);
    try {
      await loadAll(true);
      const results = await Promise.allSettled([
        refreshStocks(true, true),
        refreshWatchlist(true),
        refreshMetals("bullion", true, true),
        refreshMetals("nsel", true, true),
        refreshMutualFundNavs(),
        refreshMarketToday(),
      ]);
      const failed = results.filter((r) => r.status === "rejected").length;
      setToast(
        failed
          ? `Refreshed with ${failed} issue${failed > 1 ? "s" : ""} — check your connection`
          : "All data refreshed",
      );
    } catch (e: any) {
      setToast(e?.message || "Could not refresh data");
    } finally {
      setGlobalRefreshing(false);
    }
  }

  async function signOutSafely() {
    const authorization = `Bearer ${session?.access_token || ""}`;
    await Promise.allSettled([
      fetch("/api/google-drive/status", {
        method: "DELETE",
        headers: { Authorization: authorization },
      }),
      fetch("/api/upstox/status", {
        method: "DELETE",
        headers: { Authorization: authorization },
      }),
    ]);
    await supabase.auth.signOut();
  }
  async function uploadDocs(
    moduleKey: string,
    files: File[],
    folderParts: string[] = driveFolderParts(moduleKey),
  ) {
    if (!user || !files.length) return [] as PendingDoc[];
    if (!workspaceAccess.can_upload_documents || !canEditModule(moduleKey)) {
      setToast("Document upload permission is required");
      return [] as PendingDoc[];
    }
    if (!activeWorkspaceId && !(await connectGoogleDrive()))
      return [] as PendingDoc[];
    const pending: PendingDoc[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("moduleKey", moduleKey);
        if (activeWorkspaceId) fd.append("workspaceId", activeWorkspaceId);
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
      ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
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
    if (!canEditModule(moduleKey))
      return setToast("This household access is read-only for this module");
    if (!editChallenge(record ? "save edits" : "add this record")) return;
    if (moduleKey === "watchlist")
      data = await captureWatchlistBasePrice(data, record);
    if (moduleKey === "insurance") {
      const closed = String(data.status || "").toLowerCase() === "closed",
        wasClosed =
          String(record?.data?.status || "").toLowerCase() === "closed";
      if (
        closed &&
        (!wasClosed ||
          (!data.death_cover_after_premium_closure &&
            !data.death_cover_after_closure))
      ) {
        const deathCoverActive = confirm(
          "This insurance policy is closed. Is the sum assured still payable on death?\n\nOK = Yes, keep death cover active.\nCancel = No, no death cover remains.",
        );
        data = {
          ...data,
          death_cover_after_premium_closure: deathCoverActive ? "Yes" : "No",
          death_cover_after_closure: deathCoverActive ? "Yes" : "No",
        };
      } else if (!closed) {
        data = {
          ...data,
          death_cover_after_closure: "",
        };
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
          .select("id")
          .single()
      : await supabase
          .from("records")
          .insert({
            user_id: user.id,
            ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
            module_key: moduleKey,
            data,
          })
          .select("id")
          .single();
    if (res.error) setToast(res.error.message);
    else {
      const recordId = (res.data as any)?.id || record?.id,
        uploaded = recordId
          ? await attachDocs(recordId, moduleKey, pending)
          : 0;
      docFilesRef.current = [];
      if (moduleKey === "property" && recordId)
        await syncRentalIncome(recordId, data);
      setToast(
        `${record ? "Updated" : "Saved"}${uploaded ? ` with ${uploaded} Google Drive document${uploaded > 1 ? "s" : ""}` : ""}`,
      );
      setEditing(null);
      await loadAll(true);
    }
  }
  async function syncRentalIncome(propertyId: string, propertyData: any) {
    if (!user) return;
    const rented = String(propertyData.is_rented || "").toLowerCase() === "yes",
      rent = num(propertyData.monthly_rent);
    const linked = recordsRef.current.find(
      (r) => r.module_key === "fixedIncome" && r.data?.linked_property_id === propertyId,
    );
    if (!rented || rent <= 0) {
      // Property is no longer rented (or rent was cleared): stop the linked
      // income record from accruing further instead of leaving it reporting
      // stale rent indefinitely. Preserve history rather than deleting it.
      if (linked && num(linked.data?.employee_contribution) > 0) {
        const paused = withSystemDates(
          computedData("fixedIncome", {
            ...linked.data,
            employee_contribution: 0,
            notes: `Rental income paused — property is no longer marked as rented (was ₹${linked.data?.employee_contribution}/mo).`,
          }),
          linked,
        );
        await supabase.from("records").update({ data: paused }).eq("id", linked.id);
      }
      return;
    }
    const rentalData = withSystemDates(
      computedData("fixedIncome", {
        ...(linked?.data || {}),
        account_name: propertyData.account_name,
        category: "Rental Income",
        employee_contribution: rent,
        interest_rate: 0,
        linked_property_id: propertyId,
        rentee_name: propertyData.rentee_name || "",
        rentee_phone: propertyData.rentee_phone || "",
        rent_agreement_start_date: propertyData.rent_agreement_start_date || "",
        notes: `Auto-linked rental income from Property: ${[propertyData.security_name, propertyData.location].filter(Boolean).join(" · ")}`,
        purchase_date:
          propertyData.rent_agreement_start_date ||
          linked?.data?.purchase_date ||
          propertyData.purchase_date ||
          isoDate(),
      }),
      linked,
    );
    if (linked)
      await supabase.from("records").update({ data: rentalData }).eq("id", linked.id);
    else
      await supabase.from("records").insert({
        user_id: user.id,
        ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
        module_key: "fixedIncome",
        data: rentalData,
      });
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
      .eq("id", r.id);
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
      .eq("id", r.id);
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
      .eq("id", r.id);
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
      .eq("id", r.id);
    if (error) setToast(error.message);
    else {
      setToast("Deleted");
      await loadAll(true);
    }
  }
  async function saveAccount(payload: any, existing?: Account | null) {
    if (!user) return;
    if (!canEditModule("accounts"))
      return setToast("This household access cannot change accounts");
    if (!editChallenge(existing ? "save account edits" : "add account")) return;
    if (!payload.name?.trim()) return setToast("Account name required");
    if (existing) {
      const old = existing.name;
      const { error } = await supabase
        .from("accounts")
        .update(payload)
        .eq("id", existing.id);
      if (error) return setToast(error.message);
      if (old !== payload.name) {
        const linked = records.filter((r) => r.data?.account_name === old);
        await Promise.all(
          linked.map((r) =>
            supabase
              .from("records")
              .update({ data: { ...r.data, account_name: payload.name } })
              .eq("id", r.id),
          ),
        );
      }
    } else {
      const { error } = await supabase
        .from("accounts")
        .insert({
          ...payload,
          user_id: user.id,
          ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
        });
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
          .eq("id", r.id),
      ),
    );
    const updateError = updates.find((res) => res.error)?.error;
    if (updateError) return setToast(updateError.message);
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", a.id);
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
      fail = 0,
      firstError = "";
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
        firstError ||= `${d.security_name || "A holding"} has no ticker symbol`;
        fail++;
        continue;
      }
      try {
        const res = await quoteFetch(
          `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}${quoteProviderParam()}`,
        );
        const q = await res.json();
        if (!res.ok || !Number.isFinite(Number(q.price)))
          throw new Error(q?.error || "Quote unavailable");
        assignStockQuoteFields(d, q);
        d.today_gain = (num(d.quantity) * num(d.day_change)).toFixed(2);
        d.latest_value = (num(d.quantity) * num(d.live_price)).toFixed(2);
        if (!num(d.investment_amount) && num(d.quantity) && num(d.inv_price))
          d.investment_amount = (num(d.quantity) * num(d.inv_price)).toFixed(2);
        d.last_synced = new Date().toLocaleString();
        await saveRecordData(r.id, d);
        ok++;
      } catch (e: any) {
        firstError ||= e?.message || "refresh failed";
        fail++;
      }
    }
    if (!silent || fail)
      setToast(
        `Live prices: ${ok} updated${fail ? `, ${fail} failed${firstError ? ` (${firstError})` : ""}` : ""}`,
      );
    if (ok) await loadAll(true);
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
          quoteFetch(
            `/api/quote?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&name=${encodeURIComponent(name)}${quoteProviderParam()}`,
          ).then(async (res) => {
            const q = await res.json();
            if (!res.ok || !Number.isFinite(Number(q.price))) throw new Error();
            return q;
          }),
        );
      return quotes.get(quoteKey)!;
    };
    let firstError = "";
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
        } catch (e: any) {
          firstError ||= e?.message || `${d.security_name || d.ticker_symbol} refresh failed`;
        }
      }),
    );
    // Only surface an error when nothing updated at all -- a single symbol
    // transiently failing during a routine background refresh shouldn't
    // pop a toast every cycle, but total failure indicates something worth
    // seeing (rate limit, network outage, etc.).
    if (!updates.size) {
      if (rows.length) setToast(firstError || "Could not refresh live prices");
      return;
    }
    setRecords((prev) =>
      prev.map((r) =>
        updates.has(r.id) ? { ...r, data: updates.get(r.id)! } : r,
      ),
    );
  }
  async function refreshWatchlist(silent = false) {
    const rows = recordsRef.current.filter((r) => r.module_key === "watchlist");
    let ok = 0,
      fail = 0,
      firstError = "";
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
        firstError ||= `${d.security_name || "A holding"} has no ticker symbol`;
        fail++;
        continue;
      }
      try {
        const res = await quoteFetch(
          `/api/quote?symbol=${encodeURIComponent(d.ticker_symbol)}&exchange=${encodeURIComponent(d.exchange || "NSE")}&name=${encodeURIComponent(d.security_name || "")}${quoteProviderParam()}`,
        );
        const q = await res.json();
        if (!res.ok || !Number.isFinite(Number(q.price)))
          throw new Error(q?.error || "Quote unavailable");
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
        await saveRecordData(r.id, d);
        ok++;
      } catch (e: any) {
        firstError ||= e?.message || "refresh failed";
        fail++;
      }
    }
    if (!silent || fail)
      setToast(
        `Watchlist prices: ${ok} updated${fail ? `, ${fail} failed${firstError ? ` (${firstError})` : ""}` : ""}`,
      );
    if (ok) await loadAll(true);
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
        await saveRecordData(r.id, d);
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
      fail = 0,
      firstError = "";
    const quoteFor = (asset: string) => {
      if (!quotes.has(asset))
        quotes.set(
          asset,
          fetch(
            `/api/market-rate?asset=${encodeURIComponent(asset)}${bullionSourceParam()}`,
          ).then(async (res) => {
            const q = await res.json();
            if (!res.ok || !Number.isFinite(Number(q.ratePerGramInr)))
              throw new Error(q?.error || "Rate unavailable");
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
          benchmarkRate = Number(q.ratePerGramInr),
          localPremium = num(d.local_premium_per_gram),
          localRate = benchmarkRate + localPremium,
          rate = benchmarkRate,
          asset = metalAsset(d),
          displayPrice =
            asset === "silver"
              ? rate * 1000
              : asset === "gold"
                ? rate * 10
                : rate,
          displayChange =
            asset === "silver"
              ? Number(q.changePerKgInr)
              : asset === "gold"
                ? Number(q.changePer10GramInr)
                : Number(q.changePerGramInr),
          value = grams * rate,
          storedRate = num(
            d.benchmark_rate_per_gram ||
              d.live_rate_per_gram ||
              d.previous_rate_per_gram,
          ),
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
        d.day_low = Number.isFinite(Number(q.dayLow))
          ? Number(q.dayLow).toFixed(2)
          : d.day_low || "";
        d.day_high = Number.isFinite(Number(q.dayHigh))
          ? Number(q.dayHigh).toFixed(2)
          : d.day_high || "";
        d.fifty_two_week_low = Number.isFinite(Number(q.fiftyTwoWeekLow))
          ? Number(q.fiftyTwoWeekLow).toFixed(2)
          : d.fifty_two_week_low || "";
        d.fifty_two_week_high = Number.isFinite(Number(q.fiftyTwoWeekHigh))
          ? Number(q.fiftyTwoWeekHigh).toFixed(2)
          : d.fifty_two_week_high || "";
        d.contract_expiry = q.contractExpiry || q.expiry || d.contract_expiry || "";
        d.previous_rate_per_gram =
          Number.isFinite(Number(q.previousPerGramInr)) &&
          Number(q.previousPerGramInr) !== 0
            ? Number(q.previousPerGramInr).toFixed(2)
            : storedRate
              ? storedRate.toFixed(2)
              : "";
        d.live_rate_per_gram = rate.toFixed(2);
        d.benchmark_rate_per_gram = benchmarkRate.toFixed(2);
        d.local_rate_per_gram = localRate.toFixed(2);
        d.pricing_city = d.city || profile?.city || "";
        d.rate_provider = q.provider || "";
        d.rate_source_url = q.sourceUrl || "";
        d.last_synced = new Date().toLocaleString();
        await saveRecordData(r.id, d);
        ok++;
      } catch (e: any) {
        firstError ||= e?.message || "refresh failed";
        fail++;
      }
    }
    if (!silent || fail)
      setToast(
        `Bullion rates: ${ok} updated${fail ? `, ${fail} failed${firstError ? ` (${firstError})` : ""}` : ""}`,
      );
    await refreshBullionMarket();
    if (ok) await loadAll(true);
  }
  async function refreshModuleRates(k: string, silent = false, allAccounts = false) {
    if (k === "stocks") return refreshStocks(silent, allAccounts);
    if (k === "mutualFunds") return refreshMutualFundNavs();
    if (k === "bullion" || k === "nsel")
      return refreshMetals(k, silent, allAccounts);
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
      if (key(type) === "gratuity") {
        const clear = (name: string) => {
          const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
          if (el) el.value = "";
        };
        set("covered_under_gratuity_act", "Yes");
        ["interest_rate", "lock_in_years", "maturity_value", "maturity_date"].forEach(clear);
        setToast("Gratuity calculator ready");
        return;
      }
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
  function showFixedIncomeField(name: string, categoryOverride?: string) {
    const t = key(categoryOverride ?? fixedIncomeType);
    if (t === "gratuity")
      return [
        "account_name",
        "category",
        "purchase_date",
        "last_working_date",
        "monthly_basic_salary",
        "monthly_da",
        "covered_under_gratuity_act",
        "notes",
      ].includes(name);
    if (
      [
        "last_working_date",
        "monthly_basic_salary",
        "monthly_da",
        "covered_under_gratuity_act",
      ].includes(name)
    )
      return false;
    if (
      (isCompanyPfType(t) || t === "salary" || t === "rentalincome") &&
      ["lock_in_years", "maturity_value", "maturity_date", "gratuity_value"].includes(name)
    )
      return false;
    if (name === "account_creation_date")
      return t === "ppf" || t === "sukanyasamriddhi";
    if (name === "employee_contribution")
      return t === "epf" || t === "companypf" || t === "pf" || t === "salary" || t === "rentalincome";
    if (name === "company_contribution")
      return t === "epf" || t === "companypf" || t === "pf";
    if (name === "gratuity_value") return t === "gratuity";
    if (name === "yearly_total_value") return t === "salary" || t === "rentalincome";
    if (name === "rent_agreement_start_date" || name === "rentee_name" || name === "rentee_phone")
      return t === "rentalincome";
    return true;
  }
  function showInsuranceField(name: string, source?: Record<string, any>) {
    const type = insurancePolicyType(
        source?.policy_type || source?.category || insuranceType,
        source?.broker,
      ),
      frequency = key(
        source?.premium_frequency || insurancePremiumFrequency || "Yearly",
      ),
      term = key(
        source?.premium_paying_term_type ||
          insurancePremiumTerm ||
          "Till Maturity",
      ),
      single = frequency === "single" || term === "singlepay",
      common = new Set([
        "account_name", "life_insured", "security_name", "category", "broker",
        "insurance_broker", "status", "policy_start_date", "policy_end_date",
        "nominee", "notes",
      ]),
      premium = new Set([
        "premium_amount", "premium_frequency", "premium_paying_term_type",
        "premium_paying_years", "premium_paying_till_age", "premium_end_date",
        "premium_due_date", "premium_years_paid", "single_premium_paid",
      ]),
      byType: Record<string, string[]> = {
        TERM_PLAN: ["cover_end_date", "sum_assured", "additional_rider_cover", "return_of_premium", "death_cover_after_premium_closure"],
        HEALTH_INSURANCE: ["covered_members", "base_health_cover", "super_topup_cover", "no_claim_bonus", "deductible", "co_pay", "room_rent_limit", "waiting_period"],
        LIFE_INSURANCE: ["sum_assured", "additional_rider_cover", "maturity_sum_assured", "bonus_rate", "bonus_accrued_till_date", "final_additional_bonus", "money_back_received", "surrender_value", "current_value", "maturity_value", "death_cover_after_premium_closure", "benefits_continue_after_maturity"],
        ENDOWMENT: ["sum_assured", "additional_rider_cover", "maturity_sum_assured", "bonus_rate", "bonus_accrued_till_date", "final_additional_bonus", "money_back_received", "surrender_value", "current_value", "maturity_value", "death_cover_after_premium_closure", "benefits_continue_after_maturity"],
        MONEY_BACK: ["sum_assured", "maturity_sum_assured", "money_back_received", "next_money_back_date", "next_money_back_amount", "bonus_rate", "bonus_accrued_till_date", "final_additional_bonus", "surrender_value", "maturity_value"],
        ULIP: ["sum_assured", "fund_value", "units", "nav"],
        ACCIDENT_COVER: ["accidental_death_cover", "permanent_disability_cover", "temporary_disability_cover"],
        CRITICAL_ILLNESS: ["critical_illness_cover", "covered_illnesses", "waiting_period", "survival_period"],
        OTHER: ["sum_assured", "current_value", "maturity_value"],
      };
    if (
      type === "TERM_PLAN" &&
      ["current_value", "maturity_value"].includes(name) &&
      /^(yes|true|1)$/i.test(
        String(source?.return_of_premium || insuranceReturnPremium || ""),
      )
    )
      return true;
    if (common.has(name)) return true;
    if (premium.has(name)) {
      if (type === "OTHER") return false;
      if (["premium_amount", "premium_frequency"].includes(name)) return true;
      if (single) return name === "single_premium_paid";
      if (["HEALTH_INSURANCE", "ACCIDENT_COVER", "CRITICAL_ILLNESS"].includes(type))
        return name === "premium_due_date";
      if (name === "single_premium_paid") return false;
      if (name === "premium_paying_term_type") return true;
      if (name === "premium_paying_years") return term === "limitedyears";
      if (name === "premium_paying_till_age") return term === "untilage";
      if (name === "premium_end_date")
        return ["limitedyears", "untilage", "tillmaturity"].includes(term);
      if (["premium_due_date", "premium_years_paid"].includes(name)) return true;
      return false;
    }
    return (byType[type] || byType.OTHER).includes(name);
  }
  function updateInsurancePremiumMode(
    form: HTMLFormElement | null,
    name: string,
    value: string,
  ) {
    if (name === "premium_frequency") {
      setInsurancePremiumFrequency(value);
      if (key(value) === "single") {
        setInsurancePremiumTerm("Single Pay");
        const term = form?.querySelector<HTMLSelectElement>(
            '[name="premium_paying_term_type"]',
          ),
          paid = form?.querySelector<HTMLSelectElement>(
            '[name="single_premium_paid"]',
          );
        if (term) term.value = "Single Pay";
        if (paid) paid.value = "Yes";
      }
    }
    if (name === "premium_paying_term_type") {
      setInsurancePremiumTerm(value);
      if (key(value) === "singlepay") {
        setInsurancePremiumFrequency("Single");
        const frequency = form?.querySelector<HTMLSelectElement>(
          '[name="premium_frequency"]',
        );
        if (frequency) frequency.value = "Single";
      }
    }
  }
  function showInsuranceDetailField(
    name: string,
    source: Record<string, any>,
  ) {
    if (MODULES.insurance.fields.some((field) => field.name === name))
      return showInsuranceField(name, source);
    const type = insurancePolicyType(
        source.policy_type || source.category,
        source.broker,
      ),
      single = key(source.premium_frequency) === "single";
    if (["data_uploaded_date", "data_uploaded_at", "last_updated_date", "last_updated_at"].includes(name))
      return true;
    if (["annual_premium", "premiums_paid_to_date", "premium_status"].includes(name))
      return type !== "OTHER";
    if (["policy_years_paid", "premium_years_paid"].includes(name))
      return type !== "OTHER" && !single;
    if (name === "next_premium_due_date") return type !== "OTHER" && !single;
    if (name === "death_cover" || name === "death_cover_value")
      return ["TERM_PLAN", "LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "ACCIDENT_COVER", "OTHER"].includes(type);
    if (name === "health_cover") return type === "HEALTH_INSURANCE";
    if (name === "critical_illness_cover") return type === "CRITICAL_ILLNESS";
    if (["bonus_accrued_till_date", "lic_bonus", "yearly_bonus"].includes(name))
      return ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK"].includes(type);
    if (name === "money_back_received")
      return ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK"].includes(type);
    if (name === "latest")
      return ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "OTHER"].includes(type) ||
        (type === "TERM_PLAN" && /^(yes|true|1)$/i.test(String(source.return_of_premium || "")));
    return true;
  }
  function gratuityFromForm(form: HTMLFormElement | null) {
    const value = (name: string) =>
      (
        form?.querySelector(`[name="${name}"]`) as
          | HTMLInputElement
          | HTMLSelectElement
          | null
      )?.value || "";
    return calculateIndianGratuity({
      dateOfJoining: value("purchase_date"),
      calculationDate: value("last_working_date") || undefined,
      monthlyBasicSalary: value("monthly_basic_salary"),
      monthlyDA: value("monthly_da"),
      coveredUnderAct: value("covered_under_gratuity_act") || "Yes",
    });
  }
  function updateGratuityPreview(form: HTMLFormElement | null) {
    try {
      setGratuityPreview(gratuityFromForm(form));
    } catch (error: any) {
      setGratuityPreview({ error: error?.message || "Enter gratuity details." });
    }
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
    if (!canEditModule("shareList"))
      return setToast("This household access cannot import shares");
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
          ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
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
      insuranceHeads = [
        "account_name", "category", "security_name", "broker", "status",
        "annual_premium", "premium_frequency", "premium_years_paid",
        "premiums_paid_to_date", "premium_end_date", "policy_end_date",
        "death_cover", "health_cover", "critical_illness_cover", "latest",
        "bonus_accrued_till_date", "money_back_received", "maturity_value",
        "nominee", "notes",
      ],
      heads = k === "insurance"
        ? insuranceHeads
        : [
            ...new Set([
              ...def.fields.map((f) => f.name),
              ...def.cols,
              ...systemCols,
            ]),
          ],
      csv = [
        heads.map((head) => csvEscape(fieldLabel(k, head))).join(","),
        ...rows.map((r) => heads.map((h) => csvEscape(r[h])).join(",")),
      ].join("\n");
    download(`${k}-export.csv`, csv, "text/csv");
  }
  function createRestorePoint() {
    if (!user) return;
    const payload = {
      format: "asset-manager-restore-point",
      version: 1,
      created_at: new Date().toISOString(),
      workspace: activeWorkspace
        ? { id: activeWorkspace.id, name: activeWorkspace.name }
        : null,
      profile,
      accounts,
      records,
      documents: docs,
    };
    download(
      `asset-manager-restore-${isoDate()}-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
    );
    setToast("Restore point downloaded");
  }
  async function reinstateRestorePoint(file: File | null) {
    if (!file || !user) return;
    if (!canEditModule("dashboard"))
      return setToast("Edit access is required to reinstate data");
    try {
      const backup = JSON.parse(await file.text());
      if (
        backup?.format !== "asset-manager-restore-point" ||
        backup?.version !== 1
      )
        throw new Error("This is not a supported Asset Manager restore point");
      const backupAccounts = Array.isArray(backup.accounts)
          ? backup.accounts
          : [],
        backupRecords = Array.isArray(backup.records) ? backup.records : [],
        backupDocuments = Array.isArray(backup.documents)
          ? backup.documents
          : [];
      if (
        !confirm(
          `Reinstate ${backupAccounts.length} accounts and ${backupRecords.length} records into the current workspace?\n\nMatching IDs will be updated. Other current data will remain.`,
        )
      )
        return;
      const workspaceFields = activeWorkspaceId
        ? { workspace_id: activeWorkspaceId }
        : {};
      if (backup.profile) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email || backup.profile.email || "",
          full_name: backup.profile.full_name || "",
          city: backup.profile.city || "",
          phone: backup.profile.phone || "",
        });
        if (error) throw error;
      }
      if (backupAccounts.length) {
        const { error } = await supabase.from("accounts").upsert(
          backupAccounts.map((account: any) => ({
            id: account.id,
            user_id: user.id,
            ...workspaceFields,
            name: account.name || "Restored Account",
            relation: account.relation || "Other",
            type: account.type || "Other",
            institution: account.institution || "",
            notes: account.notes || "",
          })),
        );
        if (error) throw error;
      }
      if (backupRecords.length) {
        const { error } = await supabase.from("records").upsert(
          backupRecords.map((record: any) => ({
            id: record.id,
            user_id: user.id,
            ...workspaceFields,
            module_key: record.module_key,
            data: record.data || {},
          })),
        );
        if (error) throw error;
      }
      if (backupDocuments.length) {
        const restoredRecordIds = new Set(
          backupRecords.map((record: any) => String(record.id)),
        );
        const restorable = backupDocuments.filter((document: any) =>
          restoredRecordIds.has(String(document.record_id)),
        );
        if (restorable.length) {
          const { error } = await supabase.from("asset_documents").upsert(
            restorable.map((document: any) => ({
              id: document.id,
              user_id: user.id,
              ...workspaceFields,
              record_id: document.record_id,
              module_key: document.module_key,
              file_name: document.file_name,
              file_path: document.file_path,
              mime_type: document.mime_type || "",
              file_size: document.file_size || 0,
              notes: document.notes || "Restored reference",
            })),
          );
          if (error) throw error;
        }
      }
      setToast("Restore point reinstated");
      await loadAll(true);
    } catch (error: any) {
      setToast(error?.message || "Could not reinstate restore point");
    }
  }
  async function backtrackInvestmentPrices() {
    if (!performanceFrom || !performanceTo || performanceFrom > performanceTo)
      return setToast("Choose a valid From and To date");
    setHistoryBusy(true);
    try {
      const assetRecords = records.filter(
          (record) =>
            MODULES[record.module_key]?.kind === "asset" &&
            (performanceModule === "all" ||
              record.module_key === performanceModule),
        ),
        marketHoldings: any[] = [],
        manualValue = assetRecords.reduce((sum, record) => {
          const computed = computeLiveRecord(record.module_key, record.data);
          if (record.module_key === "stocks" && record.data?.ticker_symbol) {
            marketHoldings.push({
              id: record.id,
              kind: "stock",
              ticker: record.data.ticker_symbol,
              exchange: record.data.exchange || "NSE",
              quantity: num(computed.quantity || record.data.quantity),
            });
            return sum;
          }
          if (record.module_key === "bullion") return sum + num(computed.latest);
          return sum + num(computed.latest);
        }, 0),
        invested = assetRecords.reduce(
          (sum, record) =>
            sum + num(computeLiveRecord(record.module_key, record.data).invested),
          0,
        );
      const response = await fetch("/api/investment-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          from: performanceFrom,
          to: performanceTo,
          holdings: marketHoldings,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "History unavailable");
      const totalsByDate = new Map<string, number>();
      (json.series || []).forEach((series: any) =>
        (series.points || []).forEach((point: any) =>
          totalsByDate.set(
            point.date,
            num(totalsByDate.get(point.date)) + num(point.value),
          ),
        ),
      );
      if (!totalsByDate.size) {
        totalsByDate.set(performanceFrom, 0);
        totalsByDate.set(performanceTo, 0);
      }
      const daily = [...totalsByDate.entries()]
        .map(([date, value]) => ({
          date,
          invested,
          current: value + manualValue,
          type: "historical",
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const grouped = new Map<string, (typeof daily)[number]>();
      daily.forEach((point) => {
        const date = new Date(`${point.date}T00:00:00`),
          key =
            performanceView === "weekly"
              ? addDaysIso(point.date, (7 - date.getDay()) % 7)
              : point.date.slice(0, 7);
        grouped.set(key, point);
      });
      setHistoricalPerformance([...grouped.values()]);
      setToast(
        `Backtracked ${daily.length} market days for ${performanceModule === "all" ? "all investments" : MODULES[performanceModule]?.title || performanceModule}. Manual and unavailable assets use their recorded value.`,
      );
    } catch (error: any) {
      setToast(error?.message || "Could not backtrack prices");
    } finally {
      setHistoryBusy(false);
    }
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
  function openMcxCommodity() {
    window.open(
      mcxCommodityHref(),
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
      const record = records.find((r) => r.id === docUploadRecordId),
        folderParts = record
          ? driveFolderParts(record.module_key, record.data)
          : driveFolderParts(docUploadModule, {
              security_name: files.length === 1 ? files[0].name : "Repository",
              broker: docUploadNotes || "General",
            });
      let recordId = record?.id || "",
        moduleKey = record?.module_key || docUploadModule;
      if (!recordId) {
        const title =
          files.length === 1
            ? files[0].name
            : `${files.length} repository documents`;
        const created = await supabase
          .from("records")
          .insert({
            user_id: user.id,
            ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
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
      ids.filter(
        (id: string) =>
          (id !== "admin" || isAdmin) &&
          (id === "admin" || canViewModule(id)),
      ),
    ])
    .filter(([, ids]: any) => ids.length);
  const navButton = (id: string, compact = false) => {
    const meta = allViews.find((v) => v[0] === id);
    const NavIcon = ({
      dashboard: PieChart,
      allInvestments: Layers,
      stocks: BarChart3,
      mutualFunds: BriefcaseBusiness,
      ulips: Shield,
      bullion: Sparkles,
      nsel: BarChart3,
      fixedIncome: FolderOpen,
      insurance: Shield,
      property: Building2,
      otherAssets: FolderOpen,
      loans: ArrowDown,
      borrowings: ArrowUpDown,
      goals: CheckCircle2,
      watchlist: Eye,
      alerts: Bell,
      purchaseCalculator: BarChart3,
      household: Users,
      settings: KeyRound,
      admin: Shield,
    } as Record<string, any>)[id] || BriefcaseBusiness;
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
        <NavIcon size={17} aria-hidden="true" />
        <span>{meta?.[2]}</span>
      </button>
    );
  };
  const mobileMainTabs = [
    ["dashboard", "Summary", Home],
    ["investments", "Investments", BriefcaseBusiness],
    ["goals", "Goals", CheckCircle2],
    ["settings", "Settings", KeyRound],
  ] as const;
  const mobileInvestmentTabs = [
      ["stocks", "Stocks", BarChart3],
      ["property", "Property", Home],
      ["bullion", "Gold/Silver", BriefcaseBusiness],
      ["fixedIncome", "Fixed", FolderOpen],
      ["insurance", "Insurance", Shield],
      ["mutualFunds", "MF", BriefcaseBusiness],
      ["ulips", "ULIP", Shield],
      ["otherAssets", "Other", FolderOpen],
      ["nsel", "NSEL", BriefcaseBusiness],
    ] as const,
    mobileInvestmentTabsByValue = mobileInvestmentTabs
      .map((tab, preferredOrder) => {
        const [id] = tab;
        return {
          tab,
          preferredOrder,
          hasEntries: records.some((r) => r.module_key === id),
        };
      })
      .sort(
        (a, b) =>
          Number(b.hasEntries) - Number(a.hasEntries) ||
          a.preferredOrder - b.preferredOrder,
      )
      .map((x) => x.tab),
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
            ...(mobileAccountMenu === "stocks" ? ["Watchlist", "ETFs"] : []),
          ]
        : [];
  function selectMobileTab(id: string) {
    if (id === "investments") {
      setMobileNavMode("investments");
      setMobileAccountMenu(view !== "dashboard" && MODULES[view] ? view : "");
      return;
    }
    if (id === "__back") {
      setMobileNavMode("main");
      setMobileAccountMenu("");
      return;
    }
    setView(id);
    if (id === "dashboard") {
      setMobileNavMode("main");
      setMobileAccountMenu("");
      setAccountTabs((p) => ({ ...p, __phone: "All" }));
      return;
    }
    if (MODULES[id]) {
      setMobileNavMode("investments");
      setMobileAccountMenu(id);
    } else {
      setMobileAccountMenu("");
    }
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
  function phoneAccountStrip() {
    if (!mobileTabAccounts.length) return null;
    return (
      <div className="phone-account-strip">
        {mobileTabAccounts.map((account) => (
          <button
            key={account}
            type="button"
            className={accountTab("__phone") === account ? "active" : ""}
            onClick={() => {
              setAccountTabs((p) => ({ ...p, __phone: account }));
            }}
          >
            {account === "All" ? "All" : account}
          </button>
        ))}
      </div>
    );
  }
  function phoneRow(
    title: string,
    meta: string,
    value: any,
    items: any[],
    onClick?: () => void,
    rowKey?: string,
  ) {
    const visibleItems = [["Total", value], ...items.filter(Boolean)],
      byLabel = new Map(
        visibleItems.map(([k, v, cls]: any) => [
          String(k || "").toLowerCase(),
          { label: k, value: v, cls },
        ]),
      ),
      investedItem = byLabel.get("invested") || byLabel.get("amount"),
      totalItem = byLabel.get("total"),
      gainItem = byLabel.get("gain") || byLabel.get("overall gain"),
      todayItem =
        byLabel.get("today") ||
        byLabel.get("today gain") ||
        byLabel.get("total gain"),
      gainTone =
        String(gainItem?.cls || todayItem?.cls || "").includes("red")
          ? "phone-gain-down"
          : String(gainItem?.cls || todayItem?.cls || "").includes("green")
            ? "phone-gain-up"
            : "";
    return (
      <button
        key={rowKey || `${title}|${meta}`}
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
          className="phone-row-main !grid !w-full !max-w-full !grid-cols-1 !items-start !gap-x-3 !gap-y-2"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
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
          {visibleItems.length > 0 && (
            <div
              className="phone-row-metrics phone-pair-row grid min-w-0 gap-2 overflow-hidden pt-1"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              <div className="phone-row-metric phone-pair-cell min-w-0 text-left">
                {investedItem && (
                  <div className="phone-pair-line">
                    <span>{investedItem.label}</span>
                    <b>{investedItem.value}</b>
                  </div>
                )}
                {totalItem && (
                  <div className="phone-pair-line">
                    <span>{totalItem.label}</span>
                    <b>{totalItem.value}</b>
                  </div>
                )}
              </div>
              <div className={`phone-row-metric phone-pair-cell phone-gain-cell min-w-0 text-left ${gainTone}`}>
                {gainItem && (
                  <div className="phone-pair-line">
                    <span>Overall Gain</span>
                    <b className={gainItem.cls || ""}>{gainItem.value}</b>
                  </div>
                )}
                {todayItem && (
                  <div className="phone-pair-line">
                    <span>Today's Gain</span>
                    <b className={todayItem.cls || ""}>{todayItem.value}</b>
                  </div>
                )}
                {!gainItem && !todayItem && (
                  <div className="phone-pair-line">
                    <span>Rows</span>
                    <b>{visibleItems.find(([k]: any) => !["Total", "Invested", "Amount"].includes(String(k)))?.[1] || "-"}</b>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </button>
    );
  }
  function phoneStockHoldingCard(x: any) {
    const c = x.c || {},
      moduleKey = x.moduleKey || "stocks",
      shortName = compactName(String(c.security_name || x.title || "Stock")),
      broker = String(c.broker || c.account_name || "Stocks"),
      quantity = num(c.adjusted_quantity) || x.records.reduce(
        (s: number, r: Rec) =>
          s + (num(computeLiveRecord("stocks", r.data).adjusted_quantity) || num(r.data?.quantity)),
        0,
      ),
      quantityText = quantity.toLocaleString("en-IN", {
        maximumFractionDigits: 3,
      }),
      currentPrice = num(c.live_price || c.current_price),
      dayLow = num(c.day_low),
      dayHigh = num(c.day_high),
      weekLow = num(c.fifty_two_week_low),
      weekHigh = num(c.fifty_two_week_high),
      openHolding = () => {
        if (x.lots > 1) {
          setExpandedLots((prev) => ({
            ...prev,
            [x.key]: !prev[x.key],
          }));
          return;
        }
        setDetail({
          moduleKey,
          record: x.records[0],
          computed: c,
          cols: MODULES[moduleKey]?.cols || MODULES.stocks.cols || [],
          linkedProperty: false,
        });
      };
    return (
      <article className="phone-stock-card">
        <button
          type="button"
          className="phone-stock-card-top"
          onClick={() => {
            if (moduleKey === "watchlist") {
              window.open(moneycontrolHref(c), "_blank", "noopener,noreferrer");
              return;
            }
            openHolding();
          }}
        >
          <div className="min-w-0">
            <div className="phone-stock-name">{shortName}</div>
            <div className="phone-stock-meta">
              {broker} | {x.lots} lot{x.lots > 1 ? "s" : ""} | Qty {quantityText}
              {c.corporate_action_applied
                ? ` | ${String(c.corporate_action_type || "Action").toUpperCase()} ${c.corporate_action_ratio}`
                : ""}
            </div>
          </div>
        </button>
        <div className="phone-stock-top-stats phone-pair-row">
          {moduleKey !== "watchlist" && (
            <div className="phone-pair-cell">
              <div className="phone-pair-line">
                <span>Invested</span>
                <b>{fmt(x.invested)}</b>
              </div>
              <div className="phone-pair-line">
                <span>Total</span>
                <b>{fmt(x.latest)}</b>
              </div>
            </div>
          )}
          <div
            className={`phone-pair-cell phone-gain-cell ${x.gain >= 0 ? "phone-gain-up" : "phone-gain-down"}`}
            style={moduleKey === "watchlist" ? { gridColumn: "1 / -1" } : undefined}
          >
            <div className="phone-pair-line">
              <span>Overall Gain</span>
              <b className={x.gain >= 0 ? "phone-green" : "phone-red"}>{fmt(x.gain)}</b>
            </div>
            <div className="phone-pair-line">
              <span>Today's Gain</span>
              <b className={x.today >= 0 ? "phone-green" : "phone-red"}>{fmt(x.today)}</b>
            </div>
          </div>
        </div>
        <a
          className="phone-stock-prices phone-stock-signal-row"
          href={moneycontrolHref(c)}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <span className={x.today > 0 ? "phone-box-up" : x.today < 0 ? "phone-box-down" : "phone-box-neutral"}>
            <em>Current</em>
            <b>{currentPrice ? fmt(currentPrice) : "-"}</b>
          </span>
          <span className="phone-box-down">
            <em>Low</em>
            <b>{dayLow ? fmt(dayLow) : "-"}</b>
            <small>{weekLow ? `52W ${fmt(weekLow)}` : "52W -"}</small>
          </span>
          <span className="phone-box-up">
            <em>High</em>
            <b>{dayHigh ? fmt(dayHigh) : "-"}</b>
            <small>{weekHigh ? `52W ${fmt(weekHigh)}` : "52W -"}</small>
          </span>
        </a>
      </article>
    );
  }
  function phoneBullionHoldingCard(x: any) {
    const c = x.c || {},
      quote = liveMetalQuote(c),
      title = bullionDisplayName(c) || compactName(String(c.security_name || x.title || "Bullion")),
      broker = String(c.broker || c.account_name || "MCX"),
      quantity = x.records.reduce(
        (sum: number, r: Rec) => sum + num(r.data?.quantity || r.data?.qty || r.data?.units),
        0,
      ),
      quantityText = quantity
        ? quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })
        : String(x.lots),
      displayCurrent = num(c.current_price || c.live_price || c.rate || c.price),
      localCurrent =
        metalAsset(c) === "silver"
          ? num(localBullionRate?.silverPerKgInr)
          : num(localBullionRate?.gold24kPer10GramInr),
      dayLow = num(c.day_low || c.low || c.today_low),
      dayHigh = num(c.day_high || c.high || c.today_high),
      weekLow = num(c.fifty_two_week_low),
      weekHigh = num(c.fifty_two_week_high),
      priceLoading = bullionPriceStatus === "loading" && !displayCurrent,
      priceUnavailable = bullionPriceStatus === "error" && !displayCurrent,
      priceText = (value: number) =>
        priceLoading ? "Loading" : priceUnavailable || !value ? "Price unavailable" : fmt(value),
      openHolding = () => {
        if (x.lots > 1) {
          setExpandedLots((prev) => ({
            ...prev,
            [x.key]: !prev[x.key],
          }));
          return;
        }
        setDetail({
          moduleKey: "bullion",
          record: x.records[0],
          computed: c,
          cols: MODULES.bullion.cols || [],
          linkedProperty: false,
        });
      };
    return (
      <article className="phone-stock-card phone-bullion-card">
        <button type="button" className="phone-stock-card-top" onClick={openHolding}>
          <div className="min-w-0">
            <div className="phone-stock-name">{title}</div>
            <div className="phone-stock-meta">
              {broker} | {x.lots} lot{x.lots > 1 ? "s" : ""} | Qty {quantityText}
            </div>
          </div>
        </button>
        <div className="phone-stock-top-stats phone-pair-row">
          <div className="phone-pair-cell">
            <div className="phone-pair-line">
              <span>Invested</span>
              <b>{fmt(x.invested)}</b>
            </div>
            <div className="phone-pair-line">
              <span>Total</span>
              <b>{fmt(x.latest)}</b>
            </div>
          </div>
          <div className={`phone-pair-cell phone-gain-cell ${x.gain >= 0 ? "phone-gain-up" : "phone-gain-down"}`}>
            <div className="phone-pair-line">
              <span>Overall Gain</span>
              <b className={x.gain >= 0 ? "phone-green" : "phone-red"}>{fmt(x.gain)}</b>
            </div>
            <div className="phone-pair-line">
              <span>Today's Gain</span>
              <b className={x.today >= 0 ? "phone-green" : "phone-red"}>{fmt(x.today)}</b>
            </div>
          </div>
        </div>
        <a
          className="phone-stock-prices phone-stock-signal-row"
          href={String(quote?.sourceUrl || mcxCommodityHref())}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <span className={x.today > 0 ? "phone-box-up" : x.today < 0 ? "phone-box-down" : "phone-box-neutral"}>
            <em>MCX / MC</em>
            <b className={priceLoading ? "phone-price-skeleton" : ""}>{priceText(displayCurrent)}</b>
            <small>{localCurrent ? `Local ${fmt(localCurrent)}` : "Local -"}</small>
          </span>
          <span className="phone-box-down">
            <em>Low</em>
            <b className={priceLoading ? "phone-price-skeleton" : ""}>{priceText(dayLow)}</b>
            <small>{priceLoading ? "52W loading" : weekLow ? `52W ${fmt(weekLow)}` : "52W -"}</small>
          </span>
          <span className="phone-box-up">
            <em>High</em>
            <b className={priceLoading ? "phone-price-skeleton" : ""}>{priceText(dayHigh)}</b>
            <small>{priceLoading ? "52W loading" : weekHigh ? `52W ${fmt(weekHigh)}` : "52W -"}</small>
          </span>
        </a>
      </article>
    );
  }
  function phonePropertyHoldingCard(x: any, onClick: () => void) {
    const c = x.c || {},
      currentValue = num(c.latest || c.latest_value),
      purchaseValue = num(c.invested || c.purchase_price),
      gain = num(c.gain),
      loanBalance = num(c.loan_balance),
      netEquity = Math.max(0, currentValue - loanBalance),
      location = String(c.location || c.broker || "Location not entered"),
      usage = String(c.category || "Property"),
      account = String(c.account_name || "Unassigned");
    return (
      <button
        type="button"
        className="phone-property-card"
        onClick={onClick}
        aria-label={`Open ${x.title} at ${location}`}
      >
        <div className="phone-property-head">
          <div className="min-w-0">
            <div className="phone-property-title">{x.title}</div>
            <div className="phone-property-location">{location}</div>
          </div>
          <span className="phone-property-status">{usage}</span>
        </div>
        <div className="phone-property-values">
          <div>
            <span>Current value</span>
            <strong>{fmt(currentValue)}</strong>
          </div>
          <div>
            <span>Purchase price</span>
            <strong>{fmt(purchaseValue)}</strong>
          </div>
          <div>
            <span>Overall gain</span>
            <strong className={gain >= 0 ? "phone-green" : "phone-red"}>
              {fmt(gain)}
            </strong>
          </div>
          <div>
            <span>Net equity</span>
            <strong>{fmt(netEquity)}</strong>
          </div>
        </div>
        <div className="phone-property-foot">
          <span>{account}</span>
          <span>
            {loanBalance
              ? `Loan ${fmt(loanBalance)}${num(c.emis_left) ? ` · ${num(c.emis_left)} EMIs left` : ""}`
              : "No linked loan"}
          </span>
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
  function phoneMarketChange(x: any) {
    if (!x.ok && !num(x.change)) return "";
    const change = num(x.change),
      prefix = change > 0 ? "+" : change < 0 ? "-" : "";
    if (x.unit === "USD" || x.name === "Crude $ / Barrel")
      return `${prefix}$${Math.abs(change).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    if (["Gold - 10 GM", "Silver - 1 KG"].includes(String(x.name)))
      return `${prefix}${fmt(Math.abs(change))}`;
    if (x.name === "Dollar / INR")
      return `${prefix}${Math.abs(change).toLocaleString("en-IN", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })}`;
    return `${prefix}${Math.abs(change).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  function phoneMarketLabel(x: any) {
    return String(x.name || "")
      .replace("Gold - 10 GM", "GOLD")
      .replace("Silver - 1 KG", "SILVER")
      .replace("Dollar / INR", "DOLLAR")
      .replace("Crude $ / Barrel", "CRUDE")
      .replace("NIFTY BANK", "BANK");
  }
  function phoneLotRows(moduleKey: string, lots: Rec[], groupKey: string) {
    const def = MODULES[moduleKey];
    return (
      <div className="phone-lot-list">
        {lots.map((lot, i) => {
          const c = computeLiveRecord(moduleKey, lot.data),
            title = String(
              c.security_name ||
                c.category ||
                c.location ||
                c.policy_name ||
                `Lot ${i + 1}`,
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
            );
          return phoneRow(
            title,
            `${lot.data?.account_name || "Unassigned"} | Lot ${i + 1}`,
            fmt(latest),
            [
              ["Invested", fmt(invested)],
              ["Gain", fmt(num(c.gain)), num(c.gain) >= 0 ? "phone-green" : "phone-red"],
            ],
            () =>
              setDetail({
                moduleKey,
                record: lot,
                computed: c,
                cols: def?.cols || [],
                linkedProperty: moduleKey === "property",
              }),
            `${groupKey}-phone-lot-${lot.id}`,
          );
        })}
      </div>
    );
  }
  function phoneView() {
    if (view === "household") return householdView();
    if (view === "settings")
      return <div className="phone-screen">{settings()}</div>;
    if (view === "purchaseCalculator")
      return <div className="phone-screen">{bullionCalculatorPanel()}</div>;

    const selectedAccount = accountTab("__phone"),
      isPhoneEtfWatchlist = view === "stocks" && selectedAccount === "ETFs",
      isPhoneStockWatchlist =
        view === "stocks" &&
        (selectedAccount === "Watchlist" || isPhoneEtfWatchlist),
      accountFiltered = (rs: Rec[]) =>
        selectedAccount === "All" || isPhoneStockWatchlist
          ? rs
          : rs.filter(
              (r) =>
                String(r.data?.account_name || "Unassigned") ===
                selectedAccount,
            ),
      moduleDef = MODULES[view],
      phoneModuleKey = isPhoneStockWatchlist ? "watchlist" : view,
      phoneModuleTitle = isPhoneStockWatchlist
        ? isPhoneEtfWatchlist
          ? "ETF Watchlist"
          : "Stock Watchlist"
        : moduleDef?.title,
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
            .filter(
              (r) =>
                r.module_key === phoneModuleKey &&
                (!isPhoneStockWatchlist ||
                  (String(r.data?.asset_type || "Stock").toUpperCase() === "ETF") ===
                    isPhoneEtfWatchlist),
            )
            .map((r) => {
              const c = computeLiveRecord(phoneModuleKey, r.data),
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
                today = showsDailyChange(phoneModuleKey)
                  ? todayGainFor(phoneModuleKey, r)
                  : 0;
              return { r, c, title, latest, invested, gain, today, moduleKey: phoneModuleKey };
            })
            .filter((x) =>
              JSON.stringify(x.c).toLowerCase().includes(debouncedQuery.toLowerCase()),
            )
        : [],
      moduleRows = Array.from(
        rawModuleRows
          .reduce((m, x) => {
              const id = key(
                  phoneModuleKey === "property"
                    ? `${x.title}|${x.c.location || x.r.id}`
                    : `${x.title}|${x.c.ticker_symbol || x.c.scheme_code || x.c.category || ""}`,
                ),
              g = m.get(id) || { ...x, key: `${phoneModuleKey}|${id}`, records: [] as Rec[], lots: 0 };
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
      marketNames = new Set([
        "SENSEX",
        "NIFTY",
        "Gold - 10 GM",
        "Silver - 1 KG",
        "NASDAQ",
        "Dollar / INR",
        "Crude $ / Barrel",
      ]),
      market = marketToday.filter((x) => marketNames.has(x.name)),
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
          ).map((x: any) => {
            const change = num(x.change);
            return (
              <span key={x.name} className="phone-chip">
                <span className="phone-market-label">{phoneMarketLabel(x)}</span>
                <span className="phone-market-value">{phoneMarketValue(x)}</span>
                <span className={change >= 0 ? "phone-market-up" : "phone-market-down"}>
                  {phoneMarketChange(x)}
                </span>
              </span>
            );
          })}
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
              <div className="phone-eyebrow">
                {isPhoneStockWatchlist
                  ? `${phoneModuleTitle} · Overall Gain`
                  : phoneModuleTitle}
              </div>
              <div className="phone-hero-value">
                {fmt(
                  moduleRows.reduce(
                    (s, x) => s + (isPhoneStockWatchlist ? x.gain : x.latest),
                    0,
                  ),
                )}
              </div>
              <div className="phone-hero-sub flex flex-wrap gap-x-2 gap-y-1">
                <span>{moduleRows.length} names</span>
                <span>{rawModuleRows.length} lots</span>
                {!isPhoneStockWatchlist && (
                  <span>
                    Invested {fmt(moduleRows.reduce((s, x) => s + x.invested, 0))}
                  </span>
                )}
              </div>
            </div>
            {showsDailyChange(view) &&
              phoneStat(
                "Today's Gain",
                fmt(moduleRows.reduce((s, x) => s + x.today, 0)),
                moduleRows.reduce((s, x) => s + x.today, 0) >= 0
                  ? "phone-green"
                  : "phone-red",
              )}
            {!isPhoneStockWatchlist &&
              phoneStat(
                "Gain",
                fmt(moduleRows.reduce((s, x) => s + x.gain, 0)),
                moduleRows.reduce((s, x) => s + x.gain, 0) >= 0
                  ? "phone-green"
                  : "phone-red",
              )}
          </section>
          {phoneAccountStrip()}
          <h3 className="phone-section-title">Consolidated Holdings</h3>
          <div className={`phone-list ${view === "property" ? "phone-property-list" : ""}`}>
            {moduleRows.length ? (
              moduleRows.map((x) =>
                <div key={`${view}-phone-group-${x.key}`} className="phone-group">
                  {view === "stocks"
                    ? phoneStockHoldingCard(x)
                    : view === "bullion"
                      ? phoneBullionHoldingCard(x)
                      : view === "property"
                        ? phonePropertyHoldingCard(x, () =>
                            setDetail({
                              moduleKey: "property",
                              record: x.records[0],
                              computed: x.c,
                              cols: moduleDef.cols || [],
                              linkedProperty: true,
                            }),
                          )
                      : phoneRow(
                        x.title,
                        `${String(x.c.broker || x.c.account_name || moduleDef.title)} | ${x.lots} lot${x.lots > 1 ? "s" : ""}${x.lots > 1 ? ` | ${expandedLots[x.key] ? "Tap to hide" : "Tap to open"}` : ""}`,
                        fmt(x.latest),
                        [
                          ["Invested", fmt(x.invested)],
                          ...(showsDailyChange(view)
                            ? [
                                [
                                  "Today's Gain",
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
                        () => {
                          if (x.lots > 1) {
                            setExpandedLots((prev) => ({
                              ...prev,
                              [x.key]: !prev[x.key],
                            }));
                            return;
                          }
                          setDetail({
                            moduleKey: view,
                            record: x.records[0],
                            computed: x.c,
                            cols: moduleDef.cols || [],
                            linkedProperty: view === "property",
                          });
                        },
                        `${view}-phone-group-button-${x.key}`,
                      )}
                  {x.lots > 1 &&
                    expandedLots[x.key] &&
                    phoneLotRows(x.moduleKey || view, x.records, x.key)}
                </div>,
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
            "Today's Gain",
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
        {phoneAccountStrip()}
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
                        "Today's Gain",
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
  const stockHoldingColumns = [
    "account_name",
    "security_name",
    "asset_type",
    "quantity",
    "current_purchase",
    "low_range",
    "high_range",
    "invested",
    "today_gain_display",
    "gain_display",
    "latest",
  ];
  function stockHoldingLabel(col: string) {
    const labels: Record<string, React.ReactNode> = {
      account_name: <>Account Name</>,
      security_name: <>Security Name</>,
      asset_type: <>Asset Type</>,
      quantity: <>Quantity</>,
      current_purchase: (
        <>
          Current Price
          <br />
          Purchase Price
        </>
      ),
      invested: <>Invested</>,
      latest: <>Current Value</>,
      low_range: (
        <>
          Day Low
          <br />
          52W Low
        </>
      ),
      high_range: (
        <>
          Day High
          <br />
          52W High
        </>
      ),
      today_gain_display: (
        <>
          Today's Gain
          <br />
          Today % Gain
        </>
      ),
      gain_display: (
        <>
          Overall Gain
          <br />
          Overall % Gain
        </>
      ),
    };
    return labels[col] || pretty(col);
  }
  function stockHoldingSortValue(col: string, c: any) {
    if (col === "current_purchase") return num(c.live_price);
    if (col === "low_range") return num(c.day_low);
    if (col === "high_range") return num(c.day_high);
    if (col === "today_gain_display") return num(c.today_gain);
    if (col === "gain_display") return num(c.gain);
    if (["account_name", "security_name"].includes(col))
      return String(c[col] || "").toLowerCase();
    return num(c[col]);
  }
  function stockHoldingCell(col: string, c: any, record?: Rec) {
    if (col === "current_purchase")
      return (
        <div className="grid justify-items-end gap-1 tabular-nums">
          <div>{formatModuleCell("stocks", "live_price", c, record)}</div>
          <div className="text-[10px] font-semibold text-gray-500">
            Purchase {num(c.inv_price) ? fmtPrice(c.inv_price) : "-"}
          </div>
        </div>
      );
    if (col === "low_range")
      return (
        <div className="grid gap-1">
          {stockRangeBox(c.day_low, "dayLow")}
          <div className="text-[10px] font-semibold text-gray-500">
            52W {num(c.fifty_two_week_low) ? fmtPrice(c.fifty_two_week_low) : "-"}
          </div>
        </div>
      );
    if (col === "high_range")
      return (
        <div className="grid gap-1">
          {stockRangeBox(c.day_high, "dayHigh")}
          <div className="text-[10px] font-semibold text-gray-500">
            52W {num(c.fifty_two_week_high) ? fmtPrice(c.fifty_two_week_high) : "-"}
          </div>
        </div>
      );
    if (col === "today_gain_display") {
      const previousClose = num(c.live_price) - num(c.day_change);
      const todayGainPct = previousClose
        ? (num(c.day_change) / previousClose) * 100
        : 0;
      return (
        <div className="grid justify-items-end gap-1 tabular-nums">
          <div className={num(c.today_gain) >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
            {num(c.today_gain) >= 0 ? "+" : ""}{fmt(c.today_gain)}
          </div>
          <div className={todayGainPct >= 0 ? "text-[10px] font-semibold text-emerald-700" : "text-[10px] font-semibold text-red-600"}>
            {todayGainPct >= 0 ? "+" : ""}{todayGainPct.toFixed(2)}%
          </div>
        </div>
      );
    }
    if (col === "gain_display")
      return (
        <div className="grid justify-items-end gap-1 tabular-nums">
          <div className={num(c.gain) >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
            {num(c.gain) >= 0 ? "+" : ""}{fmt(c.gain)}
          </div>
          <div className={num(c.gain_pct) >= 0 ? "text-[10px] font-semibold text-emerald-700" : "text-[10px] font-semibold text-red-600"}>
            {num(c.gain_pct) >= 0 ? "+" : ""}{num(c.gain_pct).toFixed(2)}%
          </div>
        </div>
      );
    return formatModuleCell("stocks", col, c, record);
  }
  const bullionHoldingColumns = [
    "account_name",
    "security_name",
    "quantity",
    "current_purchase",
    "low_range",
    "high_range",
    "day_change",
    "gain_display",
    "gain_pct",
    "invested",
    "latest",
  ];
  function bullionHoldingLabel(col: string) {
    const labels: Record<string, React.ReactNode> = {
      account_name: <>Account Name</>,
      security_name: <>Asset Type</>,
      quantity: <>Quantity</>,
      current_purchase: (
        <>
          Current Rate
          <br />
          Purchase Price
        </>
      ),
      invested: <>Invested</>,
      latest: <>Total Value</>,
      low_range: (
        <>
          Day Low
          <br />
          52W Low
        </>
      ),
      high_range: (
        <>
          Day High
          <br />
          52W High
        </>
      ),
      day_change: <>Increase</>,
      gain_display: (
        <>
          Today's Gain
          <br />
          Overall Gain
        </>
      ),
      gain_pct: <>Gain %</>,
    };
    return labels[col] || pretty(col);
  }
  function bullionHoldingSortValue(col: string, c: any) {
    if (col === "current_purchase") return num(c.live_rate_per_gram);
    if (col === "low_range") return num(c.day_low);
    if (col === "high_range") return num(c.day_high);
    if (col === "gain_display") return num(c.gain);
    if (["account_name", "security_name"].includes(col))
      return String(c[col] || "").toLowerCase();
    return num(c[col]);
  }
  function bullionHoldingCell(col: string, c: any, record?: Rec) {
    if (col === "current_purchase")
      return (
        <div className="grid justify-items-end gap-1 tabular-nums">
          <div>{num(c.live_rate_per_gram) ? fmtPrice(c.live_rate_per_gram) : "-"}</div>
          <div className="text-[10px] font-semibold text-gray-500">
            Purchase {num(c.inv_price) ? fmtPrice(c.inv_price) : "-"}
          </div>
        </div>
      );
    if (col === "low_range")
      return (
        <div className="grid gap-1">
          {stockRangeBox(c.day_low, "dayLow")}
          <div className="text-[10px] font-semibold text-gray-500">
            52W {num(c.fifty_two_week_low) ? fmtPrice(c.fifty_two_week_low) : "-"}
          </div>
        </div>
      );
    if (col === "high_range")
      return (
        <div className="grid gap-1">
          {stockRangeBox(c.day_high, "dayHigh")}
          <div className="text-[10px] font-semibold text-gray-500">
            52W {num(c.fifty_two_week_high) ? fmtPrice(c.fifty_two_week_high) : "-"}
          </div>
        </div>
      );
    if (col === "gain_display")
      return (
        <div className="grid justify-items-end gap-1 tabular-nums">
          <div className={num(c.today_gain) >= 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
            {num(c.today_gain) >= 0 ? "+" : ""}{fmt(c.today_gain)}
          </div>
          <div className={num(c.gain) >= 0 ? "text-[10px] font-semibold text-emerald-700" : "text-[10px] font-semibold text-red-600"}>
            {num(c.gain) >= 0 ? "+" : ""}{fmt(c.gain)}
          </div>
        </div>
      );
    return formatModuleCell("bullion", col, c, record);
  }
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-lg font-bold text-sage">
        Loading...
      </div>
    );
  if (!session)
    return (
      <main className="auth-shell flex min-h-screen items-center justify-center p-4">
        <div className="auth-card card w-full max-w-md p-6">
          <div className="mb-6">
            <div className="auth-brand-mark mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-sage text-xl font-semibold text-white">
              <PieChart size={28} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Asset Manager
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to track your complete financial portfolio.
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
    <div
      className={`app-shell app-theme-${appearance.theme} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      style={
        {
          fontFamily: appearance.font,
          fontSize: `${appearance.fontSize}px`,
          "--sidebar-width": `${sidebarWidth}px`,
        } as any
      }
    >
      <style>{`
        :root {
          --am-bg: #F8F3EA;
          --am-bg-2: #FFF8EC;
          --am-surface: #FFFFFF;
          --am-surface-2: #FFF1C9;
          --am-ink: #170A10;
          --am-ink-2: #30101E;
          --am-muted: #755B66;
          --am-muted-2: #9A7D89;
          --am-line: rgba(122, 18, 72, 0.14);
          --am-line-strong: rgba(122, 18, 72, 0.24);
          --am-plum: #4B082A;
          --am-plum-2: #7A1248;
          --am-plum-3: #A3195B;
          --am-gold: #C89A36;
          --am-gold-2: #EBC985;
          --am-gold-3: #FFF1C9;
          --am-cream: #FFF8EC;
          --am-green: #15803D;
          --am-red: #DC2626;
          --am-shadow: 0 26px 70px rgba(122, 18, 72, 0.14);
          --am-soft-shadow: 0 14px 38px rgba(122, 18, 72, 0.10);
          --am-glow: 0 0 0 1px rgba(255,255,255,.75) inset, 0 18px 45px rgba(151,103,25,.14);
        }

        * { -webkit-tap-highlight-color: transparent; }

        body {
          background:
            radial-gradient(circle at 8% -6%, rgba(255, 225, 145, 0.42), transparent 25rem),
            radial-gradient(circle at 100% 0%, rgba(122, 18, 72, 0.12), transparent 25rem),
            linear-gradient(180deg, #FFFFFF 0%, #F8F3EA 46%, #F3E5CD 100%) !important;
          color: var(--am-ink);
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
        }

        .app-shell {
          background:
            radial-gradient(circle at 14% 4%, rgba(255, 226, 148, .35), transparent 28rem),
            radial-gradient(circle at 94% 0%, rgba(122, 18, 72, .13), transparent 26rem),
            linear-gradient(180deg, #FFFFFF 0%, var(--am-bg) 100%) !important;
        }
        .app-theme-plum {
          --am-bg: #FFF7ED;
          --am-bg-2: #FFF1E4;
          --am-surface: #FFFFFF;
          --am-surface-2: #F7DFA8;
          --am-ink: #2B0F1F;
          --am-muted: #7C5369;
          --am-line: rgba(75, 8, 42, .18);
          --am-plum: #4B082A;
          --am-plum-2: #7A1248;
          --am-plum-3: #9A1F5E;
          --am-gold: #C69632;
        }
        .app-theme-neo {
          --am-bg: #F6F8FA;
          --am-bg-2: #FFFFFF;
          --am-surface: #FFFFFF;
          --am-surface-2: #F1F5F9;
          --am-ink: #2F3A45;
          --am-ink-2: #111827;
          --am-muted: #6D747C;
          --am-muted-2: #8A929A;
          --am-line: #E7EBF0;
          --am-line-strong: #D7DEE8;
          --am-plum: #004B8D;
          --am-plum-2: #0B4F93;
          --am-plum-3: #0A6FC2;
          --am-gold: #ED1C24;
          --am-green: #00A878;
          --am-red: #FF3030;
          --am-shadow: 0 1px 2px rgba(15,23,42,.06);
          --am-soft-shadow: 0 1px 2px rgba(15,23,42,.05);
        }
        .app-theme-plum,
        .app-theme-plum main {
          background:
            radial-gradient(circle at 8% 0%, rgba(198,150,50,.26), transparent 25rem),
            linear-gradient(180deg, #FFFFFF, #FFF7ED) !important;
        }
        .app-theme-neo,
        .app-theme-neo main {
          background: #F6F8FA !important;
          color: var(--am-ink) !important;
        }
        .app-theme-neo .desktop-sidebar {
          background: #FFFFFF !important;
          border-right: 1px solid #E7EBF0 !important;
          box-shadow: none !important;
        }
        .app-theme-neo .desktop-sidebar h1 {
          color: #ED1C24 !important;
          font-weight: 850 !important;
          letter-spacing: -0.03em;
        }
        .app-theme-neo .desktop-sidebar p {
          color: #004B8D !important;
        }
        .app-theme-neo .desktop-sidebar nav button {
          border-radius: 0 !important;
          color: #65707B !important;
          font-weight: 650 !important;
          box-shadow: none !important;
        }
        .app-theme-neo .desktop-sidebar nav button.bg-sage {
          background: transparent !important;
          color: #004B8D !important;
          border-bottom: 2px solid #004B8D !important;
          box-shadow: none !important;
        }
        .app-theme-neo .bg-sage,
        .app-theme-neo .btn-primary {
          background: #004B8D !important;
          color: #FFFFFF !important;
          box-shadow: none !important;
        }
        .app-theme-neo .btn,
        .app-theme-neo .btn-danger,
        .app-theme-neo .field-input,
        .app-theme-neo input,
        .app-theme-neo select,
        .app-theme-neo textarea {
          border-color: #E1E7EF !important;
          border-radius: 10px !important;
          background: #FFFFFF !important;
          box-shadow: none !important;
        }
        .app-theme-neo .btn {
          color: #004B8D !important;
          font-weight: 650 !important;
        }
        .app-theme-neo .btn-danger {
          color: #ED1C24 !important;
          background: #FFF5F5 !important;
        }
        .app-theme-neo .card,
        .app-theme-neo section,
        .app-theme-neo .rounded-2xl,
        .app-theme-neo .rounded-3xl,
        .app-theme-neo .investment-table,
        .app-theme-neo .stock-holdings-table,
        .app-theme-neo .table-smooth,
        .app-theme-neo .bg-white,
        .app-theme-neo .bg-white\/90 {
          background: #FFFFFF !important;
          border-color: #E7EBF0 !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .app-theme-neo .investment-table,
        .app-theme-neo .stock-holdings-table,
        .app-theme-neo .table-smooth {
          border-radius: 0 !important;
        }
        .app-theme-neo .investment-table table,
        .app-theme-neo .stock-holdings-table table,
        .app-theme-neo .table-smooth table {
          border-collapse: collapse !important;
          font-size: .88em !important;
        }
        .app-theme-neo .investment-table thead th,
        .app-theme-neo .stock-holdings-table thead th,
        .app-theme-neo .table-smooth thead th {
          background: #F4F4F5 !important;
          color: #3D4650 !important;
          font-weight: 650 !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
          border-bottom: 1px solid #E7EBF0 !important;
        }
        .app-theme-neo .investment-table tbody td,
        .app-theme-neo .stock-holdings-table tbody td,
        .app-theme-neo .table-smooth tbody td {
          color: #4B5563 !important;
          border-top: 1px solid #EEF1F4 !important;
          padding-top: 13px !important;
          padding-bottom: 13px !important;
        }
        .app-theme-neo .investment-table tbody tr:hover,
        .app-theme-neo .stock-holdings-table tbody tr:hover,
        .app-theme-neo .table-smooth tbody tr:hover {
          background: #F8FBFF !important;
        }
        .app-theme-neo .pill {
          background: #EEF6FF !important;
          color: #004B8D !important;
          border: 1px solid #B8D8F5 !important;
          border-radius: 999px !important;
        }
        .app-theme-neo .text-emerald-700,
        .app-theme-neo .text-green-700,
        .app-theme-neo .text-green-600 {
          color: #00A878 !important;
        }
        .app-theme-neo .text-red-700,
        .app-theme-neo .text-red-600 {
          color: #FF3030 !important;
        }
        .app-theme-neo h1,
        .app-theme-neo h2,
        .app-theme-neo h3,
        .app-theme-neo .phone-hero-value,
        .app-theme-neo .phone-row-value,
        .app-theme-neo .phone-stat-value {
          color: #26313D !important;
          text-shadow: none !important;
          letter-spacing: 0 !important;
          font-weight: 700 !important;
        }

        .desktop-sidebar {
          background:
            linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,248,236,.93)),
            radial-gradient(circle at 30% 0%, rgba(226,191,102,.28), transparent 20rem) !important;
          border-right: 1px solid rgba(126, 82, 36, .16) !important;
          box-shadow: 18px 0 55px rgba(45, 24, 49, 0.08);
        }
        .desktop-sidebar h1 {
          color: var(--am-plum) !important;
          letter-spacing: -0.045em;
          font-weight: 950 !important;
        }
        .desktop-sidebar p { color: #8b7d87 !important; }
        .desktop-sidebar .bg-sage,
        .bg-sage {
          background:
            radial-gradient(circle at 28% 18%, rgba(255,255,255,.24), transparent 1.2rem),
            linear-gradient(135deg, var(--am-plum-3) 0%, var(--am-plum-2) 44%, var(--am-plum) 100%) !important;
          color: #fff !important;
          box-shadow: 0 12px 28px rgba(67,17,47,.24), inset 0 1px 0 rgba(255,255,255,.22) !important;
        }
        .desktop-sidebar nav button {
          border-radius: 18px !important;
          color: #514653 !important;
          font-weight: 850 !important;
        }
        .desktop-sidebar nav button:hover {
          background: rgba(255,255,255,.70) !important;
          color: var(--am-plum) !important;
          box-shadow: inset 0 0 0 1px rgba(200,148,37,.18) !important;
        }
        .desktop-sidebar nav button.bg-sage {
          background:
            linear-gradient(135deg, rgba(255,240,181,.92), rgba(226,191,102,.92)) !important;
          color: #2f1828 !important;
          box-shadow: 0 10px 22px rgba(200,148,37,.20), inset 0 1px 0 rgba(255,255,255,.78) !important;
        }

        h1, h2, h3, .phone-hero-value, .phone-row-value, .phone-stat-value {
          text-shadow: 0 1px 0 rgba(255,255,255,.55);
        }

        .card,
        .rounded-2xl,
        .rounded-3xl,
        .field-input,
        input,
        select,
        textarea {
          border-color: var(--am-line) !important;
        }
        .card {
          position: relative;
          background:
            linear-gradient(180deg, rgba(255,255,255,.94), rgba(255,250,241,.90)) !important;
          box-shadow: var(--am-soft-shadow), inset 0 1px 0 rgba(255,255,255,.78) !important;
          overflow: hidden;
        }
        .card::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(226,191,102,.75), transparent);
          pointer-events: none;
        }
        .field-input,
        input,
        select,
        textarea {
          background: rgba(255,255,255,.82) !important;
          color: var(--am-ink) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.88) !important;
        }
        .field-label { color: #6f5f6a !important; font-weight: 900 !important; letter-spacing: .08em !important; }

        .btn-primary,
        .phone-add-btn {
          background:
            radial-gradient(circle at 24% 15%, rgba(255,255,255,.24), transparent 1.5rem),
            linear-gradient(135deg, var(--am-plum-3) 0%, var(--am-plum-2) 44%, var(--am-plum) 100%) !important;
          color: #fff !important;
          border: 0 !important;
          box-shadow: 0 14px 30px rgba(67,17,47,0.25), inset 0 1px 0 rgba(255,255,255,.22) !important;
          font-weight: 950 !important;
        }
        .btn-primary:hover,
        .phone-add-btn:hover { filter: brightness(1.06) saturate(1.05); transform: translateY(-1px); }
        .btn {
          background: rgba(255,255,255,.72) !important;
          border-color: rgba(83,43,72,.14) !important;
          color: #332233 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.82) !important;
          font-weight: 850 !important;
        }

        .mobile-appbar {
          position: sticky;
          top: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 72px;
          padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px !important;
          color: var(--am-ink) !important;
          background:
            linear-gradient(115deg, rgba(255,255,255,.92) 0%, rgba(255,248,232,.90) 48%, rgba(255,239,196,.82) 100%),
            radial-gradient(circle at 88% 0%, rgba(154,31,94,.14), transparent 16rem) !important;
          border-bottom: 1px solid rgba(126,82,36,.16) !important;
          box-shadow: 0 16px 34px rgba(48, 26, 50, 0.11), inset 0 -1px 0 rgba(255,255,255,.72);
          backdrop-filter: blur(18px);
        }
        .mobile-appbar::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: 0;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(200,148,37,.80), rgba(154,31,94,.40), transparent);
        }
        .mobile-appbar .text-\[11px\] {
          color: var(--am-plum-2) !important;
          letter-spacing: .22em !important;
          font-weight: 950 !important;
          text-transform: uppercase;
        }
        .mobile-appbar h2 {
          color: var(--am-ink) !important;
          font-size: 20px !important;
          line-height: 1.04 !important;
          letter-spacing: -0.052em !important;
          font-weight: 950 !important;
        }
        .mobile-icon-btn {
          width: 38px !important;
          height: 38px !important;
          border-radius: 999px !important;
          color: var(--am-plum) !important;
          border: 1px solid rgba(83,43,72,.14) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,247,232,.80)) !important;
          box-shadow: 0 10px 22px rgba(48,26,50,.09), inset 0 1px 0 rgba(255,255,255,.92) !important;
        }
        .mobile-icon-btn svg { stroke-width: 2.4 !important; }
        .phone-add-btn {
          height: 38px !important;
          border-radius: 999px !important;
          padding: 0 13px !important;
          background:
            radial-gradient(circle at 24% 18%, rgba(255,255,255,.30), transparent 1.2rem),
            linear-gradient(135deg, #A3195B 0%, #7A1248 52%, #4B082A 100%) !important;
          box-shadow: 0 13px 26px rgba(112,25,71,0.26), inset 0 1px 0 rgba(255,255,255,.24) !important;
          letter-spacing: -.01em !important;
        }

        .phone-content {
          min-height: calc(100vh - 72px);
          overflow-x: hidden !important;
          overflow-y: visible !important;
          touch-action: pan-y !important;
          background:
            radial-gradient(circle at -8% 0%, rgba(255,226,148,.45), transparent 17rem),
            radial-gradient(circle at 108% 4%, rgba(154,31,94,.11), transparent 18rem),
            linear-gradient(180deg, #FFFFFF 0%, #F8F3EA 54%, #F3E5CD 100%) !important;
          color: var(--am-ink) !important;
        }
        .phone-screen {
          padding: 10px 10px 94px !important;
          max-width: 100vw !important;
          overflow-x: hidden !important;
          overflow-y: visible !important;
          touch-action: pan-y !important;
        }

        .phone-market-strip {
          display: flex !important;
          gap: 8px !important;
          margin: -2px -12px 14px !important;
          padding: 10px 12px 12px !important;
          overflow-x: auto !important;
          overscroll-behavior-x: contain !important;
          scroll-snap-type: x proximity !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: none;
          background: rgba(255,250,241,.74) !important;
          border-bottom: 1px solid rgba(126,82,36,.12) !important;
          box-shadow: inset 0 -1px 0 rgba(255,255,255,.86);
        }
        .phone-market-strip::-webkit-scrollbar { display: none; }
        .phone-chip {
          flex: 0 0 112px;
          min-height: 54px !important;
          display: grid !important;
          align-content: center !important;
          gap: 2px !important;
          padding: 7px 10px !important;
          scroll-snap-align: start !important;
          border-radius: 14px !important;
          border: 1px solid rgba(83,43,72,.12) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,247,232,.88)) !important;
          color: #3b2c3c !important;
          box-shadow: 0 7px 16px rgba(48,26,50,.06), inset 0 1px 0 rgba(255,255,255,.9) !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
        }
        .phone-market-label {
          color: #4b3349 !important;
          font-size: 9.4px !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
          white-space: nowrap !important;
        }
        .phone-market-value {
          color: var(--am-plum-3) !important;
          font-size: 12.4px !important;
          line-height: 1.12 !important;
          font-weight: 950 !important;
          white-space: nowrap !important;
        }
        .phone-market-up,
        .phone-market-down {
          font-size: 10.4px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          white-space: nowrap !important;
        }
        .phone-market-up { color: #007a52 !important; }
        .phone-market-down { color: #e11d2e !important; }

        .phone-hero,
        .phone-module-strip,
        .phone-module-main,
        .phone-stat {
          border: 1px solid rgba(83,43,72,.12) !important;
          background:
            linear-gradient(150deg, rgba(255,255,255,.98) 0%, rgba(255,251,242,.96) 54%, rgba(255,243,214,.90) 100%) !important;
          box-shadow: var(--am-glow) !important;
          position: relative;
          overflow: hidden;
        }
        .phone-hero::before,
        .phone-module-main::before,
        .phone-stat::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(226,191,102,.95), transparent);
        }
        .phone-hero::after,
        .phone-module-main::after {
          content: "";
          position: absolute;
          right: -38px;
          top: -42px;
          width: 120px;
          height: 120px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(226,191,102,.22), transparent 68%);
          pointer-events: none;
        }
        .phone-hero,
        .phone-module-main {
          border-radius: 20px !important;
          padding: 13px !important;
        }
        .phone-module-strip {
          border-radius: 21px !important;
          padding: 8px !important;
          gap: 8px !important;
        }
        .phone-stat {
          border-radius: 16px !important;
          padding: 10px !important;
        }
        .phone-stats {
          gap: 8px !important;
        }
        .phone-eyebrow,
        .phone-stat-label,
        .phone-mini-label,
        .phone-section-title {
          color: #7b536d !important;
          letter-spacing: .19em !important;
          font-weight: 950 !important;
          text-transform: uppercase;
        }
        .phone-hero-value,
        .phone-stat-value,
        .phone-row-value {
          color: #1a1019 !important;
          letter-spacing: -0.055em !important;
          font-weight: 950 !important;
        }
        .phone-hero-value { font-size: 26px !important; line-height: 1 !important; }
        .phone-stat-value { font-size: 15px !important; line-height: 1.05 !important; }
        .phone-hero-sub,
        .phone-row-meta { color: #746675 !important; font-weight: 820 !important; }
        .phone-section-title {
          margin: 13px 2px 8px !important;
          font-size: 10px !important;
        }
        .phone-section-title::after {
          content: "";
          display: inline-block;
          width: 46px;
          height: 2px;
          margin-left: 10px;
          vertical-align: middle;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--am-gold), rgba(154,31,94,.32), transparent);
          box-shadow: 0 1px 4px rgba(200,148,37,.24);
        }

        .phone-list {
          display: grid !important;
          gap: 14px !important;
        }
        .phone-account-strip {
          display: flex !important;
          gap: 7px !important;
          margin: 9px 0 2px !important;
          padding: 5px !important;
          overflow-x: auto !important;
          border: 1px solid rgba(83,43,72,.12) !important;
          border-radius: 18px !important;
          background: rgba(255,253,248,.78) !important;
          box-shadow: 0 8px 20px rgba(48,26,50,.07), inset 0 1px 0 rgba(255,255,255,.86) !important;
          scrollbar-width: none !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .phone-account-strip::-webkit-scrollbar { display: none; }
        .phone-account-strip button {
          flex: 0 0 auto !important;
          min-height: 30px !important;
          border-radius: 999px !important;
          padding: 0 13px !important;
          color: #544653 !important;
          background: rgba(255,255,255,.70) !important;
          border: 1px solid rgba(83,43,72,.10) !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
        }
        .phone-account-strip button.active {
          color: #211521 !important;
          background: linear-gradient(135deg, #FFF1C9 0%, #e4bd5b 48%, #C89A36 100%) !important;
          border-color: rgba(200,148,37,.45) !important;
          box-shadow: 0 5px 12px rgba(200,148,37,.18), inset 0 1px 0 rgba(255,255,255,.72) !important;
        }
        .phone-group {
          min-width: 0 !important;
          overflow: hidden !important;
        }
        .phone-lot-list {
          display: grid !important;
          gap: 8px !important;
          margin: 0 0 4px 14px !important;
          border-left: 2px solid rgba(122, 18, 72, .18) !important;
          padding-left: 8px !important;
        }
        .phone-lot-list .phone-row {
          background: rgba(255,255,255,.78) !important;
        }
        .phone-stock-card {
          position: relative;
          display: grid !important;
          gap: 9px !important;
          min-width: 0 !important;
          padding: 11px 10px 10px 14px !important;
          border: 1px solid rgba(83,43,72,.20) !important;
          border-radius: 19px !important;
          overflow: hidden !important;
          background:
            linear-gradient(145deg, rgba(255,255,255,1), rgba(255,250,240,.98) 56%, rgba(255,241,207,.92)) !important;
          box-shadow:
            0 12px 28px rgba(48,26,50,.13),
            0 1px 0 rgba(255,255,255,.86) inset,
            0 -1px 0 rgba(200,148,37,.12) inset !important;
        }
        .phone-stock-card + .phone-stock-card,
        .phone-group + .phone-group {
          margin-top: 2px !important;
        }
        .phone-stock-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 13px;
          bottom: 13px;
          width: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--am-gold-3), var(--am-gold), var(--am-plum-3));
          box-shadow: 0 0 12px rgba(200,148,37,.35);
        }
        .phone-stock-card-top {
          position: relative;
          z-index: 1;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 3px !important;
          align-items: start !important;
          width: 100% !important;
          text-align: left !important;
        }
        .phone-stock-name {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #1d111c !important;
          font-size: 13.2px !important;
          line-height: 1.05 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
        }
        .phone-stock-meta {
          margin-top: 2px !important;
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: #6c596a !important;
          font-size: 9.8px !important;
          line-height: 1.12 !important;
          font-weight: 850 !important;
        }
        .phone-stock-top-stats,
        .phone-stock-metrics,
        .phone-stock-prices {
          position: relative;
          z-index: 1;
          display: grid !important;
          gap: 6px !important;
        }
        .phone-stock-top-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: stretch !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid rgba(122,18,72,.10) !important;
        }
        .phone-stock-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .phone-stock-top-stats > div,
        .phone-stock-metrics > div,
        .phone-stock-prices > span {
          min-width: 0 !important;
          border-radius: 13px !important;
          padding: 7px 8px !important;
          background: rgba(255,255,255,.56) !important;
          border: 1px solid rgba(200,148,37,.18) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.78) !important;
        }
        .phone-stock-top-stats span,
        .phone-stock-metrics span,
        .phone-stock-prices em {
          display: block !important;
          color: #785f70 !important;
          font-size: 7.8px !important;
          line-height: 1 !important;
          font-style: normal !important;
          font-weight: 950 !important;
          text-transform: uppercase !important;
        }
        .phone-stock-top-stats b,
        .phone-stock-metrics b,
        .phone-stock-prices b {
          display: block !important;
          margin-top: 3px !important;
          color: #211521 !important;
          font-size: 12px !important;
          line-height: 1.08 !important;
          font-weight: 950 !important;
          text-align: right !important;
          white-space: normal !important;
          overflow: hidden !important;
          text-overflow: clip !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
        }
        .phone-stock-metrics small {
          display: block !important;
          margin-top: 2px !important;
          color: #6c596a !important;
          font-size: 8.8px !important;
          line-height: 1 !important;
          font-weight: 850 !important;
          text-align: right !important;
          white-space: nowrap !important;
        }
        .phone-pair-cell {
          display: grid !important;
          align-content: center !important;
          gap: 7px !important;
        }
        .phone-pair-line {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: baseline !important;
          gap: 6px !important;
          min-width: 0 !important;
        }
        .phone-pair-line + .phone-pair-line {
          border-top: 1px solid rgba(122,18,72,.08) !important;
          padding-top: 6px !important;
        }
        .phone-pair-line span {
          color: #785f70 !important;
          font-size: 7.8px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          text-transform: uppercase !important;
        }
        .phone-pair-line b {
          margin-top: 0 !important;
          color: #211521 !important;
          font-size: 12px !important;
          line-height: 1.08 !important;
          font-weight: 950 !important;
          text-align: right !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }
        .phone-gain-up {
          border-color: rgba(0,122,85,.22) !important;
          background: linear-gradient(180deg, rgba(235,252,244,.92), rgba(216,246,232,.82)) !important;
        }
        .phone-gain-down {
          border-color: rgba(204,44,44,.22) !important;
          background: linear-gradient(180deg, rgba(255,239,236,.95), rgba(255,221,216,.86)) !important;
        }
        .phone-stock-prices {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          color: inherit !important;
          text-decoration: none !important;
          -webkit-tap-highlight-color: transparent !important;
          padding-top: 1px !important;
        }
        .phone-stock-signal-row > span {
          min-height: 52px !important;
        }
        .phone-stock-signal-row > .phone-box-neutral {
          border-color: rgba(200,148,37,.24) !important;
          background: linear-gradient(180deg, rgba(255,253,248,.98), rgba(255,244,219,.92)) !important;
        }
        .phone-stock-signal-row > .phone-box-neutral em,
        .phone-stock-signal-row > .phone-box-neutral b {
          color: #4f354a !important;
        }
        .phone-stock-signal-row > .phone-box-up {
          border-color: rgba(0,122,85,.24) !important;
          background: linear-gradient(180deg, rgba(226,250,239,.96), rgba(196,239,219,.92)) !important;
        }
        .phone-stock-signal-row > .phone-box-down {
          border-color: rgba(204,44,44,.24) !important;
          background: linear-gradient(180deg, rgba(255,235,232,.96), rgba(255,210,204,.92)) !important;
        }
        .phone-stock-signal-row > .phone-box-up em,
        .phone-stock-signal-row > .phone-box-up b {
          color: #006b4a !important;
        }
        .phone-stock-signal-row > .phone-box-down em,
        .phone-stock-signal-row > .phone-box-down b {
          color: #bd2020 !important;
        }
        .phone-stock-signal-row small {
          display: block !important;
          margin-top: 2px !important;
          font-size: 10px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          text-align: right !important;
          white-space: nowrap !important;
          opacity: .78 !important;
        }
        .phone-stock-signal-row > .phone-box-up small {
          color: #006b4a !important;
        }
        .phone-stock-signal-row > .phone-box-down small {
          color: #bd2020 !important;
        }
        .phone-stock-prices:active > span {
          border-color: rgba(122,18,72,.34) !important;
          background: rgba(255,255,255,.92) !important;
        }
        .phone-row {
          position: relative;
          border: 1px solid rgba(83,43,72,.12) !important;
          border-radius: 22px !important;
          background:
            linear-gradient(145deg, rgba(255,255,255,.99), rgba(255,249,237,.96) 62%, rgba(255,243,214,.88)) !important;
          box-shadow: 0 13px 34px rgba(48,26,50,.10), inset 0 1px 0 rgba(255,255,255,.92) !important;
          transform: translateZ(0);
        }
        .phone-row::before {
          content: "";
          position: absolute;
          left: 0;
          top: 13px;
          bottom: 13px;
          width: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--am-gold-3), var(--am-gold), var(--am-plum-3));
          box-shadow: 0 0 12px rgba(200,148,37,.35);
        }
        .phone-row::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(226,191,102,.72), transparent);
          pointer-events: none;
        }
        .phone-row-main {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 9px 12px !important;
          position: relative;
          z-index: 1;
        }
        .phone-row-title {
          color: #1d111c !important;
          font-size: 14.5px !important;
          line-height: 1.12 !important;
          font-weight: 950 !important;
          letter-spacing: -0.035em !important;
        }
        .phone-row-meta {
          font-size: 11.5px !important;
          line-height: 1.18 !important;
        }
        .phone-row-value {
          max-width: 40vw !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          font-size: 15.5px !important;
          line-height: 1.10 !important;
          text-align: right !important;
          color: #160d16 !important;
        }
        .phone-row-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .phone-row-metric {
          min-width: 0 !important;
          border-radius: 15px !important;
          padding: 8px 8px !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,246,225,.78)) !important;
          border: 1px solid rgba(200,148,37,.18) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.78) !important;
        }
        .phone-mini-label { font-size: 8.5px !important; color: #8b7182 !important; }
        .phone-mini-value {
          color: #211521 !important;
          font-size: 12px !important;
          line-height: 1.12 !important;
          font-weight: 950 !important;
          letter-spacing: -.02em !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          text-overflow: clip !important;
        }
        .phone-green { color: var(--am-green) !important; text-shadow: 0 1px 0 rgba(255,255,255,.55); }
        .phone-red { color: var(--am-red) !important; text-shadow: 0 1px 0 rgba(255,255,255,.55); }

        .phone-tabs,
        .mobile-tabbar,
        .mobile-tab-account-menu {
          border: 1px solid rgba(83,43,72,.14) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,247,232,.82)) !important;
          box-shadow: 0 16px 38px rgba(48,26,50,.13), inset 0 1px 0 rgba(255,255,255,.88) !important;
          backdrop-filter: blur(18px) saturate(1.22);
        }
        .phone-tabs { padding: 5px !important; }
        .phone-tab,
        .mobile-tabbar button,
        .mobile-tab-account-menu button {
          color: #544653 !important;
          border-radius: 999px !important;
          font-weight: 950 !important;
          letter-spacing: -.02em !important;
        }
        .phone-tab.active,
        .mobile-tabbar button.active,
        .mobile-tab-account-menu button.active {
          color: #211521 !important;
          background:
            radial-gradient(circle at 28% 18%, rgba(255,255,255,.45), transparent 1.2rem),
            linear-gradient(135deg, #FFF1C9 0%, #e4bd5b 45%, #C89A36 100%) !important;
          box-shadow: 0 9px 20px rgba(200,148,37,.28), inset 0 1px 0 rgba(255,255,255,.72) !important;
        }
        .mobile-tab-account-menu { padding: 6px !important; }
        .mobile-tabbar {
          right: 0.65rem !important;
          left: 0.65rem !important;
          bottom: calc(env(safe-area-inset-bottom) + 0.5rem) !important;
          justify-content: space-between !important;
          gap: 0.1rem !important;
          border-radius: 20px !important;
          padding: 4px !important;
          box-shadow: 0 12px 26px rgba(48,26,50,.14), inset 0 1px 0 rgba(255,255,255,.88) !important;
        }
        .mobile-tabbar button {
          flex: 1 1 0 !important;
          min-width: 0 !important;
          min-height: 38px !important;
          padding: 0 4px !important;
          font-size: 10px !important;
        }
        .mobile-tabbar.mobile-top-nav {
          position: sticky !important;
          top: calc(env(safe-area-inset-top) + 72px) !important;
          right: auto !important;
          bottom: auto !important;
          left: auto !important;
          z-index: 39 !important;
          width: calc(100vw - 18px) !important;
          max-width: calc(100vw - 18px) !important;
          margin: -4px auto 12px !important;
          justify-content: flex-start !important;
          gap: 7px !important;
          overflow-x: auto !important;
          border-radius: 22px !important;
          padding: 7px !important;
          white-space: nowrap !important;
        }
        .mobile-tabbar.mobile-top-nav button {
          flex: 0 0 auto !important;
          min-width: max-content !important;
          min-height: 38px !important;
          gap: 6px !important;
          padding: 0 13px !important;
          font-size: 12px !important;
          letter-spacing: -.03em !important;
        }
        .mobile-tabbar.mobile-top-nav .mobile-nav-back {
          border: 1px solid rgba(83,43,72,.12) !important;
          background: rgba(255,255,255,.64) !important;
          color: #4f354a !important;
        }
        .mobile-tabbar.mobile-top-nav .mobile-nav-back span:first-child {
          font-size: 18px !important;
          line-height: 1 !important;
        }
        .phone-content {
          padding-bottom: 18px !important;
        }

        .mobile-menu-panel {
          border-color: rgba(83,43,72,.13) !important;
          background: rgba(255,253,248,.98) !important;
          box-shadow: 0 22px 55px rgba(48,26,50,.16), inset 0 1px 0 rgba(255,255,255,.88) !important;
        }
        .mobile-menu-panel button {
          font-weight: 850 !important;
        }

        .text-green-700, .text-green-600, .text-emerald-600 { color: var(--am-green) !important; }
        .text-red-700, .text-red-600, .text-rose-600 { color: var(--am-red) !important; }
        .text-gray-500, .text-gray-600 { color: var(--am-muted) !important; }

        @media (max-width: 1023px) {
          main { background: var(--am-bg) !important; }
        }
        @media (max-width: 430px) {
          .phone-hero-value { font-size: 29px !important; }
          .phone-row-value { max-width: 36vw !important; font-size: 14.5px !important; }
          .phone-row-metric { padding: 7px 7px !important; }
          .phone-mini-value { font-size: 11px !important; }
          .phone-tab { font-size: 10px !important; }
          .mobile-appbar h2 { font-size: 22px !important; }
        }
      `}</style>

      <style>{`
        /* Ultra premium override layer: high-end ivory, oxblood plum, champagne gold */
        :root {
          --lux-ink: #12060d;
          --lux-ink-soft: #38202f;
          --lux-muted: #7b6875;
          --lux-cream: #fff8eb;
          --lux-cream-2: #f6ead5;
          --lux-porcelain: rgba(255,255,255,.86);
          --lux-plum: #4b082a;
          --lux-plum-2: #790f46;
          --lux-plum-3: #a21a61;
          --lux-gold: #c69632;
          --lux-gold-2: #f0d794;
          --lux-line: rgba(95, 46, 74, .14);
          --lux-line-strong: rgba(198, 150, 50, .32);
          --lux-green: #007a55;
          --lux-red: #cc2c2c;
          --lux-shadow: 0 28px 78px rgba(55, 18, 39, .15);
          --lux-shadow-soft: 0 18px 45px rgba(55, 18, 39, .10);
          --lux-inner: inset 0 1px 0 rgba(255,255,255,.82), inset 0 -1px 0 rgba(120,72,18,.06);
        }

        body {
          background:
            radial-gradient(circle at 8% -8%, rgba(255, 219, 128, .50), transparent 28rem),
            radial-gradient(circle at 100% 0%, rgba(121, 15, 70, .16), transparent 30rem),
            radial-gradient(circle at 78% 96%, rgba(198, 150, 50, .12), transparent 26rem),
            linear-gradient(135deg, #fffdf9 0%, #fbf0dc 42%, #f3dfbf 100%) !important;
          color: var(--lux-ink) !important;
          font-feature-settings: "tnum" 1, "cv02" 1, "cv03" 1, "cv04" 1;
          letter-spacing: -.01em;
        }

        .app-shell {
          background:
            linear-gradient(90deg, rgba(255,255,255,.42), rgba(255,255,255,0)),
            radial-gradient(circle at 16% 8%, rgba(255, 227, 154, .46), transparent 30rem),
            radial-gradient(circle at 92% -2%, rgba(94, 10, 54, .16), transparent 32rem),
            linear-gradient(180deg, #fffdf8 0%, #f9edda 100%) !important;
        }

        main {
          background:
            radial-gradient(circle at 84% 0%, rgba(255,255,255,.70), transparent 20rem),
            linear-gradient(180deg, rgba(255,255,255,.54), rgba(255,255,255,.10)) !important;
        }

        .desktop-sidebar {
          background:
            linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,246,229,.92)),
            radial-gradient(circle at 22% 0%, rgba(246, 207, 111, .38), transparent 18rem),
            linear-gradient(180deg, #fffaf0, #f5e4c9) !important;
          border-right: 1px solid rgba(198,150,50,.28) !important;
          box-shadow: 24px 0 70px rgba(45, 14, 32, .10) !important;
          backdrop-filter: blur(28px) saturate(145%) !important;
        }
        .desktop-sidebar::before {
          content: "";
          position: fixed;
          left: 0;
          top: 0;
          width: var(--sidebar-width, 280px);
          height: 3px;
          background: linear-gradient(90deg, var(--lux-plum), var(--lux-gold), transparent);
          z-index: 20;
        }
        .desktop-sidebar h1 {
          color: var(--lux-plum) !important;
          font-weight: 950 !important;
          letter-spacing: -.055em !important;
        }
        .desktop-sidebar .bg-sage,
        .bg-sage {
          background:
            radial-gradient(circle at 22% 10%, rgba(255,255,255,.32), transparent 1.25rem),
            linear-gradient(135deg, #a21a61 0%, #790f46 42%, #3f0624 100%) !important;
          color: #fff !important;
          box-shadow: 0 16px 34px rgba(75,8,42,.28), inset 0 1px 0 rgba(255,255,255,.28) !important;
        }
        .desktop-sidebar nav button {
          border: 1px solid transparent !important;
          color: #4b3d48 !important;
          font-weight: 850 !important;
          letter-spacing: -.015em !important;
        }
        .desktop-sidebar nav button:hover {
          background: rgba(255,255,255,.72) !important;
          border-color: rgba(198,150,50,.22) !important;
          color: var(--lux-plum) !important;
          box-shadow: 0 10px 26px rgba(75,8,42,.08), inset 0 1px 0 rgba(255,255,255,.85) !important;
        }
        .desktop-sidebar nav button.bg-sage {
          background:
            linear-gradient(135deg, #6e0c3f 0%, #9d185c 54%, #c69632 135%) !important;
          color: #fff !important;
          border-color: rgba(255,255,255,.28) !important;
          box-shadow: 0 16px 34px rgba(75,8,42,.24), inset 0 1px 0 rgba(255,255,255,.25) !important;
        }

        .desktop-header,
        .mobile-appbar {
          border: 1px solid rgba(198,150,50,.20) !important;
          border-radius: 28px !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,.88), rgba(255,247,231,.78)),
            radial-gradient(circle at 94% 0%, rgba(198,150,50,.22), transparent 12rem) !important;
          box-shadow: var(--lux-shadow-soft) !important;
          padding: 16px 18px !important;
          backdrop-filter: blur(22px) saturate(135%) !important;
        }

        .card,
        .card-gradient,
        .kpi-card,
        .overflow-auto.rounded-\[22px\],
        .investment-table {
          border: 1px solid rgba(198,150,50,.22) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,250,241,.88)) !important;
          box-shadow: var(--lux-shadow-soft), var(--lux-inner) !important;
          backdrop-filter: blur(22px) saturate(140%) !important;
        }
        .card:hover,
        .kpi-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--lux-shadow), var(--lux-inner) !important;
        }
        .card > .border-b,
        .card-gradient > .border-b {
          border-color: rgba(198,150,50,.20) !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,.78), rgba(255,246,226,.70)) !important;
        }

        h1, h2, h3 {
          color: var(--lux-ink) !important;
          letter-spacing: -.045em !important;
          font-weight: 900 !important;
        }
        p, span, td, th, label, input, select, textarea, button {
          font-variant-numeric: tabular-nums;
        }

        .btn,
        .btn-danger {
          border: 1px solid rgba(198,150,50,.24) !important;
          background: linear-gradient(180deg, #ffffff, #fff7e9) !important;
          color: #3d2835 !important;
          border-radius: 999px !important;
          box-shadow: 0 10px 22px rgba(75,8,42,.07), inset 0 1px 0 rgba(255,255,255,.88) !important;
          font-weight: 850 !important;
        }
        .btn:hover,
        .btn-danger:hover {
          transform: translateY(-1px) !important;
          border-color: rgba(121,15,70,.32) !important;
          color: var(--lux-plum) !important;
          box-shadow: 0 16px 30px rgba(75,8,42,.13), inset 0 1px 0 rgba(255,255,255,.9) !important;
        }
        .btn-primary,
        .phone-add-btn {
          border: 1px solid rgba(255,255,255,.28) !important;
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,.26), transparent 2.2rem),
            linear-gradient(135deg, #a51b61, #790f46 50%, #4b082a) !important;
          color: #fff !important;
          border-radius: 999px !important;
          box-shadow: 0 18px 34px rgba(75,8,42,.28), inset 0 1px 0 rgba(255,255,255,.24) !important;
          font-weight: 900 !important;
        }
        .btn-primary:hover { filter: brightness(1.05); transform: translateY(-1px) !important; }

        .pill,
        [class*="rounded-full"] {
          border-color: rgba(198,150,50,.22) !important;
          background: linear-gradient(180deg, rgba(255,255,255,.90), rgba(255,247,229,.82)) !important;
          color: #4d3342 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.82) !important;
        }

        .field-label {
          color: #654b5c !important;
          letter-spacing: .15em !important;
          font-weight: 950 !important;
        }
        .field-input,
        input,
        select,
        textarea {
          background: rgba(255,255,255,.84) !important;
          border-color: rgba(198,150,50,.24) !important;
          border-radius: 18px !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.85), 0 8px 22px rgba(75,8,42,.05) !important;
        }
        .field-input:focus,
        input:focus,
        select:focus,
        textarea:focus {
          border-color: rgba(121,15,70,.48) !important;
          box-shadow: 0 0 0 4px rgba(121,15,70,.10), 0 12px 28px rgba(75,8,42,.09) !important;
        }

        .kpi-card {
          position: relative;
          overflow: hidden;
          border-radius: 26px !important;
          padding: 18px !important;
        }
        .kpi-card::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: linear-gradient(180deg, var(--lux-plum-2), var(--lux-gold));
          opacity: .9;
        }
        .kpi-card::after {
          content: "";
          position: absolute;
          right: -34px;
          top: -44px;
          width: 120px;
          height: 120px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(240,215,148,.35), transparent 70%);
          pointer-events: none;
        }
        .stat-label {
          color: #705a6a !important;
          font-weight: 950 !important;
          letter-spacing: .16em !important;
        }
        .stat-value,
        .text-emerald-700,
        .text-green-700 {
          color: var(--lux-green) !important;
        }
        .text-red-700,
        .text-red-600 {
          color: var(--lux-red) !important;
        }
        .stat-note { color: #8c7986 !important; font-weight: 650 !important; }

        .investment-table,
        .table-smooth,
        .stock-holdings-table {
          border-radius: 28px !important;
          overflow: auto !important;
        }
        .investment-table table,
        .stock-holdings-table table,
        .table-smooth table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
          background: transparent !important;
        }
        .investment-table thead th,
        .stock-holdings-table thead th,
        .table-smooth thead th,
        .overflow-auto table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background:
            linear-gradient(180deg, #f5e9d4, #ead8b7) !important;
          color: #342433 !important;
          border-bottom: 1px solid rgba(198,150,50,.35) !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          letter-spacing: .105em !important;
        }
        .investment-table tbody td,
        .stock-holdings-table tbody td,
        .table-smooth tbody td,
        .overflow-auto table tbody td {
          border-bottom: 1px solid rgba(95,46,74,.09) !important;
          color: #2e2230 !important;
          font-weight: 650 !important;
        }
        .stock-holdings-table thead th {
          padding: 8px 8px !important;
        }
        .stock-holdings-table tbody td {
          padding: 8px 8px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
        }
        .stock-holdings-table .btn,
        .stock-holdings-table .btn-danger {
          min-height: 24px !important;
          padding: 3px 8px !important;
          font-size: 11px !important;
          border-radius: 10px !important;
        }
        .stock-holdings-table .stock-range-box {
          min-height: 22px !important;
          padding: 2px 5px !important;
          font-size: 10px !important;
        }
        .investment-table tbody tr,
        .stock-holdings-table tbody tr,
        .table-smooth tbody tr {
          background: rgba(255,255,255,.64) !important;
          transition: transform .14s ease, box-shadow .14s ease, background .14s ease !important;
        }
        .investment-table tbody tr:nth-child(even),
        .stock-holdings-table tbody tr:nth-child(even) {
          background: rgba(255,249,238,.72) !important;
        }
        .investment-table tbody tr:hover,
        .stock-holdings-table tbody tr:hover,
        .table-smooth tbody tr:hover {
          background: linear-gradient(90deg, rgba(255,245,218,.95), rgba(255,255,255,.86)) !important;
          box-shadow: inset 4px 0 0 var(--lux-plum-2), 0 10px 26px rgba(75,8,42,.08) !important;
        }
        .investment-table a,
        .stock-holdings-table a {
          color: #075f8c !important;
          font-weight: 900 !important;
          text-decoration: none !important;
        }
        .investment-table a:hover { color: var(--lux-plum-2) !important; }

        .stock-range-box {
          border-radius: 999px !important;
          min-height: 28px !important;
          background: linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,247,229,.82)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72), 0 6px 14px rgba(75,8,42,.05) !important;
          font-size: 11px !important;
        }

        .mobile-appbar,
        .mobile-menu-panel,
        .phone-card,
        .phone-row,
        .phone-summary-card,
        .phone-metric-card {
          border-color: rgba(198,150,50,.22) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,248,235,.82)) !important;
          box-shadow: var(--lux-shadow-soft), var(--lux-inner) !important;
          backdrop-filter: blur(22px) saturate(140%) !important;
        }
        .mobile-icon-btn {
          background: linear-gradient(180deg, #fff, #fff2d9) !important;
          border-color: rgba(198,150,50,.26) !important;
          color: var(--lux-plum) !important;
        }
        .phone-hero-value,
        .phone-row-value,
        .phone-stat-value {
          color: var(--lux-plum) !important;
          font-weight: 950 !important;
        }

        /* Studio Store: a restrained product-gallery theme inspired by premium
           storefront rhythm, adapted for financial data rather than branding. */
        .app-theme-studio {
          --am-bg: #F5F5F7;
          --am-bg-2: #F5F5F7;
          --am-surface: #FFFFFF;
          --am-surface-2: #FBFBFD;
          --am-ink: #1D1D1F;
          --am-ink-2: #000000;
          --am-muted: #6E6E73;
          --am-muted-2: #86868B;
          --am-line: rgba(0, 0, 0, .08);
          --am-line-strong: rgba(0, 0, 0, .14);
          --am-plum: #0071E3;
          --am-plum-2: #0077ED;
          --am-plum-3: #2997FF;
          --am-gold: #0071E3;
          --am-green: #248A3D;
          --am-red: #D70015;
          --am-shadow: 0 12px 30px rgba(0, 0, 0, .08);
          --am-soft-shadow: 0 5px 18px rgba(0, 0, 0, .06);
          color: #1D1D1F !important;
          background: #F5F5F7 !important;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
            "SF Pro Text", "Helvetica Neue", Arial, sans-serif !important;
          letter-spacing: -.012em;
        }
        .app-theme-studio,
        .app-theme-studio main,
        .app-theme-studio .phone-content {
          background: #F5F5F7 !important;
        }
        .app-theme-studio .desktop-sidebar {
          background: rgba(255, 255, 255, .92) !important;
          border-right: 1px solid rgba(0, 0, 0, .07) !important;
          box-shadow: none !important;
          backdrop-filter: saturate(180%) blur(22px) !important;
          scrollbar-color: rgba(0, 0, 0, .22) transparent !important;
        }
        .app-theme-studio .desktop-sidebar::before {
          display: none !important;
        }
        .app-theme-studio .desktop-sidebar h1 {
          color: #1D1D1F !important;
          font-weight: 700 !important;
          letter-spacing: -.035em !important;
        }
        .app-theme-studio .desktop-sidebar p,
        .app-theme-studio .text-gray-500,
        .app-theme-studio .text-gray-600,
        .app-theme-studio .text-slate-500 {
          color: #6E6E73 !important;
        }
        .app-theme-studio .desktop-sidebar nav button {
          min-height: 42px;
          border: 0 !important;
          border-radius: 12px !important;
          color: #424245 !important;
          background: transparent !important;
          box-shadow: none !important;
          font-weight: 600 !important;
          letter-spacing: -.01em !important;
        }
        .app-theme-studio .desktop-sidebar nav button:hover {
          color: #1D1D1F !important;
          background: #F5F5F7 !important;
        }
        .app-theme-studio .desktop-sidebar nav button.bg-sage {
          color: #0066CC !important;
          background: #EAF4FF !important;
          box-shadow: none !important;
        }
        .app-theme-studio .desktop-header {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 10px 2px 18px !important;
        }
        .app-theme-studio h1,
        .app-theme-studio h2,
        .app-theme-studio h3,
        .app-theme-studio h4,
        .app-theme-studio .stat-value,
        .app-theme-studio .phone-hero-value,
        .app-theme-studio .phone-row-value,
        .app-theme-studio .phone-stat-value {
          color: #1D1D1F !important;
          font-weight: 700 !important;
          letter-spacing: -.04em !important;
          text-shadow: none !important;
        }
        .app-theme-studio .desktop-header h2 {
          font-size: clamp(2.35rem, 4vw, 4rem) !important;
          line-height: .95 !important;
        }
        .app-theme-studio .card,
        .app-theme-studio .card-gradient,
        .app-theme-studio .kpi-card,
        .app-theme-studio section,
        .app-theme-studio .rounded-2xl,
        .app-theme-studio .rounded-3xl,
        .app-theme-studio .investment-table,
        .app-theme-studio .stock-holdings-table,
        .app-theme-studio .table-smooth,
        .app-theme-studio .desktop-market-card,
        .app-theme-studio .phone-card,
        .app-theme-studio .phone-row,
        .app-theme-studio .phone-summary-card,
        .app-theme-studio .phone-metric-card {
          border-color: rgba(0, 0, 0, .06) !important;
          border-radius: 22px !important;
          background: #FFFFFF !important;
          box-shadow: 0 5px 18px rgba(0, 0, 0, .055) !important;
          backdrop-filter: none !important;
        }
        .app-theme-studio .kpi-card,
        .app-theme-studio .desktop-market-card {
          transition: transform .22s ease, box-shadow .22s ease !important;
        }
        .app-theme-studio .kpi-card:hover,
        .app-theme-studio .desktop-market-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, .09) !important;
        }
        .app-theme-studio .card::before,
        .app-theme-studio .desktop-market-card::before {
          display: none !important;
        }
        .app-theme-studio .field-label,
        .app-theme-studio .stat-label,
        .app-theme-studio .phone-eyebrow {
          color: #6E6E73 !important;
          font-weight: 600 !important;
          letter-spacing: .04em !important;
        }
        .app-theme-studio .field-input,
        .app-theme-studio input,
        .app-theme-studio select,
        .app-theme-studio textarea {
          border: 1px solid rgba(0, 0, 0, .12) !important;
          border-radius: 12px !important;
          color: #1D1D1F !important;
          background: rgba(255, 255, 255, .94) !important;
          box-shadow: none !important;
        }
        .app-theme-studio .field-input:focus,
        .app-theme-studio input:focus,
        .app-theme-studio select:focus,
        .app-theme-studio textarea:focus {
          border-color: #0071E3 !important;
          box-shadow: 0 0 0 4px rgba(0, 113, 227, .14) !important;
        }
        .app-theme-studio .btn-primary,
        .app-theme-studio .bg-sage,
        .app-theme-studio .phone-add-btn {
          border: 0 !important;
          border-radius: 999px !important;
          color: #FFFFFF !important;
          background: #0071E3 !important;
          box-shadow: none !important;
          font-weight: 600 !important;
        }
        .app-theme-studio .btn-primary:hover,
        .app-theme-studio .phone-add-btn:hover {
          background: #0077ED !important;
          transform: none !important;
          filter: none !important;
        }
        .app-theme-studio .btn,
        .app-theme-studio .btn-danger {
          border: 1px solid rgba(0, 0, 0, .09) !important;
          border-radius: 999px !important;
          color: #0066CC !important;
          background: #FFFFFF !important;
          box-shadow: none !important;
          font-weight: 600 !important;
        }
        .app-theme-studio .btn:hover {
          border-color: rgba(0, 113, 227, .25) !important;
          background: #F7FBFF !important;
          transform: none !important;
        }
        .app-theme-studio .btn-danger {
          color: #D70015 !important;
          background: #FFF5F5 !important;
        }
        .app-theme-studio .pill,
        .app-theme-studio .badge,
        .app-theme-studio .chip,
        .app-theme-studio .tag {
          border-color: transparent !important;
          color: #0066CC !important;
          background: #EAF4FF !important;
          box-shadow: none !important;
        }
        .app-theme-studio .investment-table,
        .app-theme-studio .stock-holdings-table,
        .app-theme-studio .table-smooth {
          overflow: hidden;
        }
        .app-theme-studio .investment-table thead th,
        .app-theme-studio .stock-holdings-table thead th,
        .app-theme-studio .table-smooth thead th,
        .app-theme-studio .overflow-auto table thead th {
          color: #6E6E73 !important;
          background: #FBFBFD !important;
          border-bottom: 1px solid rgba(0, 0, 0, .08) !important;
          font-weight: 600 !important;
          letter-spacing: .02em !important;
        }
        .app-theme-studio .investment-table tbody tr,
        .app-theme-studio .stock-holdings-table tbody tr,
        .app-theme-studio .table-smooth tbody tr {
          background: #FFFFFF !important;
          box-shadow: none !important;
        }
        .app-theme-studio .investment-table tbody tr:hover,
        .app-theme-studio .stock-holdings-table tbody tr:hover,
        .app-theme-studio .table-smooth tbody tr:hover {
          background: #F5F5F7 !important;
          box-shadow: none !important;
        }
        .app-theme-studio .investment-table tbody td,
        .app-theme-studio .stock-holdings-table tbody td,
        .app-theme-studio .table-smooth tbody td {
          color: #424245 !important;
          border-bottom-color: rgba(0, 0, 0, .06) !important;
        }
        .app-theme-studio .text-emerald-700,
        .app-theme-studio .text-green-700,
        .app-theme-studio .text-green-600 {
          color: #248A3D !important;
        }
        .app-theme-studio .text-red-700,
        .app-theme-studio .text-red-600 {
          color: #D70015 !important;
        }
        .app-theme-studio .mobile-appbar,
        .app-theme-studio .mobile-menu-panel,
        .app-theme-studio .mobile-tabbar.mobile-top-nav {
          border-color: rgba(0, 0, 0, .07) !important;
          color: #1D1D1F !important;
          background: rgba(255, 255, 255, .88) !important;
          box-shadow: 0 5px 18px rgba(0, 0, 0, .06) !important;
          backdrop-filter: saturate(180%) blur(20px) !important;
        }
        .app-theme-studio .mobile-appbar::after {
          display: none !important;
        }
        .app-theme-studio .mobile-icon-btn {
          border-color: rgba(0, 0, 0, .08) !important;
          color: #0066CC !important;
          background: #F5F5F7 !important;
          box-shadow: none !important;
        }
        .app-theme-studio .mobile-tabbar button {
          color: #424245 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .app-theme-studio .mobile-tabbar button.active {
          color: #FFFFFF !important;
          background: #0071E3 !important;
          box-shadow: none !important;
        }
        .app-theme-studio ::selection {
          color: #1D1D1F;
          background: rgba(0, 113, 227, .18);
        }

        ::selection { background: rgba(121,15,70,.20); color: var(--lux-ink); }
        ::-webkit-scrollbar { width: 11px; height: 11px; }
        ::-webkit-scrollbar-track { background: rgba(255,248,235,.76); }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(121,15,70,.45), rgba(198,150,50,.55));
          border: 3px solid rgba(255,248,235,.9);
          border-radius: 999px;
        }
      `}</style>
      {sidebarCollapsed && (
        <button
          type="button"
          className="sidebar-reopen"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Show side panel"
          title="Show side panel"
        >
          <ChevronRight size={20} />
        </button>
      )}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand mb-6 flex items-start gap-3">
          <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-3xl bg-sage text-lg font-semibold text-white shadow-soft">
            <PieChart size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold leading-none">asset manager</h1>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {isAdmin ? "Admin portfolio" : "Your portfolio"}
            </p>
          </div>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="Hide side panel"
            title="Hide side panel"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        {workspaces.length > 0 && (
          <div className="mb-5">
            <label className="field-label">Active household</label>
            <select
              className="field-input"
              value={activeWorkspaceId}
              onChange={(event) => {
                setActiveWorkspaceId(event.target.value);
                setWorkspaceMembers([]);
                loadHousehold(event.target.value);
              }}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({workspace.access.member_role})
                </option>
              ))}
            </select>
          </div>
        )}
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
        <button
          type="button"
          className="btn mt-4 w-full justify-center"
          onClick={signOutSafely}
        >
          <LogOut size={16} className="inline" /> Sign out
        </button>
        <div
          className="sidebar-resizer"
          role="separator"
          tabIndex={0}
          aria-label="Resize side panel"
          aria-orientation="vertical"
          aria-valuemin={220}
          aria-valuemax={420}
          aria-valuenow={sidebarWidth}
          title="Drag to resize side panel"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setSidebarWidth((width) => Math.max(220, width - 10));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setSidebarWidth((width) => Math.min(420, width + 10));
            }
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            const startX = event.clientX;
            const startWidth = sidebarWidth;
            const onMove = (moveEvent: PointerEvent) => {
              setSidebarWidth(
                Math.min(420, Math.max(220, startWidth + moveEvent.clientX - startX)),
              );
            };
            const onUp = () => {
              document.body.classList.remove("resizing-sidebar");
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };
            document.body.classList.add("resizing-sidebar");
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
        />
      </aside>
      <main className="desktop-main min-w-0 max-w-full overflow-x-hidden p-6 max-lg:p-0">
        <div className="mobile-appbar">
          <div className="mobile-brand-copy">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#4f675b]">
              asset manager
            </div>
            <h2>{allViews.find((v) => v[0] === view)?.[2]}</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="mobile-icon-btn"
              onClick={refreshAllData}
              disabled={globalRefreshing}
              aria-label="Refresh all data"
              title="Refresh all data"
            >
              <RefreshCw size={18} className={globalRefreshing ? "animate-spin" : ""} />
            </button>
            {MODULES[view] && view !== "dashboard" && (
              <button
                className="btn-primary phone-add-btn"
                disabled={!canEditModule(view)}
                onClick={() => setEditing({ moduleKey: view })}
              >
                <Plus size={14} /> Add
              </button>
            )}
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
              <button className="btn" onClick={signOutSafely}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        )}
        <nav className="mobile-tabbar mobile-top-nav" aria-label="Mobile section navigation">
          {mobileNavMode === "investments" && (
            <button
              type="button"
              onClick={() => selectMobileTab("__back")}
              className="mobile-nav-back"
              aria-label="Back to summary navigation"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}
          {(mobileNavMode === "investments" ? mobileInvestmentTabsByValue : mobileMainTabs).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectMobileTab(id)}
              className={(id === "investments" ? mobileNavMode === "investments" : view === id) ? "active" : ""}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="phone-content min-w-0 max-w-full overflow-x-hidden">
          {phoneView()}
        </div>
        <div className="desktop-content">
          {view !== "stocks" && (
            <header className="desktop-header mb-5 flex items-start justify-between gap-4 max-md:flex-col">
              <div className="desktop-heading-copy">
                <h2 className="text-3xl font-semibold tracking-tight">
                  {allViews.find((v) => v[0] === view)?.[2]}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Track, compare and manage your complete portfolio.
                </p>
              </div>
            </header>
          )}
          {view === "dashboard" && dashboardModern()}
          {view === "allInvestments" && allInvestmentsView()}
          {view === "futureWealth" && futureNetWorthPanel()}
          {view === "purchaseCalculator" && bullionCalculatorPanel()}
          {view === "watchlist" && utilityWatchlistView()}
          {view === "household" && householdView()}
          {view === "settings" && settings()}
          {view === "admin" && adminConsole()}
          {MODULES[view] &&
            !["watchlist", "settings", "admin"].includes(view) &&
            moduleView(view)}
        </div>
        {detail && detailModal()}
        {editing && recordModal()}
        {corporateAction && corporateActionModal()}
        {accModal && accountModal()}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-sage px-5 py-3 text-sm font-bold text-white shadow-2xl">
            {toast}
          </div>
        )}

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
              ["Bullion Holding", "Today's Gain", "Current Value", "Signal"],
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
            { name: "NIFTY BANK" },
            { name: "Gold - 10 GM" },
            { name: "Silver - 1 KG" },
            { name: "Dollar / INR" },
            { name: "Crude $ / Barrel" },
          ],
      inr = (v: number, d = 2) =>
        `â‚¹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d })}`,
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
      marketTime =
        marketTodayUpdatedAt ||
        rows.find((x: any) => x?.time)?.time ||
        new Date().toISOString();
    return (
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e3dccc] bg-[#FFFFFF] px-5 py-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-lg font-semibold uppercase text-[#004080]">
              Market
            </h3>
            <span className="text-lg text-[#004080]">Today</span>
            <span className="text-xs font-semibold text-gray-500">
              {new Date(marketTime).toLocaleDateString()}{" "}
              {new Date(marketTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
  function bullionRatePanel() {
    const bullionRecords = records.filter((record) => record.module_key === "bullion"),
      gold = bullionMarket?.gold,
      silver = bullionMarket?.silver,
      goldBenchmark = num(gold?.ratePer10GramInr),
      silverBenchmark = num(silver?.ratePerKgInr),
      goldLocal = num(localBullionRate?.gold24kPer10GramInr),
      silverLocal = num(localBullionRate?.silverPerKgInr),
      city =
        String(localBullionRate?.city || "").trim() ||
        bullionRecords
          .map((record) => String(record.data?.city || "").trim())
          .find(Boolean) ||
        profile?.city ||
        "Current city",
      rateCard = (
        title: string,
        local: number,
        benchmark: number,
        difference: number,
        provider: string,
        unit: string,
        asOn: string,
        sourceUrl: string,
      ) => (
        <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#6d7c73]">
              {title}
            </div>
            <div className="text-[11px] text-gray-500">{unit}</div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold text-[#17382b]">
                {local ? fmt(local) : "MCX rate below"}
              </div>
              <div className="text-[11px] text-gray-500">
                Local · {city}
                {asOn ? ` · ${asOn}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-[#17382b]">
                {benchmark ? fmt(benchmark) : "-"}
              </div>
              <div className="text-[11px] text-gray-500">
                MCX / Moneycontrol
                {local && benchmark
                  ? ` · ${difference >= 0 ? "+" : ""}${fmt(difference)} vs local`
                  : ""}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eee3cf] pt-2 text-[11px] font-semibold text-[#7a1248]">
            <span>{provider || "Selected bullion source"}</span>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                Open 5paisa
              </a>
            )}
          </div>
        </div>
      );
    return (
      <section className="mb-4 rounded-[24px] border border-[#ded6c4] bg-[#fffaf0] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Gold & Silver Rates</h3>
            <p className="text-xs text-gray-600">
              Portfolio valuation, gains and snapshots use only MCX or
              Moneycontrol. Local rates are display references only.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] font-semibold text-gray-500">
              {bullionPriceStatus === "loading"
                ? "Updating…"
                : bullionMarket?.time
                  ? `Live · updated ${bullionMarket.time}`
                  : "Live"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {rateCard(
            "Local Gold 24K",
            goldLocal,
            goldBenchmark,
            goldLocal && goldBenchmark ? goldLocal - goldBenchmark : 0,
            String(gold?.provider || ""),
            "10 grams",
            String(localBullionRate?.goldAsOn || ""),
            String(localBullionRate?.goldUrl || ""),
          )}
          {rateCard(
            "Local Silver",
            silverLocal,
            silverBenchmark,
            silverLocal && silverBenchmark ? silverLocal - silverBenchmark : 0,
            String(silver?.provider || ""),
            "1 kilogram",
            String(localBullionRate?.silverAsOn || ""),
            String(localBullionRate?.silverUrl || ""),
          )}
        </div>
      </section>
    );
  }
  function bullionCalculatorPanel() {
    const benchmarkQuote =
        calculatorMetal === "gold"
          ? bullionMarket?.gold
          : bullionMarket?.silver,
      localRateTotal =
        calculatorMetal === "gold"
          ? num(localBullionRate?.gold24kPer10GramInr)
          : num(localBullionRate?.silverPerKgInr),
      fetchedRatePerGram =
        calculatorMetal === "gold"
          ? localRateTotal / 10
          : localRateTotal / 1000,
      manualRate = calculatorRateOverrides[calculatorMetal],
      hasManualRate = manualRate.trim() !== "",
      ratePerGram = hasManualRate ? num(manualRate) : fetchedRatePerGram,
      benchmarkRatePerGram = num(benchmarkQuote?.ratePerGramInr),
      weight = Math.max(
        calculatorMetal === "gold" ? 5 : 100,
        num(calculatorWeight),
      ),
      basePrice = ratePerGram * weight,
      wastageAmount = basePrice * (num(calculatorWastage) / 100),
      priceAfterWastage = basePrice + wastageAmount,
      gstAmount = priceAfterWastage * (num(calculatorGst) / 100),
      totalPrice = priceAfterWastage + gstAmount,
      summary = {
        metal: calculatorMetal === "gold" ? "Gold" : "Silver",
        rate_per_gram: ratePerGram,
        weight_grams: weight,
        wastage_percent: num(calculatorWastage),
        gst_percent: num(calculatorGst),
        base_price: basePrice,
        wastage_amount: wastageAmount,
        price_after_wastage: priceAfterWastage,
        gst_amount: gstAmount,
        total_price: totalPrice,
        purchase_date: calculatorPurchaseDate,
        vendor: calculatorVendor,
        invoice_no: calculatorInvoice,
        rate_provider: hasManualRate
          ? "Manual local rate"
          : String(
              localBullionRate?.provider || "5paisa city bullion rates",
            ),
        rate_source_url: hasManualRate
          ? ""
          : String(
              calculatorMetal === "gold"
                ? localBullionRate?.goldUrl || ""
                : localBullionRate?.silverUrl || "",
            ),
        benchmark_rate_per_gram: benchmarkRatePerGram,
        benchmark_provider: String(
          benchmarkQuote?.provider || "MCX / Moneycontrol",
        ),
        pricing_city: String(
          localBullionRate?.city || profile?.city || "",
        ),
        calculated_at: new Date().toISOString(),
      };
    const addPurchaseRecord = async () => {
      if (!ratePerGram)
        return setToast("Refresh MCX / Moneycontrol rates before calculating");
      if (!user || !canEditModule("bullion"))
        return setToast("Bullion edit access is required");
      const data = withSystemDates({
        account_name: "",
        security_name: summary.metal,
        quantity: weight,
        unit: "gms",
        city: profile?.city || "",
        metal_cost: Number(basePrice.toFixed(2)),
        making_charges: Number(wastageAmount.toFixed(2)),
        gst_paid: Number(gstAmount.toFixed(2)),
        other_costs: 0,
        purchase_price: Number(totalPrice.toFixed(2)),
        latest_value: Number((weight * benchmarkRatePerGram).toFixed(2)),
        purchase_date: calculatorPurchaseDate,
        broker: calculatorVendor,
        purchase_local_rate_per_gram: Number(ratePerGram.toFixed(2)),
        benchmark_rate_per_gram: Number(benchmarkRatePerGram.toFixed(2)),
        live_rate_per_gram: Number(benchmarkRatePerGram.toFixed(2)),
        rate_provider: summary.benchmark_provider,
        rate_source_url: String(benchmarkQuote?.sourceUrl || ""),
        purchase_rate_provider: summary.rate_provider,
        purchase_rate_source_url: summary.rate_source_url,
        notes: [
          `Wastage ${summary.wastage_percent}%`,
          `GST ${summary.gst_percent}%`,
          calculatorInvoice ? `Invoice ${calculatorInvoice}` : "",
          "Created with Gold/Silver Calculator",
        ]
          .filter(Boolean)
          .join(" | "),
      });
      const result = await supabase
        .from("records")
        .insert({
          user_id: user.id,
          ...(activeWorkspaceId ? { workspace_id: activeWorkspaceId } : {}),
          module_key: "bullion",
          data,
        })
        .select("id")
        .single();
      if (result.error) return setToast(result.error.message);
      setCalculatorRecords((current) => [
        ...current,
        { ...summary, record_id: (result.data as any)?.id },
      ]);
      setToast("Bullion purchase record saved");
      await loadAll(true);
    };
    const chooseInvoiceFolder = async () => {
      const picker = (window as any).showDirectoryPicker;
      if (!picker)
        return setToast(
          "Folder saving is not supported by this browser. Use Export Records JSON.",
        );
      try {
        const handle = await picker({ mode: "readwrite" });
        setInvoiceFolderHandle(handle);
        setToast(`Invoice folder selected: ${handle.name}`);
      } catch (error: any) {
        if (error?.name !== "AbortError")
          setToast(error?.message || "Could not select invoice folder");
      }
    };
    const saveInvoice = async () => {
      if (!ratePerGram) return setToast("Rate unavailable");
      if (!invoiceFolderHandle)
        return setToast("Choose an invoice folder first");
      try {
        const safeName = String(
          calculatorInvoice ||
            `${summary.metal}-${calculatorPurchaseDate}-${Date.now()}`,
        )
          .replace(/[^a-z0-9._-]+/gi, "-")
          .replace(/^-+|-+$/g, "");
        const fileHandle = await invoiceFolderHandle.getFileHandle(
          `${safeName}.json`,
          { create: true },
        );
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(summary, null, 2));
        await writable.close();
        setToast(`Invoice saved to ${invoiceFolderHandle.name}`);
      } catch (error: any) {
        setToast(error?.message || "Could not save invoice");
      }
    };
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <h3 className="text-xl font-semibold">Purchase Cost Calculator</h3>
          <p className="mt-1 text-sm text-gray-600">
            Calculate purchase cost using the local 5paisa city rate, then add
            wastage and GST. Portfolio valuation continues to use MCX or
            Moneycontrol.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
            <div>
              <label className="field-label">Metal</label>
              <select
                className="field-input"
                value={calculatorMetal}
                onChange={(event) => {
                  const metal = event.target.value as "gold" | "silver";
                  setCalculatorMetal(metal);
                  setCalculatorWeight(metal === "gold" ? 10 : 1000);
                }}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="field-label">Local Rate per Gram (₹)</label>
                {hasManualRate && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#7a1248] underline"
                    onClick={() =>
                      setCalculatorRateOverrides((current) => ({
                        ...current,
                        [calculatorMetal]: "",
                      }))
                    }
                  >
                    Use fetched
                  </button>
                )}
              </div>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.01"
                value={
                  hasManualRate
                    ? manualRate
                    : fetchedRatePerGram
                      ? fetchedRatePerGram.toFixed(2)
                      : ""
                }
                onChange={(event) =>
                  setCalculatorRateOverrides((current) => ({
                    ...current,
                    [calculatorMetal]: event.target.value,
                  }))
                }
                placeholder="Refresh 5paisa city rate"
              />
              <div className="mt-1 text-xs font-semibold text-gray-500">
                {hasManualRate ? "Manual override | " : "Fetched | "}
                {localBullionRate?.city || profile?.city || "City not set"}
                {calculatorMetal === "gold" && localBullionRate?.goldAsOn
                  ? ` | ${localBullionRate.goldAsOn}`
                  : calculatorMetal === "silver" &&
                      localBullionRate?.silverAsOn
                    ? ` | ${localBullionRate.silverAsOn}`
                    : ""}
              </div>
            </div>
            <div>
              <label className="field-label">Weight (grams)</label>
              <input
                className="field-input"
                type="number"
                min={calculatorMetal === "gold" ? 5 : 100}
                max={calculatorMetal === "gold" ? 2000 : 100000}
                step={calculatorMetal === "gold" ? 1 : 100}
                value={calculatorWeight}
                onChange={(event) => setCalculatorWeight(num(event.target.value))}
              />
            </div>
            <div>
              <label className="field-label">Wastage %</label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.01"
                value={calculatorWastage}
                onChange={(event) => setCalculatorWastage(num(event.target.value))}
              />
            </div>
            <div>
              <label className="field-label">GST %</label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.01"
                value={calculatorGst}
                onChange={(event) => setCalculatorGst(num(event.target.value))}
              />
            </div>
            <div>
              <label className="field-label">Purchase Date</label>
              <input
                className="field-input"
                type="date"
                value={calculatorPurchaseDate}
                onChange={(event) => setCalculatorPurchaseDate(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Vendor / Jeweller</label>
              <input
                className="field-input"
                value={calculatorVendor}
                placeholder="Optional"
                onChange={(event) => setCalculatorVendor(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Invoice No.</label>
              <input
                className="field-input"
                value={calculatorInvoice}
                placeholder="Optional"
                onChange={(event) => setCalculatorInvoice(event.target.value)}
              />
            </div>
          </div>
          <button
            className="btn-primary mt-4 w-full"
            onClick={() =>
              ratePerGram
                ? setToast("Calculation updated with 5paisa local rate")
                : refreshBullionMarket()
            }
          >
            {ratePerGram ? "Calculate Total" : "Fetch Benchmark Rate"}
          </button>
          <div className="mt-5 rounded-2xl border border-[#e3dccc] bg-[#fbfcfe] p-4">
            <h4 className="text-lg font-semibold">
              {summary.metal} Calculation Summary
            </h4>
            <div className="mt-3 divide-y divide-dashed divide-[#e3dccc] text-sm">
              {[
                ["Base Price", basePrice],
                ["Wastage Amount", wastageAmount],
                ["Price After Wastage", priceAfterWastage],
                ["GST Amount", gstAmount],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-3 py-2" key={String(label)}>
                  <span>{label}</span>
                  <b>{fmt(value)}</b>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-3 text-lg font-semibold">
                <span>Total Price</span>
                <b>{fmt(totalPrice)}</b>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={addPurchaseRecord}>
              Add to Purchase Record
            </button>
            <button className="btn" onClick={chooseInvoiceFolder}>
              Choose Invoice Folder
            </button>
            <button className="btn" onClick={saveInvoice}>
              Save Current Invoice
            </button>
            <button
              className="btn"
              onClick={() =>
                download(
                  `bullion-calculator-records-${isoDate()}.json`,
                  JSON.stringify(
                    {
                      exported_at: new Date().toISOString(),
                      current_calculation: summary,
                      records: calculatorRecords,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Export Records JSON
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-600">
            Gold weight: 5g to 2000g. Silver starts at 100g with 100g steps.
            Purchase cost uses the 5paisa local rate. Current value, gains and
            portfolio snapshots use MCX/Moneycontrol only.
          </p>
      </section>
    );
  }
  function computeLiveRecord(k: string, d: any) {
    const c = computeRecord(k, d);
    if (k === "stocks") {
      const livePrice = num(c.live_price || d.live_price),
        dayChange = num(c.day_change || d.day_change),
        qty = num(c.adjusted_quantity || c.quantity || d.quantity),
        invested = num(c.invested),
        latest = livePrice && qty ? qty * livePrice : num(c.latest);
      if (livePrice && qty) {
        const monthStartPrice = num(d.month_start_price || d.month_open_price),
          monthlyGain = monthStartPrice && qty ? (livePrice - monthStartPrice) * qty : 0;
        Object.assign(c, {
          latest_value: latest,
          latest,
          today_gain: qty * dayChange,
          gain: latest - invested,
          gain_pct: invested ? ((latest - invested) / invested) * 100 : 0,
          monthly_gain: monthlyGain,
        });
      }
    }
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
      Object.assign(c, {
        day_low: num(q?.dayLow) || num(d.day_low),
        day_high: num(q?.dayHigh) || num(d.day_high),
        fifty_two_week_low: num(q?.fiftyTwoWeekLow) || num(d.fifty_two_week_low),
        fifty_two_week_high: num(q?.fiftyTwoWeekHigh) || num(d.fifty_two_week_high),
        contract_expiry: q?.contractExpiry || q?.expiry || d.contract_expiry,
      });
      if (rate && num(d.quantity)) {
        const grams = num(d.quantity) * metalUnitFactor(d.unit),
          latest = grams * rate,
          invested = num(c.invested),
          monthStartRate = num(d.month_start_rate || d.month_open_rate),
          monthlyGain = monthStartRate && grams ? (rate - monthStartRate) * grams : 0;
        Object.assign(c, {
          latest,
          latest_value: latest,
          live_rate_per_gram: rate,
          today_gain: grams * changePerGram,
          gain: latest - invested,
          gain_pct: invested ? ((latest - invested) / invested) * 100 : 0,
          monthly_gain: monthlyGain,
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
    if (k === "stocks") return computeLiveTotals(rs);
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3dccc] bg-[#FFFFFF] px-5 py-4">
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
                  Today's Gain
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
  function recurringMonthlyInvestment() {
    return records
      .filter((r) => MODULES[r.module_key]?.kind === "asset" && r.module_key !== "fixedIncome")
      .reduce((sum, r) => {
        const d = r.data || {};
        const direct = Math.max(
          num(d.monthly_contribution),
          num(d.sip_amount),
          num(d.monthly_investment),
          num(d.monthly_premium),
        );
        const payroll = num(d.employee_contribution) + num(d.company_contribution);
        return sum + (direct || payroll || num(d.yearly_investment) / 12);
      }, 0);
  }
  function futureNetWorthPanel() {
    const inferredMonthly = recurringMonthlyInvestment();
    const monthly = Math.max(0, projectionMonthlyInput === "" ? inferredMonthly : num(projectionMonthlyInput));
    const yearlyLump = Math.max(0, num(projectionYearlyInput));
    const otherIncomeMonthly = Math.max(0, num(projectionOtherIncomeInput));
    const annualRate = Math.max(-20, Math.min(30, projectionReturnInput === "" ? projectionHistoryRates.shares : num(projectionReturnInput)));
    const currentAge = projectionCurrentAge === "" ? null : num(projectionCurrentAge);
    const retireAge = projectionRetireAge === "" ? null : num(projectionRetireAge);
    const retireYears =
      currentAge !== null && retireAge !== null
        ? Math.max(0, Math.min(projectionYears, retireAge - currentAge))
        : projectionYears;
    // Each contribution stream can have its own "invest until age"; falls back to the
    // shared stop-working age, and to the full horizon if neither is set.
    const untilYearsFor = (untilAgeInput: string) => {
      const untilAge = untilAgeInput === "" ? null : num(untilAgeInput);
      if (currentAge !== null && untilAge !== null)
        return Math.max(0, Math.min(projectionYears, untilAge - currentAge));
      if (currentAge !== null && retireAge !== null) return retireYears;
      return projectionYears;
    };
    const monthlyUntilYears = untilYearsFor(projectionMonthlyUntilAge);
    const yearlyUntilYears = untilYearsFor(projectionYearlyUntilAge);
    const otherIncomeUntilYears = untilYearsFor(projectionOtherIncomeUntilAge);
    const base = totals.net;
    const moduleValue = (keys: string[]) => records
      .filter((r) => keys.includes(r.module_key))
      .reduce((sum, r) => sum + num(computeLiveRecord(r.module_key, r.data).latest), 0);
    const sharesBase = moduleValue(["stocks", "mutualFunds", "ulips"]);
    const goldBase = moduleValue(["bullion"]);
    const fixedRecords = records.filter((r) => r.module_key === "fixedIncome").map((r) => computeLiveRecord("fixedIncome", r.data));
    const fixedBase = fixedRecords.reduce((sum, r) => sum + num(r.latest), 0);
    const otherBase = base - sharesBase - goldBase - fixedBase;
    const project = (starting: number, years: number, contribution: number, annualPct: number) => {
      const months = years * 12;
      const rate = annualPct / 100 / 12;
      if (!rate) return starting + contribution * months;
      return starting * Math.pow(1 + rate, months) + contribution * ((Math.pow(1 + rate, months) - 1) / rate);
    };
    // Month-by-month projection: each stream stops contributing once it passes its own
    // "invest until" cutoff, so different streams can run for different lengths of time.
    const projectStreams = (
      starting: number,
      years: number,
      annualPct: number,
      monthlyStreams: { monthly: number; untilYears: number }[],
      yearlyStream: { amount: number; untilYears: number } = { amount: 0, untilYears: 0 },
    ) => {
      const rate = annualPct / 100 / 12;
      let value = starting;
      for (let m = 1; m <= years * 12; m++) {
        value *= 1 + rate;
        for (const s of monthlyStreams) if (s.monthly && m <= s.untilYears * 12) value += s.monthly;
        if (yearlyStream.amount && m <= yearlyStream.untilYears * 12 && m % 12 === 0) value += yearlyStream.amount;
      }
      return value;
    };
    const fixedProjection = (years: number, includeContributions: boolean) => fixedRecords.reduce((sum, r) => {
      const monthlyDeposit = includeContributions
        ? num(r.employee_contribution) + num(r.company_contribution) + num(r.yearly_investment) / 12
        : 0;
      // Respect the same "invest until" cutoff as the other contribution
      // streams -- an EPF/PF record's employer/employee contributions stop
      // once you stop working, same as everything else on this chart.
      return sum + projectStreams(num(r.latest), years, num(r.interest_rate), [
        { monthly: monthlyDeposit, untilYears: monthlyUntilYears },
      ]);
    }, 0);
    const comboValue = (
      years: number,
      monthlyOn: boolean,
      yearlyOn: boolean,
      incomeOn: boolean,
    ) =>
      project(sharesBase, years, 0, projectionHistoryRates.shares) +
      project(goldBase, years, 0, projectionHistoryRates.gold) +
      fixedProjection(years, monthlyOn) +
      projectStreams(
        otherBase,
        years,
        annualRate,
        [
          { monthly: monthlyOn ? monthly : 0, untilYears: monthlyUntilYears },
          { monthly: incomeOn ? otherIncomeMonthly : 0, untilYears: otherIncomeUntilYears },
        ],
        { amount: yearlyOn ? yearlyLump : 0, untilYears: yearlyUntilYears },
      );
    const scenarioAt = (year: number, scenario: "continue" | "trend" | "withoutIncome") =>
      scenario === "trend"
        ? comboValue(year, false, false, false)
        : comboValue(year, true, true, scenario === "continue");
    const points = Array.from({ length: projectionYears + 1 }, (_, year) => ({
      year,
      continueValue: scenarioAt(year, "continue"),
      trendValue: scenarioAt(year, "trend"),
      withoutIncomeValue: scenarioAt(year, "withoutIncome"),
    }));
    const combinations = [
      { label: "Monthly + yearly + other income", monthlyOn: true, yearlyOn: true, incomeOn: true },
      { label: "Monthly + yearly only", monthlyOn: true, yearlyOn: true, incomeOn: false },
      { label: "Monthly + other income only", monthlyOn: true, yearlyOn: false, incomeOn: true },
      { label: "Yearly + other income only", monthlyOn: false, yearlyOn: true, incomeOn: true },
      { label: "Monthly investment only", monthlyOn: true, yearlyOn: false, incomeOn: false },
      { label: "Yearly investment only", monthlyOn: false, yearlyOn: true, incomeOn: false },
      { label: "Other income only", monthlyOn: false, yearlyOn: false, incomeOn: true },
      { label: "None (current trend)", monthlyOn: false, yearlyOn: false, incomeOn: false },
    ]
      .map((c) => ({ ...c, value: comboValue(projectionYears, c.monthlyOn, c.yearlyOn, c.incomeOn) }))
      .sort((a, b) => b.value - a.value);
    const future = points[points.length - 1];
    const generateWealthForecast = async () => {
      if (!session?.access_token) return setWealthForecastError("Sign in before generating a forecast.");
      setWealthForecastBusy(true);
      setWealthForecastError("");
      try {
        const res = await fetch("/api/wealth-forecast", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: {
                horizonYears: projectionYears,
                currentNetWorth: base,
                monthlyInvestment: monthly,
                monthlyInvestmentUntilYears: monthlyUntilYears,
                yearlyLumpSum: yearlyLump,
                otherMonthlyIncome: otherIncomeMonthly,
                assumedAnnualReturnPct: annualRate,
                sharesHistoricalReturnPct: projectionHistoryRates.shares,
                goldHistoricalReturnPct: projectionHistoryRates.gold,
                projectedValueContinuing: future.continueValue,
                projectedValueTrendOnly: future.trendValue,
                assetMix: [
                  { assetClass: "Shares/MF/ULIP", value: sharesBase },
                  { assetClass: "Gold/Silver", value: goldBase },
                  { assetClass: "Fixed income", value: fixedBase },
                  { assetClass: "Other", value: otherBase },
                ],
              },
            }),
          }),
          json = await res.json();
        if (!res.ok) throw new Error(json.error || "Forecast could not be generated.");
        setWealthForecast(json.forecast);
        setWealthForecastMeta({ model: String(json.model || "AI"), generatedAt: json.generatedAt });
      } catch (e: any) {
        setWealthForecastError(e?.message || "Forecast could not be generated.");
      } finally {
        setWealthForecastBusy(false);
      }
    };
    const fixedMonthly = fixedRecords.reduce((sum, r) => sum + num(r.employee_contribution) + num(r.company_contribution) + num(r.yearly_investment) / 12, 0);
    const investedMore = monthly * monthlyUntilYears * 12 + fixedMonthly * retireYears * 12 + yearlyLump * yearlyUntilYears;
    const incomeContribution = future.continueValue - future.withoutIncomeValue;
    const wealthCreated = future.continueValue - base - investedMore - otherIncomeMonthly * otherIncomeUntilYears * 12;
    const values = points.flatMap((p) => [p.continueValue, p.trendValue, p.withoutIncomeValue]);
    const minValue = Math.min(0, ...values), maxValue = Math.max(1, ...values), range = Math.max(1, maxValue - minValue);
    const chartPoint = (value: number, index: number) => `${(index / Math.max(1, points.length - 1)) * 100},${92 - ((value - minValue) / range) * 84}`;
    const continuePath = points.map((p, i) => chartPoint(p.continueValue, i)).join(" ");
    const trendPath = points.map((p, i) => chartPoint(p.trendValue, i)).join(" ");
    const withoutIncomePath = points.map((p, i) => chartPoint(p.withoutIncomeValue, i)).join(" ");
    const retireX = (retireYears / Math.max(1, projectionYears)) * 100;
    return (
      <section className="overflow-hidden rounded-[26px] border border-[#cddfd4] bg-[linear-gradient(135deg,#f4fbf7_0%,#ffffff_50%,#f7f2ff_100%)] shadow-[0_18px_46px_rgba(23,56,43,0.09)]">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.65fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#17382b] px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white"><Sparkles size={13} /> Future wealth outlook</div>
                <h3 className="text-2xl font-semibold tracking-tight text-[#17382b]">What could my net worth become?</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">Plan around when you stop working, extra income, and how much you invest each year.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-right shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">In {projectionYears} years</div>
                <div className="text-2xl font-semibold tabular-nums text-emerald-700">{fmt(future.continueValue)}</div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/80 bg-white/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center gap-2 text-emerald-700"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Continue investing + other income</span>
                  <span className="flex items-center gap-2 text-blue-600"><i className="h-2.5 w-2.5 rounded-full bg-blue-500" />Without other income</span>
                  <span className="flex items-center gap-2 text-violet-700"><i className="h-2.5 w-2.5 rounded-full bg-violet-500" />Current trend only</span>
                </div>
                <span className="text-gray-500">Today {fmt(base)}</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-52 w-full overflow-visible" role="img" aria-label="Projected net worth chart">
                {[8, 29, 50, 71, 92].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#dfe7e2" strokeWidth=".4" />)}
                {retireYears > 0 && retireYears < projectionYears && (
                  <line x1={retireX} x2={retireX} y1="0" y2="100" stroke="#f59e0b" strokeWidth=".6" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                )}
                <polyline points={trendPath} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="5 4" />
                <polyline points={withoutIncomePath} fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" />
                <polyline points={continuePath} fill="none" stroke="#16a34a" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                <span>Today</span>
                {retireYears > 0 && retireYears < projectionYears && <span className="text-amber-600">Stop working ({retireYears}y)</span>}
                <span>{projectionYears} years</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#ded6c4] bg-white/90 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Adjust assumptions</div>
              <label className="mt-4 block text-xs font-semibold text-[#40584c]">Time horizon: {projectionYears} years</label>
              <input className="mt-2 w-full accent-emerald-700" type="range" min="1" max="30" value={projectionYears} onChange={(e) => setProjectionYears(Number(e.target.value))} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#40584c]">Your current age</label>
                  <input className="input mt-2 w-full" inputMode="numeric" value={projectionCurrentAge} placeholder="35" onChange={(e) => setProjectionCurrentAge(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#40584c]">Stop working at age</label>
                  <input className="input mt-2 w-full" inputMode="numeric" value={projectionRetireAge} placeholder="60" onChange={(e) => setProjectionRetireAge(e.target.value)} />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {currentAge !== null && retireAge !== null
                  ? `Investing pauses in ${Math.max(0, retireAge - currentAge)} years; other income keeps coming in.`
                  : "Enter both ages to set when investing pauses; other income keeps coming in either way."}
              </p>
              <label className="mt-4 block text-xs font-semibold text-[#40584c]">Monthly investment (SIPs, contributions)</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="input w-full" inputMode="decimal" value={projectionMonthlyInput} placeholder={String(Math.round(inferredMonthly))} onChange={(e) => setProjectionMonthlyInput(e.target.value)} />
                <input className="input w-full" inputMode="numeric" value={projectionMonthlyUntilAge} placeholder={retireAge !== null ? `Until ${retireAge}` : "Until age"} onChange={(e) => setProjectionMonthlyUntilAge(e.target.value)} />
              </div>
              <label className="mt-4 block text-xs font-semibold text-[#40584c]">Extra yearly investment (bonus, lump sum)</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="input w-full" inputMode="decimal" value={projectionYearlyInput} placeholder="0" onChange={(e) => setProjectionYearlyInput(e.target.value)} />
                <input className="input w-full" inputMode="numeric" value={projectionYearlyUntilAge} placeholder={retireAge !== null ? `Until ${retireAge}` : "Until age"} onChange={(e) => setProjectionYearlyUntilAge(e.target.value)} />
              </div>
              <label className="mt-4 block text-xs font-semibold text-[#40584c]">Rental / other monthly income</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="input w-full" inputMode="decimal" value={projectionOtherIncomeInput} placeholder="0" onChange={(e) => setProjectionOtherIncomeInput(e.target.value)} />
                <input className="input w-full" inputMode="numeric" value={projectionOtherIncomeUntilAge} placeholder={retireAge !== null ? `Until ${retireAge}` : "Until age"} onChange={(e) => setProjectionOtherIncomeUntilAge(e.target.value)} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Each amount has its own "invest until age" — leave blank to use your stop-working age above, or set one further out (e.g. rental income continuing past retirement).</p>
              <label className="mt-4 block text-xs font-semibold text-[#40584c]">Other/new investment return</label>
              <div className="relative mt-2"><input className="input w-full pr-9" inputMode="decimal" value={projectionReturnInput} placeholder={annualRate.toFixed(1)} onChange={(e) => setProjectionReturnInput(e.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">%</span></div>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">Shares use 10-year NIFTY history, gold uses 10-year Gold BeES history, and every fixed-income record uses its own interest and deposits.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Current trend", future.trendValue, "text-violet-700"],
                ["Without other income", future.withoutIncomeValue, "text-blue-700"],
                ["Extra invested", investedMore, "text-[#17382b]"],
                ["From other income", incomeContribution, "text-blue-700"],
                ["Growth earned", wealthCreated, wealthCreated >= 0 ? "text-emerald-700" : "text-red-700"],
                ["Shares · 10Y", `${projectionHistoryRates.shares.toFixed(1)}%`, "text-[#17382b]"],
                ["Gold · 10Y", `${projectionHistoryRates.gold.toFixed(1)}%`, "text-amber-700"],
                ["Fixed income", "Own rates", "text-blue-700"],
              ].map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-white bg-white/75 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div><div className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{typeof value === "number" ? fmt(value) : value}</div></div>)}
            </div>
          </div>
        </div>
        <div className="border-t border-[#dce8df] bg-white/40 px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Every combination, in {projectionYears} years
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            All 8 ways to switch monthly investing, yearly investing and other income on or off — ranked highest to lowest.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {combinations.map((c, i) => (
              <div key={c.label} className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white/80 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-[10px] font-semibold text-gray-400">#{i + 1}</span>
                  <span className="truncate text-xs font-semibold text-[#17382b]">{c.label}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[#dce8df] bg-white/40 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">AI realism check</div>
              <p className="mt-1 text-[11px] text-gray-500">
                Ask a local AI model to sanity-check these assumptions against typical long-run market trends. Requires Ollama running on this machine — won't work on the deployed production site.
              </p>
            </div>
            <button type="button" className="btn shrink-0" disabled={wealthForecastBusy} onClick={generateWealthForecast}>
              {wealthForecastBusy ? "Thinking…" : wealthForecast ? "Regenerate forecast" : "Generate AI forecast"}
            </button>
          </div>
          {wealthForecastError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{wealthForecastError}</p>
          )}
          {wealthForecast && (
            <div className="mt-4 space-y-3 rounded-2xl border border-white bg-white/80 p-4">
              <div>
                <div className="text-sm font-semibold text-[#17382b]">{wealthForecast.headline}</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{wealthForecast.outlook}</p>
              </div>
              <div className="rounded-xl bg-[#f5efe3] px-3 py-2 text-xs text-[#40584c]">
                <span className="font-semibold">Realism check: </span>{wealthForecast.realism_check}
              </div>
              {[
                ["Market trend context", wealthForecast.trend_context, "text-[#17382b]"],
                ["Risks to consider", wealthForecast.risks, "text-red-700"],
                ["Suggestions", wealthForecast.suggestions, "text-emerald-700"],
              ].map(([label, items, color]: any) =>
                Array.isArray(items) && items.length ? (
                  <div key={label}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {items.map((item: string, i: number) => (
                        <li key={i} className={`text-xs ${color}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
              <p className="text-[10px] italic text-gray-400">{wealthForecast.disclaimer}</p>
              {wealthForecastMeta && (
                <p className="text-[10px] text-gray-400">{wealthForecastMeta.model} · {new Date(wealthForecastMeta.generatedAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-[#dce8df] bg-white/55 px-6 py-3 text-[11px] text-gray-500">Illustration only. Historical returns do not guarantee future results. Fixed-income interest and monthly/yearly deposits are compounded monthly; taxes, inflation and future liability changes are not included.</div>
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
              rs.map(recordFreshDate).filter(Boolean).sort().slice(-1)[0] || "",
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
      last = snaps[snaps.length - 1],
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
  function portfolioPerformancePanel() {
    const investmentTypes = Object.entries(MODULES)
        .filter(
          ([moduleKey, module]) =>
            module.kind === "asset" &&
            records.some((record) => record.module_key === moduleKey),
        )
        .map(([moduleKey, module]) => ({
          key: moduleKey,
          title: module.title,
        })),
      selectedInvestmentTitle =
        performanceModule === "all"
          ? "All Investments"
          : MODULES[performanceModule]?.title || "Selected Investment",
      accountMap = new Map<
        string,
        { account: string; invested: number; current: number }
      >(),
      assetRecords = records.filter(
        (record) =>
          MODULES[record.module_key]?.kind === "asset" &&
          (performanceModule === "all" ||
            record.module_key === performanceModule),
      );
    assetRecords.forEach((record) => {
      const c = computeLiveRecord(record.module_key, record.data),
        account = String(record.data?.account_name || "Unassigned"),
        row = accountMap.get(account) || { account, invested: 0, current: 0 };
      row.invested += num(c.invested);
      row.current += num(c.latest);
      accountMap.set(account, row);
    });
    const accountRows = [...accountMap.values()].sort((a, b) =>
        a.account.localeCompare(b.account),
      ),
      today = istCalendar().iso,
      currentPoint = {
        date: today,
        invested: accountRows.reduce((sum, item) => sum + item.invested, 0),
        current: accountRows.reduce((sum, item) => sum + item.current, 0),
        type: "live",
      },
      rangeFrom =
        performanceView === "ytd"
          ? `${performanceTo.slice(0, 4)}-01-01`
          : performanceFrom,
      savedPoints = records
        .filter(
          (record) =>
            record.module_key === INVESTMENT_PERIOD_SNAPSHOT_MODULE &&
            ["weekly", "monthly"].includes(record.data?.snapshot_type) &&
            (performanceModule === "all" ||
              record.data?.module_totals?.some(
                (item: any) => item.module_key === performanceModule,
              )),
        )
        .map((record) => {
          const moduleTotal =
            performanceModule === "all"
              ? null
              : record.data?.module_totals?.find(
                  (item: any) => item.module_key === performanceModule,
                );
          return {
            date: String(record.data?.snapshot_date || "").slice(0, 10),
            periodKey: String(record.data?.period_key || ""),
            type: String(record.data?.snapshot_type || ""),
            invested: num(moduleTotal?.invested ?? record.data?.invested),
            current: num(moduleTotal?.current ?? record.data?.current),
          };
        })
        .filter(
          (point) =>
            point.date &&
            point.date >= rangeFrom &&
            point.date <= performanceTo &&
            (performanceView === "weekly"
              ? point.type === "weekly"
              : point.type === "monthly"),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
      basePoints = historicalPerformance.length
        ? historicalPerformance.filter(
            (point) => point.date >= rangeFrom && point.date <= performanceTo,
          )
        : savedPoints,
      pointMap = new Map(
        basePoints.map((point) => [point.date, point]),
      );
    if (today >= rangeFrom && today <= performanceTo)
      pointMap.set(today, currentPoint);
    const points = [...pointMap.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      values = points.flatMap((point) => [point.invested, point.current]),
      minValue = Math.min(...values, 0),
      maxValue = Math.max(...values, 1),
      padding = Math.max(1, (maxValue - minValue) * 0.08),
      chartMin = Math.max(0, minValue - padding),
      chartMax = maxValue + padding,
      chartSpan = Math.max(1, chartMax - chartMin),
      width = 900,
      height = 280,
      plotLeft = 82,
      plotRight = 18,
      plotTop = 24,
      plotBottom = 24,
      plotWidth = width - plotLeft - plotRight,
      plotHeight = height - plotTop - plotBottom,
      x = (index: number) =>
        points.length <= 1
          ? plotLeft + plotWidth / 2
          : plotLeft + (index / (points.length - 1)) * plotWidth,
      y = (value: number) =>
        plotTop +
        plotHeight -
        ((value - chartMin) / chartSpan) * plotHeight,
      compactInr = (value: number) => {
        const absolute = Math.abs(value),
          sign = value < 0 ? "-" : "";
        if (absolute >= 10000000)
          return `${sign}₹${(absolute / 10000000).toFixed(2)}Cr`;
        if (absolute >= 100000)
          return `${sign}₹${(absolute / 100000).toFixed(2)}L`;
        if (absolute >= 1000)
          return `${sign}₹${(absolute / 1000).toFixed(1)}K`;
        return `${sign}₹${Math.round(absolute).toLocaleString("en-IN")}`;
      },
      pathFor = (key: "invested" | "current") =>
        points.length === 1
          ? `M ${plotLeft} ${y(points[0][key]).toFixed(1)} L ${plotLeft + plotWidth} ${y(points[0][key]).toFixed(1)}`
          : points
              .map(
                (point, index) =>
                  `${index ? "L" : "M"} ${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`,
              )
              .join(" "),
      allPeriodPoints = records
        .filter(
          (record) =>
            record.module_key === INVESTMENT_PERIOD_SNAPSHOT_MODULE &&
            (performanceModule === "all" ||
              record.data?.module_totals?.some(
                (item: any) => item.module_key === performanceModule,
              )),
        )
        .map((record) => {
          const moduleTotal =
            performanceModule === "all"
              ? null
              : record.data?.module_totals?.find(
                  (item: any) => item.module_key === performanceModule,
                );
          return {
            type: String(record.data?.snapshot_type || ""),
            date: String(record.data?.snapshot_date || ""),
            current: num(moduleTotal?.current ?? record.data?.current),
          };
        })
        .filter(
          (point) =>
            point.date >= rangeFrom && point.date <= performanceTo,
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
      weekly = allPeriodPoints.filter((point) => point.type === "weekly"),
      monthly = allPeriodPoints.filter((point) => point.type === "monthly"),
      latestWeek = weekly[weekly.length - 1],
      previousWeek = weekly[weekly.length - 2],
      latestMonth = monthly[monthly.length - 1],
      previousMonth = monthly[monthly.length - 2],
      weekMove =
        latestWeek && previousWeek
          ? latestWeek.current - previousWeek.current
          : null,
      monthMove =
        latestMonth && previousMonth
          ? latestMonth.current - previousMonth.current
          : null,
      weekPct =
        previousWeek?.current && weekMove !== null
          ? (weekMove / previousWeek.current) * 100
          : null,
      monthPct =
        previousMonth?.current && monthMove !== null
          ? (monthMove / previousMonth.current) * 100
          : null,
      overallGain = currentPoint.current - currentPoint.invested;
    const periodKpi = (
      title: string,
      move: number | null,
      movePct: number | null,
      note: string,
    ) =>
      kpi(
        title,
        move === null ? "-" : fmt(move),
        move === null
          ? "text-gray-500"
          : move >= 0
            ? "text-emerald-700"
            : "text-red-700",
        movePct === null ? `${note}; more history required` : `${pct(movePct)} | ${note}`,
      );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {selectedInvestmentTitle} Performance
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {performanceModule === "all"
                ? "Combined account portfolio."
                : `${selectedInvestmentTitle} across all accounts.`}{" "}
              Weekly closes save Friday-Sunday; monthly closes save on the final
              calendar day.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" type="button" onClick={createRestorePoint}>
              Create Restore Point
            </button>
            <label className="btn cursor-pointer">
              Reinstate
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(event) => {
                  void reinstateRestorePoint(event.currentTarget.files?.[0] || null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1.1fr_1fr_1fr_1.2fr_auto] gap-3 rounded-2xl border border-[#e3dccc] bg-[#fffaf0] p-3 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <div>
            <label className="field-label">Investment Type</label>
            <select
              className="field-input"
              value={performanceModule}
              onChange={(event) => {
                setPerformanceModule(event.target.value);
                setHistoricalPerformance([]);
              }}
            >
              <option value="all">All Investments</option>
              {investmentTypes.map((investmentType) => (
                <option key={investmentType.key} value={investmentType.key}>
                  {investmentType.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">From</label>
            <input
              type="date"
              className="field-input"
              value={performanceFrom}
              disabled={performanceView === "ytd"}
              onChange={(event) => {
                setPerformanceFrom(event.target.value);
                setHistoricalPerformance([]);
              }}
            />
          </div>
          <div>
            <label className="field-label">To</label>
            <input
              type="date"
              className="field-input"
              value={performanceTo}
              max={today}
              onChange={(event) => {
                setPerformanceTo(event.target.value);
                setHistoricalPerformance([]);
              }}
            />
          </div>
          <div>
            <label className="field-label">
              Do you need Weekly, Monthly or YTD view?
            </label>
            <select
              className="field-input"
              value={performanceView}
              onChange={(event) => {
                setPerformanceView(
                  event.target.value as "weekly" | "monthly" | "ytd",
                );
                setHistoricalPerformance([]);
              }}
            >
              <option value="weekly">Weekly view</option>
              <option value="monthly">Monthly view</option>
              <option value="ytd">Year-to-date view</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-primary w-full"
              disabled={historyBusy}
              onClick={backtrackInvestmentPrices}
            >
              {historyBusy ? "Backtracking..." : "Backtrack Available Prices"}
            </button>
          </div>
        </div>
        {historicalPerformance.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Historical estimate: stock and bullion market closes are backtracked.
            Manual assets and unavailable symbols retain their recorded value.
          </div>
        )}
        <div className="mt-4 min-w-0 rounded-2xl border border-[#e3dccc] bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-[#17382b]">
                <span className="mr-1 inline-block h-2 w-5 rounded bg-[#115c45]" />
                Current value
              </span>
              <span className="text-[#8b6a28]">
                <span className="mr-1 inline-block h-2 w-5 rounded bg-[#c69632]" />
                Cost basis
              </span>
              <span className="text-gray-500">
                {historicalPerformance.length
                  ? `${points.length} backtracked points`
                  : savedPoints.length
                  ? `${points.length} saved ${performanceView === "weekly" ? "weekly" : "month-end"} points`
                  : "Waiting for the first scheduled close"}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-64 w-full overflow-visible"
              role="img"
                aria-label={`${selectedInvestmentTitle} performance graph`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const gridY = plotTop + plotHeight * ratio,
                  gridValue = chartMax - chartSpan * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={plotLeft}
                      x2={plotLeft + plotWidth}
                      y1={gridY}
                      y2={gridY}
                      stroke="#e9e2d6"
                      strokeWidth="1"
                    />
                    <text
                      x={plotLeft - 8}
                      y={gridY + 4}
                      textAnchor="end"
                      fill="#6b7280"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {compactInr(gridValue)}
                    </text>
                  </g>
                );
              })}
              <path
                d={pathFor("invested")}
                fill="none"
                stroke="#c69632"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathFor("current")}
                fill="none"
                stroke="#115c45"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point, index) => {
                const pointX = x(index),
                  currentY = y(point.current),
                  investedY = y(point.invested),
                  labelEvery = Math.max(1, Math.ceil(points.length / 6)),
                  showPointLabel =
                    points.length <= 8 ||
                    index === 0 ||
                    index === points.length - 1 ||
                    index % labelEvery === 0,
                  currentLabelY =
                    currentY - 10 < plotTop ? currentY + 18 : currentY - 10,
                  investedLabelY =
                    investedY + 18 > plotTop + plotHeight
                      ? investedY - 10
                      : investedY + 18;
                return (
                  <g key={`${point.date}-${index}`}>
                    <circle cx={pointX} cy={currentY} r="5" fill="#115c45">
                      <title>
                        {point.date} {point.type} current value:{" "}
                        {fmt(point.current)}
                      </title>
                    </circle>
                    {showPointLabel && <text
                      x={pointX}
                      y={currentLabelY}
                      textAnchor="middle"
                      fill="#115c45"
                      fontSize="10"
                      fontWeight="700"
                      paintOrder="stroke"
                      stroke="white"
                      strokeWidth="3"
                    >
                      {compactInr(point.current)}
                    </text>}
                    <circle cx={pointX} cy={investedY} r="4" fill="#c69632">
                      <title>
                        {point.date} {point.type} cost basis:{" "}
                        {fmt(point.invested)}
                      </title>
                    </circle>
                    {showPointLabel && <text
                      x={pointX}
                      y={investedLabelY}
                      textAnchor="middle"
                      fill="#8b6a28"
                      fontSize="10"
                      fontWeight="700"
                      paintOrder="stroke"
                      stroke="white"
                      strokeWidth="3"
                    >
                      {compactInr(point.invested)}
                    </text>}
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-xs font-semibold text-gray-500">
              <span>{points[0]?.date || today}</span>
              <span>{points[points.length - 1]?.date || today}</span>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3 max-xl:grid-cols-3 max-md:grid-cols-1">
          {kpi(
            "Total Cost",
            fmt(currentPoint.invested),
            "text-[#17382b]",
            `${selectedInvestmentTitle} | All accounts`,
          )}
          {kpi(
            "Current Value",
            fmt(currentPoint.current),
            "text-emerald-700",
            `${selectedInvestmentTitle} | All accounts`,
          )}
          {periodKpi("Week on Week", weekMove, weekPct, "Last two saved weekly closes")}
          {periodKpi("Month on Month", monthMove, monthPct, "Last two saved month-end closes")}
          {kpi(
            "Overall Performance",
            fmt(overallGain),
            overallGain >= 0 ? "text-emerald-700" : "text-red-700",
            currentPoint.invested
              ? `${pct((overallGain / currentPoint.invested) * 100)} on cost`
              : "Current value - cost basis",
          )}
        </div>
        <div className="mt-4 overflow-auto rounded-2xl border border-[#e3dccc] bg-white">
          <table className="w-full min-w-[650px] border-collapse text-sm">
            <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
              <tr>
                <th className="p-3">Account</th>
                <th className="p-3 text-right">Cost Basis</th>
                <th className="p-3 text-right">Current Value</th>
                <th className="p-3 text-right">Performance</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map((row) => {
                const gain = row.current - row.invested;
                return (
                  <tr key={row.account} className="border-t border-[#eee6d9]">
                    <td className="p-3 font-semibold">{row.account}</td>
                    <td className="p-3 text-right">{fmt(row.invested)}</td>
                    <td className="p-3 text-right font-semibold">
                      {fmt(row.current)}
                    </td>
                    <td
                      className={`p-3 text-right font-semibold ${gain >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {fmt(gain)}
                      {row.invested ? ` (${pct((gain / row.invested) * 100)})` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                  <th className="text-right">Today's Gain</th>
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
    const q = debouncedQuery.toLowerCase(),
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
            c = computeLiveRecord("stocks", r.data),
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
                  <th className="p-3 text-right">Today's Gain</th>
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
                        <div className="flex items-center gap-2">
                          <a
                            className="min-w-0 flex-1 truncate font-semibold text-[#004080]"
                            href={moneycontrolHref(computed)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {row.holding}
                          </a>
                          <button
                            type="button"
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-sm transition ${
                              row.c.corporate_action_applied ||
                              row.c.corporate_action_type ||
                              row.c.corporate_action_ratio ||
                              row.c.ex_base_price
                                ? "border-[#b8892b] bg-[#fff2c7] text-[#7a1248] ring-1 ring-[#e6c46a]/50"
                                : "border-[#e3dccc] bg-white text-[#6d7c73] hover:border-[#b8892b] hover:bg-[#fffaf0] hover:text-[#7a1248]"
                            }`}
                            title="Corporate action"
                            aria-label={`Corporate action for ${row.holding}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCorporateAction(row.r);
                            }}
                          >
                            <GitBranch size={14} strokeWidth={3} />
                          </button>
                        </div>
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
    const q = debouncedQuery.toLowerCase(),
      watchlistRecords = records.filter((r) => r.module_key === "watchlist"),
      stockCount = watchlistRecords.filter(
        (r) => String(r.data?.asset_type || "Stock").toUpperCase() !== "ETF",
      ).length,
      etfCount = watchlistRecords.filter(
        (r) => String(r.data?.asset_type || "Stock").toUpperCase() === "ETF",
      ).length,
      rows = records
        .filter(
          (r) =>
            r.module_key === "watchlist" &&
            (String(r.data?.asset_type || "Stock").toUpperCase() === "ETF"
              ? "ETF"
              : "Stock") === watchlistAssetTab,
        )
        .map((r) => {
          const d = r.data || {},
            match = findStock(d.security_name || d.ticker_symbol || ""),
            qty = num(d.quantity) || 1,
            live = num(d.current_price || d.live_price),
            dayLow = num(d.day_low),
            dayHigh = num(d.day_high),
            weekLow = num(d.fifty_two_week_low),
            weekHigh = num(d.fifty_two_week_high),
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
            dayLow,
            dayHigh,
            weekLow,
            weekHigh,
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
        .sort((a, b) => {
          const key = watchlistSort.key,
            left = key === "name" ? a.name.toLowerCase() : a[key],
            right = key === "name" ? b.name.toLowerCase() : b[key],
            comparison =
              typeof left === "string"
                ? left.localeCompare(String(right))
                : num(left) - num(right);
          return watchlistSort.direction === "asc" ? comparison : -comparison;
        });
    const total = rows.reduce(
      (a, x) => ({
        invested: a.invested + x.invested,
        latest: a.latest + x.latest,
        day: a.day + x.dayGain,
        overall: a.overall + x.overall,
      }),
      { invested: 0, latest: 0, day: 0, overall: 0 },
    );
    const sortableHeader = (
      key: typeof watchlistSort.key,
      label: React.ReactNode,
      align: "left" | "right" = "right",
    ) => {
      const active = watchlistSort.key === key;
      return (
        <th
          className={`p-3 ${align === "right" ? "text-right" : "text-left"}`}
          aria-sort={
            active
              ? watchlistSort.direction === "asc"
                ? "ascending"
                : "descending"
              : undefined
          }
        >
          <button
            type="button"
            className={`inline-flex w-full items-center gap-1.5 text-inherit ${
              align === "right" ? "justify-end text-right" : "justify-start text-left"
            }`}
            onClick={() =>
              setWatchlistSort((previous) => ({
                key,
                direction:
                  previous.key === key && previous.direction === "asc"
                    ? "desc"
                    : "asc",
              }))
            }
            title={`Sort by ${typeof label === "string" ? label : key}`}
          >
            <span>{label}</span>
            {active ? (
              watchlistSort.direction === "asc" ? (
                <ArrowUp size={13} aria-hidden="true" />
              ) : (
                <ArrowDown size={13} aria-hidden="true" />
              )
            ) : (
              <ArrowUpDown size={13} className="opacity-45" aria-hidden="true" />
            )}
          </button>
        </th>
      );
    };
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Stocks & ETFs Watchlist</h3>
            <p className="text-sm text-gray-600">
              Saved stock and ETF ideas with date added, added price, current price,
              movement and paper gain tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={() =>
                setEditing({
                  moduleKey: "watchlist",
                  defaults: {
                    exchange: "NSE",
                    quantity: 1,
                    asset_type: watchlistAssetTab,
                  },
                })
              }
            >
              <Plus size={16} className="inline" /> Add Watch Item
            </button>
          </div>
        </div>
        <div className="mb-4 inline-flex rounded-xl border border-[#9bb4d8] bg-[#f4f7fb] p-1">
          {([
            ["Stock", `Stocks (${stockCount})`],
            ["ETF", `ETFs (${etfCount})`],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                watchlistAssetTab === tab
                  ? "bg-[#00579b] text-white shadow-sm"
                  : "text-[#17382b] hover:bg-white"
              }`}
              onClick={() => setWatchlistAssetTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {kpi(
            "Today's Gain",
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
        </div>
        {rows.length ? (
          <div className="overflow-auto rounded-2xl border border-[#9bb4d8] bg-white">
            <table className="w-full min-w-[1380px] border-collapse text-sm">
              <thead className="bg-[#eaf0f7] text-left text-black">
                <tr>
                  {sortableHeader(
                    "name",
                    <>
                      Company
                      <br />
                      Sector
                    </>,
                    "left",
                  )}
                  {sortableHeader(
                    "live",
                    "Current Price",
                  )}
                  {sortableHeader(
                    "dayLow",
                    <>
                      Day Low
                      <br />
                      52W Low
                    </>,
                  )}
                  {sortableHeader(
                    "dayHigh",
                    <>
                      Day High
                      <br />
                      52W High
                    </>,
                  )}
                  {sortableHeader("change", "Change")}
                  {sortableHeader(
                    "base",
                    <>
                      Added Price
                      <br />
                      Date Added
                    </>,
                  )}
                  {sortableHeader(
                    "dayGain",
                    <>
                      Today's Gain
                      <br />% Change
                    </>,
                  )}
                  {sortableHeader(
                    "overall",
                    <>
                      Overall Gain
                      <br />% Change
                    </>,
                  )}
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
                        <div>{x.live ? fmtPrice(x.live) : "-"}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <div className="font-semibold text-red-700">
                          {x.dayLow ? fmtPrice(x.dayLow) : "-"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-gray-500">
                          52W {x.weekLow ? fmtPrice(x.weekLow) : "-"}
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <div className="font-semibold text-emerald-700">
                          {x.dayHigh ? fmtPrice(x.dayHigh) : "-"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-gray-500">
                          52W {x.weekHigh ? fmtPrice(x.weekHigh) : "-"}
                        </div>
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
          <Empty
            text={`No ${watchlistAssetTab === "ETF" ? "ETF" : "stock"} watchlist rows yet. Use Add Watch Item to add one.`}
          />
        )}
      </section>
    );
  }
  function bullionBrokerDetailsTable(title: string, sourceRecords: Rec[]) {
    const q = debouncedQuery.toLowerCase(),
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
                  <th className="text-right">Today's Gain</th>
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
                  onClick={() => openMcxCommodity()}
                >
                      <td className="p-3 font-semibold">{row.broker}</td>
                      <td>
                        <button
                          className="font-semibold text-[#004080]"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMcxCommodity();
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
  function allInvestmentsView() {
    const investmentKeys = [
        "stocks",
        "property",
        "bullion",
        "fixedIncome",
        "mutualFunds",
        "ulips",
        "otherAssets",
        "nsel",
      ],
      rows = records
        .filter((r) => investmentKeys.includes(r.module_key))
        .map((r) => {
          const c = computeLiveRecord(r.module_key, r.data);
          return {
            record: r,
            computed: c,
            type: MODULES[r.module_key]?.title || r.module_key,
            moduleKey: r.module_key,
            account: String(r.data?.account_name || "Unassigned"),
            name: c.security_name || r.data?.security_name || MODULES[r.module_key]?.title,
            invested: num(c.invested),
            latest: num(c.latest),
            gain: num(c.gain),
            gainPct: num(c.invested) ? (num(c.gain) / num(c.invested)) * 100 : 0,
          };
        }),
      byModule = investmentKeys.map((k) => {
        const moduleRows = rows.filter((r) => r.moduleKey === k),
          invested = moduleRows.reduce((s, r) => s + r.invested, 0),
          latest = moduleRows.reduce((s, r) => s + r.latest, 0);
        return {
          key: k,
          title: MODULES[k]?.title || k,
          count: moduleRows.length,
          invested,
          latest,
          gain: latest - invested,
        };
      }),
      totals = {
        invested: rows.reduce((s, r) => s + r.invested, 0),
        latest: rows.reduce((s, r) => s + r.latest, 0),
      },
      totalGain = totals.latest - totals.invested,
      totalGainPct = totals.invested ? (totalGain / totals.invested) * 100 : 0,
      typeOptions = ["All", ...byModule.filter((m) => m.count).map((m) => m.title)],
      filteredRows = rows.filter(
        (r) => allInvestmentsType === "All" || r.type === allInvestmentsType,
      ),
      sortedRows = [...filteredRows].sort((a, b) => {
        const key = allInvestmentsSort.key,
          field = key === "gain_pct" ? "gainPct" : key,
          left = a[field],
          right = b[field],
          comparison =
            typeof left === "string" ? String(left).localeCompare(String(right)) : num(left) - num(right);
        return allInvestmentsSort.direction === "asc" ? comparison : -comparison;
      }),
      sortHeader = (label: string, key: typeof allInvestmentsSort.key) => (
        <th
          className="cursor-pointer select-none text-left"
          onClick={() =>
            setAllInvestmentsSort((prev) => ({
              key,
              direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
            }))
          }
        >
          {label}
          {allInvestmentsSort.key === key ? (allInvestmentsSort.direction === "asc" ? " ▲" : " ▼") : ""}
        </th>
      );
    return (
      <div className="space-y-5">
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight">All Investments</h3>
            <p className="text-sm text-gray-600">
              Every investment holding — Stocks, Property, Gold/Silver, Fixed Income, Mutual
              Funds, ULIPs, Other Assets and NSEL — in one combined view.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            <div className="rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Invested</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-[#17382b]">{fmt(totals.invested)}</div>
            </div>
            <div className="rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Current Value</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-[#17382b]">{fmt(totals.latest)}</div>
            </div>
            <div className="rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Gain</div>
              <div className={`mt-1 text-xl font-semibold tabular-nums ${totalGain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {fmt(totalGain)}
              </div>
            </div>
            <div className="rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Gain %</div>
              <div className={`mt-1 text-xl font-semibold tabular-nums ${totalGain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {pct(totalGainPct)}
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">By asset class</div>
          <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {byModule
              .filter((m) => m.count)
              .map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setView(m.key)}
                  className="rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-4 text-left transition hover:border-[#c9bd9e] hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-[#17382b]">{m.title}</div>
                    <span className="text-[10px] font-semibold text-gray-400">{m.count}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold tabular-nums text-[#17382b]">{fmt(m.latest)}</div>
                  <div className={`text-xs font-semibold tabular-nums ${m.gain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {m.gain >= 0 ? "+" : ""}
                    {fmt(m.gain)}
                  </div>
                </button>
              ))}
          </div>
        </section>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              All holdings ({sortedRows.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setAllInvestmentsType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${allInvestmentsType === t ? "bg-sage text-white" : "border border-[#e3dccc] text-[#40584c] hover:bg-[#f5efe3]"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-auto rounded-2xl border border-[#e3dccc]">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#f5efe3] text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  {sortHeader("Type", "type")}
                  {sortHeader("Account", "account")}
                  {sortHeader("Name", "name")}
                  <th className="text-right">{sortHeader("Invested", "invested")}</th>
                  <th className="text-right">{sortHeader("Current Value", "latest")}</th>
                  <th className="text-right">{sortHeader("Gain", "gain")}</th>
                  <th className="text-right">{sortHeader("Gain %", "gain_pct")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr
                    key={r.record.id}
                    className="cursor-pointer border-t border-[#ede9df] hover:bg-[#f9f8f4]"
                    onClick={() =>
                      setDetail({
                        moduleKey: r.moduleKey,
                        record: r.record,
                        computed: r.computed,
                        cols: MODULES[r.moduleKey]?.cols || [],
                        linkedProperty: false,
                      })
                    }
                  >
                    <td className="px-3 py-2 text-xs font-semibold text-gray-500">{r.type}</td>
                    <td className="px-3 py-2">{r.account}</td>
                    <td className="px-3 py-2 font-semibold text-[#17382b]">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.invested)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.latest)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${r.gain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {fmt(r.gain)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${r.gain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {pct(r.gainPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!sortedRows.length && <Empty text="No investments yet." />}
          </div>
        </section>
      </div>
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
      calendar = istCalendar(),
      monthKey = `${calendar.year}-${String(calendar.month).padStart(2, "0")}`,
      monthStartSnapshot = records.find(
        (record) =>
          record.module_key === INVESTMENT_PERIOD_SNAPSHOT_MODULE &&
          record.data?.snapshot_type === "month_start" &&
          record.data?.period_key === monthKey,
      ),
      monthStartNet = monthStartSnapshot
        ? num(monthStartSnapshot.data?.net)
        : totals.net,
      monthMove = totals.net - monthStartNet,
      monthMovePct = monthStartNet ? (monthMove / monthStartNet) * 100 : 0,
      yearlyGain = totals.gain;
    return (
      <div className="space-y-5">
        {dashboardTabs()}
        <section className="overflow-hidden rounded-2xl border border-[#ded6c4] bg-white/90 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-5 divide-x divide-[#e7ebdf] max-lg:grid-cols-2 max-lg:divide-x-0 max-md:grid-cols-1">
            {[
              ["Invested", totals.invested, "text-[#17382b]"],
              [
                "Today's Gain",
                todayGain,
                todayGain >= 0 ? "text-emerald-700" : "text-red-700",
              ],
              [
                "Month Start Value",
                monthStartNet,
                "text-[#17382b]",
              ],
              [
                "Yearly Gain",
                yearlyGain,
                yearlyGain >= 0 ? "text-emerald-700" : "text-red-700",
              ],
              [
                "Current Net Worth",
                totals.net,
                totals.net >= 0 ? "text-emerald-700" : "text-red-700",
              ],
            ].map(([label, value, color]) => (
              <div
                key={String(label)}
                className="min-w-0 px-4 py-3 max-lg:border-b max-lg:border-[#e7ebdf]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">
                  {label}
                </div>
                <div
                  className={`mt-1 truncate text-lg font-semibold tabular-nums ${color}`}
                  title={fmt(value)}
                >
                  {fmt(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-[#ded6c4] bg-white/90 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#17382b]">
                Monthly Portfolio Analysis
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Overall portfolio excluding Watchlist. Baseline captured{" "}
                {monthStartSnapshot?.data?.snapshot_date
                  ? new Date(
                      `${monthStartSnapshot.data.snapshot_date}T00:00:00`,
                    ).toLocaleDateString("en-IN")
                  : "when this dashboard loaded"}
                .
              </p>
            </div>
            <div
              className={`text-right ${monthMove >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              <div className="text-xl font-semibold tabular-nums">
                {monthMove >= 0 ? "+" : ""}
                {fmt(monthMove)}
              </div>
              <div className="text-xs font-semibold tabular-nums">
                {monthMovePct >= 0 ? "+" : ""}
                {pct(monthMovePct)} since baseline
              </div>
            </div>
          </div>
        </section>
        {executiveAnalyticsPanel()}
        <section
          className="flex cursor-pointer flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[26px] border border-[#cddfd4] bg-[linear-gradient(135deg,#f4fbf7_0%,#ffffff_50%,#f7f2ff_100%)] p-5 shadow-[0_18px_46px_rgba(23,56,43,0.09)] transition hover:shadow-[0_22px_54px_rgba(23,56,43,0.14)]"
          onClick={() => setView("futureWealth")}
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#17382b] px-3 py-1 text-[11px] font-semibold uppercase tracking-[.14em] text-white"><Sparkles size={13} /> Future wealth outlook</div>
            <h3 className="text-xl font-semibold tracking-tight text-[#17382b]">What could my net worth become?</h3>
            <p className="mt-1 max-w-xl text-sm text-gray-600">Plan retirement age, extra income and every combination of contributions on the Future Wealth tab.</p>
          </div>
          <button type="button" className="btn-primary shrink-0" onClick={() => setView("futureWealth")}>
            Open Future Wealth →
          </button>
        </section>
        {portfolioPerformancePanel()}
        {portfolioSummaryTable()}
        {dashboardFeaturePanels()}
        {riskOpportunityPanel()}
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
      JSON.stringify(a).toLowerCase().includes(debouncedQuery.toLowerCase()),
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
          <button
            className="btn-primary"
            disabled={!canEditModule("accounts")}
            onClick={() => setAccModal("new")}
          >
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
                      <button
                        className="btn"
                        disabled={!canEditModule("accounts")}
                        onClick={() => setAccModal(a)}
                      >
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
          .includes(debouncedQuery.toLowerCase()),
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
                Personal files can use Google Drive; household files use shared,
                access-controlled storage.
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
  async function runHouseholdAction(body: Record<string, any>) {
    setHouseholdBusy(true);
    try {
      const json = await householdRequest(body);
      setToast(json.message || "Household access updated");
      await loadHousehold(activeWorkspaceId);
    } catch (caught: any) {
      setToast(caught?.message || "Household action failed");
    } finally {
      setHouseholdBusy(false);
    }
  }
  function householdView() {
    const modules = views
      .filter(
        ([key]) =>
          !["dashboard", "household", "settings", "admin"].includes(key),
      )
      .map(([key, , label]) => ({ key, label }));
    if (householdSetupRequired) {
      return (
        <section className="rounded-[26px] border border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h3 className="text-xl font-semibold">Household database setup required</h3>
          <p className="mt-2 text-sm leading-6">
            Run <code>supabase/household-workspaces.sql</code> once in the
            Supabase SQL editor. Existing data is automatically moved into each
            user&apos;s primary household.
          </p>
          <button className="btn mt-4" onClick={() => loadHousehold()}>
            <RefreshCw size={16} className="inline" /> Check setup
          </button>
        </section>
      );
    }
    return (
      <div className="space-y-5">
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">{activeWorkspace?.name || "Household"}</h3>
              <p className="mt-1 text-sm text-gray-600">
                Your role: {workspaceAccess.member_role}. Access is enforced at the database level.
              </p>
            </div>
            {workspaceAccess.member_role === "owner" && (
              <button
                className="btn"
                disabled={householdBusy}
                onClick={() => {
                  const name = prompt("Household name", activeWorkspace?.name || "");
                  if (name?.trim())
                    runHouseholdAction({ action: "renameWorkspace", name: name.trim() });
                }}
              >
                Rename
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["View", workspaceAccess.all_modules ? "All modules" : `${workspaceAccess.modules.length} modules`],
              ["Change data", workspaceAccess.can_edit ? "Allowed" : "Read only"],
              ["Delete", workspaceAccess.can_delete ? "Allowed" : "Not allowed"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#e3dccc] bg-[#fffaf0] p-4">
                <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </section>
        {workspaceAccess.can_manage_members && (
          <>
            <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5">
              <h3 className="text-xl font-semibold">Add household member</h3>
              <p className="mt-1 text-sm text-gray-600">
                Existing users are linked immediately. New users receive an email invitation.
              </p>
              <form
                className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  runHouseholdAction({
                    action: "invite",
                    email: String(form.get("email") || ""),
                    member_role: String(form.get("member_role") || "viewer"),
                  });
                  event.currentTarget.reset();
                }}
              >
                <input className="field-input" type="email" name="email" required placeholder="member@example.com" />
                <select className="field-input" name="member_role" defaultValue="viewer">
                  <option value="viewer">Viewer: read only</option>
                  <option value="editor">Editor: add and edit</option>
                  <option value="custom">Custom permissions</option>
                </select>
                <button className="btn-primary" disabled={householdBusy}>
                  <Plus size={16} className="inline" /> Add member
                </button>
              </form>
            </section>
            <section className="space-y-3">
              {workspaceMembers.map((member) => {
                const permissions = member.permissions || ({} as any),
                  owner = member.member_role === "owner";
                return (
                  <form
                    key={member.id}
                    className="rounded-[22px] border border-[#ded6c4] bg-white/90 p-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget),
                        role = String(form.get("member_role") || "viewer"),
                        selectedModules = form.getAll("modules").map(String);
                      runHouseholdAction({
                        action: "updateMember",
                        membershipId: member.id,
                        member_role: role,
                        permissions: {
                          all_modules: form.get("all_modules") === "on",
                          modules: selectedModules,
                          can_edit: form.get("can_edit") === "on",
                          can_delete: form.get("can_delete") === "on",
                          can_manage_members: form.get("can_manage_members") === "on",
                          can_view_documents: form.get("can_view_documents") === "on",
                          can_upload_documents: form.get("can_upload_documents") === "on",
                        },
                      });
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {member.profile?.full_name || member.profile?.email || member.user_id}
                        </div>
                        <div className="text-xs text-gray-500">{member.profile?.email}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-full border px-3 py-1 text-xs font-semibold">
                          {member.status}
                        </span>
                        {!owner && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() =>
                              runHouseholdAction({
                                action: "setStatus",
                                membershipId: member.id,
                                status: member.status === "active" ? "suspended" : "active",
                              })
                            }
                          >
                            {member.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                      <div>
                        <label className="field-label">Role preset</label>
                        <select
                          className="field-input"
                          name="member_role"
                          defaultValue={member.member_role}
                          disabled={owner}
                        >
                          {owner && <option value="owner">Primary owner</option>}
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="custom">Custom</option>
                        </select>
                        {!owner && (
                          <div className="mt-4 space-y-2 text-sm">
                            {[
                              ["all_modules", "All modules"],
                              ["can_edit", "Add and edit"],
                              ["can_delete", "Delete data"],
                              ["can_manage_members", "Manage members"],
                              ["can_view_documents", "View documents"],
                              ["can_upload_documents", "Upload documents"],
                            ].map(([name, label]) => (
                              <label key={name} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  name={name}
                                  defaultChecked={Boolean((permissions as any)[name])}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {!owner && (
                        <div>
                          <div className="field-label">Selected modules</div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {modules.map((module) => (
                              <label
                                key={module.key}
                                className="flex items-center gap-2 rounded-xl border border-[#e3dccc] bg-[#fffaf0] px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  name="modules"
                                  value={module.key}
                                  defaultChecked={permissions.modules?.includes(module.key)}
                                />
                                {module.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!owner && (
                      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#e3dccc] pt-4">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            if (confirm("Remove this member's household access?"))
                              runHouseholdAction({
                                action: "removeMember",
                                membershipId: member.id,
                              });
                          }}
                        >
                          <Trash2 size={15} className="inline" /> Remove
                        </button>
                        <button className="btn-primary" disabled={householdBusy}>
                          Save permissions
                        </button>
                      </div>
                    )}
                  </form>
                );
              })}
            </section>
          </>
        )}
      </div>
    );
  }
  function adminConsole() {
    const q = debouncedQuery.toLowerCase(),
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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Investment Data Sources</h3>
              <p className="text-sm text-gray-600">
                Choose where each investment module fetches live or default data.
              </p>
            </div>
            <button
              className="btn"
              onClick={() => {
                setSourcePrefs(DEFAULT_SOURCE_PREFS);
                setToast("Source preferences reset");
              }}
            >
              Reset Sources
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {Object.entries(INVESTMENT_SOURCE_OPTIONS).map(([moduleKey, options]) => {
              const selected = sourceFor(moduleKey),
                selectedOption = options.find((option) => option.value === selected) || options[0];
              return (
                <div
                  key={moduleKey}
                  className="rounded-2xl border border-[#e3dccc] bg-[#fffaf0] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#17382b]">
                        {MODULES[moduleKey]?.title || pretty(moduleKey)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-500">
                        Active source: {selectedOption?.label}
                      </div>
                    </div>
                    <select
                      className="field-input max-w-[220px]"
                      value={selected}
                      onChange={(e) => setSourcePref(moduleKey, e.target.value)}
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-gray-600">
                    {selectedOption?.note}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-[26px] border border-[#ded6c4] bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight">Appearance Lab</h3>
            <p className="text-sm text-gray-600">
              Explore embedded themes and tune the app typography.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {APP_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-option theme-option-${theme.id} rounded-2xl border p-4 text-left transition hover:shadow-md ${
                    appearance.theme === theme.id
                      ? "border-[#115c45] bg-[#eef5ee]"
                      : "border-[#e3dccc] bg-white"
                  }`}
                  onClick={() => setAppearancePref({ theme: theme.id })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#17382b]">
                        {theme.name}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-gray-500">
                        {theme.note}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {theme.swatches.map((color) => (
                        <span
                          key={color}
                          className="theme-swatch h-5 w-5 rounded-full border border-white shadow-sm"
                          style={{ "--theme-swatch": color } as any}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-[#e3dccc] bg-[#fffaf0] p-4">
              <div className="grid gap-4">
                <div>
                  <label className="field-label">Font</label>
                  <select
                    className="field-input"
                    value={appearance.font}
                    onChange={(e) => setAppearancePref({ font: e.target.value })}
                  >
                    {APP_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Font Size</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="13"
                      max="19"
                      step="1"
                      value={appearance.fontSize}
                      onChange={(e) =>
                        setAppearancePref({ fontSize: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                    <input
                      className="field-input w-20 text-center"
                      type="number"
                      min="13"
                      max="19"
                      value={appearance.fontSize}
                      onChange={(e) =>
                        setAppearancePref({ fontSize: Number(e.target.value) || 16 })
                      }
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                    Preview
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight">
                    Portfolio Summary
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Tables, dashboards and admin tools use this font and size.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
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
      acct =
        k === "insurance"
          ? key(d.account_name || d.life_insured || "")
          : accountTab(k) === "All"
            ? ""
            : key(d.account_name || ""),
      category =
        k === "fixedIncome" ? fixedIncomeCategoryLabel(d.category) : d.category,
      holdingName = k === "bullion" ? bullionDisplayName(d) : d.security_name,
      propertyIdentity =
        k === "property"
          ? [
              key(d.security_name || category || "property"),
              key(d.location || ""),
              key(d.broker || d.community || d.project || d.society || ""),
            ].join("|")
          : "";
    return [
      acct,
      propertyIdentity ||
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
        qty += num(c.adjusted_quantity) || num(d.quantity);
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
      .slice(-1)[0];
    if (synced) data.last_synced = synced;
    const todayGain = items.reduce(
      (sum, record) => sum + todayGainFor(k, record),
      0,
    );
    const computed =
      ["bullion", "fixedIncome"].includes(k)
        ? computeLiveRecord(k, data)
        : computeRecord(k, data);
    if (showsDailyChange(k)) computed.today_gain = todayGain;
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
    if (k === "stocks") return stockMove(c);
    if (showsDailyChange(k)) return num(c.day_change || c.today_gain);
    if (MODULES[k]?.kind === "asset") return num(c.gain);
    return 0;
  }
  function marketRowClass(k: string, c: any) {
    if (!["stocks", "mutualFunds", "ulips", "bullion", "nsel", "fixedIncome", "property", "otherAssets"].includes(k))
      return "hover:bg-[#f7faf6]";
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
    if (col === "account_name") return "72px";
    if (col === "security_name") return "132px";
    if (col === "quantity") return "58px";
    if (col === "current_purchase") return "108px";
    if (["low_range", "high_range"].includes(col)) return "102px";
    if (["today_gain_display", "gain_display"].includes(col)) return "108px";
    if (col === "monthly_gain") return "88px";
    if (["invested", "latest"].includes(col)) return "94px";
    if (col === "gain") return "94px";
    return "74px";
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
    if (moduleKey === "property") {
      if (["account_name", "security_name", "location", "broker"].includes(col))
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
        className={`inline-flex w-full max-w-[5rem] items-center justify-end gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm ${cls}`}
      >
        {Arrow && <Arrow size={11} strokeWidth={3} />}
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
        className={`inline-flex w-full max-w-[5rem] justify-end rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}
      >
        {fmtPrice(v)}
      </span>
    );
  }
  function formatModuleCell(moduleKey: string, col: string, c: any, record?: Rec) {
    if (moduleKey === "stocks" && col === "security_name") {
      const fullName = String(c[col] || ""),
        shortName = compactName(fullName),
        gain = num(c.gain),
        positionClass =
          gain > 0
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : gain < 0
              ? "border-red-200 bg-red-50 text-red-950"
              : "border-gray-200 bg-gray-50 text-gray-800",
        hasAction =
          !!c.corporate_action_applied ||
          !!c.corporate_action_type ||
          !!c.corporate_action_ratio ||
          !!c.ex_base_price;
      return (
        <div className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 shadow-sm ${positionClass}`}>
          <a
            className="min-w-0 flex-1 leading-tight text-inherit underline decoration-current/40"
            href={moneycontrolHref(c)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={fullName}
          >
            <span className="block truncate font-semibold">{shortName}</span>
            {shortName !== fullName && (
              <span className="block truncate text-[10px] font-medium opacity-70 no-underline">
                {fullName}
              </span>
            )}
          </a>
          {record && (
            <button
              type="button"
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-sm transition ${
                hasAction
                  ? "border-[#b8892b] bg-[#fff2c7] text-[#7a1248] ring-1 ring-[#e6c46a]/50"
                  : "border-[#e3dccc] bg-white text-[#6d7c73] hover:border-[#b8892b] hover:bg-[#fffaf0] hover:text-[#7a1248]"
              }`}
              title="Corporate action"
              aria-label={`Corporate action for ${fullName}`}
              onClick={(e) => {
                e.stopPropagation();
                setCorporateAction(record);
              }}
            >
              <GitBranch size={14} strokeWidth={3} />
            </button>
          )}
        </div>
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
    if (["stocks", "watchlist"].includes(moduleKey) && col === "asset_type")
      return c[col] || "Stock";
    if (
      moduleKey === "insurance" &&
      ["premium_years_paid", "premium_end_date", "next_premium_due_date"].includes(col) &&
      key(c.premium_frequency) === "single"
    )
      return <span className="text-gray-400">—</span>;
    if (
      moduleKey === "insurance" &&
      [
        "death_cover",
        "health_cover",
        "critical_illness_cover",
        "latest",
        "bonus_accrued_till_date",
        "money_back_received",
        "maturity_value",
      ].includes(col)
    ) {
      const type = insurancePolicyType(c.policy_type || c.category, c.broker),
        applicable: Record<string, string[]> = {
          death_cover: ["TERM_PLAN", "LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "ACCIDENT_COVER", "OTHER"],
          health_cover: ["HEALTH_INSURANCE"],
          critical_illness_cover: ["CRITICAL_ILLNESS"],
          latest: ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "OTHER"],
          bonus_accrued_till_date: ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK"],
          money_back_received: ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK"],
          maturity_value: ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "OTHER"],
        };
      if (
        type === "TERM_PLAN" &&
        /^(yes|true|1)$/i.test(String(c.return_of_premium || "")) &&
        ["latest", "maturity_value"].includes(col)
      )
        return formatCell(col, c[col]);
      if (!(applicable[col] || []).includes(type))
        return <span className="text-gray-400">—</span>;
    }
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
      stockWatchlistCount =
        k === "stocks"
          ? records.filter((r) => r.module_key === "watchlist").length
          : 0,
      accountNames = Array.from(
        new Set(
          moduleRecords.map((r) => String(r.data?.account_name || "Unassigned")),
        ),
      ),
      tabs = k === "stocks" ? ["All", ...accountNames, "Watchlist"] : ["All", ...accountNames],
      selected = tabs.includes(accountTab(k)) ? accountTab(k) : "All",
      filtered =
        k === "stocks" && selected === "Watchlist"
          ? []
          : moduleRecords.filter(
              (r) =>
                selected === "All" ||
                String(r.data?.account_name || "Unassigned") === selected,
            ),
      grouped = groupedRows(k, filtered),
      rawTabTotals = computeModuleTotals(k, filtered),
      tabTotals =
        k === "bullion"
          ? (() => {
              const displayed = grouped.reduce(
                (totals, row) => ({
                  assets: totals.assets + Math.round(num(row.c.latest)),
                  invested: totals.invested + Math.round(num(row.c.invested)),
                }),
                { assets: 0, invested: 0 },
              );
              return {
                assets: displayed.assets,
                liabilities: 0,
                net: displayed.assets,
                invested: displayed.invested,
                gain: displayed.assets - displayed.invested,
              };
            })()
          : rawTabTotals,
      normalizedQuery = debouncedQuery.trim().toLowerCase(),
      matchedRows = normalizedQuery
        ? grouped.filter((x) =>
            JSON.stringify(x.c).toLowerCase().includes(normalizedQuery),
          )
        : grouped,
      rows =
        k === "stocks"
          ? [...matchedRows].sort((a, b) => {
              const left = stockHoldingSortValue(stockHoldingsSort.key, a.c),
                right = stockHoldingSortValue(stockHoldingsSort.key, b.c),
                comparison =
                  typeof left === "string"
                    ? left.localeCompare(String(right))
                    : num(left) - num(right);
              return stockHoldingsSort.direction === "asc"
                ? comparison
                : -comparison;
            })
          : k === "bullion"
          ? [...matchedRows].sort((a, b) => {
              const left = bullionHoldingSortValue(stockHoldingsSort.key, a.c),
                right = bullionHoldingSortValue(stockHoldingsSort.key, b.c),
                comparison =
                  typeof left === "string"
                    ? left.localeCompare(String(right))
                    : num(left) - num(right);
              return stockHoldingsSort.direction === "asc"
                ? comparison
                : -comparison;
            })
          : matchedRows,
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
      mode = k === "stocks" && selected === "Watchlist" ? "watchlist" : "holdings",
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
      moduleToday = hasDailyChange
        ? k === "bullion"
          ? grouped.reduce(
              (sum, row) => sum + Math.round(num(row.c.today_gain)),
              0,
            )
          : filtered.reduce((s, r) => s + todayGainFor(k, r), 0)
        : 0;
    const detailCols =
      k === "stocks"
        ? def.cols.filter(
            (c) =>
              ![
                "ticker_symbol",
                "exchange",
                "last_synced",
                "bonus_ratio",
                "split_ratio",
                "corporate_action_type",
                "corporate_action_ratio",
                "corporate_action_ex_date",
                "ex_base_price",
              ].includes(c),
          )
        : k === "bullion"
        ? def.cols.filter((c) => c !== "last_synced")
        : def.cols,
      visibleCols =
        k === "stocks"
          ? stockHoldingColumns
          : k === "bullion"
            ? bullionHoldingColumns
            : k === "fixedIncome"
              ? detailCols.filter(
                  (column) =>
                    ![
                      "employee_contribution",
                      "company_contribution",
                      "broker",
                      "purchase_date",
                    ].includes(column),
                )
              : detailCols;
    const lastSynced =
      filtered
        .map((r) => String(r.data?.last_synced || ""))
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || "";
    const lotRows = (lots: Rec[], groupKey: string) =>
      lots.map((lot, i) => {
        const c = computeLiveRecord(k, lot.data),
          linkedProperty = lot.data?.source_module === "property";
        return (
          <tr
            onClick={() => {
              if (k === "bullion") {
                openMcxCommodity();
                return;
              }
              setDetail({
                moduleKey: k,
                record: lot,
                computed: c,
                cols: detailCols,
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
              <td className={`p-3 ${stockCellClass(k, col)}`} key={col}>
                {k === "stocks"
                  ? stockHoldingCell(col, c, lot)
                  : k === "bullion"
                  ? bullionHoldingCell(col, c, lot)
                  : formatModuleCell(k, col, c, lot)}
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
                    cols: detailCols,
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
                <span className="inline-flex items-center rounded-full border border-[#e1d8c8] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#37534a]">
                  Live{lastSynced ? ` · updated ${lastSynced}` : ""}
                </span>
                <button
                  className="btn-primary"
                  onClick={() => setEditing({ moduleKey: "stocks" })}
                >
                  <Plus size={16} className="inline" /> Add Stock / ETF
                </button>
              </div>
            </div>
          </section>
          {hasAccountTabs && tabs.length > 1 && (
            <div className="mb-4 flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-1">
              {tabs.map((t) => {
                const count =
                  t === "All"
                    ? moduleRecords.length
                    : k === "stocks" && t === "Watchlist"
                      ? stockWatchlistCount
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
          {marketTodayHeader()}
          {stockWatchlistTable()}
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
              <span className="inline-flex items-center rounded-full border border-[#e1d8c8] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#37534a]">
                Live{lastSynced ? ` · updated ${lastSynced}` : ""}
              </span>
            )}
            <button className="btn" onClick={() => exportModuleCsv(k)}>
              Export CSV
            </button>
            <button
              className="btn-primary"
              disabled={!canEditModule(k)}
              onClick={() => setEditing({ moduleKey: k })}
            >
              <Plus size={16} className="inline" /> Add
            </button>
          </div>
        </div>
        {hasAccountTabs && tabs.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-[#FFFFFF] p-1">
            {tabs.map((t) => {
              const count =
                t === "All"
                  ? moduleRecords.length
                  : k === "stocks" && t === "Watchlist"
                    ? stockWatchlistCount
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
        {k === "bullion" && bullionRatePanel()}
        {k === "stocks" && <div className="mb-4">{marketTodayHeader()}</div>}
        {isInvestment && (
          <div className="investment-summary-float" aria-label={`${def.title} investment summary`}>
            {(k === "fixedIncome" && fixedTotals
              ? [
                  {
                    label: "Invested",
                    value: tabTotals.invested,
                    color: "text-[#17382b]",
                  },
                  {
                    label: "Interest This FY",
                    value: fixedTotals.interest,
                    color: "text-emerald-700",
                  },
                  {
                    label: "Overall Gain",
                    value: tabTotals.gain,
                    color:
                      tabTotals.gain >= 0
                        ? "text-emerald-700"
                        : "text-red-700",
                  },
                  {
                    label: "Current Worth",
                    value: fixedTotals.current,
                    color: "text-emerald-700",
                  },
                ]
              : [
                  {
                    label: "Invested",
                    value: tabTotals.invested,
                    color: "text-[#17382b]",
                  },
                  {
                    label: "Today's Gain",
                    value: moduleToday,
                    color:
                      moduleToday >= 0 ? "text-emerald-700" : "text-red-700",
                    unavailable: !hasDailyChange,
                  },
                  {
                    label: "Overall Gain",
                    value: tabTotals.gain,
                    color:
                      tabTotals.gain >= 0
                        ? "text-emerald-700"
                        : "text-red-700",
                  },
                  {
                    label: "Current Value",
                    value: tabTotals.assets,
                    color: "text-emerald-700",
                  },
                ]
            ).map((metric) => (
              <div className="investment-summary-metric" key={metric.label}>
                <div className="investment-summary-label">{metric.label}</div>
                <div
                  className={`investment-summary-value ${metric.color}`}
                  title={metric.unavailable ? "Daily change is not available for this investment type" : fmt(metric.value)}
                >
                  {metric.unavailable ? "—" : fmt(metric.value)}
                </div>
              </div>
            ))}
          </div>
        )}
        {k === "insurance" && (() => {
          const calculated = filtered.map((record) => ({
              record,
              value: computeLiveRecord("insurance", record.data),
            })),
            active = calculated.filter(({ value }) =>
              ["Active", "Paid-up"].includes(String(value.status || "")),
            ),
            lifeCover = active
              .filter(({ value }) => ["TERM_PLAN", "LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP", "ACCIDENT_COVER"].includes(String(value.policy_type)))
              .reduce((sum, row) => sum + num(row.value.death_cover), 0),
            healthCover = active.reduce((sum, row) => sum + num(row.value.health_cover), 0),
            criticalCover = active.reduce((sum, row) => sum + num(row.value.critical_illness_cover), 0),
            currentValue = active
              .filter(({ value }) => ["LIFE_INSURANCE", "ENDOWMENT", "MONEY_BACK", "ULIP"].includes(String(value.policy_type)) || (value.policy_type === "TERM_PLAN" && /^(yes|true|1)$/i.test(String(value.return_of_premium || ""))))
              .reduce((sum, row) => sum + num(row.value.latest), 0),
            annualOutflow = active.reduce((sum, row) => sum + num(row.value.annual_premium), 0),
            todayDate = new Date(isoDate()), dueLimit = new Date(todayDate);
          dueLimit.setDate(dueLimit.getDate() + 30);
          const dueSoon = active.filter(({ value }) => {
            const due = value.next_premium_due_date
              ? new Date(String(value.next_premium_due_date))
              : null;
            return due && !Number.isNaN(due.getTime()) && due >= todayDate && due <= dueLimit;
          }).length;
          return (
            <div className="mb-4 grid grid-cols-6 gap-3 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
              {[
                ["Total Life Cover", fmt(lifeCover)],
                ["Total Health Cover", fmt(healthCover)],
                ["Critical Illness Cover", fmt(criticalCover)],
                ["Current Insurance Value", fmt(currentValue)],
                ["Annual Premium Outflow", fmt(annualOutflow)],
                ["Premium Due Soon", String(dueSoon)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#ded6c4] bg-white px-4 py-3 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-[#17382b]">{value}</div>
                </div>
              ))}
            </div>
          );
        })()}
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
                      disabled={!canEditModule(k)}
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
            className={`overflow-auto rounded-[22px] border border-[#ded6c4] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] investment-table ${k === "stocks" ? "stock-holdings-table" : ""} ${k === "bullion" ? "bullion-holdings-table" : ""} ${k === "fixedIncome" ? "fixed-income-table" : ""} ${k === "property" ? "property-holdings-table" : ""}`}
          >
            <table
              className={`border-collapse text-sm ${
                k === "stocks"
                  ? "w-[1120px] table-fixed"
                    : k === "fixedIncome"
                      ? "w-[1330px] table-fixed"
                    : k === "bullion"
                      ? "w-[1160px] table-fixed"
                    : k === "insurance"
                      ? "w-[2100px] table-fixed"
                    : k === "property"
                      ? "w-[1480px] table-fixed"
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
              {k === "insurance" && (
                <colgroup>
                  {visibleCols.map((column) => (
                    <col key={column} style={{ width: insuranceColWidth(column) }} />
                  ))}
                  <col style={{ width: "96px" }} />
                </colgroup>
              )}
              {k === "property" && (
                <colgroup>
                  {visibleCols.map((column) => (
                    <col key={column} style={{ width: propertyColWidth(column) }} />
                  ))}
                  <col style={{ width: "100px" }} />
                </colgroup>
              )}
              <thead className="bg-[#f5efe3] text-left text-xs uppercase tracking-widest">
                <tr>
                  {visibleCols.map((c) => {
                    const active = stockHoldingsSort.key === c;
                    return (
                      <th
                        className={`p-3 ${stockCellClass(k, c)}`}
                        key={c}
                        aria-sort={
                          (k === "stocks" || k === "bullion") && active
                            ? stockHoldingsSort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                      >
                        {k === "stocks" ? (
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-inherit ${
                              ["account_name", "security_name"].includes(c)
                                ? "justify-start text-left"
                                : "justify-end text-right"
                            }`}
                            onClick={() =>
                              setStockHoldingsSort((previous) => ({
                                key: c,
                                direction:
                                  previous.key === c &&
                                  previous.direction === "asc"
                                    ? "desc"
                                    : "asc",
                              }))
                            }
                          >
                            <span>{stockHoldingLabel(c)}</span>
                            {active ? (
                              stockHoldingsSort.direction === "asc" ? (
                                <ArrowUp size={12} aria-hidden="true" />
                              ) : (
                                <ArrowDown size={12} aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown
                                size={12}
                                className="opacity-45"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ) : k === "bullion" ? (
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-inherit ${
                              ["account_name", "security_name"].includes(c)
                                ? "justify-start text-left"
                                : "justify-end text-right"
                            }`}
                            onClick={() =>
                              setStockHoldingsSort((previous) => ({
                                key: c,
                                direction:
                                  previous.key === c &&
                                  previous.direction === "asc"
                                    ? "desc"
                                    : "asc",
                              }))
                            }
                          >
                            <span>{bullionHoldingLabel(c)}</span>
                            {active ? (
                              stockHoldingsSort.direction === "asc" ? (
                                <ArrowUp size={12} aria-hidden="true" />
                              ) : (
                                <ArrowDown size={12} aria-hidden="true" />
                              )
                            ) : (
                              <ArrowUpDown
                                size={12}
                                className="opacity-45"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ) : (
                          fieldLabel(k, c)
                        )}
                      </th>
                    );
                  })}
                  <th className={k === "stocks" ? "text-right" : ""}>
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(({ r, c, records: lots, key }) => {
                  const open = lots.length > 1 && !!expandedLots[key];
                  return [
                    <tr
                      onClick={() => {
                        if (k === "bullion") {
                          openMcxCommodity();
                          return;
                        }
                        setDetail({
                          moduleKey: k,
                          record: r,
                          computed: c,
                          cols: detailCols,
                          linkedProperty: r.data?.source_module === "property",
                        });
                      }}
                      className={`cursor-pointer border-t border-[#eee6d9] transition ${marketRowClass(k, c)}`}
                      key={key}
                    >
                      {visibleCols.map((col) => (
                        <td className={`p-3 ${stockCellClass(k, col)}`} key={col}>
                          {k === "stocks"
                            ? stockHoldingCell(col, c, r)
                            : k === "bullion"
                            ? bullionHoldingCell(col, c, r)
                            : formatModuleCell(k, col, c, r)}
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
                                cols: detailCols,
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
                accept=".xlsx,.csv,.tsv,.txt,.json"
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
  function propertyColWidth(col: string) {
    if (col === "account_name") return "100px";
    if (col === "security_name") return "130px";
    if (col === "location") return "180px";
    if (col === "broker") return "150px";
    if (["invested", "latest", "gain"].includes(col)) return "125px";
    if (["loan_amount", "loan_balance", "emiFuture"].includes(col)) return "125px";
    if (col === "loan_interest_rate") return "105px";
    if (col === "emis_left") return "90px";
    return "110px";
  }
  function executiveAnalyticsPanel() {
    const moduleRows = Object.entries(MODULES)
        .filter(
          ([moduleKey, module]) =>
            (module.kind === "asset" && moduleKey !== "watchlist") ||
            moduleKey === "insurance",
        )
        .map(([moduleKey, module]) => {
          const moduleRecords = records.filter((record) => record.module_key === moduleKey),
            current = moduleRecords.reduce(
              (sum, record) => sum + num(computeLiveRecord(moduleKey, record.data).latest),
              0,
            ),
            invested = moduleRecords.reduce(
              (sum, record) => sum + num(computeLiveRecord(moduleKey, record.data).invested),
              0,
            );
          return {
            key: moduleKey,
            title: module.title,
            current,
            invested,
            gain: current - invested,
            weight: totals.assets ? (current / totals.assets) * 100 : 0,
          };
        })
        .filter((row) => row.current || row.invested)
        .sort((a, b) => b.current - a.current),
      largest = moduleRows[0],
      best = [...moduleRows].filter((row) => row.invested).sort((a, b) => b.gain - a.gain)[0],
      worst = [...moduleRows].filter((row) => row.invested).sort((a, b) => a.gain - b.gain)[0],
      returnOnCost = totals.invested ? (totals.gain / totals.invested) * 100 : 0,
      debtRatio = totals.assets ? (totals.liabilities / totals.assets) * 100 : 0,
      coverageRatio = totals.liabilities ? totals.assets / totals.liabilities : null,
      valuedRecords = records.filter(
        (record) =>
          (MODULES[record.module_key]?.kind === "asset" ||
            record.module_key === "insurance") &&
          num(computeLiveRecord(record.module_key, record.data).latest) > 0,
      ).length,
      assetRecordCount = records.filter(
        (record) =>
          MODULES[record.module_key]?.kind === "asset" ||
          record.module_key === "insurance",
      ).length,
      valuationCoverage = assetRecordCount ? (valuedRecords / assetRecordCount) * 100 : 0,
      staleClasses = moduleRows.filter((row) => {
        const latest = records
          .filter((record) => record.module_key === row.key)
          .map(recordFreshDate)
          .filter(Boolean)
          .sort()
          .slice(-1)[0];
        return ageDays(latest || "") > 30;
      }),
      actions = [
        largest && largest.weight > 40
          ? {
              tone: "amber",
              title: `Review ${largest.title} concentration`,
              detail: `${pct(largest.weight)} of gross assets is in one asset class.`,
              moduleKey: largest.key,
            }
          : {
              tone: "green",
              title: "Allocation concentration is controlled",
              detail: largest
                ? `Largest asset class is ${largest.title} at ${pct(largest.weight)}.`
                : "Add asset values to begin concentration monitoring.",
              moduleKey: largest?.key,
            },
        debtRatio > 30
          ? {
              tone: "red",
              title: "Prioritize liability reduction",
              detail: `Liabilities are ${pct(debtRatio)} of gross assets.`,
              moduleKey: "loans",
            }
          : {
              tone: "green",
              title: "Leverage is within the dashboard guardrail",
              detail: `Liabilities are ${pct(debtRatio)} of gross assets.`,
              moduleKey: "loans",
            },
        staleClasses.length
          ? {
              tone: "amber",
              title: `Refresh ${staleClasses.length} stale asset ${staleClasses.length === 1 ? "class" : "classes"}`,
              detail: staleClasses.map((row) => row.title).join(", "),
              moduleKey: staleClasses[0].key,
            }
          : {
              tone: "green",
              title: "Portfolio data is decision-ready",
              detail: `${valuedRecords} of ${assetRecordCount} asset records have a current valuation.`,
              moduleKey: undefined,
            },
      ];
    const metric = (
      label: string,
      value: string,
      note: string,
      tone: string,
    ) => (
      <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="mt-1 text-xs font-semibold text-gray-500">{note}</div>
      </div>
    );
    return (
      <section className="rounded-[26px] border border-[#ded6c4] bg-[#f8f5ed] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8b6a28]">
              Executive pulse
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">Portfolio health at a glance</h3>
            <p className="mt-1 text-sm text-gray-600">
              Performance, leverage, concentration and data quality translated into decisions.
            </p>
          </div>
          <span className="rounded-full border border-[#d8cba9] bg-white px-3 py-1 text-xs font-semibold text-[#40584c]">
            As of {new Date().toLocaleDateString("en-IN")}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          {metric(
            "Return on cost",
            pct(returnOnCost),
            `${fmt(totals.gain)} cumulative gain`,
            returnOnCost >= 0 ? "text-emerald-700" : "text-red-700",
          )}
          {metric(
            "Debt / assets",
            pct(debtRatio),
            coverageRatio === null ? "No liabilities recorded" : `${coverageRatio.toFixed(1)}x asset coverage`,
            debtRatio > 30 ? "text-red-700" : debtRatio > 15 ? "text-amber-700" : "text-emerald-700",
          )}
          {metric(
            "Largest allocation",
            largest ? pct(largest.weight) : "-",
            largest?.title || "No allocation data",
            largest && largest.weight > 40 ? "text-amber-700" : "text-[#17382b]",
          )}
          {metric(
            "Valuation coverage",
            pct(valuationCoverage),
            `${valuedRecords} of ${assetRecordCount} asset records`,
            valuationCoverage >= 90 ? "text-emerald-700" : "text-amber-700",
          )}
        </div>
        <div className="mt-4 grid grid-cols-[1.2fr_.8fr] gap-4 max-lg:grid-cols-1">
          <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
            <h4 className="font-semibold text-[#17382b]">Priority actions</h4>
            <div className="mt-3 space-y-2">
              {actions.map((action) => (
                <button
                  type="button"
                  key={action.title}
                  onClick={() => action.moduleKey && openModuleAll(action.moduleKey)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${action.tone === "red" ? "border-red-200 bg-red-50 hover:border-red-300" : action.tone === "amber" ? "border-amber-200 bg-amber-50 hover:border-amber-300" : "border-emerald-200 bg-emerald-50 hover:border-emerald-300"}`}
                >
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${action.tone === "red" ? "bg-red-500" : action.tone === "amber" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span>
                    <span className="block text-sm font-semibold">{action.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-600">{action.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e3dccc] bg-white p-4">
            <h4 className="font-semibold text-[#17382b]">Return contributors</h4>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-emerald-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Best contributor</div>
                <div className="mt-1 flex items-center justify-between gap-3 font-semibold">
                  <span>{best?.title || "-"}</span><span className="tabular-nums text-emerald-700">{best ? fmt(best.gain) : "-"}</span>
                </div>
              </div>
              <div className="rounded-xl bg-red-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-red-700">Needs attention</div>
                <div className="mt-1 flex items-center justify-between gap-3 font-semibold">
                  <span>{worst?.title || "-"}</span><span className={`tabular-nums ${worst && worst.gain < 0 ? "text-red-700" : "text-emerald-700"}`}>{worst ? fmt(worst.gain) : "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  function utilityWatchlistView() {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = records
      .filter((record) => record.module_key === "watchlist")
      .map((record) => {
        const data = record.data || {};
        const match = findStock(data.security_name || data.ticker_symbol || "");
        const last = num(data.current_price || data.live_price);
        const change = num(data.day_change);
        const previousClose = num(data.previous_close) || last - change;
        const changePct = previousClose ? (change / previousClose) * 100 : 0;
        return {
          record,
          data,
          name: data.security_name || match?.name || "Watch item",
          symbol: data.ticker_symbol || match?.ticker || "",
          exchange: data.exchange || match?.exchange || "NSE",
          sector: data.category || match?.category || "",
          last,
          change,
          changePct,
          previousClose,
          dayLow: num(data.day_low),
          dayHigh: num(data.day_high),
          target: num(data.target_price),
          added: num(data.base_price || data.inv_price),
          addedDate:
            data.base_price_date ||
            data.data_uploaded_date ||
            String(record.created_at || "").slice(0, 10),
        };
      })
      .filter((row) =>
        `${row.name} ${row.symbol} ${row.exchange} ${row.sector}`
          .toLowerCase()
          .includes(q),
      );
    const selected =
      rows.find((row) => row.record.id === selectedWatchlistId) || rows[0];

    return (
      <section className="utility-watchlist">
        <div className="utility-watchlist-head">
          <div>
            <div className="utility-watchlist-title">
              Watchlist <span>{rows.length}</span>
            </div>
            <p>Live market movement for your saved stock and ETF ideas.</p>
          </div>
          <div className="utility-watchlist-actions">
            <button className="btn" onClick={() => refreshWatchlist()}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              className="btn-primary"
              onClick={() =>
                setEditing({
                  moduleKey: "watchlist",
                  defaults: {
                    exchange: "NSE",
                    quantity: 1,
                    asset_type: watchlistAssetTab,
                  },
                })
              }
            >
              <Plus size={15} /> Add symbol
            </button>
          </div>
        </div>

        {rows.length ? (
          <div className="utility-watchlist-layout">
            <div className="utility-watchlist-table-wrap">
              <table className="utility-watchlist-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Last</th>
                    <th>Chg</th>
                    <th>Chg%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = selected?.record.id === row.record.id;
                    const movementClass =
                      row.change > 0
                        ? "watchlist-positive"
                        : row.change < 0
                          ? "watchlist-negative"
                          : "watchlist-neutral";
                    return (
                      <tr
                        key={row.record.id}
                        className={active ? "active" : ""}
                        onClick={() => setSelectedWatchlistId(row.record.id)}
                      >
                        <td>
                          <strong>{row.symbol || row.name}</strong>
                          <small>
                            {row.exchange}
                            {row.sector ? ` · ${row.sector}` : ""}
                          </small>
                        </td>
                        <td className="number-cell">
                          {row.last ? row.last.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) : "-"}
                        </td>
                        <td className={`number-cell ${movementClass}`}>
                          {row.change > 0 ? "+" : ""}
                          {row.change.toFixed(2)}
                        </td>
                        <td className={`number-cell ${movementClass}`}>
                          {row.changePct > 0 ? "+" : ""}
                          {row.changePct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selected && (
              <aside className="utility-watchlist-detail">
                <div className="utility-watchlist-detail-top">
                  <div>
                    <span>{selected.exchange}</span>
                    <h3>{selected.symbol || selected.name}</h3>
                    <p>{selected.name}</p>
                  </div>
                  <button
                    className="btn"
                    onClick={() =>
                      setDetail({
                        moduleKey: "watchlist",
                        record: selected.record,
                        computed: computeRecord("watchlist", selected.data),
                        cols: MODULES.watchlist?.cols || [],
                      })
                    }
                  >
                    Manage
                  </button>
                </div>
                <div className="utility-watchlist-price">
                  {selected.last ? fmtPrice(selected.last) : "-"}
                  <span
                    className={
                      selected.change >= 0
                        ? "watchlist-positive"
                        : "watchlist-negative"
                    }
                  >
                    {selected.change > 0 ? "+" : ""}
                    {selected.change.toFixed(2)}{" "}
                    {selected.changePct > 0 ? "+" : ""}
                    {selected.changePct.toFixed(2)}%
                  </span>
                </div>
                <div className="utility-watchlist-status">
                  <i /> Latest available quote
                </div>
                <dl className="utility-watchlist-stats">
                  <div>
                    <dt>Previous close</dt>
                    <dd>{selected.previousClose ? fmtPrice(selected.previousClose) : "-"}</dd>
                  </div>
                  <div>
                    <dt>Day range</dt>
                    <dd>
                      {selected.dayLow ? fmtPrice(selected.dayLow) : "-"} –{" "}
                      {selected.dayHigh ? fmtPrice(selected.dayHigh) : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Added price</dt>
                    <dd>{selected.added ? fmtPrice(selected.added) : "-"}</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>{selected.target ? fmtPrice(selected.target) : "-"}</dd>
                  </div>
                </dl>
                <div className="utility-watchlist-added">
                  Added {selected.addedDate || "date unavailable"}
                </div>
              </aside>
            )}
          </div>
        ) : (
          <Empty text="No saved watchlist yet. Add a symbol to start tracking market movement." />
        )}
      </section>
    );
  }
  function settings() {
    return (
      <div className="grid gap-4">
        <div className="flex gap-2 overflow-auto rounded-2xl border border-[#e3dccc] bg-white p-1">
          {[
            ["profile", "Profile"],
            ["accounts", "Accounts"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSettingsTab(id as "profile" | "accounts")}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                settingsTab === id
                  ? "bg-sage text-white shadow-sm"
                  : "text-[#17382b] hover:bg-[#eef5ee]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {settingsTab === "accounts" ? (
          accountsView()
        ) : (
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
        )}
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
      gratuityFields =
        d.moduleKey === "fixedIncome" &&
        key((computed as Record<string, any>).category) === "gratuity"
          ? [
              "calculation_date",
              "total_service",
              "eligible_years",
              "salary_basis",
              "gratuity_per_year",
              "gratuity_value",
              "tax_exempt_gratuity",
              "taxable_gratuity",
              "monthly_ctc_gratuity",
              "annual_ctc_gratuity",
              "eligibility_message",
            ]
          : [],
      fields = [
        ...new Set([
          ...d.cols,
          ...def.fields.map((f) => f.name),
          ...gratuityFields,
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
          computed[f] !== null &&
          (d.moduleKey !== "insurance" ||
            showInsuranceDetailField(f, computed as Record<string, any>)) &&
          (d.moduleKey !== "fixedIncome" ||
            showFixedIncomeField(f, key((computed as Record<string, any>).category))),
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
          <div className="fixed bottom-5 right-5 z-[70] flex gap-2 rounded-full border border-[#e3dccc] bg-[#FFFFFF]/95 p-2 shadow-2xl backdrop-blur">
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
  function corporateActionModal() {
    const r = corporateAction!,
      c = computeLiveRecord("stocks", r.data),
      title = String(r.data?.security_name || "Stock"),
      currentAction = String(
        r.data?.corporate_action_type ||
          (r.data?.bonus_ratio ? "Bonus" : r.data?.split_ratio ? "Split" : ""),
      ),
      currentRatio = String(
        r.data?.corporate_action_ratio || r.data?.bonus_ratio || r.data?.split_ratio || "",
      ),
      currentExDate = String(
        r.data?.corporate_action_ex_date ||
          r.data?.ex_bonus_date ||
          r.data?.ex_split_date ||
          r.data?.ex_date ||
          "",
      ).slice(0, 10);
    return (
      <Modal
        title={`Corporate Action: ${compactName(title)}`}
        onClose={() => setCorporateAction(null)}
      >
        <form
          className="grid grid-cols-2 gap-3 max-md:grid-cols-1"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            saveCorporateAction(r, {
              corporate_action_type: String(fd.get("corporate_action_type") || ""),
              corporate_action_ratio: String(fd.get("corporate_action_ratio") || ""),
              corporate_action_ex_date: String(fd.get("corporate_action_ex_date") || ""),
              ex_base_price: num(fd.get("ex_base_price")),
            });
          }}
        >
          <div className="col-span-2 rounded-2xl border border-[#e3dccc] bg-[#fffaf0] p-3 text-sm text-[#4a3b45] max-md:col-span-1">
            <div className="font-semibold text-[#17382b]">{title}</div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs max-md:grid-cols-1">
              <span>Qty: {num(c.quantity).toLocaleString("en-IN")}</span>
              <span>Live: {fmtPrice(c.live_price)}</span>
              <span>Increase: {fmtSignedPrice(c.day_change)}</span>
            </div>
          </div>
          <div>
            <label className="field-label">Action</label>
            <select
              name="corporate_action_type"
              className="field-input"
              defaultValue={currentAction}
            >
              <option value="">None</option>
              <option value="Bonus">Bonus</option>
              <option value="Split">Split</option>
            </select>
          </div>
          <div>
            <label className="field-label">Ratio</label>
            <input
              name="corporate_action_ratio"
              className="field-input"
              placeholder="1:2"
              defaultValue={currentRatio}
            />
          </div>
          <div>
            <label className="field-label">Ex Date</label>
            <input
              name="corporate_action_ex_date"
              type="date"
              className="field-input"
              defaultValue={currentExDate}
            />
          </div>
          <div>
            <label className="field-label">Ex-Day Base Price</label>
            <input
              name="ex_base_price"
              className="field-input"
              inputMode="decimal"
              placeholder="2783"
              defaultValue={r.data?.ex_base_price || ""}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2 border-t border-[#e3dccc] pt-3 max-md:col-span-1">
            <button
              type="button"
              className="btn"
              onClick={() => setCorporateAction(null)}
            >
              Cancel
            </button>
            <button className="btn-primary">Save Corporate Action</button>
          </div>
        </form>
      </Modal>
    );
  }
  function recordModal() {
    const simpleStockFields = new Set([
      "account_name",
      "asset_type",
      "security_name",
      "quantity",
      "inv_price",
      "purchase_date",
      "broker",
      "notes",
    ]);
    const def = MODULES[editing!.moduleKey],
      raw = editing!.record?.data || editing!.defaults || {},
      cur = ["stocks", "watchlist"].includes(editing!.moduleKey)
        ? computedData(editing!.moduleKey, raw)
        : editing!.moduleKey === "fixedIncome"
          ? computeRecord("fixedIncome", raw)
          : editing!.moduleKey === "insurance"
            ? computeRecord("insurance", raw)
          : raw,
      matches = stockOpen
        ? stockResults.length
          ? stockResults
          : stockMatches(stockSearch)
        : [],
      fields =
        editing!.moduleKey === "fixedIncome"
          ? def.fields
              .filter((f) => showFixedIncomeField(f.name))
              .map((f) =>
                f.name === "employee_contribution" &&
                ["salary", "rentalincome"].includes(key(fixedIncomeType))
                  ? {
                      ...f,
                      label:
                        key(fixedIncomeType) === "salary"
                          ? "Monthly Salary"
                          : "Monthly Rent Received",
                    }
                  : f,
              )
          : editing!.moduleKey === "insurance"
            ? def.fields.filter((f) => showInsuranceField(f.name))
          : editing!.moduleKey === "stocks"
            ? def.fields.filter((f) => simpleStockFields.has(f.name))
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
            if (editing!.moduleKey === "bullion")
              fillBullionCosts(e.currentTarget);
            const t = e.target as HTMLInputElement | HTMLSelectElement;
            if (editing!.moduleKey === "property" && t.name === "rent_agreement_start_date") {
              const endField = e.currentTarget.querySelector<HTMLInputElement>(
                '[name="rent_agreement_end_date"]',
              );
              if (endField && !endField.value && t.value)
                endField.value = addMonthsIso(t.value, 11);
            }
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
              if (
                key(
                  (
                    e.currentTarget.querySelector(
                      '[name="category"]',
                    ) as HTMLSelectElement | null
                  )?.value || "",
                ) === "gratuity"
              )
                updateGratuityPreview(e.currentTarget);
            }
            if (editing!.moduleKey === "insurance") {
              if (t.name === "category") setInsuranceType(t.value);
              if (t.name === "return_of_premium")
                setInsuranceReturnPremium(t.value);
              if (
                ["premium_frequency", "premium_paying_term_type"].includes(
                  t.name,
                )
              )
                updateInsurancePremiumMode(
                  e.currentTarget,
                  t.name,
                  t.value,
                );
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget),
              data: any = ["stocks", "insurance"].includes(editing!.moduleKey)
                ? { ...raw }
                : {};
            def.fields.forEach((f) => {
              if (
                ["stocks", "insurance"].includes(editing!.moduleKey) &&
                !fd.has(f.name)
              )
                return;
              const v = fd.get(f.name) || "";
              data[f.name] = numericFieldNames.has(f.name) ? num(v) : v;
            });
            if (editing!.moduleKey === "fixedIncome") {
              data.category = fixedIncomeCategoryLabel(data.category);
              if (key(data.category) === "gratuity") {
                try {
                  const result = gratuityFromForm(e.currentTarget);
                  data.covered_under_gratuity_act =
                    data.covered_under_gratuity_act || "Yes";
                  Object.assign(data, {
                    calculation_date: result.calculationDate,
                    total_service: `${result.serviceYears} years, ${result.serviceMonths} months, ${result.serviceDays} days`,
                    service_years: result.serviceYears,
                    service_months: result.serviceMonths,
                    service_days: result.serviceDays,
                    eligible_years: result.eligibleYears,
                    salary_basis: result.salaryBasis,
                    gratuity_per_year: result.gratuityPerYear,
                    gratuity_value: result.totalGratuity,
                    tax_exempt_gratuity: result.taxExemptGratuity,
                    taxable_gratuity: result.taxableGratuity,
                    monthly_ctc_gratuity: result.monthlyCtcAccrual,
                    annual_ctc_gratuity: result.annualCtcAccrual,
                    gratuity_eligible: result.eligible,
                    eligibility_message: result.eligibilityMessage,
                    maturity_date: "",
                    interest_rate: 0,
                  });
                } catch (error: any) {
                  setToast(error?.message || "Check gratuity details");
                  return;
                }
              }
              if (isCompanyPfType(data.category)) {
                data.broker = "Govt";
                data.lock_in_years = "";
                data.maturity_date = "";
                data.maturity_value = "";
              }
            }
            if (editing!.moduleKey === "insurance") {
              if (
                key(data.premium_frequency) === "single" ||
                key(data.premium_paying_term_type) === "singlepay"
              ) {
                data.premium_frequency = "Single";
                data.premium_paying_term_type = "Single Pay";
                data.premium_years_paid = 1;
                data.single_premium_paid = data.single_premium_paid || "Yes";
                data.premium_end_date = "";
                data.premium_due_date = "";
              }
              const errors = validateInsurancePolicy(data);
              if (errors.length) {
                setToast(errors[0]);
                return;
              }
              const normalized = normalizeInsurancePolicy(data);
              Object.assign(data, normalized, {
                category: normalized.category,
                policy_type: normalized.policy_type,
              });
            }
            saveRecord(editing!.moduleKey, data, editing!.record);
          }}
        >
          {editing!.moduleKey === "stocks" && (
            <div className="col-span-2 grid grid-cols-3 gap-3 rounded-2xl border border-[#e3dccc] bg-[#f7faf6] p-3 text-sm max-md:col-span-1 max-md:grid-cols-1">
              {[
                ["Current Price", num(cur.live_price) ? fmtPrice(cur.live_price) : "-"],
                ["Invested", num(cur.invested) ? fmt(cur.invested) : "-"],
                [
                  "Overall Gain",
                  num(cur.gain) ? `${num(cur.gain) > 0 ? "+" : ""}${fmt(cur.gain)}` : "-",
                  num(cur.gain) >= 0 ? "text-emerald-700" : "text-red-700",
                ],
              ].map(([label, value, cls]) => (
                <div key={label} className="min-w-0">
                  <div className="field-label">{label}</div>
                  <div className={`truncate font-semibold tabular-nums ${cls || "text-[#17382b]"}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {fields.map((f) => (
            <div
              key={f.name}
              className={
                f.type === "textarea" ? "col-span-2 max-md:col-span-1" : ""
              }
            >
              <div className="flex items-center justify-between gap-2">
                <label className="field-label">
                  {editing!.moduleKey === "fixedIncome" &&
                  key(fixedIncomeType) === "gratuity" &&
                  f.name === "purchase_date"
                    ? "Date of Joining (DOJ)"
                    : f.label}
                </label>
                {editing!.moduleKey === "bullion" && f.name === "city" && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#7a1248] underline"
                    disabled={bullionLocating}
                    onClick={(e) =>
                      detectCurrentBullionCity(e.currentTarget.form)
                    }
                  >
                    {bullionLocating ? "Locating..." : "Use current city"}
                  </button>
                )}
              </div>
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
                      : editing!.moduleKey === "fixedIncome" &&
                          f.name === "covered_under_gratuity_act"
                        ? cur[f.name] || "Yes"
                      : editing!.moduleKey === "insurance" &&
                          f.name === "single_premium_paid" &&
                          key(insurancePremiumFrequency) === "single"
                        ? cur[f.name] || "Yes"
                      : ["stocks", "watchlist"].includes(editing!.moduleKey) &&
                          f.name === "asset_type"
                        ? cur[f.name] || "Stock"
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
                    if (
                      editing!.moduleKey === "insurance" &&
                      f.name === "category"
                    )
                      setInsuranceType(e.currentTarget.value);
                    if (
                      editing!.moduleKey === "insurance" &&
                      f.name === "return_of_premium"
                    )
                      setInsuranceReturnPremium(e.currentTarget.value);
                    if (
                      editing!.moduleKey === "insurance" &&
                      [
                        "premium_frequency",
                        "premium_paying_term_type",
                      ].includes(f.name)
                    )
                      updateInsurancePremiumMode(
                        e.currentTarget.form,
                        f.name,
                        e.currentTarget.value,
                      );
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
                  required={
                    editing!.moduleKey === "fixedIncome" &&
                    key(fixedIncomeType) === "gratuity" &&
                    ["purchase_date", "monthly_basic_salary"].includes(f.name)
                  }
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
                      ? ["latitude", "longitude"].includes(f.name)
                        ? cur[f.name] === undefined || cur[f.name] === ""
                          ? ""
                          : Number(cur[f.name]).toFixed(6)
                        : fmtInr(cur[f.name])
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
          {editing!.moduleKey === "fixedIncome" &&
            key(fixedIncomeType) === "gratuity" && (
              <div className="col-span-2 max-md:col-span-1">
                <div className="rounded-2xl border border-[#d8cba9] bg-[#fffaf0] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-[#17382b]">
                        Gratuity calculation
                      </h4>
                      <p className="mt-1 text-xs text-gray-600">
                        Payment of Gratuity Act basis: (Basic + DA) × 15 ÷ 26 × eligible years.
                      </p>
                    </div>
                    {gratuityPreview?.eligible !== undefined && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          gratuityPreview.eligible
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {gratuityPreview.eligible ? "Eligible" : "Not eligible"}
                      </span>
                    )}
                  </div>
                  {gratuityPreview?.error ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                      {gratuityPreview.error}
                    </div>
                  ) : gratuityPreview ? (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
                        {[
                          ["DOJ", gratuityPreview.dateOfJoining],
                          ["Calculation date", gratuityPreview.calculationDate],
                          [
                            "Total service",
                            `${gratuityPreview.serviceYears} years, ${gratuityPreview.serviceMonths} months, ${gratuityPreview.serviceDays} days`,
                          ],
                          ["Eligible years", String(gratuityPreview.eligibleYears)],
                          ["Monthly Basic + DA", fmt(gratuityPreview.salaryBasis)],
                          ["Gratuity per year", fmt(gratuityPreview.gratuityPerYear)],
                          ["Total gratuity payable", fmt(gratuityPreview.totalGratuity)],
                          ["Tax-exempt amount", fmt(gratuityPreview.taxExemptGratuity)],
                          ["Taxable amount", fmt(gratuityPreview.taxableGratuity)],
                          ["Monthly CTC accrual", fmt(gratuityPreview.monthlyCtcAccrual)],
                          ["Annual CTC accrual", fmt(gratuityPreview.annualCtcAccrual)],
                          [
                            "Covered under Act",
                            gratuityPreview.coveredUnderAct ? "Yes" : "No",
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-[#e3dccc] bg-white px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                              {label}
                            </div>
                            <div className="mt-1 font-semibold tabular-nums text-[#17382b]">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                          gratuityPreview.eligible
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {gratuityPreview.eligibilityMessage}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
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
          <div className="sticky bottom-0 col-span-2 flex justify-end gap-2 border-t border-[#e3dccc] bg-[#FFFFFF]/95 py-3 backdrop-blur max-md:col-span-1">
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
    set("asset_type", s.asset_type || "Stock");
    try {
      const res = await quoteFetch(
        `/api/quote?symbol=${encodeURIComponent(s.ticker)}&exchange=${encodeURIComponent(s.exchange)}&name=${encodeURIComponent(s.name)}${quoteProviderParam()}`,
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
