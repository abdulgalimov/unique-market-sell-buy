import { getCollection, getToken, init } from "./base.js";
import * as ethers from "ethers";
import { UniqueNFTFactory } from "@unique-nft/solidity-interfaces";
import { Address } from "@unique-nft/utils";

const { sdk, signer, contractAddress, contractAbi } = init();

const provider = new ethers.JsonRpcProvider("https://rpc-opal.unique.network");
const ownerWallet = new ethers.Wallet(process.env.PRIVATE_KEY2, provider);

const otherWallet = new ethers.Wallet(process.env.PRIVATE_KEY1, provider);

async function transferToken(collectionId, tokenId) {
  const { owner } = await sdk.token.owner({
    collectionId,
    tokenId,
  });
  console.log("owner", owner);
  if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
    console.log("run transfer");
    try {
      const result = await sdk.token.transfer.submitWaitResult({
        address: signer.address,
        collectionId,
        tokenId,
        to: ownerWallet.address,
      });
      console.log("transfer result", result);
    } catch (err) {
      console.log("transfer error", err);
    }
  }
}

async function getOrder(contract) {
  let order;
  try {
    order = await contract.getOrder(collectionId, tokenId);
    console.log("order", order);
    return order;
  } catch (err) {}
}

async function put(contract, collectionId, tokenId) {
  try {
    console.log("run put");
    const tx = await contract.put(collectionId, tokenId, 123, 1, {
      gasLimit: 10_000_000,
    });
    const result = await tx.wait();
    console.log("put result", result);
    return true;
  } catch (err) {
    console.log("put err", err);
  }
}

async function approveEthers(collectionId, tokenId) {
  console.log("run approveEthers");
  const collectionAddress = Address.collection.idToAddress(collectionId);
  const collection = await UniqueNFTFactory(
    collectionAddress,
    ownerWallet,
    ethers
  );
  let approved = await collection.getApproved(tokenId);

  if (!approved || approved.toLowerCase() !== contractAddress.toLowerCase()) {
    const result = await (
      await collection.approve(contractAddress, tokenId)
    ).wait();
    console.log("approveEthers result", result);
  }

  approved = await collection.getApproved(tokenId);

  return approved && approved.toLowerCase() === contractAddress.toLowerCase();
}

async function main() {
  console.log("start", ownerWallet.address);
  const collectionId = await getCollection();
  const tokenId = await getToken();
  console.log(`token: ${collectionId}x${tokenId}`);

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

  const order = await getOrder(ownerContract);
  if (!order) {
    await transferToken(collectionId, tokenId);

    const resultApprove = await approveEthers(collectionId, tokenId);
    if (!resultApprove) {
      return;
    }

    const resultPut = await put(ownerContract, collectionId, tokenId);
    if (!resultPut) {
      return;
    }
  }

  const result = await (
    await otherContract.buy(collectionId, tokenId, 1, {
      value: 200,
      gasLimit: 10_000_000,
    })
  ).wait();
  console.log("buy result", result);

  const ownerResult = await sdk.token.owner({
    collectionId,
    tokenId,
  });
  console.log("owner after buy", ownerResult);
}

main();
