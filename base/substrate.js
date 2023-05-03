import dotenv from "dotenv";

import fs from "fs";
import { KeyringProvider } from "@unique-nft/accounts/keyring";
import { Sdk } from "../../../sdk/sdk1/dist/packages/sdk/full.js";
import { Address } from "@unique-nft/utils";

dotenv.config();

const provider = new KeyringProvider({
  type: "sr25519",
});
await provider.init();
export const signer = provider.addSeed(process.env.SUBSTRATE_SEED);

export const sdk = new Sdk({
  baseUrl: "http://localhost:3000/v1",
  signer,
});

const dataPath = "data.json";
export const data = fs.existsSync(dataPath)
  ? JSON.parse(fs.readFileSync(dataPath).toString())
  : {};

export function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data));
}

export async function getCollection() {
  if (data.collectionId) {
    return data.collectionId;
  }
  console.log(`--> create collection`);
  const collection = await sdk.collection.create.submitWaitResult({
    address: signer.address,
    name: "test",
    tokenPrefix: "tst",
    description: "test collection",
  });

  data.collectionId = collection.parsed.collectionId;
  saveData();

  console.log(`<-- create collection complete: ${data.collectionId}`);

  return data.collectionId;
}

export async function getToken(forceNew) {
  if (data.tokenId && !forceNew) {
    return data.tokenId;
  }

  console.log(`--> create token`);
  const token = await sdk.token.create.submitWaitResult({
    address: signer.address,
    collectionId: data.collectionId,
    owner: signer.address,
  });

  data.tokenId = token.parsed.tokenId;
  saveData();

  console.log(`<-- create token complete: ${data.tokenId}`);

  return data.tokenId;
}

export async function approveIfNeed(contractAddress) {
  const { isAllowed } = await sdk.token.allowance({
    collectionId: data.collectionId,
    tokenId: data.tokenId,
    from: signer.address,
    to: contractAddress,
  });

  if (!isAllowed) {
    console.log(
      `--> approve by account ${signer.address} to ${contractAddress}`
    );
    const approveRes = await sdk.token.approve.submitWaitResult({
      address: signer.address,
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      spender: contractAddress,
      isApprove: true,
    });
    console.log(`<-- approve complete`, !approveRes.error);
    return !approveRes.error;
  } else {
    return true;
  }
}

export async function transferToken(collectionId, tokenId, toAddress) {
  const { owner } = await sdk.token.owner({
    collectionId,
    tokenId,
  });
  if (owner.toLowerCase() === signer.address.toLowerCase()) {
    console.log(`--> transfer token from ${signer.address} to ${toAddress}`);
    try {
      await sdk.token.transfer.submitWaitResult({
        address: signer.address,
        collectionId,
        tokenId,
        to: toAddress,
      });
      console.log("<-- transfer token complete");
    } catch (err) {
      console.log("transfer error", err);
    }
  }
}

export async function runPut(contract, collectionId, tokenId) {
  console.log(`--> put by account ${signer.address}`);
  await contract.send.submitWaitResult({
    address: signer.address,
    funcName: "put",
    gasLimit: 10_000_000,
    args: {
      collectionId,
      tokenId,
      amount: 1,
      price: 10,
      seller: Address.extract.ethCrossAccountId(signer.address),
    },
  });
  console.log("<-- put complete");
}

export async function runBuy(contract, collectionId, tokenId) {
  console.log(`--> buy by account ${signer.address}`);
  const args = {
    address: signer.address,
    funcName: "buy",
    gasLimit: 10_000_000,
    value: 100,
    args: {
      collectionId,
      tokenId,
      amount: 1,
      buyer: Address.extract.ethCrossAccountId(signer.address),
    },
  };

  /*
  try {
    const callResult = await sdk.evm.call({
      ...args,
      contractAddress,
      abi: contractAbi,
    });
    console.log("callResult", callResult);
  } catch (err) {
    console.log("buy err", JSON.stringify(err, null, 2));
    return;
  }
   */

  await contract.send.submitWaitResult(args);
  console.log("<-- buy complete");
}
