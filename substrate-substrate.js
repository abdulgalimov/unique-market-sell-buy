import {
  approveIfNeed,
  getCollection,
  getToken,
  sdk,
  signer,
  runPut,
  runBuy,
} from "./base/substrate.js";
import { contractAddress, contractAbi, getOrder } from "./base/metamask.js";

async function main() {
  console.log("substrate-substrate start", signer.address);
  const collectionId = await getCollection();
  const tokenId = await getToken(true);
  console.log(`token: ${collectionId}x${tokenId}`);

  const contract = await sdk.evm.contractConnect(contractAddress, contractAbi);

  let order = await getOrder(contract, collectionId, tokenId);

  if (!order) {
    const approveRes = await approveIfNeed(contractAddress);
    if (!approveRes) {
      console.log("approve invalid");
      return;
    }

    await runPut(contract, collectionId, tokenId);
  }

  await runBuy(contract, collectionId, tokenId);
}

main()
  .then(() => {
    console.log("exited ok");
  })
  .catch((err) => {
    console.log("exited error", err);
  });
