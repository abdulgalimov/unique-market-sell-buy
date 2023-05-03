import { getCollection, getToken, transferToken } from "./base/substrate.js";
import {
  runApprove,
  getMetamaskWallets,
  putToSell,
  contractAddress,
  contractAbi,
} from "./base/metamask.js";
import * as ethers from "ethers";

async function main() {
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

  await transferToken(collectionId, tokenId, ownerWallet.address);

  await runApprove(ownerWallet, collectionId, tokenId);

  const resultPut = await putToSell(ownerContract, collectionId, tokenId);
  if (!resultPut) {
    return;
  }

  await runApprove(ownerWallet, collectionId, tokenId, otherWallet.address);
}

main()
  .then(() => {
    console.log("exited ok");
  })
  .catch((err) => {
    console.log("exited error", err);
  });
