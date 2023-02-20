const {ethers} = require("hardhat");
const {CRYPTODEV_TOKEN_CONTRACT_ADDRESS} = require("../constants");

async function main() {

  const exchangeContract = await ethers.getContractFactory("Exchange");

  const deployedExchangeContract = await exchangeContract.deploy(CRYPTODEV_TOKEN_CONTRACT_ADDRESS);

  await deployedExchangeContract.deployed();

  console.log("Deployed Exchange Contract : ", deployedExchangeContract.address);
}


main()
.then(() => process.exit(0))
.catch((err) => {
console.log(err);
process.exit(1);
});