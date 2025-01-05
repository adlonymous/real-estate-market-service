export interface ParclMarket {
  parcl_id: string;
  country: string;
  geoid: string;
  state_fips_code: string;
  name: string;
  state_abbreviation: string;
  region: string;
  location_type: string;
  total_population: number;
  median_income: number;
  parcl_exchange_market: number;
  pricefeed_market: number;
  case_shiller_10_market: number;
  case_shiller_20_market: number;
} 