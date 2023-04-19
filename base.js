import dotenv from "dotenv";

import fs from "fs";
import { KeyringProvider } from "@unique-nft/accounts/keyring";
import { Sdk } from "../../sdk/sdk1/dist/packages/sdk/full.js";

dotenv.config();

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractAbi = JSON.parse(fs.readFileSync("./market-abi.json").toString());

const provider = new KeyringProvider({
  type: "sr25519",
});
await provider.init();
const signer = provider.addSeed(process.env.SUBSTRATE_SEED);

const sdk = new Sdk({
  baseUrl: "http://localhost:3000/v1",
  signer,
});

const dataPath = "data.json";
const data = fs.existsSync(dataPath)
  ? JSON.parse(fs.readFileSync(dataPath).toString())
  : {};

export function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data));
}

export async function getCollection() {
  if (data.collectionId) {
    return data.collectionId;
  }
  const collection = await sdk.collection.create.submitWaitResult({
    address: signer.address,
    name: "test",
    tokenPrefix: "tst",
    description: "test collection",
  });
  console.log("collection", collection);

  data.collectionId = collection.parsed.collectionId;
  saveData();

  return data.collectionId;
}

export async function getToken() {
  if (data.tokenId) {
    return data.tokenId;
  }
  const token = await sdk.token.create.submitWaitResult({
    address: signer.address,
    collectionId: data.collectionId,
    owner: signer.address,
  });

  data.tokenId = token.parsed.tokenId;
  saveData();

  return data.tokenId;
}

export async function approveIfNeed() {
  const { isAllowed } = await sdk.token.allowance({
    collectionId: data.collectionId,
    tokenId: data.tokenId,
    from: signer.address,
    to: contractAddress,
  });
  console.log("isAllowed", isAllowed);

  if (!isAllowed) {
    const approveRes = await sdk.token.approve.submitWaitResult({
      address: signer.address,
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      spender: contractAddress,
      isApprove: true,
    });
    console.log("approveRes", approveRes);
    return !approveRes.error;
  }
}

export function init() {
  return {
    sdk,
    signer,
    data,
    contractAddress,
    contractAbi,
  };
}
