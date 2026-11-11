import { constructionSummary } from './construction';
export const num=(v:any)=>{if(v===null||v===undefined||v==='')return 0;const n=Number(String(v).replace(/,/g,'').replace(/[₹%\s]/g,''));return Number.isFinite(n)?n:0};
export const fmt=(v:any)=>'₹'+Math.round(num(v)).toLocaleString('en-IN');
export const fmtInr=(v:any,decimals=2)=>num(v).toLocaleString('en-IN',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
export const pct=(v:any)=>`${num(v).toFixed(2)}%`;

const MONTH_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ISO_DATE=/^(\d{4})-(\d{2})-(\d{2})$/,ISO_MONTH=/^(\d{4})-(\d{2})$/,ISO_TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const validMonth=(m:string)=>Number(m)>=1&&Number(m)<=12;
/** dd-MMM-yyyy, the app's date format, for a stored date or timestamp. Anything else is returned unchanged. */
export function formatDate(v:any):string{
  if(v instanceof Date||ISO_TIMESTAMP.test(String(v??'')))return formatDateTime(v).slice(0,11);
  const text=String(v??''),match=text.match(ISO_DATE);
  return match&&validMonth(match[2])?`${match[3]}-${MONTH_ABBR[Number(match[2])-1]}-${match[1]}`:text;
}
/** dd-MMM-yyyy HH:mm in India time. Anything that is not a date is returned unchanged. */
export function formatDateTime(v:any):string{
  const date=v instanceof Date?v:new Date(String(v??''));
  if(Number.isNaN(date.getTime()))return String(v??'');
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date),part=(type:string)=>parts.find(item=>item.type===type)?.value||'';
  return `${part('day')}-${MONTH_ABBR[Number(part('month'))-1]}-${part('year')} ${part('hour')}:${part('minute')}`;
}
/** MMM-yyyy for a stored month such as 2026-11. Anything else is returned unchanged. */
export function formatMonth(v:any):string{
  const text=String(v??''),match=text.match(ISO_MONTH)||text.match(/^(\d{4})-(\d{2})-\d{2}$/);
  return match&&validMonth(match[2])?`${MONTH_ABBR[Number(match[2])-1]}-${match[1]}`:text;
}
/** Formats a table value if it is a date, timestamp or month, and leaves everything else alone. */
export function formatDateValue(v:any):string{
  const text=String(v??'');
  if(ISO_TIMESTAMP.test(text))return formatDateTime(text);
  if(ISO_DATE.test(text))return formatDate(text);
  return ISO_MONTH.test(text)?formatMonth(text):text;
}

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
  // Contributions stop after the last working day (when employment ends); interest keeps accruing.
  const lastDay=r.last_working_date?localDate(r.last_working_date):null;
  let balance=base,contributions=0,interest=0;
  for(let i=0;i<monthsCount;i++){
    const contributing=!lastDay||new Date(start.getFullYear(),start.getMonth()+i,1)<=lastDay;
    if(contributing){balance+=monthly;contributions+=monthly}
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

export const isDividendIncome=(r:any)=>/^dividend/.test(typeKey(r));
export const isSavingsAccount=(r:any)=>/^savings/.test(typeKey(r));
export const isCashAtHome=(r:any)=>/^cash\s*at\s*home/.test(typeKey(r));

/** Salary, rent and dividends are money received each month, not holdings. */
export const isIncomeRecord=(r:any)=>isDividendIncome(r)||/^salary$|^rental\s*income$/.test(typeKey(r));

function fixedIncomeRecord(r:any){
  // Income is cash flow only: past salary or rent never builds up into an asset or net worth.
  if(isIncomeRecord(r)){Object.assign(r,{invested:0,latest:0,worth_till_date:0,interest_incurred_fy:0,year_end_maturity_value:0,maturity_value:'',maturity_date:'',locked_until:'',yearly_total_value:/^salary$/.test(typeKey(r))?'':num(r.employee_contribution)*12});return r}
  // Bank savings and cash at home are plain cash: the balance is its own cost, so it shows no gain.
  if(isSavingsAccount(r)||isCashAtHome(r)){const balance=num(r.current_value_today);Object.assign(r,{invested:balance,latest:balance,worth_till_date:balance,interest_incurred_fy:0,year_end_maturity_value:balance,maturity_value:'',maturity_date:'',locked_until:''});return r}
  if(isGratuity(r)&&r.purchase_date&&num(r.monthly_basic_salary)>0){
    const result=calculateIndianGratuity({dateOfJoining:r.purchase_date,calculationDate:r.last_working_date||undefined,monthlyBasicSalary:r.monthly_basic_salary,monthlyDA:r.monthly_da,coveredUnderAct:r.covered_under_gratuity_act});
    Object.assign(r,{calculation_date:result.calculationDate,total_service:`${result.serviceYears} years, ${result.serviceMonths} months, ${result.serviceDays} days`,service_years:result.serviceYears,service_months:result.serviceMonths,service_days:result.serviceDays,eligible_years:result.eligibleYears,salary_basis:result.salaryBasis,gratuity_per_year:result.gratuityPerYear,gratuity_value:result.totalGratuity,tax_exempt_gratuity:result.taxExemptGratuity,taxable_gratuity:result.taxableGratuity,monthly_ctc_gratuity:result.monthlyCtcAccrual,annual_ctc_gratuity:result.annualCtcAccrual,gratuity_eligible:result.eligible,eligibility_message:result.eligibilityMessage,invested:0,interest_incurred_fy:0,current_value_today:result.totalGratuity,worth_till_date:result.totalGratuity,latest:result.totalGratuity,year_end_maturity_value:result.totalGratuity,maturity_value:result.totalGratuity,maturity_date:'',locked_until:''});
    return r;
  }
  // A PF only receives contributions up to the last working day.
  const pfEnd=isPf(r)&&r.last_working_date?new Date(r.last_working_date):null,elapsed=pfEnd&&!Number.isNaN(pfEnd.getTime())&&pfEnd<new Date()?Math.max(0,years(fiBaseDate(r))-years(r.last_working_date)):years(fiBaseDate(r));if(isCompanyPf(r))r.broker='Govt';r.maturity_date=isCompanyPf(r)?'':fixedIncomeMaturityDate(r)||r.maturity_date;r.invested=fixedIncomeInvested(r,elapsed);r.interest_incurred_fy=fixedIncomeInterestIncurredFy(r);r.worth_till_date=fixedIncomeWorthTillDate(r);r.latest=r.worth_till_date;r.maturity_value=isCompanyPf(r)?'':fixedIncomeMaturityValue(r);r.year_end_maturity_value=fixedIncomeYearEndValue(r);r.locked_until=r.maturity_date||'';
  if(/^salary$|^rental\s*income$/.test(typeKey(r)))r.yearly_total_value=(num(r.employee_contribution)+num(r.company_contribution))*12;
  return r
}

export const isUnderConstruction=(r:any)=>[r?.construction_status,r?.category].some(v=>/under\s*construction/i.test(String(v||'')));
/** Reads Residing or Rented, falling back to the older Yes/No "is rented" answer on records saved before it existed. */
export const occupancyOf=(r:any)=>{
  const value=String(r?.occupancy||'').trim().toLowerCase();
  if(/rented/.test(value))return 'Rented';
  if(/resid/.test(value))return 'Residing';
  return String(r?.is_rented||'').trim().toLowerCase()==='yes'?'Rented':'Residing';
};
/** A property is let only once it is built and marked Rented. */
export const isRentedProperty=(r:any)=>occupancyOf(r)==='Rented'&&!isUnderConstruction(r);
const dayOf=(v:any)=>String(v||'').slice(0,10);
/** An open-ended vacancy (no end date) lasts until an end date is entered. */
export const isVacantOn=(r:any,date:string)=>{
  const from=dayOf(r?.vacant_from),to=dayOf(r?.vacant_to);
  return Boolean(from)&&from<=date&&(!to||date<=to);
};
export const isEarningRent=(r:any,date:string)=>isRentedProperty(r)&&!isVacantOn(r,date);
/** Share of a calendar month (YYYY-MM) the property was let, so a part-month vacancy reduces rent pro rata. */
export function occupiedShareOfMonth(r:any,month:string){
  const [year,monthNumber]=month.split('-').map(Number),days=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  let vacant=0;
  for(let day=1;day<=days;day++)if(isVacantOn(r,`${month}-${String(day).padStart(2,'0')}`))vacant++;
  return (days-vacant)/days;
}
export const isOverdraftLoan=(r:any)=>/overdraft|^od$/i.test(String(r?.loan_structure||'').trim());
/** Savings parked in the linked OD account; only the amount covering the outstanding balance offsets it. */
export const parkedAgainstLoan=(r:any,balance:number)=>isOverdraftLoan(r)?Math.min(Math.max(0,num(r.od_parked_balance)),Math.max(0,balance)):0;

const emiFor=(principal:number,monthlyRate:number,months:number)=>{
  if(principal<=0||months<=0)return 0;
  return monthlyRate?principal*monthlyRate/(1-Math.pow(1+monthlyRate,-months)):principal/months;
};

function repayFrom(balance:number,parked:number,monthlyRate:number,emi:number){
  let outstanding=balance,paid=0;
  if(balance<=0)return{paid:0,months:0 as number|null};
  if(emi<=0||emi<=Math.max(0,balance-parked)*monthlyRate)return{paid:0,months:null as number|null};
  for(let month=1;month<=1200;month++){
    const owed=outstanding+Math.max(0,outstanding-parked)*monthlyRate,payment=Math.min(owed,emi);
    paid+=payment;outstanding=owed-payment;
    if(outstanding<0.01)return{paid,months:month};
  }
  return{paid:0,months:null as number|null};
}

function emisDueSince(start:any,asOf:Date){
  const first=localDate(start);
  if(!first||first>asOf)return 0;
  return (asOf.getFullYear()-first.getFullYear())*12+asOf.getMonth()-first.getMonth()+(asOf.getDate()>=first.getDate()?1:0);
}

export type LoanFieldNames={rate:string;tenure:string;start:string};
export const PROPERTY_LOAN_FIELDS:LoanFieldNames={rate:'loan_interest_rate',tenure:'loan_tenure_months',start:'loan_start_date'};
export const LOAN_FIELDS:LoanFieldNames={rate:'interest_rate',tenure:'tenure_months',start:'purchase_date'};

/**
 * Works out a loan from whichever figures are known.
 * An entered EMI, balance or paid amount is the user's figure and always wins; anything left blank is derived.
 */
/**
 * Pre-EMI: while a home is being built, the buyer may choose to pay only the interest on what the
 * bank has paid out so far, until possession. The full EMI then starts from possession over the
 * loan's tenure. Returns null when the choice does not apply (or possession has passed).
 */
export function preEmiPosition(r:any,names:LoanFieldNames,asOf=new Date()){
  if(!/^yes/i.test(String(r?.pre_emi||''))||!isUnderConstruction(r))return null;
  const possession=String(r.possession_date||'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(possession)&&new Date(`${possession}T00:00:00`)<=asOf)return null;
  const amount=num(r.loan_amount),annualRate=num(r[names.rate]),rate=annualRate/1200,tenure=num(r[names.tenure]);
  const fromLoan=cleanConstructionLoanPaid(r);
  // What the bank has paid the builder so far: recorded loan payments, else the balance entered, else the full loan.
  const disbursed=Math.max(0,fromLoan||num(r.loan_balance)||amount);
  const interest=disbursed*rate;
  const monthsToPossession=/^\d{4}-\d{2}-\d{2}$/.test(possession)?Math.max(0,(Number(possession.slice(0,4))-asOf.getFullYear())*12+Number(possession.slice(5,7))-1-asOf.getMonth()):0;
  const fullEmi=num(r.emi_amount)||emiFor(Math.max(disbursed,amount),rate,tenure);
  const afterPossession=repayFrom(Math.max(disbursed,amount),0,rate,fullEmi);
  const clearsMonths=monthsToPossession&&afterPossession.months?monthsToPossession+afterPossession.months:null;
  const warnings:string[]=[];
  if(!possession)warnings.push('Enter the expected possession date to see when the full EMI starts.');
  if(!annualRate)warnings.push('Interest rate is missing, so no interest is being calculated.');
  return{amount,annualRate,tenure,balance:disbursed,netBalance:disbursed,parked:0,emi:interest,monthsLeft:clearsMonths,
    clearsOn:clearsMonths?new Date(asOf.getFullYear(),asOf.getMonth()+clearsMonths,1).toISOString().slice(0,7):possession?'':'After possession',
    totalPayable:interest*monthsToPossession+afterPossession.paid,futureInterest:Math.max(0,interest*monthsToPossession+afterPossession.paid-Math.max(disbursed,amount)),
    principalPaid:0,interestPaid:num(r.interest_paid),nextInterest:interest,nextPrincipal:0,warnings,preEmi:true,fullEmi,possessionDate:possession};
}
const cleanConstructionLoanPaid=(r:any)=>(Array.isArray(r?.construction_payments)?r.construction_payments:[]).filter((p:any)=>p&&p.from==='loan').reduce((s:number,p:any)=>s+Math.max(0,num(p.amount)),0);
export function loanPosition(r:any,names:LoanFieldNames,asOf=new Date()){
  const pre=preEmiPosition(r,names,asOf);
  if(pre)return pre;
  // While a home is being built the bank pays the builder in stages, so interest and the EMI are on what it has
  // paid out (payments recorded 'from the home loan'), not the full sanctioned loan, which still shows as entered.
  const disbursed=isUnderConstruction(r)?cleanConstructionLoanPaid(r):0;
  if(disbursed>0)r={...r,loan_amount:disbursed,loan_balance:num(r.loan_balance)?Math.min(num(r.loan_balance),disbursed):''};
  const amount=num(r.loan_amount),annualRate=num(r[names.rate]),rate=annualRate/1200,tenure=num(r[names.tenure]),enteredMonths=num(r.emis_left),enteredEmi=num(r.emi_amount)||num(r.od_monthly_emi)||num(r.monthly_emi),
    enteredBalance=num(r.loan_balance),enteredPrincipal=num(r.principal_paid),elapsed=emisDueSince(r[names.start],asOf),originalEmi=emiFor(amount,rate,tenure);
  const isOd=isOverdraftLoan(r);
  // A blank balance is worked out; an entered 0 means nothing is outstanding. An OD with 0 entered and money
  // parked is ambiguous (paid off, or an unused limit entered as parked), so it keeps the loan amount until answered.
  const zeroEntered=r.loan_balance!==''&&r.loan_balance!==null&&r.loan_balance!==undefined&&num(r.loan_balance)===0&&!(isOd&&num(r.od_parked_balance)>0);
  let scheduled=amount;
  const scheduleEmi=enteredEmi||originalEmi;
  // An OD balance moves with deposits and withdrawals, so it cannot be inferred from an EMI schedule.
  if(!isOd&&!enteredBalance&&!enteredPrincipal&&amount&&scheduleEmi&&elapsed)for(let i=0;i<elapsed&&scheduled>0;i++)scheduled=Math.max(0,scheduled*(1+rate)-scheduleEmi);
  const balance=zeroEntered?0:Math.max(0,enteredBalance||(enteredPrincipal?amount-enteredPrincipal:scheduled)),
    parked=parkedAgainstLoan(r,balance),netBalance=Math.max(0,balance-parked),
    monthsBasis=enteredMonths||(amount?0:tenure),
    remainingTerm=enteredMonths||(tenure?Math.max(1,tenure-elapsed):0),
    // Savings parked in an OD account negate the loan, so only the uncovered balance needs repaying.
    emi=enteredEmi||(isOd?emiFor(netBalance,rate,remainingTerm):emiFor(balance,rate,monthsBasis)||(balance?originalEmi:0)),
    future=repayFrom(netBalance,0,rate,emi),
    principalPaid=enteredPrincipal||(amount?Math.max(0,amount-balance):0),
    interestPaid=num(r.interest_paid)||(!isOd&&elapsed&&emi?Math.max(0,emi*elapsed-principalPaid):0),
    nextInterest=netBalance*rate,monthsLeft=future.months??(emi?null:monthsBasis||null);
  const clearsOn=future.months?new Date(asOf.getFullYear(),asOf.getMonth()+future.months,1).toISOString().slice(0,7):isOd&&balance&&!netBalance?'Covered by OD savings':'';
  const warnings:string[]=[];
  if(netBalance&&emi&&future.months===null)warnings.push(`EMI of ${fmt(emi)} does not cover the monthly interest of ${fmt(nextInterest)}, so this loan would never clear.`);
  if(netBalance&&!emi)warnings.push('Enter the monthly EMI, or the loan amount and tenure, to calculate the repayment.');
  if(netBalance&&!annualRate)warnings.push('Interest rate is missing, so no interest is being calculated.');
  if(amount&&balance>amount)warnings.push(`Balance ${fmt(balance)} is higher than the loan amount ${fmt(amount)}.`);
  if(enteredEmi&&enteredMonths&&future.months&&Math.abs(enteredMonths-future.months)>2&&!parked)warnings.push(`EMIs left says ${enteredMonths}, but this EMI clears the balance in ${future.months} months.`);
  if(!enteredEmi&&netBalance&&enteredMonths&&tenure&&enteredMonths===tenure&&amount&&balance<amount)warnings.push(`EMIs left equals the full ${tenure}-month tenure although ${fmt(amount-balance)} is already repaid. Enter the EMIs actually left, or your EMI.`);
  if(!enteredEmi&&originalEmi&&emi>originalEmi*1.25)warnings.push(`Balance and EMIs left imply an EMI of ${fmt(emi)}, well above ${fmt(originalEmi)} from the original loan terms. Check EMIs left, or enter your EMI.`);
  if(tenure&&future.months&&!parked&&future.months>tenure)warnings.push(`At this EMI the loan runs ${future.months} months, longer than its ${tenure}-month tenure.`);
  return{amount,annualRate,tenure,balance,netBalance,parked,emi,monthsLeft,clearsOn,totalPayable:future.paid,futureInterest:Math.max(0,future.paid-netBalance),principalPaid,interestPaid,nextInterest,nextPrincipal:Math.max(0,Math.min(emi,netBalance+nextInterest)-nextInterest),warnings};
}

function applyLoanPosition(r:any,names:LoanFieldNames){
  const loan=loanPosition(r,names);
  Object.assign(r,{loan_balance:loan.balance,monthly_emi:loan.emi,emiFuture:loan.totalPayable,emis_left:loan.monthsLeft??'',interest_rate:loan.annualRate,principal_paid:loan.principalPaid,interest_paid:loan.interestPaid,loan_clears_on:loan.clearsOn,future_interest:loan.futureInterest,next_emi_interest:loan.nextInterest,next_emi_principal:loan.nextPrincipal,net_loan_balance:loan.netBalance,balance:loan.netBalance});
  if(isOverdraftLoan(r))Object.assign(r,{od_months_to_clear:loan.monthsLeft??'',od_monthly_interest:loan.nextInterest,od_interest_saved_monthly:loan.parked*loan.annualRate/1200});
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

/** Combines units in one community: money adds up, while EMIs left and the rate describe the whole group sensibly. */
export function propertyGroupTotals(rows:any[]){
  if(rows.length===1)return rows[0];
  const sum=(field:string)=>rows.reduce((total,row)=>total+num(row[field]),0),distinct=(field:string)=>[...new Set(rows.map(row=>String(row[field]||'').trim()).filter(Boolean))],
    rented=rows.filter(isRentedProperty),balance=sum('loan_balance'),rate=balance?rows.reduce((total,row)=>total+num(row.loan_balance)*num(row.loan_interest_rate),0)/balance:0,structures=distinct('loan_structure'),statuses=distinct('construction_status'),
    money=Object.fromEntries(['invested','purchase_price','to_clear','realised_value','construction_owed','latest','gain','loan_amount','loan_balance','od_parked_balance','net_loan_balance','balance','od_monthly_interest','monthly_emi','emiFuture','principal_paid','interest_paid','future_interest'].map(field=>[field,sum(field)])),
    paying=rows.filter(row=>num(row.emis_left)>0);
  // Stage payments add up across the homes in a community that are still being built.
  const building=rows.filter(row=>row.construction_paid!==''&&row.construction_paid!==undefined),construction=building.length?{construction_paid:building.reduce((t,row)=>t+num(row.construction_paid),0),construction_pending:building.reduce((t,row)=>t+num(row.construction_pending),0)}:{construction_paid:'',construction_pending:''};
  return{...money,...construction,gain_pct:num(money.invested)?num(money.gain)/num(money.invested)*100:0,security_name:distinct('security_name').join(' · '),loan_interest_rate:rate,interest_rate:rate,emis_left:paying.length?Math.max(...paying.map(row=>num(row.emis_left))):'',loan_clears_on:distinct('loan_clears_on').filter(value=>/^\d/.test(value)).sort().at(-1)||distinct('loan_clears_on')[0]||'',
    loan_structure:structures.length>1?(structures.some(s=>isOverdraftLoan({loan_structure:s}))?'Overdraft (OD) + Standard':'Mixed'):structures[0]||'',construction_status:statuses.length>1?'Mixed':statuses[0]||'',
    is_rented:rented.length?'Yes':'No',occupancy:!rented.length?'Residing':rented.length===rows.length?'Rented':`${rented.length} of ${rows.length} Rented`,vacant_from:'',vacant_to:'',monthly_rent:rented.reduce((total,row)=>total+num(row.monthly_rent),0),rentee_name:[...new Set(rented.map(row=>String(row.rentee_name||'').trim()).filter(Boolean))].join(', '),rentee_phone:[...new Set(rented.map(row=>String(row.rentee_phone||'').trim()).filter(Boolean))].join(', '),rent_agreement_start_date:rented.length===1?rented[0].rent_agreement_start_date:'',rent_agreement_end_date:rented.length===1?rented[0].rent_agreement_end_date:''};
}

export function computeRecord(k:string,r0:any){const r={...r0};if(k==='stocks'){stockRecord(r)}else if(k==='mutualFunds'){r.invested=num(r.investment_amount)||num(r.quantity)*num(r.nav);r.latest=num(r.latest_value)||num(r.quantity)*num(r.live_nav)}else if(k==='bullion'){const tracked=num(r.metal_cost)+num(r.making_charges)+num(r.gst_paid)+num(r.other_costs);r.invested=num(r.purchase_price)||tracked;r.purchase_price=r.invested;r.latest=num(r.latest_value)||r.invested}else if(['nsel','otherAssets'].includes(k)){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested}else if(k==='property'){r.invested=num(r.purchase_price);r.latest=num(r.latest_value)||r.invested;applyLoanPosition(r,PROPERTY_LOAN_FIELDS);r.occupancy=occupancyOf(r);if(isUnderConstruction(r)){const b=constructionSummary(r);r.construction_paid=b.paid;r.construction_pending=b.pending;
    // Until possession, what is still to pay the builder is owed, but only the part already inside the home's
    // value. A value entered as the amount paid so far (not the full price) owes nothing more here, so the
    // unpaid price is never taken off twice. Nothing is counted until some payment is recorded.
    r.construction_owed=b.paid>0?Math.min(b.pending,Math.max(0,num(r.latest)-b.paid)):0;
    // While it is being built, what has gone in is what has been paid so far (own money and loan), not the full price.
    if(b.paid>0)r.invested=b.paid}else{r.construction_paid='';r.construction_pending='';r.construction_owed=0}}else if(k==='fixedIncome'){fixedIncomeRecord(r)}else if(k==='ulips'){r.invested=num(r.investment_amount)||num(r.premium_amount);r.latest=num(r.latest_value)||r.invested}else if(k==='insurance'){insuranceRecord(r)}else if(k==='loans'){applyLoanPosition(r,LOAN_FIELDS);r.latest=r.balance}else if(k==='borrowings'){r.balance=num(r.loan_balance)||(num(r.loan_amount)-num(r.principal_paid));r.loan_balance=r.balance;r.net_loan_balance=r.balance;r.latest=r.balance}else if(k==='goals'){r.gap=Math.max(0,num(r.target_amount)-num(r.current_value));r.monthly_required=r.gap/months(new Date(),new Date(r.target_date||new Date()))}// A home being built gains only beyond what is paid and still owed, so the unpaid price is not shown as a loss.
  r.gain=k==='insurance'?0:num(r.latest)-num(r.invested)-(k==='property'?num(r.construction_owed):0);
  // What is left to clear on a property (the bank's loan in use, after money parked in the OD, plus any builder
  // amount already inside its value), and what is yours once that is cleared.
  if(k==='property'){r.to_clear=Math.max(0,num(r.balance))+num(r.construction_owed);r.realised_value=num(r.latest)-r.to_clear}r.gain_pct=k==='insurance'?0:num(r.invested)?r.gain/num(r.invested)*100:0;return r}
export function computeTotals(records:any[]){let assets=0,liabilities=0,invested=0,gain=0;records.forEach(rec=>{const k=rec.module_key,c=computeRecord(k,rec.data); if(['stocks','mutualFunds','ulips','bullion','nsel','fixedIncome','property','otherAssets'].includes(k)){assets+=num(c.latest);invested+=num(c.invested);gain+=num(c.gain)} if(k==='insurance')assets+=num(c.latest);if(['loans','borrowings'].includes(k))liabilities+=num(c.balance);if(k==='property')liabilities+=num(c.balance)+num(c.construction_owed)});return{assets,liabilities,net:assets-liabilities,invested,gain}}
import { calculateInsurance, normalizeInsurancePolicy } from './insurance';
