/**
 * Indian Bank data — static reference for account creation.
 * Each entry has a unique code, display name, brand color, and Feather icon.
 */

export interface BankInfo {
  code: string;
  name: string;
  color: string;
  icon: string; // Feather icon name
}

export const BANKS: BankInfo[] = [
  {code: 'cash', name: 'Cash', color: '#4CAF50', icon: 'dollar-sign'},
  {code: 'sbi', name: 'State Bank of India', color: '#1F4E79', icon: 'briefcase'},
  {code: 'hdfc', name: 'HDFC Bank', color: '#004B8D', icon: 'briefcase'},
  {code: 'icici', name: 'ICICI Bank', color: '#F37920', icon: 'briefcase'},
  {code: 'axis', name: 'Axis Bank', color: '#800020', icon: 'briefcase'},
  {code: 'kotak', name: 'Kotak Mahindra', color: '#ED1C24', icon: 'briefcase'},
  {code: 'pnb', name: 'Punjab National Bank', color: '#1A237E', icon: 'briefcase'},
  {code: 'bob', name: 'Bank of Baroda', color: '#F15A29', icon: 'briefcase'},
  {code: 'canara', name: 'Canara Bank', color: '#006B3F', icon: 'briefcase'},
  {code: 'union', name: 'Union Bank', color: '#003366', icon: 'briefcase'},
  {code: 'indusind', name: 'IndusInd Bank', color: '#8A1538', icon: 'briefcase'},
  {code: 'yes', name: 'Yes Bank', color: '#0066B3', icon: 'briefcase'},
  {code: 'idfc', name: 'IDFC First', color: '#9C1D26', icon: 'briefcase'},
  {code: 'federal', name: 'Federal Bank', color: '#002F6C', icon: 'briefcase'},
  {code: 'iob', name: 'Indian Overseas Bank', color: '#1A237E', icon: 'briefcase'},
  {code: 'boi', name: 'Bank of India', color: '#E65100', icon: 'briefcase'},
];

export function getBankByCode(code: string): BankInfo {
  return BANKS.find(b => b.code === code) || BANKS[0];
}
