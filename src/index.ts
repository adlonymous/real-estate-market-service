//File: example/example-node.ts

import { z } from "zod";
import axios from "axios";

import {
  defineDAINService,
  ToolConfig,
  ServiceContext,
} from "@dainprotocol/service-sdk";

const getParclId = async (location: string) => {
  interface ParclMarket {
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

  const locquery: string = location.replace(/ /g, "%20");
  try {
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
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getPricePerSqFt: ToolConfig = {
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
  },
};

const getRentalPricePerSqFt: ToolConfig = {
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
  },
};

const dainService = defineDAINService({
  metadata: {
    title: "Real Estate Market DAIN Service",
    description:
      "A DAIN Service to extract real estate market data and perform various tasks and analyses using the data",
    version: "1.0.0",
    author: "adlonymous",
    tags: ["real estate", "property"],
    logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
  },
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [getPricePerSqFt, getRentalPricePerSqFt],
});

dainService.startNode({ port: 2022 }).then(() => {
  console.log("Real Estate Market DAIN Service is running on port 2022");
});
