import {
  approveIfNeed,
  getCollection,
  getToken,
  runPut,
  sdk,
  signer,
} from "./base/substrate.js";
import {
  getMetamaskWallets,
  contractAddress,
  contractAbi,
  getOrder,
  runBuy,
} from "./base/metamask.js";
import * as ethers from "ethers";

async function main() {
  console.log("substrate-metamask start");
  const collectionId = await getCollection();
  const tokenId = await getToken(true);
  console.log(`token: ${collectionId}x${tokenId}`);
  console.log("seller", signer.address);

  const { otherWallet } = await getMetamaskWallets(collectionId, tokenId);

  const otherContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    otherWallet
  );

  let order = await getOrder(otherContract, collectionId, tokenId);
  console.log("order2", order);

  const approveRes = await approveIfNeed(contractAddress);
  if (!approveRes) {
    console.log("approve invalid");
    return;
  }

  if (!order) {
    const contract = await sdk.evm.contractConnect(
      contractAddress,
      contractAbi
    );
    await runPut(contract, collectionId, tokenId);
  }

  await runBuy(otherContract, collectionId, tokenId, otherContract.address);

  order = await getOrder(otherContract, collectionId, tokenId);
  console.log("order after put", order);

  const ownerAfter = await sdk.token.owner({
    collectionId,
    tokenId,
  });
  console.log("owner after buy", ownerAfter);
}

main()
  .then(() => {
    console.log("exited ok");
  })
  .catch((err) => {
    console.log("exited error", err);
  });
