import { notFound } from 'next/navigation';
import PredictivePlanner, { type ForecastTab } from '@/components/PredictivePlanner';

export const metadata = { title: 'Planner development preview', robots: { index: false, follow: false } };

// Fictional fixtures for local responsive QA; never expose an authenticated-data bypass.
export default async function PlannerPreview({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { tab } = await searchParams;
  const initialTab: ForecastTab = tab === 'goals' || tab === 'cash' || tab === 'market' ? tab : 'wealth';
  const records = [
    { id: 'demo-salary', module_key: 'fixedIncome', data: { category: 'Salary', employee_contribution: 120000 } },
    { id: 'demo-dividend', module_key: 'fixedIncome', data: { category: 'Dividend Income', employee_contribution: 8000 } },
    { id: 'demo-savings', module_key: 'fixedIncome', data: { category: 'Savings in Bank', current_value_today: 450000 } },
    { id: 'demo-home-cash', module_key: 'fixedIncome', data: { category: 'Cash at Home', current_value_today: 25000 } },
    { id: 'demo-mf', module_key: 'mutualFunds', data: { security_name: 'Example fund', sip_amount: 15000 } },
    { id: 'demo-goal', module_key: 'goals', data: { security_name: 'Education fund', current_value: 300000, target_amount: 2000000, target_date: '2032-11-01' } },
    { id: 'demo-loan', module_key: 'loans', data: { security_name: 'Example home loan', loan_balance: 1500000, interest_rate: 8.5, emis_left: 120 } },
    { id: 'demo-flat', module_key: 'property', data: { security_name: 'Example flat', is_rented: 'Yes', monthly_rent: 40000, loan_structure: 'Overdraft (OD)', loan_balance: 3000000, od_parked_balance: 1000000, loan_interest_rate: 7.5, emis_left: 180 } },
  ];
  return <main className="mx-auto max-w-6xl p-4 md:p-8"><p className="mb-5 text-sm text-slate-500">Development preview · fictional records · no account or database access</p><PredictivePlanner records={records} netWorth={2500000} accessToken="" initialTab={initialTab} /></main>;
}
