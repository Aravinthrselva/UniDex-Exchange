import {Contract, providers, utils, BigNumber} from "ethers";
import {EXCHANGE_CONTRACT_ADDRESS, EXCHANGE_CONTRACT_ABI } from "@/constants";

export const removeLiquidity = async(signer , removeLPTokensWei) => {
    const exchangeContract = new Contract (EXCHANGE_CONTRACT_ADDRESS, EXCHANGE_CONTRACT_ABI, signer);

    const tx = await exchangeContract.removeLiquidity(removeLiquidity);
    await tx.wait();
}; 

//  * getTokensAfterRemove: Calculates the amount of `Eth` and `CD` tokens
//  that would be returned back to user after he removes `removeLPTokenWei` amount of LP tokens from the contract

export const getTokensAfterRemove = async( provider, removeLPTokenWei, _ethBalance, cryptoDevTokenReserve) => {
    try {
        const exchangeContract = new Contract (EXCHANGE_CONTRACT_ADDRESS, EXCHANGE_CONTRACT_ABI, provider);

        const _LPTotalSupply = await exchangeContract.totalSupply();
   // Here we are using the BigNumber methods of multiplication and division
   // The amount of Eth that would be sent back to the user after he withdraws the LP token is calculated based on a ratio

   //(amount of Eth that would be sent back to the user / Eth reserve) = (LP tokens withdrawn) / (total supply of LP tokens)

   //(amount of CD tokens sent back to the user / CD Token reserve) = (LP tokens withdrawn) / (total supply of LP tokens)

        const _removeEther = _ethBalance.mul(removeLPTokenWei).div(_LPTotalSupply);
        const _removeCD = cryptoDevTokenReserve.mul(removeLPTokenWei).div(_LPTotalSupply);
        
        return {_removeEther, _removeCD};
    } catch(err) {
        console.error(err);
    }

}