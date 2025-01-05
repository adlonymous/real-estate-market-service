import axios from 'axios';
import { withCache } from '../utils/cache';
import { getParclId } from '../utils/parclUtils'; // Import the utility function
import { ToolConfig } from "@dainprotocol/service-sdk";
import { z } from "zod";
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:2023'
});

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(console.error);

export const getRentalPricePerSqFt: ToolConfig = {
    id: "get-rental-price-per-sq-ft",
    name: "Rental Price Per Square Foot Feed",
    description:
      "Fetches the latest rental price feed for the price per square foot of property for rent in several cities across the US",
    input: z.object({
      location: z.string().describe("The location to get the rental price feed for"),
    }),
    output: z.object({
      rentalpricepersqft: z.number().describe(
        "The rental price per square foot for real estate property in the requested location"
      ),
    }),
    pricing: { pricePerUse: 0, currency: "USD" },
    handler: async ({ location }, agentInfo) => {
      const cacheKey = `rental_price_feed:${location}`;
      // Cache rental price feed for 1 hour
      return withCache(cacheKey, 24 * 60 * 60, async () => {
        console.log(
          `Agent ${agentInfo.agentId} requested per sq.ft rental property price for ${location}.`
        );
        const parclId = await getParclId(location);
  
        const options = {
          method: "GET",
          url: `https://api.parcllabs.com/v1/price_feed/${parclId}/rental_price_feed?limit=731`,
          headers: {
            accept: "application/json",
            Authorization: process.env.PARCL_API_KEY,
          },
        };
  
        const response = await axios.request(options);
        const feed = response.data.items;

        await redisClient.set(cacheKey, JSON.stringify(feed));
  
        const currentPrice = feed[0].rental_price_feed;
        const onemonthPrice = feed[31].rental_price_feed;
        const twomonthPrice = feed[61].rental_price_feed;
        const threemonthPrice = feed[91].rental_price_feed;
        const sixmonthPrice = feed[182].rental_price_feed;
        const oneyearPrice = feed[365].rental_price_feed;
        const twoyearPrice = feed[730].rental_price_feed;
  
        const monthOverMonthChange = Number(((currentPrice - onemonthPrice) / onemonthPrice * 100).toFixed(3));
        const twoMonthChange = Number(((currentPrice - twomonthPrice) / twomonthPrice * 100).toFixed(3));
        const threeMonthChange = Number(((currentPrice - threemonthPrice) / threemonthPrice * 100).toFixed(3));
        const sixMonthChange = Number(((currentPrice - sixmonthPrice) / sixmonthPrice * 100).toFixed(3));
  
        const yearOverYearChange = Number(((currentPrice - oneyearPrice) / oneyearPrice * 100).toFixed(3));
        const twoYearChange = Number(((currentPrice - twoyearPrice) / twoyearPrice * 100).toFixed(3));
  
        const shortTermMomentum = Number((monthOverMonthChange / 1).toFixed(3));  // Monthly rate
        const mediumTermMomentum = Number((threeMonthChange / 3).toFixed(3));     // Quarterly rate
        const longTermMomentum = Number((yearOverYearChange / 12).toFixed(3));    // Monthly rate over year
  
        const velocityMonthly = Number((monthOverMonthChange - twoMonthChange).toFixed(3));
        const velocityQuarterly = Number((threeMonthChange - sixMonthChange).toFixed(3));
  
        const seasonalVariation = Number(((currentPrice - oneyearPrice) / oneyearPrice * 100).toFixed(3));
  
        return {
          text: `The current rental price of property per square foot in ${location} is ${currentPrice}`,
          data: { rentalpricepersqft: currentPrice },
          ui: {
            type: "statsGrid",
            uiData: JSON.stringify({
              stats: [
                {
                  title: "Current Price",
                  value: currentPrice,
                  description: "The current rental price of property per square foot",
                },
                {
                  title: "Earlier Price (1 month ago)",
                  value: onemonthPrice,
                  change: monthOverMonthChange,
                  description: "The rental price of property per square foot 1 month ago",
                },
                {
                  title: "Earlier Price (6 months ago)",
                  value: sixmonthPrice,
                  change: sixMonthChange,
                  description: "The rental price of property per square foot 6 months ago",
                },
                {
                  title: "Earlier Price (1 year ago)",
                  value: oneyearPrice,
                  change: yearOverYearChange,
                  description: "The rental price of property per square foot 1 year ago",
                },
                {
                  title: "Earlier Price (2 years ago)",
                  value: twoyearPrice,
                  change: twoYearChange,
                  description: "The rental price of property per square foot 2 years ago",
                },
                {
                  title: "Short Term Momentum",
                  value: `${shortTermMomentum}%`,
                  description: "Monthly rate of rental price change (1 month)",
                },
                {
                  title: "Medium Term Momentum", 
                  value: `${mediumTermMomentum}%`,
                  description: "Average monthly rate of rental price change over 3 months",
                },
                {
                  title: "Long Term Momentum",
                  value: `${longTermMomentum}%`, 
                  description: "Average monthly rate of rental price change over 1 year",
                },
                {
                  title: "Velocity Monthly",
                  value: `${velocityMonthly}%`,
                  description: "Monthly change in rental price momentum",
                },
                {
                  title: "Velocity Quarterly",
                  value: `${velocityQuarterly}%`,
                  description: "Quarterly change in rental price momentum",
                },
                {
                  title: "Seasonal Variation",
                  value: seasonalVariation,
                  description: "Seasonal variation in rental price",
                },
              ]
            })
          },
        };
      });
    },
  };