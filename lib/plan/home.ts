// R4: homes you live in are kept for good, so they never fund goals or retirement. By default their own
// loans are left out with them (the setting `homeLoanAgainstPlan` puts the loan back, the cautious view).
import { computeRecord, num } from "../calculations";
import { isPrimaryResidence } from "../goals";
import { DEFAULT_PLAN_SETTINGS, type PlanSettings } from "./settings";

type Rec = { id: string; module_key: string; data: Record<string, any> | null };

export function livedInHomes(records: Rec[], settings: Pick<PlanSettings, "homeLoanAgainstPlan"> = DEFAULT_PLAN_SETTINGS) {
  const homes = records.filter((r) => r.module_key === "property" && isPrimaryResidence(r.data));
  const computed = homes.map((r) => computeRecord("property", r.data));
  return {
    records: homes,
    ids: new Set(homes.map((r) => r.id)),
    value: computed.reduce((s, c) => s + num(c.latest), 0),
    /** What is owed on those homes (the loan after money parked in OD, plus builder amounts), left out of goals. */
    loan: settings.homeLoanAgainstPlan ? 0 : computed.reduce((s, c) => s + num(c.net_loan_balance) + num(c.construction_owed), 0),
  };
}
