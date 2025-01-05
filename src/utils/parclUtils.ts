import axios from 'axios';
import { withCache } from './cache';
import { ParclMarket } from '../models/ParclMarket';

export const getParclId = async (location: string) => {
  const cacheKey = `parcl_id:${location}`;
  return withCache(cacheKey, 24 * 60 * 60, async () => {
    const locquery: string = location.replace(/ /g, "%20");
    const options = {
      method: "GET",
      url: `https://api.parcllabs.com/v1/search/markets?query=${locquery}`,
      headers: {
        accept: "application/json",
        Authorization: process.env.PARCL_API_KEY,
      },
    };

    const response = await axios.request(options);
    const markets: ParclMarket[] = response.data.items;

    if (!markets.length) {
      throw new Error("No markets found for the given location");
    }

    return markets[0].parcl_id;
  });
}; 