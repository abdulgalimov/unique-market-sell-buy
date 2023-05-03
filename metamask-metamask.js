import * as ethers from "ethers";
import {
  sdk,
  transferToken,
  getCollection,
  getToken,
} from "./base/substrate.js";
import {
  putToSell,
  runApprove,
  getOrder,
  runBuy,
  getMetamaskWallets,
  contractAddress,
  contractAbi,
} from "./base/metamask.js";

async function main() {
  console.log("metamask-metamask start");
  const collectionId = await getCollection();
  const tokenId = await getToken(true);
  console.log(`token: ${collectionId}x${tokenId}`);

  const { ownerWallet, otherWallet } = await getMetamaskWallets(
    collectionId,
    tokenId
  );

  const ownerContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    ownerWallet
  );
  const otherContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    otherWallet
  );

  const order = await getOrder(ownerContract, collectionId, tokenId);
  if (!order) {
    await transferToken(collectionId, tokenId, ownerWallet.address);

    const resultApprove = await runApprove(ownerWallet, collectionId, tokenId);
    if (!resultApprove) {
      return;
    }

    const resultPut = await putToSell(ownerContract, collectionId, tokenId);
    if (!resultPut) {
      return;
    }
  }

  await runBuy(otherContract, collectionId, tokenId, otherContract.address);

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
