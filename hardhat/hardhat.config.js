require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({path: ".env"});

const QUICKNODE_HTTP_URL = process.env.QUICKNODE_HTTP_URL;
const PRV_KEY = process.env.PRV_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url : QUICKNODE_HTTP_URL,
      accounts:[PRV_KEY],
    },
  },
};
