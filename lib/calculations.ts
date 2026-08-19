export const num=(v:any)=>{if(v===null||v===undefined||v==='')return 0;const n=Number(String(v).replace(/,/g,'').replace(/[₹%\s]/g,''));return Number.isFinite(n)?n:0};
export const fmt=(v:any)=>'₹'+Math.round(num(v)).toLocaleString('en-IN');
export const fmtInr=(v:any,decimals=2)=>num(v).toLocaleString('en-IN',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
export const pct=(v:any)=>`${num(v).toFixed(2)}%`;

export type IndianGratuityInput={
  dateOfJoining:string;
  calculationDate?:string;
  monthlyBasicSalary:number|string;
  monthlyDA?:number|string;
  coveredUnderAct?:boolean|string;
};

export type IndianGratuityResult={
  dateOfJoining:string;
  calculationDate:string;
  serviceYears:number;
  serviceMonths:number;
  serviceDays:number;
  completedYears:number;
  eligibleYears:number;
  salaryBasis:number;
  gratuityPerYear:number;
  totalGratuity:number;
  taxExemptGratuity:number;
  taxableGratuity:number;
  monthlyCtcAccrual:number;
  annualCtcAccrual:number;
  coveredUnderAct:boolean;
  eligible:boolean;
  eligibilityMessage:string;
};

const dateIsoIndia=(date:Date)=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),part=(type:string)=>parts.find(item=>item.type===type)?.value||'';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

function strictLocalDate(value:string,label:string){
  const text=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new Error(`${label} is required.`);
  const [year,month,day]=text.split('-').map(Number),date=new Date(year,month-1,day);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)throw new Error(`${label} must be a valid date.`);
  return date;
}

function addCalendarYears(date:Date,count:number){
  const result=new Date(date.getFullYear()+count,date.getMonth(),1),lastDay=new Date(result.getFullYear(),result.getMonth()+1,0).getDate();
  result.setDate(Math.min(date.getDate(),lastDay));
  return result;
}

function addCalendarMonths(date:Date,count:number){
  const result=new Date(date.getFullYear(),date.getMonth()+count,1),lastDay=new Date(result.getFullYear(),result.getMonth()+1,0).getDate();
  result.setDate(Math.min(date.getDate(),lastDay));
  return result;
}

/** Calculates Indian gratuity using the Payment of Gratuity Act 15/26 basis. */
export function calculateIndianGratuity(input:IndianGratuityInput):IndianGratuityResult{
  const today=dateIsoIndia(new Date()),dateOfJoining=String(input.dateOfJoining||'').trim(),calculationDate=String(input.calculationDate||today).trim(),
    start=strictLocalDate(dateOfJoining,'Date of Joining'),end=strictLocalDate(calculationDate,'Calculation date'),
    basic=num(input.monthlyBasicSalary),da=num(input.monthlyDA),coveredUnderAct=input.coveredUnderAct===undefined||input.coveredUnderAct===true||/^(yes|true)$/i.test(String(input.coveredUnderAct));
  if(start>end)throw new Error('Date of Joining cannot be after Calculation Date.');
  if(basic<=0)throw new Error('Monthly Basic Salary must be greater than 0.');
  if(da<0)throw new Error('Monthly DA cannot be negative.');
  let serviceYears=end.getFullYear()-start.getFullYear();
  if(addCalendarYears(start,serviceYears)>end)serviceYears--;
  const afterYears=addCalendarYears(start,serviceYears);
  let serviceMonths=(end.getFullYear()-afterYears.getFullYear())*12+end.getMonth()-afterYears.getMonth();
  if(addCalendarMonths(afterYears,serviceMonths)>end)serviceMonths--;
  const afterMonths=addCalendarMonths(afterYears,serviceMonths),serviceDays=Math.round((end.getTime()-afterMonths.getTime())/86400000),
    completedYears=Math.max(0,serviceYears),roundUp=serviceMonths>6||(serviceMonths===6&&serviceDays>0),eligible=completedYears>=5,
    eligibleYears=eligible?completedYears+(roundUp?1:0):0,salaryBasis=basic+da,
    gratuityPerYear=Math.round(salaryBasis*15/26),totalGratuity=eligible?Math.round(salaryBasis*15/26*eligibleYears):0,
    taxExemptGratuity=Math.min(totalGratuity,2000000),taxableGratuity=Math.max(0,totalGratuity-taxExemptGratuity),
    monthlyCtcAccrual=Math.round(salaryBasis*0.0481),annualCtcAccrual=Math.round(salaryBasis*0.0481*12);
  return{dateOfJoining,calculationDate,serviceYears:completedYears,serviceMonths,serviceDays,completedYears,eligibleYears,salaryBasis,gratuityPerYear,totalGratuity,taxExemptGratuity,taxableGratuity,monthlyCtcAccrual,annualCtcAccrual,coveredUnderAct,eligible,eligibilityMessage:eligible?'Eligible for gratuity.':'Not eligible for gratuity, except in case of death or disability.'};
}

const months=(a:Date,b:Date)=>Math.max(1,(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth());
const years=(d:any)=>{const start=d?new Date(d):new Date();if(Number.isNaN(start.getTime()))return 0;const now=new Date();let y=now.getFullYear()-start.getFullYear();if(now.getMonth()<start.getMonth()||(now.getMonth()===start.getMonth()&&now.getDate()<start.getDate()))y--;return Math.max(0,y)}
const monthSpan=(d:any)=>{const start=d?new Date(d):new Date();if(Number.isNaN(start.getTime()))return 0;const now=new Date();return Math.max(0,(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth())}
const typeKey=(r:any)=>String(r.category||'').toLowerCase();
const isGratuity=(r:any)=>/gratuity/.test(typeKey(r));
const isAnnualAccount=(r:any)=>/ppf|sukanya|gratuity/.test(typeKey(r));
const isPf=(r:any)=>/^epf$|^pf$|company\s*pf|provident/.test(typeKey(r));
const isCompanyPf=(r:any)=>/^pf$|company\s*pf/.test(typeKey(r));
const fiBaseDate=(r:any)=>r.purchase_date||r.account_creation_date;

export function fixedIncomeMaturityDate(r:any){if(isCompanyPf(r))return '';const base=fiBaseDate(r),lock=num(r.lock_in_years);if(!base||!lock)return '';const d=new Date(base);if(Number.isNaN(d.getTime()))return '';d.setMonth(d.getMonth()+Math.round(lock*12));return d.toISOString().slice(0,10)}
const yearEndFraction=()=>{const now=new Date(),fyStart=new Date(now.getFullYear()-(now.getMonth()<3?1:0),3,1),fyEnd=new Date(fyStart.getFullYear()+1,2,31);return Math.max(0,(fyEnd.getTime()-now.getTime())/(fyEnd.getTime()-fyStart.getTime()))}
const yearsUntil=(date:any)=>{const end=date?new Date(date):new Date();if(Number.isNaN(end.getTime()))return 0;const now=new Date();return Math.max(0,(end.getTime()-now.getTime())/(365.25*24*60*60*1000))}

function projectedFixedIncomeValue(r:any,periodYears:number){
  const rate=num(r.interest_rate)/100,initial=num(r.gratuity_value)||num(r.initial_investment)||num(r.investment_amount),yearly=num(r.yearly_investment),monthly=num(r.employee_contribution)+num(r.company_contribution);
  if(isPf(r)){
    const ratePerMonth=rate/12,monthsCount=Math.max(0,Math.round(periodYears*12));
    let balance=initial;
    for(let i=0;i<monthsCount;i++)balance=(balance+monthly)*(1+ratePerMonth);
    return balance;
  }
  if(isAnnualAccount(r)){
    const fullYears=Math.floor(Math.max(0,periodYears)),partial=Math.max(0,periodYears-fullYears);
    let balance=initial;
    for(let i=0;i<fullYears;i++)balance=(balance+yearly)*(1+rate);
    if(partial)balance=balance*(1+(rate*partial));
    return balance;
  }
  const effectiveYearly=yearly+monthly*12;
  let balance=initial*Math.pow(1+rate,Math.max(0,periodYears));
  for(let i=1;i<=Math.floor(Math.max(0,periodYears));i++)balance+=effectiveYearly*Math.pow(1+rate,periodYears-i);
  return balance;
}

function fixedIncomeInvested(r:any,periodYears:number){
  const initial=num(r.gratuity_value)||num(r.initial_investment)||num(r.investment_amount),yearly=num(r.yearly_investment),monthly=num(r.employee_contribution)+num(r.company_contribution);
  if(isPf(r))return initial+(monthly*Math.max(0,Math.round(periodYears*12)));
  if(isAnnualAccount(r))return initial+(yearly*Math.floor(Math.max(0,periodYears)));
  return initial+(yearly*Math.floor(Math.max(0,periodYears)))+(monthly*monthSpan(fiBaseDate(r)));
}

function fixedIncomeBaseValue(r:any){
  const elapsed=years(fiBaseDate(r));
  return num(r.current_value_today)||num(r.latest_value)||num(r.gratuity_value)||projectedFixedIncomeValue(r,elapsed)||num(r.maturity_value)||fixedIncomeInvested(r,elapsed);
}

function fyStartDate(asOf:Date){
  return new Date(asOf.getFullYear()-(asOf.getMonth()<3?1:0),3,1);
}

function monthCountInclusive(start:Date,end:Date){
  if(start>end)return 0;
  return Math.max(0,(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth()+1);
}

function localDate(v:any){
  const value=String(v||'').slice(0,10);
  if(!value)return null;
  const date=new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())?null:date;
}

export function fixedIncomeInterestIncurredFy(r:any,asOf=new Date()){
  if(isPf(r))return pfMonthlyFyProjection(r,asOf).interest;
  const rate=num(r.interest_rate)/100,base=fixedIncomeBaseValue(r);
  if(!rate||!base)return 0;
  const fyStart=fyStartDate(asOf),
    investmentDate=localDate(fiBaseDate(r)),
    start=investmentDate&&investmentDate>fyStart?investmentDate:fyStart,
    today=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate()),
    days=Math.max(0,(today.getTime()-start.getTime())/(24*60*60*1000));
  return base*rate*(days/365);
}

function pfMonthlyFyProjection(r:any,asOf=new Date()){
  const base=fixedIncomeBaseValue(r),ratePerMonth=num(r.interest_rate)/100/12,monthly=num(r.employee_contribution)+num(r.company_contribution);
  if(!base&&!monthly)return{base,contributions:0,interest:0,latest:0};
  const investmentDate=localDate(fiBaseDate(r)),fyStart=fyStartDate(asOf),start=investmentDate&&investmentDate>fyStart?investmentDate:fyStart,today=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate()),monthsCount=Math.min(12,monthCountInclusive(start,today));
  let balance=base,contributions=0,interest=0;
  for(let i=0;i<monthsCount;i++){
    balance+=monthly;
    contributions+=monthly;
    const monthlyInterest=balance*ratePerMonth;
    interest+=monthlyInterest;
    balance+=monthlyInterest;
  }
  return{base,contributions,interest,latest:balance};
}

function pfYearEndValue(r:any,asOf=new Date()){
  const current=pfMonthlyFyProjection(r,asOf),ratePerMonth=num(r.interest_rate)/100/12,monthly=num(r.employee_contribution)+num(r.company_contribution),fyEnd=new Date(fyStartDate(asOf).getFullYear()+1,2,31);
  let balance=current.latest;
  const nextMonth=new Date(asOf.getFullYear(),asOf.getMonth()+1,1),monthsLeft=Math.max(0,(fyEnd.getFullYear()-nextMonth.getFullYear())*12+fyEnd.getMonth()-nextMonth.getMonth()+1);
  for(let i=0;i<monthsLeft;i++)balance=(balance+monthly)*(1+ratePerMonth);
  return balance;
}

export function fixedIncomeWorthTillDate(r:any){return isPf(r)?pfMonthlyFyProjection(r).latest:fixedIncomeBaseValue(r)+fixedIncomeInterestIncurredFy(r)}
export function fixedIncomeYearEndValue(r:any){if(isPf(r))return pfYearEndValue(r);const current=fixedIncomeWorthTillDate(r),rate=num(r.interest_rate)/100;return current*Math.pow(1+rate,yearEndFraction())}
export function fixedIncomeMaturityValue(r:any){if(isCompanyPf(r))return 0;const current=fixedIncomeWorthTillDate(r),rate=num(r.interest_rate)/100,maturity=fixedIncomeMaturityDate(r),period=maturity?yearsUntil(maturity):(num(r.lock_in_years)||years(fiBaseDate(r)));return current*Math.pow(1+rate,period)||num(r.maturity_value)}

function fixedIncomeRecord(r:any){
  if(isGratuity(r)&&r.purchase_date&&num(r.monthly_basic_salary)>0){
    const result=calculateIndianGratuity({dateOfJoining:r.purchase_date,calculationDate:r.last_working_date||undefined,monthlyBasicSalary:r.monthly_basic_salary,monthlyDA:r.monthly_da,coveredUnderAct:r.covered_under_gratuity_act});
    Object.assign(r,{calculation_date:result.calculationDate,total_service:`${result.serviceYears} years, ${result.serviceMonths} months, ${result.serviceDays} days`,service_years:result.serviceYears,service_months:result.serviceMonths,service_days:result.serviceDays,eligible_years:result.eligibleYears,salary_basis:result.salaryBasis,gratuity_per_year:result.gratuityPerYear,gratuity_value:result.totalGratuity,tax_exempt_gratuity:result.taxExemptGratuity,taxable_gratuity:result.taxableGratuity,monthly_ctc_gratuity:result.monthlyCtcAccrual,annual_ctc_gratuity:result.annualCtcAccrual,gratuity_eligible:result.eligible,eligibility_message:result.eligibilityMessage,invested:0,interest_incurred_fy:0,current_value_today:result.totalGratuity,worth_till_date:result.totalGratuity,latest:result.totalGratuity,year_end_maturity_value:result.totalGratuity,maturity_value:result.totalGratuity,maturity_date:'',locked_until:''});
    return r;
  }
  const elapsed=years(fiBaseDate(r));if(isCompanyPf(r))r.broker='Govt';r.maturity_date=isCompanyPf(r)?'':fixedIncomeMaturityDate(r)||r.maturity_date;r.invested=fixedIncomeInvested(r,elapsed);r.interest_incurred_fy=fixedIncomeInterestIncurredFy(r);r.worth_till_date=fixedIncomeWorthTillDate(r);r.latest=r.worth_till_date;r.maturity_value=isCompanyPf(r)?'':fixedIncomeMaturityValue(r);r.year_end_maturity_value=fixedIncomeYearEndValue(r);r.locked_until=r.maturity_date||'';
  if(/^salary$|^rental\s*income$/.test(typeKey(r)))r.yearly_total_value=(num(r.employee_contribution)+num(r.company_contribution))*12;
  return r
}

function projectLoanFuture(r:any){
  const balance=num(r.loan_balance),rate=num(r.loan_interest_rate)/100/12,tenure=num(r.loan_tenure_months)||num(r.emis_left)||0;
  if(!balance||!tenure||!rate)return{remaining:balance,totalInterest:0,emiFuture:0,monthlyEmi:0,monthsLeft:tenure};
  const emi=tenure>0?(balance*rate*(Math.pow(1+rate,tenure)))/((Math.pow(1+rate,tenure))-1):0,totalInterest=Math.max(0,emi*tenure-balance);
  return{remaining:balance,emiFuture:emi*tenure,totalInterest,monthlyEmi:emi,monthsLeft:tenure};
}

function insuranceRecord(r:any){
  const policy=normalizeInsurancePolicy(r),calculated=calculateInsurance(policy);
  Object.assign(r,policy,{
    policy_type:calculated.policyType,
    category:calculated.policyTypeLabel,
    annual_premium:calculated.annualPremium,
    premiums_paid_to_date:calculated.premiumsPaidTillDate,
    completed_policy_years:calculated.completedPolicyYears,
    policy_years_paid:calculated.premiumYearsPaid,
    premium_years_paid:calculated.premiumYearsPaid,
    bonus_accrued_till_date:calculated.bonusAccruedTillDate,
    lic_bonus:calculated.bonusAccruedTillDate,
    current_value:calculated.currentValue,
    current_value_including_bonus:calculated.currentValue,
    latest:calculated.currentValue,
    death_cover:calculated.deathCover,
    death_cover_value:calculated.deathCover,
    health_cover:calculated.healthCover,
    critical_illness_cover:calculated.criticalIllnessCover,
    maturity_value:calculated.maturityValue,
    money_back_received:calculated.moneyBackReceived,
    next_premium_due_date:calculated.nextPremiumDueDate,
    premium_status:calculated.premiumStatus,
    invested:calculated.premiumsPaidTillDate,
  });
  return r;
}

function isDateOnOrBeforeToday(v:any,asOf=new Date()){
  const d=localDate(v);
  if(!d)return false;
  const today=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate());
  return d<=today;
}

function ratioParts(value:any){
  const text=String(value||'').trim();
  const match=text.match(/(\d+(?:\.\d+)?)\s*(?::|for|\/)\s*(\d+(?:\.\d+)?)/i);
  if(!match)return null;
  const a=Number(match[1]),b=Number(match[2]);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=0)return null;
  return{a,b,label:`${a}:${b}`};
}

function corporateActionFactor(r:any){
  const action=String(r.corporate_action_type||r.action_type||r.stock_action||'').toLowerCase(),
    ratio=ratioParts(r.corporate_action_ratio||r.action_ratio||r.bonus_ratio||r.split_ratio);
  if(!ratio)return null;
  if(/split/.test(action))return{factor:ratio.a/ratio.b,label:ratio.label,type:'split'};
  if(/bonus/.test(action)||r.bonus_ratio)return{factor:1+(ratio.a/ratio.b),label:ratio.label,type:'bonus'};
  return null;
}

function stockRecord(r:any){
  const qty=num(r.quantity),
    action=corporateActionFactor(r),
    exDate=r.corporate_action_ex_date||r.ex_bonus_date||r.ex_split_date||r.ex_date,
    actionActive=Boolean(action&&isDateOnOrBeforeToday(exDate)),
    adjustedQty=actionActive?qty*Number(action?.factor||1):qty,
    live=num(r.live_price||r.current_price),
    latest=live&&adjustedQty?adjustedQty*live:num(r.latest_value),
    exBase=num(r.ex_base_price||r.ex_day_start_price||r.ex_open_price||r.day_start_price||r.open_price),
    basePrice=actionActive&&exBase?exBase:num(r.inv_price),
    invested=basePrice&&adjustedQty?adjustedQty*basePrice:num(r.investment_amount);
  r.quantity=adjustedQty;
  r.original_quantity=actionActive?qty:r.original_quantity;
  r.adjusted_quantity=actionActive?adjustedQty:r.adjusted_quantity;
  r.corporate_action_applied=actionActive;
  if(actionActive&&action){
    r.corporate_action_factor=action.factor;
    r.corporate_action_ratio=action.label;
    r.corporate_action_type=action.type;
    r.inv_price=basePrice;
    r.investment_amount=invested;
    if(exBase&&live){
      r.previous_close=exBase;
      r.day_change=live-exBase;
      r.change_pct=exBase?((live-exBase)/exBase)*100:0;
    }
  }
  r.invested=invested;
  r.latest=latest;
}

export function computeRecord(k:string,r0:any){const r={...r0};if(k==='stocks'){stockRecord(r)}else if(k==='mutualFunds'){r.invested=num(r.investment_amount)||num(r.quantity)*num(r.nav);r.latest=num(r.latest_value)||num(r.quantity)*num(r.live_nav)}else if(k==='bullion'){const tracked=num(r.metal_cost)+num(r.making_charges)+num(r.gst_paid)+num(r.other_costs);r.invested=num(r.purchase_price)||tracked;r.purchase_price=r.invested;r.latest=num(r.latest_value)||r.invested}else if(['nsel','otherAssets'].includes(k)){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested}else if(k==='property'){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested;r.balance=num(r.loan_balance)||(num(r.loan_amount)-num(r.principal_paid));r.loan_balance=r.balance;const lf=projectLoanFuture(r);r.emiFuture=lf.emiFuture;r.monthly_emi=lf.monthlyEmi;r.interest_rate=num(r.loan_interest_rate);r.emis_left=lf.monthsLeft}else if(k==='fixedIncome'){fixedIncomeRecord(r)}else if(k==='ulips'){r.invested=num(r.investment_amount)||num(r.premium_amount);r.latest=num(r.latest_value)||r.invested}else if(k==='insurance'){insuranceRecord(r)}else if(['loans','borrowings'].includes(k)){r.balance=num(r.loan_balance)||(num(r.loan_amount)-num(r.principal_paid));r.loan_balance=r.balance;r.latest=r.balance}else if(k==='goals'){r.gap=Math.max(0,num(r.target_amount)-num(r.current_value));r.monthly_required=r.gap/months(new Date(),new Date(r.target_date||new Date()))}r.gain=k==='insurance'?0:num(r.latest)-num(r.invested);r.gain_pct=k==='insurance'?0:num(r.invested)?r.gain/num(r.invested)*100:0;return r}
export function computeTotals(records:any[]){let assets=0,liabilities=0,invested=0,gain=0;records.forEach(rec=>{const k=rec.module_key,c=computeRecord(k,rec.data); if(['stocks','mutualFunds','ulips','bullion','nsel','fixedIncome','property','otherAssets'].includes(k)){assets+=num(c.latest);invested+=num(c.invested);gain+=num(c.gain)} if(k==='insurance')assets+=num(c.latest);if(['loans','borrowings'].includes(k))liabilities+=num(c.balance);if(k==='property')liabilities+=num(c.balance)});return{assets,liabilities,net:assets-liabilities,invested,gain}}
import { calculateInsurance, normalizeInsurancePolicy } from './insurance';
