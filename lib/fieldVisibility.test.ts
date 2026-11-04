import { describe, expect, it } from 'vitest';
import { controlsOtherFields, isFieldVisible } from './fieldVisibility';

describe('dependent field visibility', () => {
  it('shows rent and tenant fields only on a rented property', () => {
    for (const field of ['monthly_rent', 'rentee_name', 'rentee_phone', 'rent_agreement_start_date', 'rent_agreement_end_date']) {
      expect(isFieldVisible('property', field, { is_rented: 'Yes' })).toBe(true);
      expect(isFieldVisible('property', field, { is_rented: 'No' })).toBe(false);
      expect(isFieldVisible('property', field, {})).toBe(false);
    }
  });
  it('removes the rented question and rent fields while a property is under construction', () => {
    const building = { construction_status: 'Under Construction', is_rented: 'Yes' };
    expect(isFieldVisible('property', 'occupancy', building)).toBe(false);
    expect(isFieldVisible('property', 'monthly_rent', building)).toBe(false);
    expect(isFieldVisible('property', 'vacant_from', building)).toBe(false);
    expect(isFieldVisible('property', 'occupancy', { construction_status: 'Ready' })).toBe(true);
    expect(isFieldVisible('property', 'occupancy', {})).toBe(true);
    expect(isFieldVisible('property', 'occupancy', { category: 'under construction' })).toBe(false);
    expect(controlsOtherFields('property', 'construction_status')).toBe(true);
  });
  it('follows Ready, then Residing or Rented, then the rental fields', () => {
    for (const field of ['monthly_rent', 'rentee_name', 'rentee_phone', 'rent_agreement_end_date', 'vacant_from', 'vacant_to']) {
      expect(isFieldVisible('property', field, { construction_status: 'Ready', occupancy: 'Residing' })).toBe(false);
      expect(isFieldVisible('property', field, { construction_status: 'Ready', occupancy: 'Rented' })).toBe(true);
    }
    expect(controlsOtherFields('property', 'occupancy')).toBe(true);
  });
  it('shows OD fields only on an overdraft loan, in both loan modules', () => {
    for (const moduleKey of ['property', 'loans']) {
      expect(isFieldVisible(moduleKey, 'od_parked_balance', { loan_amount: 100, loan_structure: 'Overdraft (OD)' })).toBe(true);
      expect(isFieldVisible(moduleKey, 'net_loan_balance', { loan_amount: 100, loan_structure: 'Standard EMI' })).toBe(false);
    }
  });
  it('shows property loan details only once there is a loan', () => {
    expect(isFieldVisible('property', 'loan_amount', {})).toBe(true);
    expect(isFieldVisible('property', 'loan_interest_rate', {})).toBe(false);
    expect(isFieldVisible('property', 'emis_left', { loan_amount: '0' })).toBe(false);
    expect(isFieldVisible('property', 'loan_interest_rate', { loan_amount: '500000' })).toBe(true);
    expect(isFieldVisible('property', 'emis_left', { loan_balance: 100 })).toBe(true);
  });
  it('hides interest fields on salary and rent but not on deposits', () => {
    expect(isFieldVisible('fixedIncome', 'interest_rate', { category: 'Salary' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'yearly_investment', { category: 'Rental Income' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'interest_rate', { category: 'FD' })).toBe(true);
  });
  it('keeps only the balance for a savings account and only the amount for dividends', () => {
    expect(isFieldVisible('fixedIncome', 'current_value_today', { category: 'Savings Account' })).toBe(true);
    expect(isFieldVisible('fixedIncome', 'interest_rate', { category: 'Savings Account' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'maturity_date', { category: 'Savings Account' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'current_value_today', { category: 'Dividend Income' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'maturity_date', { category: 'FD' })).toBe(true);
  });
  it('asks for no opening value on salary or rent', () => {
    for (const category of ['Salary', 'Rental Income']) {
      for (const field of ['current_value_today', 'interest_incurred_fy', 'year_end_maturity_value']) expect(isFieldVisible('fixedIncome', field, { category })).toBe(false);
    }
    expect(isFieldVisible('fixedIncome', 'broker', { category: 'Salary' })).toBe(true);
    expect(isFieldVisible('fixedIncome', 'purchase_date', { category: 'Salary' })).toBe(true);
    expect(isFieldVisible('fixedIncome', 'current_value_today', { category: 'FD' })).toBe(true);
  });
  it('asks only for the amount on cash at home, and keeps the bank name for bank savings', () => {
    expect(isFieldVisible('fixedIncome', 'current_value_today', { category: 'Cash at Home' })).toBe(true);
    expect(isFieldVisible('fixedIncome', 'interest_rate', { category: 'Cash at Home' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'broker', { category: 'Cash at Home' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'purchase_date', { category: 'Cash at Home' })).toBe(false);
    expect(isFieldVisible('fixedIncome', 'broker', { category: 'Savings in Bank' })).toBe(true);
    expect(isFieldVisible('fixedIncome', 'maturity_date', { category: 'Savings in Bank' })).toBe(false);
  });
  it('shows corporate action details only once an action is chosen', () => {
    expect(isFieldVisible('stocks', 'corporate_action_ratio', { corporate_action_type: '' })).toBe(false);
    expect(isFieldVisible('stocks', 'corporate_action_ratio', { corporate_action_type: 'Bonus' })).toBe(true);
  });
  it('leaves unrelated fields and modules alone', () => {
    expect(isFieldVisible('property', 'location', {})).toBe(true);
    expect(isFieldVisible('goals', 'target_amount', {})).toBe(true);
  });
  it('identifies which fields drive others', () => {
    expect(controlsOtherFields('property', 'occupancy')).toBe(true);
    expect(controlsOtherFields('property', 'location')).toBe(false);
    expect(controlsOtherFields('goals', 'category')).toBe(false);
  });
});
