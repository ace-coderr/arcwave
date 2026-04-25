import { createPublicClient, http } from "viem";
import { arcTestnet } from "./arcChain";

export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});
