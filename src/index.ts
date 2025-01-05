//File: example/example-node.ts

import { defineDAINService } from "@dainprotocol/service-sdk";
import { getPricePerSqFt } from './tools/PriceFeed';
import { getRentalPricePerSqFt } from './tools/RentalPriceFeed';

const dainService = defineDAINService({
  metadata: {
    title: "Real Estate Market DAIN Service",
    description: "A DAIN Service to extract real estate market data and perform various tasks and analyses using the data",
    version: "1.0.0",
    author: "adlonymous",
    tags: ["real estate", "property"],
  },
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [getPricePerSqFt, getRentalPricePerSqFt],
});

dainService.startNode({ port: 2022 }).then(() => {
  console.log("Real Estate Market DAIN Service is running on port 2022");
});
