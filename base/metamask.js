import { Address } from "@unique-nft/utils";
import { UniqueNFTFactory } from "@unique-nft/solidity-interfaces";
import * as ethers from "ethers";
import fs from "fs";
import { sdk, signer } from "./substrate.js";

export const contractAddress = process.env.CONTRACT_ADDRESS;
export const contractAbi = JSON.parse(
  fs.readFileSync("./market-abi.json").toString()
);

const metamaskProvider = new ethers.providers.JsonRpcBatchProvider(
  process.env.RPC_URL
);

export async function getMetamaskWallets(collectionId, tokenId) {
  const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY1, metamaskProvider);

  const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY2, metamaskProvider);

  const ownerBefore = await sdk.token.owner({
    collectionId,
    tokenId,
  });
  console.log("owner before buy", ownerBefore);
  if (ownerBefore.owner.toLowerCase() === wallet1.address.toLowerCase()) {
    return {
      ownerWallet: wallet1,
      otherWallet: wallet2,
    };
  } else {
    return {
      ownerWallet: wallet2,
      otherWallet: wallet1,
    };
  }
}

export async function runApprove(
  wallet,
  collectionId,
  tokenId,
  address = null
) {
  const approveTo = address || contractAddress;
  console.log(`--> approve by account ${wallet.address} to ${approveTo}`);
  const collectionAddress = Address.collection.idToAddress(collectionId);
  const collection = await UniqueNFTFactory(collectionAddress, wallet, ethers);
  let approved = await collection.getApproved(tokenId);

  if (!approved || approved.toLowerCase() !== approveTo.toLowerCase()) {
    await (
      await collection.approve(approveTo, tokenId, {
        gasLimit: 10_000_000,
      })
    ).wait();
  }

  approved = await collection.getApproved(tokenId);

  console.log(`<-- approve complete`, approved);
  return approved;
}

export async function putToSell(contract, collectionId, tokenId) {
  console.log(`--> put to sell by account ${contract.signer.address}`);
  try {
    const tx = await contract.put(
      collectionId,
      tokenId,
      12,
      1,
      Address.extract.ethCrossAccountId(contract.signer.address),
      {
        gasLimit: 10_000_000,
      }
    );
    await tx.wait();

    console.log("<-- put to sell complete");
    return true;
  } catch (err) {
    console.log("put err", err);
  }
}

export async function getOrder(contract, collectionId, tokenId) {
  let order;
  try {
    order = await contract.getOrder(collectionId, tokenId);
    return order.collectionId ? order : null;
  } catch (err) {}
}

export async function runBuy(contract, collectionId, tokenId) {
  console.log(`--> buy by account ${contract.signer.address}`);

  await (
    await contract.buy(
      collectionId,
      tokenId,
      1,
      Address.extract.ethCrossAccountId(contract.signer.address),
      {
        value: 100,
        gasLimit: 10_000_000,
      }
    )
  ).wait();
  console.log("<-- buy complete");
}
