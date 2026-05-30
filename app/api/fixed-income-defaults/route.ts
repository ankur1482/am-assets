import {NextResponse} from 'next/server';

const source='Department of Economic Affairs, Small Savings Interest Rates';
const sourceUrl='https://dea.gov.in/budget-division/475';
const circularUrl='https://dea.gov.in/files/budget_division_documents/RoI_Q1_2627.pdf';
const period='Q1 FY 2026-27';

const defaults:Record<string,{rate:number|string;lockInYears:number|string;label:string;notes:string}>={
  fd:{rate:7.5,lockInYears:5,label:'5 Year Time Deposit / FD',notes:'Government small-savings 5 year time deposit rate. Bank FDs vary by bank and tenure.'},
  recurringdeposit:{rate:6.7,lockInYears:5,label:'5 Year Recurring Deposit',notes:'Post Office 5 year recurring deposit.'},
  ppf:{rate:7.1,lockInYears:15,label:'Public Provident Fund',notes:'PPF account maturity is 15 years.'},
  sukanyasamriddhi:{rate:8.2,lockInYears:21,label:'Sukanya Samriddhi Account',notes:'SSA maturity is 21 years from account opening, subject to scheme rules.'},
  nsc:{rate:7.7,lockInYears:5,label:'National Savings Certificate',notes:'NSC VIII issue maturity is 5 years.'},
  kvp:{rate:7.5,lockInYears:115/12,label:'Kisan Vikas Patra',notes:'KVP matures in 115 months at the current notified rate.'},
  epf:{rate:8.25,lockInYears:'',label:'Employees Provident Fund',notes:'EPF rate is annual and retirement/withdrawal rules depend on employment status.'},
  companypf:{rate:8.25,lockInYears:'',label:'Company PF',notes:'Using current EPF-style provident fund rate. Confirm the applicable employer scheme terms.'},
  pf:{rate:8.25,lockInYears:'',label:'Company PF',notes:'Legacy PF entry mapped to Company PF using the current EPF-style provident fund rate.'},
  gratuity:{rate:'',lockInYears:5,label:'Gratuity',notes:'Gratuity eligibility generally starts after 5 years of qualifying continuous service; value depends on salary and service.'},
};

const key=(v:string)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');

export async function GET(request:Request){
  const {searchParams}=new URL(request.url);
  const type=key(searchParams.get('type')||'');
  const data=defaults[type]||defaults[type.replace(/deposit$/,'deposit')];
  if(!data)return NextResponse.json({type,available:Object.keys(defaults),source,sourceUrl,circularUrl,period},{status:404});
  return NextResponse.json({...data,type,period,source,sourceUrl,circularUrl,time:new Date().toISOString()});
}
