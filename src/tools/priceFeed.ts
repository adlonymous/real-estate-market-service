import { z } from "zod";
import { ToolConfig } from "@dainprotocol/service-sdk";
import axios from 'axios';
import { createClient } from 'redis';
import { withCache } from '../utils/cache';
import { getParclId } from '../utils/parclUtils';
import { ParclMarket } from '../models/ParclMarket';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:2023'
});

redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(console.error);

export const getPricePerSqFt: ToolConfig = {
  id: "get-price-per-sq-ft",
  name: "Price Per Square Foot Feed",
  description:
    "Fetches the latest price feed for the price per square foot of property for sale in several cities across the US",
  input: z.object({
    location: z.string().describe("The location to get the price feed for"),
  }),
  output: z.object({
    pricepersqft: z
      .number()
      .describe(
        "The price per square foot for real estate property in the requested location"
      ),
  }),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async ({ location }, agentInfo) => {
    const cacheKey = `price_feed:${location}`;
    // Cache price feed for 1 hour
    return withCache(cacheKey, 24 * 60 * 60, async () => {
      console.log(
        `Agent ${agentInfo.agentId} requested per sq.ft property price for ${location}.`
      );
      const parclId = await getParclId(location);

      const options = {
        method: "GET",
        url: `https://api.parcllabs.com/v1/price_feed/${parclId}/price_feed?limit=731`,
        headers: {
          accept: "application/json",
          Authorization: process.env.PARCL_API_KEY,
        },
      };

      const response = await axios.request(options);
      const feed = response.data.items;

      // Retrieve the existing feed from cache
      const cachedFeed = await redisClient.get(cacheKey).then(data => data ? JSON.parse(data) : null);

      // Check if there is no cached feed
      if (!cachedFeed) {
        // If no cache, store the fresh feed directly
        await redisClient.set(cacheKey, JSON.stringify(feed));
        return {
          text: `The current price of property per square foot in ${location} is ${feed[0].price_feed}`,
          data: { pricepersqft: feed[0].price_feed },
          ui: {
            type: "statsGrid",
            uiData: JSON.stringify({
              stats: [
                {
                  title: "Current Price",
                  value: feed[0].price_feed,
                  description: "The current price of property per square foot",
                },
                {
                  title: "Earlier Price (1 month ago)",
                  value: feed[31].price_feed,
                  change: Number(((feed[0].price_feed - feed[31].price_feed) / feed[31].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 1 month ago",
                },
                {
                  title: "Earlier Price (6 months ago)",
                  value: feed[182].price_feed,
                  change: Number(((feed[0].price_feed - feed[182].price_feed) / feed[182].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 6 months ago",
                },
                {
                  title: "Earlier Price (1 year ago)",
                  value: feed[365].price_feed,
                  change: Number(((feed[0].price_feed - feed[365].price_feed) / feed[365].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 1 year ago",
                },
                {
                  title: "Earlier Price (2 years ago)",
                  value: feed[730].price_feed,
                  change: Number(((feed[0].price_feed - feed[730].price_feed) / feed[730].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 2 years ago",
                },
                {
                  title: "Short Term Momentum",
                  value: `${Number(((feed[0].price_feed - feed[31].price_feed) / feed[31].price_feed * 100).toFixed(3))}%`,
                  description: "Monthly rate of price change (1 month)",
                },
                {
                  title: "Medium Term Momentum", 
                  value: `${Number(((feed[31].price_feed - feed[182].price_feed) / 3).toFixed(3))}%`,
                  description: "Average monthly rate of price change over 3 months",
                },
                {
                  title: "Long Term Momentum",
                  value: `${Number(((feed[0].price_feed - feed[365].price_feed) / 12).toFixed(3))}%`, 
                  description: "Average monthly rate of price change over 1 year",
                },
                {
                  title: "Velocity Monthly",
                  value: `${Number(((feed[0].price_feed - feed[31].price_feed) - (feed[31].price_feed - feed[182].price_feed)).toFixed(3))}%`,
                  description: "Monthly change in price momentum",
                },
                {
                  title: "Velocity Quarterly",
                  value: `${Number(((feed[31].price_feed - feed[182].price_feed) - (feed[182].price_feed - feed[365].price_feed)).toFixed(3))}%`,
                  description: "Quarterly change in price momentum",
                },
                {
                  title: "Seasonal Variation",
                  value: Number(((feed[0].price_feed - feed[365].price_feed) / feed[365].price_feed * 100).toFixed(3)),
                  description: "Seasonal variation in price",
                },
              ]
            })
          },
        };
      }

      // Check if the first element of the cached feed is the same as the fresh feed
      if (cachedFeed[0].price_feed === feed[0].price_feed) {
        // Do nothing if they are the same
        return {
          text: `The current price of property per square foot in ${location} is ${feed[0].price_feed}`,
          data: { pricepersqft: feed[0].price_feed },
          ui: {
            type: "statsGrid",
            uiData: JSON.stringify({
              stats: [
                {
                  title: "Current Price",
                  value: feed[0].price_feed,
                  description: "The current price of property per square foot",
                },
                {
                  title: "Earlier Price (1 month ago)",
                  value: feed[31].price_feed,
                  change: Number(((feed[0].price_feed - feed[31].price_feed) / feed[31].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 1 month ago",
                },
                {
                  title: "Earlier Price (6 months ago)",
                  value: feed[182].price_feed,
                  change: Number(((feed[0].price_feed - feed[182].price_feed) / feed[182].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 6 months ago",
                },
                {
                  title: "Earlier Price (1 year ago)",
                  value: feed[365].price_feed,
                  change: Number(((feed[0].price_feed - feed[365].price_feed) / feed[365].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 1 year ago",
                },
                {
                  title: "Earlier Price (2 years ago)",
                  value: feed[730].price_feed,
                  change: Number(((feed[0].price_feed - feed[730].price_feed) / feed[730].price_feed * 100).toFixed(3)),
                  description: "The price of property per square foot 2 years ago",
                },
                {
                  title: "Short Term Momentum",
                  value: `${Number(((feed[0].price_feed - feed[31].price_feed) / feed[31].price_feed * 100).toFixed(3))}%`,
                  description: "Monthly rate of price change (1 month)",
                },
                {
                  title: "Medium Term Momentum", 
                  value: `${Number(((feed[31].price_feed - feed[182].price_feed) / 3).toFixed(3))}%`,
                  description: "Average monthly rate of price change over 3 months",
                },
                {
                  title: "Long Term Momentum",
                  value: `${Number(((feed[0].price_feed - feed[365].price_feed) / 12).toFixed(3))}%`, 
                  description: "Average monthly rate of price change over 1 year",
                },
                {
                  title: "Velocity Monthly",
                  value: `${Number(((feed[0].price_feed - feed[31].price_feed) - (feed[31].price_feed - feed[182].price_feed)).toFixed(3))}%`,
                  description: "Monthly change in price momentum",
                },
                {
                  title: "Velocity Quarterly",
                  value: `${Number(((feed[31].price_feed - feed[182].price_feed) - (feed[182].price_feed - feed[365].price_feed)).toFixed(3))}%`,
                  description: "Quarterly change in price momentum",
                },
                {
                  title: "Seasonal Variation",
                  value: Number(((feed[0].price_feed - feed[365].price_feed) / feed[365].price_feed * 100).toFixed(3)),
                  description: "Seasonal variation in price",
                },
              ]
            })
          },
        };
      } else {
        // If they are different, update the cached feed
        feed.unshift(cachedFeed[0]);
        await redisClient.set(cacheKey, JSON.stringify(feed));

        const currentPrice = feed[0].price_feed;
        const onemonthPrice = feed[31].price_feed;
        const twomonthPrice = feed[61].price_feed;
        const threemonthPrice = feed[91].price_feed;
        const sixmonthPrice = feed[182].price_feed;
        const oneyearPrice = feed[365].price_feed;
        const twoyearPrice = feed[730].price_feed;

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
          text: `The current price of property per square foot in ${location} is ${currentPrice}`,
          data: { pricepersqft: currentPrice },
          ui: {
            type: "statsGrid",
            uiData: JSON.stringify({
              stats: [
                {
                  title: "Current Price",
                  value: currentPrice,
                  description: "The current price of property per square foot",
                },
                {
                  title: "Earlier Price (1 month ago)",
                  value: onemonthPrice,
                  change: monthOverMonthChange,
                  description: "The price of property per square foot 1 month ago",
                },
                {
                  title: "Earlier Price (6 months ago)",
                  value: sixmonthPrice,
                  change: sixMonthChange,
                  description: "The price of property per square foot 6 months ago",
                },
                {
                  title: "Earlier Price (1 year ago)",
                  value: oneyearPrice,
                  change: yearOverYearChange,
                  description: "The price of property per square foot 1 year ago",
                },
                {
                  title: "Earlier Price (2 years ago)",
                  value: twoyearPrice,
                  change: twoYearChange,
                  description: "The price of property per square foot 2 years ago",
                },
                {
                  title: "Short Term Momentum",
                  value: `${shortTermMomentum}%`,
                  description: "Monthly rate of price change (1 month)",
                },
                {
                  title: "Medium Term Momentum", 
                  value: `${mediumTermMomentum}%`,
                  description: "Average monthly rate of price change over 3 months",
                },
                {
                  title: "Long Term Momentum",
                  value: `${longTermMomentum}%`, 
                  description: "Average monthly rate of price change over 1 year",
                },
                {
                  title: "Velocity Monthly",
                  value: `${velocityMonthly}%`,
                  description: "Monthly change in price momentum",
                },
                {
                  title: "Velocity Quarterly",
                  value: `${velocityQuarterly}%`,
                  description: "Quarterly change in price momentum",
                },
                {
                  title: "Seasonal Variation",
                  value: seasonalVariation,
                  description: "Seasonal variation in price",
                },
              ]
            })
          },
        };
      }
    });
  },
};
