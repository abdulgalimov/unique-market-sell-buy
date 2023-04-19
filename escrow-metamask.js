import { getCollection, getToken, init } from "./base.js";
import * as ethers from "ethers";
import { UniqueNFTFactory } from "@unique-nft/solidity-interfaces";
import { Address } from "@unique-nft/utils";

const { sdk, signer, contractAddress, contractAbi } = init();

const provider = new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL);

async function getWallets(collectionId, tokenId) {
  const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY1, provider);

  const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY2, provider);

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

async function transferToken(collectionId, tokenId, toAddress) {
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

async function getOrder(contract, collectionId, tokenId) {
  let order;
  try {
    order = await contract.getOrder(collectionId, tokenId);
    return order;
  } catch (err) {}
}

async function runApprove(wallet, collectionId, tokenId) {
  console.log(`--> approve contract by account ${wallet.address}`);
  const collectionAddress = Address.collection.idToAddress(collectionId);
  const collection = await UniqueNFTFactory(collectionAddress, wallet, ethers);
  let approved = await collection.getApproved(tokenId);

  if (!approved || approved.toLowerCase() !== contractAddress.toLowerCase()) {
    await (await collection.approve(contractAddress, tokenId)).wait();
  }

  approved = await collection.getApproved(tokenId);

  console.log(`<-- approve complete`);
  return approved && approved.toLowerCase() === contractAddress.toLowerCase();
}

async function put(contract, collectionId, tokenId) {
  console.log(`--> put to sell by account ${contract.signer.address}`);
  try {
    const tx = await contract.put(collectionId, tokenId, 123, 1, {
      gasLimit: 10_000_000,
    });
    await tx.wait();

    console.log("<-- put to sell complete");
    return true;
  } catch (err) {
    console.log("put err", err);
  }
}

async function runBuy(contract, collectionId, tokenId) {
  console.log(`--> buy by account ${contract.signer.address}`);
  await (
    await contract.buy(collectionId, tokenId, 1, {
      value: 200,
      gasLimit: 10_000_000,
    })
  ).wait();
  console.log("<-- buy complete");
}

async function main() {
  console.log("start");
  const collectionId = await getCollection();
  const tokenId = await getToken();
  console.log(`token: ${collectionId}x${tokenId}`);

  const { ownerWallet, otherWallet } = await getWallets(collectionId, tokenId);

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

    const resultPut = await put(ownerContract, collectionId, tokenId);
    if (!resultPut) {
      return;
    }
  }

  await runBuy(otherContract, collectionId, tokenId);

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
