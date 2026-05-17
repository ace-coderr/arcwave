import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const facilitatorClient = new HTTPFacilitatorClient({
    url: "https://conduit-pay.vercel.app/api/x402",
});

export const x402Server = new x402ResourceServer(facilitatorClient);
x402Server.register("eip155:5042002", new ExactEvmScheme());

// Your wallet that receives payments
export const PAYMENT_ADDRESS = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";