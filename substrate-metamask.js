import { approveIfNeed, getCollection, getToken, init } from "./base.js";
import * as ethers from "ethers";
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

async function getOrder(contract, collectionId, tokenId) {
  let order;
  try {
    order = await contract.getOrder(collectionId, tokenId);
    return order.collectionId ? order : null;
  } catch (err) {}
}

async function put(contract, collectionId, tokenId) {
  const putResult = await contract.send.submitWaitResult({
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
  console.log("putResult", JSON.stringify(putResult, null, 2));
}

async function runBuy(contract, collectionId, tokenId) {
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

async function main() {
  console.log("substrate-metamask start");
  const collectionId = await getCollection();
  const tokenId = await getToken(true);
  console.log(`token: ${collectionId}x${tokenId}`);
  console.log("seller", signer.address);

  const { otherWallet } = await getWallets(collectionId, tokenId);

  const otherContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    otherWallet
  );

  let order = await getOrder(otherContract, collectionId, tokenId);
  console.log("order2", order);

  const approveRes = await approveIfNeed();
  if (!approveRes) {
    console.log("approve invalid");
    return;
  }

  if (!order) {
    const contract = await sdk.evm.contractConnect(
      contractAddress,
      contractAbi
    );
    await put(contract, collectionId, tokenId);
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
