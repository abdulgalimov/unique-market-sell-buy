import { approveIfNeed, getCollection, getToken, init } from "./base.js";

const { sdk, signer, data, contractAddress, contractAbi } = init();

async function getOrder(contract) {
  try {
    const order = await contract.call({
      address: signer.address,
      funcName: "getOrder",
      gasLimit: 10_000_000,
      args: {
        collectionId: data.collectionId,
        tokenId: data.tokenId,
      },
    });
    return order;
  } catch (err) {
    console.log("get order err", err);
    return undefined;
  }
}

async function put(contract) {
  const putResult = await contract.send.submitWaitResult({
    address: signer.address,
    funcName: "put",
    gasLimit: 10_000_000,
    args: {
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      amount: 1,
      price: 10,
    },
  });
  console.log("putResult", JSON.stringify(putResult, null, 2));
}

async function buy(contract) {
  const args = {
    address: signer.address,
    funcName: "buy",
    gasLimit: 10_000_000,
    value: 100,
    args: {
      collectionId: data.collectionId,
      tokenId: data.tokenId,
      amount: 1,
    },
  };

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

  const buyResult = await contract.send.submitWaitResult(args);
  console.log("buy", JSON.stringify(buyResult, null, 2));
}

async function main() {
  console.log("substrate-substrate start", signer.address);
  const collectionId = await getCollection();
  const tokenId = await getToken();
  console.log(`token: ${collectionId}x${tokenId}`);

  const contract = await sdk.evm.contractConnect(contractAddress, contractAbi);

  let order = await getOrder(contract);

  if (!order) {
    const approveRes = await approveIfNeed();
    if (!approveRes) {
      console.log("approve invalid");
      return;
    }

    await put(contract);
  }

  await buy(contract);
}

main();
