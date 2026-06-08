export const num=(v:any)=>{if(v===null||v===undefined||v==='')return 0;const n=Number(String(v).replace(/,/g,'').replace(/[₹%\s]/g,''));return Number.isFinite(n)?n:0};
export const fmt=(v:any)=>'₹'+Math.round(num(v)).toLocaleString('en-IN');
export const fmtInr=(v:any,decimals=2)=>num(v).toLocaleString('en-IN',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
export const pct=(v:any)=>`${num(v).toFixed(2)}%`;

const months=(a:Date,b:Date)=>Math.max(1,(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth());
const years=(d:any)=>{const start=d?new Date(d):new Date();if(Number.isNaN(start.getTime()))return 0;const now=new Date();let y=now.getFullYear()-start.getFullYear();if(now.getMonth()<start.getMonth()||(now.getMonth()===start.getMonth()&&now.getDate()<start.getDate()))y--;return Math.max(0,y)}
const monthSpan=(d:any)=>{const start=d?new Date(d):new Date();if(Number.isNaN(start.getTime()))return 0;const now=new Date();return Math.max(0,(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth())}
const typeKey=(r:any)=>String(r.category||'').toLowerCase();
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
  let balance=initial*Math.pow(1+rate,Math.max(0,periodYears));
  for(let i=1;i<=Math.floor(Math.max(0,periodYears));i++)balance+=yearly*Math.pow(1+rate,periodYears-i);
  return balance;
}

function fixedIncomeInvested(r:any,periodYears:number){
  const initial=num(r.gratuity_value)||num(r.initial_investment)||num(r.investment_amount),yearly=num(r.yearly_investment),monthly=num(r.employee_contribution)+num(r.company_contribution);
  if(isPf(r))return initial+(monthly*Math.max(0,Math.round(periodYears*12)));
  if(isAnnualAccount(r))return initial+(yearly*Math.floor(Math.max(0,periodYears)));
  return initial+(yearly*Math.floor(Math.max(0,periodYears)));
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

function fixedIncomeRecord(r:any){const elapsed=years(fiBaseDate(r));if(isCompanyPf(r))r.broker='Govt';r.maturity_date=isCompanyPf(r)?'':fixedIncomeMaturityDate(r)||r.maturity_date;r.invested=fixedIncomeInvested(r,elapsed);r.interest_incurred_fy=fixedIncomeInterestIncurredFy(r);r.worth_till_date=fixedIncomeWorthTillDate(r);r.latest=r.worth_till_date;r.maturity_value=isCompanyPf(r)?'':fixedIncomeMaturityValue(r);r.year_end_maturity_value=fixedIncomeYearEndValue(r);r.locked_until=r.maturity_date||'';return r}

function projectLoanFuture(r:any){
  const balance=num(r.loan_balance),rate=num(r.loan_interest_rate)/100/12,tenure=num(r.loan_tenure_months)||num(r.emis_left)||0;
  if(!balance||!tenure||!rate)return{remaining:balance,totalInterest:0,emiFuture:0,monthlyEmi:0,monthsLeft:tenure};
  const emi=tenure>0?(balance*rate*(Math.pow(1+rate,tenure)))/((Math.pow(1+rate,tenure))-1):0,totalInterest=Math.max(0,emi*tenure-balance);
  return{remaining:balance,emiFuture:emi*tenure,totalInterest,monthlyEmi:emi,monthsLeft:tenure};
}

function insurancePremiumYears(r:any,asOf=new Date()){
  const start=localDate(r.policy_start_date);
  if(!start)return num(r.annual_premium)?1:0;
  const today=new Date(asOf.getFullYear(),asOf.getMonth(),asOf.getDate());
  if(start>today)return 0;
  let completed=today.getFullYear()-start.getFullYear();
  if(today.getMonth()<start.getMonth()||(today.getMonth()===start.getMonth()&&today.getDate()<start.getDate()))completed--;
  return Math.max(1,completed+1);
}

function insuranceCurrentValue(r:any){
  const insurer=String(r.broker||r.insurer||'').toLowerCase(),
    lic=/\blic\b|life insurance corporation/.test(insurer),
    closed=String(r.status||'').toLowerCase()==='closed',
    deathCoverActive=String(r.death_cover_after_closure||'').toLowerCase()==='yes';
  r.death_cover_value=closed&&deathCoverActive?num(r.sum_assured):0;
  if(closed){r.policy_years_paid=0;r.premiums_paid_to_date=0;r.yearly_bonus=0;r.lic_bonus=0;return 0}
  r.policy_years_paid=insurancePremiumYears(r);
  r.premiums_paid_to_date=num(r.annual_premium)*r.policy_years_paid;
  r.yearly_bonus=lic?num(r.sum_assured)*0.06:0;
  r.lic_bonus=r.yearly_bonus*r.policy_years_paid;
  if(lic)return r.premiums_paid_to_date+r.lic_bonus;
  const hasCurrentValue=r.current_value_including_bonus!==null&&r.current_value_including_bonus!==undefined&&String(r.current_value_including_bonus).trim()!=='';
  return hasCurrentValue?num(r.current_value_including_bonus):num(r.payout_value);
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
    latest=num(r.latest_value)||adjustedQty*live,
    exBase=num(r.ex_base_price||r.ex_day_start_price||r.ex_open_price||r.day_start_price||r.open_price),
    basePrice=actionActive&&exBase?exBase:num(r.inv_price),
    invested=actionActive&&exBase?adjustedQty*basePrice:(num(r.investment_amount)||(adjustedQty*basePrice));
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

export function computeRecord(k:string,r0:any){const r={...r0};if(k==='stocks'){stockRecord(r)}else if(k==='mutualFunds'){r.invested=num(r.investment_amount)||num(r.quantity)*num(r.nav);r.latest=num(r.latest_value)||num(r.quantity)*num(r.live_nav)}else if(k==='bullion'){const tracked=num(r.metal_cost)+num(r.making_charges)+num(r.gst_paid)+num(r.other_costs);r.invested=num(r.purchase_price)||tracked;r.purchase_price=r.invested;r.latest=num(r.latest_value)||r.invested}else if(['nsel','otherAssets'].includes(k)){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested}else if(k==='property'){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested;r.balance=num(r.loan_balance)||(num(r.loan_amount)-num(r.principal_paid));r.loan_balance=r.balance;const lf=projectLoanFuture(r);r.emiFuture=lf.emiFuture;r.monthly_emi=lf.monthlyEmi;r.interest_rate=num(r.loan_interest_rate);r.emis_left=lf.monthsLeft}else if(k==='fixedIncome'){fixedIncomeRecord(r)}else if(k==='ulips'){r.invested=num(r.investment_amount)||num(r.premium_amount);r.latest=num(r.latest_value)||r.invested}else if(k==='insurance'){r.latest=insuranceCurrentValue(r);r.invested=num(r.premiums_paid_to_date)}else if(['loans','borrowings'].includes(k)){r.balance=num(r.loan_balance)||(num(r.loan_amount)-num(r.principal_paid));r.loan_balance=r.balance;r.latest=r.balance}else if(k==='goals'){r.gap=Math.max(0,num(r.target_amount)-num(r.current_value));r.monthly_required=r.gap/months(new Date(),new Date(r.target_date||new Date()))}r.gain=k==='insurance'?0:num(r.latest)-num(r.invested);r.gain_pct=k==='insurance'?0:num(r.invested)?r.gain/num(r.invested)*100:0;return r}
export function computeTotals(records:any[]){let assets=0,liabilities=0,invested=0,gain=0;records.forEach(rec=>{const k=rec.module_key,c=computeRecord(k,rec.data); if(['stocks','mutualFunds','ulips','bullion','nsel','fixedIncome','property','otherAssets'].includes(k)){assets+=num(c.latest);invested+=num(c.invested);gain+=num(c.gain)} if(k==='insurance')assets+=num(c.latest);if(['loans','borrowings'].includes(k))liabilities+=num(c.balance);if(k==='property')liabilities+=num(c.balance)});return{assets,liabilities,net:assets-liabilities,invested,gain}}
