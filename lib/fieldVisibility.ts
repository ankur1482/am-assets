import { isOverdraftLoan, isRentedProperty, isUnderConstruction, num } from './calculations';

type Values = Record<string, any>;
type FieldRule = { controllers: string[]; fields: string[]; visible: (values: Values) => boolean };

const OD_RULE: FieldRule = {
  controllers: ['loan_structure'],
  fields: ['od_parked_balance', 'net_loan_balance', 'od_monthly_interest', 'od_interest_saved_monthly', 'od_months_to_clear'],
  visible: isOverdraftLoan,
};
const earnsNoTrackedInterest = (values: Values) => /^(salary|rental\s*income|dividend\s*income|savings\s*(account|in\s*bank)|cash\s*at\s*home)$/i.test(String(values.category || '').trim());
const isCashCategory = (values: Values) => /^(salary|rental\s*income|dividend\s*income|savings\s*(account|in\s*bank)|cash\s*at\s*home)$/i.test(String(values.category || '').trim());

// A field listed here shows only while its rule passes. Insurance and the other Fixed Income
// categories keep their fuller type-based rules in the record form.
const FIELD_RULES: Record<string, FieldRule[]> = {
  property: [
    { controllers: ['construction_status', 'category'], fields: ['occupancy'], visible: values => !isUnderConstruction(values) },
    { controllers: ['construction_status', 'category', 'occupancy'], fields: ['primary_residence'], visible: values => !isRentedProperty(values) },
    { controllers: ['construction_status', 'category'], fields: ['self_funded_so_far'], visible: isUnderConstruction },
    { controllers: ['construction_status', 'category'], fields: ['possession_date'], visible: isUnderConstruction },
    { controllers: ['construction_status', 'category', 'loan_amount', 'loan_balance'], fields: ['pre_emi'], visible: values => isUnderConstruction(values) && (num(values.loan_amount) > 0 || num(values.loan_balance) > 0) },
    { controllers: ['construction_status', 'category', 'occupancy'], fields: ['monthly_rent', 'rentee_name', 'rentee_phone', 'rent_agreement_start_date', 'rent_agreement_end_date', 'vacant_from', 'vacant_to'], visible: isRentedProperty },
    { controllers: ['loan_amount', 'loan_balance'], fields: ['loan_structure', 'loan_institution', 'loan_interest_rate', 'loan_tenure_months', 'loan_start_date', 'emi_amount', 'loan_balance', 'emis_left', 'principal_paid', 'interest_paid', 'monthly_emi', 'loan_clears_on', 'emiFuture', 'od_parked_balance', 'net_loan_balance', 'od_monthly_interest'], visible: values => num(values.loan_amount) > 0 || num(values.loan_balance) > 0 },
    OD_RULE,
  ],
  loans: [OD_RULE],
  fixedIncome: [
    // Employment questions belong to a salary; PF and gratuity follow the same person's answers.
    { controllers: ['category', 'currently_employed'], fields: ['currently_employed', 'planned_employment_end'], visible: values => /^salary$/i.test(String(values.category || '').trim()) },
    { controllers: ['category'], fields: ['interest_rate', 'rate_year', 'yearly_investment', 'investment_due_month'], visible: values => !earnsNoTrackedInterest(values) },
    { controllers: ['category'], fields: ['lock_in_years', 'maturity_value', 'maturity_date', 'year_end_maturity_value', 'interest_incurred_fy'], visible: values => !isCashCategory(values) },
    { controllers: ['category'], fields: ['current_value_today', 'latest'], visible: values => !/^(salary|rental\s*income|dividend)/i.test(String(values.category || '').trim()) },
    { controllers: ['category'], fields: ['broker', 'purchase_date'], visible: values => !/^cash\s*at\s*home/i.test(String(values.category || '').trim()) },
  ],
  stocks: [{ controllers: ['corporate_action_type'], fields: ['corporate_action_ratio', 'corporate_action_ex_date', 'ex_base_price'], visible: values => Boolean(String(values.corporate_action_type || '').trim()) }],
};

export const isFieldVisible = (moduleKey: string, field: string, values: Values) =>
  (FIELD_RULES[moduleKey] || []).every(rule => !rule.fields.includes(field) || rule.visible(values));

/** Whether changing this field can show or hide other fields, so the form must track its value. */
export const controlsOtherFields = (moduleKey: string, field: string) =>
  (FIELD_RULES[moduleKey] || []).some(rule => rule.controllers.includes(field));
