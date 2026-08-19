import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ollamaUrl = (process.env.OLLAMA_URL?.trim() || "http://localhost:11434").replace(/\/+$/, "");
const ollamaModel = process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b-instruct";

const forecastInstructions =
  "You are a careful financial planning assistant for an Indian personal asset tracker. You are given a sanitized numeric projection (not real-time market data) and the user's stated assumptions. Ground your commentary in general, well-known long-run trends for Indian equities, gold and fixed income (e.g. multi-decade historical index behavior, typical inflation ranges, typical sequence-of-returns risk near retirement) — never invent specific prices, news, or guaranteed returns. Point out where the user's assumed return or contribution looks optimistic or conservative versus typical long-run ranges, and note concrete risks (inflation eroding real returns, contribution gaps if income stops, concentration in one asset class). Keep it educational, not regulated investment advice. Respond ONLY with JSON matching the schema.";

const outputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    outlook: { type: "string" },
    realism_check: { type: "string" },
    trend_context: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "outlook",
    "realism_check",
    "trend_context",
    "risks",
    "suggestions",
    "disclaimer",
  ],
};

function jsonError(message: string, status = 500, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

async function requireUser(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: jsonError("Missing Supabase server environment variables.", 500) };
  }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: jsonError("Missing authorization token.", 401) };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { error: jsonError("Invalid session.", 401) };
  return { user };
}

function amount(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function text(value: any, max = 200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeInputs(raw: any) {
  return {
    currency: "INR",
    horizonYears: Math.max(1, Math.min(30, Math.round(amount(raw?.horizonYears)))),
    currentNetWorth: amount(raw?.currentNetWorth),
    monthlyInvestment: amount(raw?.monthlyInvestment),
    monthlyInvestmentUntilYears: Math.max(0, Math.round(amount(raw?.monthlyInvestmentUntilYears))),
    yearlyLumpSum: amount(raw?.yearlyLumpSum),
    otherMonthlyIncome: amount(raw?.otherMonthlyIncome),
    assumedAnnualReturnPct: amount(raw?.assumedAnnualReturnPct),
    sharesHistoricalReturnPct: amount(raw?.sharesHistoricalReturnPct),
    goldHistoricalReturnPct: amount(raw?.goldHistoricalReturnPct),
    projectedValueContinuing: amount(raw?.projectedValueContinuing),
    projectedValueTrendOnly: amount(raw?.projectedValueTrendOnly),
    assetMix: Array.isArray(raw?.assetMix)
      ? raw.assetMix.slice(0, 8).map((r: any) => ({
          assetClass: text(r?.assetClass, 40),
          value: amount(r?.value),
        }))
      : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const inputs = sanitizeInputs(body?.inputs);
    if (!inputs.currentNetWorth && !inputs.projectedValueContinuing) {
      return jsonError("Add investment data before generating a forecast.", 400);
    }

    const ping = await fetch(`${ollamaUrl}/api/version`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    if (!ping || !ping.ok) {
      return jsonError(
        `Could not reach Ollama at ${ollamaUrl}. This forecast only works while a local Ollama server is running (e.g. \`ollama serve\`) on the machine hosting this app.`,
        503,
        "OLLAMA_UNREACHABLE",
      );
    }

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: "system", content: forecastInstructions },
          {
            role: "user",
            content: `Sanitized projection inputs and outputs (INR):\n${JSON.stringify(inputs)}`,
          },
        ],
        format: outputSchema,
        stream: false,
        options: { temperature: 0.3 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    const body2 = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonError(body2?.error || "Ollama request failed.", 502, "OLLAMA_REQUEST_FAILED");
    }
    const raw = body2?.message?.content;
    if (!raw) return jsonError("Ollama response did not contain a forecast.", 502);
    const forecast = JSON.parse(raw);
    return NextResponse.json(
      { forecast, model: `Ollama / ${ollamaModel}`, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error: any) {
    const message =
      error?.name === "TimeoutError"
        ? "Forecast timed out. The local model may be slow to respond — try again."
        : error?.message || "Forecast failed.";
    return jsonError(message, 500, "WEALTH_FORECAST_FAILED");
  }
}
