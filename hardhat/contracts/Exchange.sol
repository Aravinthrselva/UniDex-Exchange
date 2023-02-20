// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {

    address public cryptoDevTokenAddress;

    constructor (address _CryptoDevToken) ERC20("CryptoDev LP Token", "CDLP") {
        require(_CryptoDevToken != address(0), "Token address passed is a Null Address");
        cryptoDevTokenAddress = _CryptoDevToken;
        
    }

// getReserve returns the amount of `Crypto Dev Tokens` held by the contract

function getReserve() public view returns (uint) {
    return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
}

function addLiquidity(uint _amount) public payable returns (uint) {
    uint liquidity;
    uint ethBalance = address(this).balance;
    uint cryptoDevTokenReserve = getReserve();
    ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);

/*
If the reserve is empty, intake any user supplied value for `Ether` and `Crypto Dev` tokens because there is no ratio currently
*/

    if (cryptoDevTokenReserve == 0) {
        
        // Transfer the `cryptoDevToken` from the user's account to the contract
        cryptoDevToken.transferFrom(msg.sender, address(this), _amount);

       // Take the current ethBalance and mint `ethBalance` amount of LP tokens to the user.

        // `liquidity` provided is equal to `ethBalance` because this is the first time user is adding `Eth` to the contract, 

        // so whatever `Eth` contract has is equal to the one supplied by the user in the current `addLiquidity` call

        // `liquidity` tokens that need to be minted to the user on `addLiquidity` call should always be proportional to the Eth specified by the user

        liquidity = ethBalance;
        _mint(msg.sender, liquidity);

        // _mint is ERC20.sol smart contract function to mint ERC20 tokens
    } else {
         uint ethReserve = ethBalance - msg.value;
         uint lpTotalSupply = totalSupply();

        // Ratio should always be maintained so that there are no major price impacts when adding liquidity
        // Ratio here is -> (cryptoDevTokenAmount user can add/cryptoDevTokenReserve in the contract) = (Eth Sent by the user/Eth Reserve in the contract);
        // So doing some maths, (cryptoDevTokenAmount user can add) = (Eth Sent by the user * cryptoDevTokenReserve /Eth Reserve);

         uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve) / (ethReserve);
         require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimum tokens required");

         cryptoDevToken.transferFrom(msg.sender, address(this), cryptoDevTokenAmount);

        // The amount of LP tokens that would be sent to the user should be proportional to the liquidity of
        // ether added by the user
        // Ratio here to be maintained is ->
        // (LP tokens to be sent to the user (liquidity)/ totalSupply of LP tokens in contract) = (Eth sent by the user)/(Eth reserve in the contract)
        // by some maths -> liquidity =  (totalSupply of LP tokens in contract * (Eth sent by the user))/(Eth reserve in the contract)

         liquidity = (msg.value* lpTotalSupply ) / (ethReserve);

         _mint(msg.sender, liquidity);
    }
        return liquidity;
}


//Returns the amount Eth/Crypto Dev tokens that would be returned to the user in the swap

function removeLiquidity(uint _amount) public returns (uint, uint) {

require(_amount > 0, "Amount should be greater than zero");
uint ethReserve = address(this).balance;
uint devTokenReserve = getReserve();
uint lpTotalSupply = totalSupply();

// The amount of Eth that would be sent back to the user is based on a ratio
// Ratio is -> (Eth sent back to the user) / (current Eth reserve)
// = (amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)

uint ethAmount = (ethReserve * _amount)/ lpTotalSupply;

// The amount of Crypto Dev token that would be sent back to the user is based on a ratio
// Ratio is -> (Crypto Dev sent back to the user) / (current Crypto Dev token reserve)
// = (amount of LP tokens that user wants to withdraw) / (total supply of LP tokens)

uint cryptoDevTokenAmount = (_amount * devTokenReserve) / lpTotalSupply;

// Burn the sent LP tokens from the user's wallet because they are already sent to
// remove liquidity

_burn(msg.sender, _amount);
// Transfer `ethAmount` of Eth from the contract to the user's wallet
payable(msg.sender).transfer(ethAmount);

// Transfer `cryptoDevTokenAmount` of Crypto Dev tokens from the contract to the user's wallet
ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);

return(ethAmount, cryptoDevTokenAmount);

}

function getAmountOfTokens(uint inputAmount, uint inputReserve, uint outputReserve) public pure returns(uint) {

    require(inputReserve > 0 && outputReserve > 0, "Invalid Reserves");
    // We are charging a fee of `1%` --- inputAmount*99/100
    uint inputAmountWithFee = inputAmount * 99;  

    // So the final formula is Δy = (y * Δx) / (x + Δx)
    // Δy in our case is `tokens to be received`
    // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
    // So by putting the values in the formulae you can get the numerator and denominator
    uint numerator = inputAmountWithFee*outputReserve;
    uint denominator = (inputReserve * 100)+ inputAmountWithFee;

    uint outputAmount = numerator/denominator;

    return outputAmount;
}

function ethToCryptoDevToken(uint _minTokens) public payable {
    uint tokenReserve = getReserve();
    // call the `getAmountOfTokens` to get the amount of Crypto Dev tokens that would be returned to the user after the swap
    // because `address(this).balance` already contains the `msg.value` user has sent in the given call 
    // so we need to subtract it to get the actual input reserve  

   uint ethReserve = address(this).balance - msg.value;

   uint tokensBought = getAmountOfTokens(msg.value, ethReserve, tokenReserve);

   require ( tokensBought >= _minTokens, "Insufficient output amount(Dev Tokens)");
  // Transfer the `Crypto Dev` tokens to the user
  ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
}


// Swaps CryptoDev Tokens for Eth


function cryptoDevTokenToEth(uint _tokensSold, uint _minEth) public {
    uint tokenReserve = getReserve();

    uint ethBought = getAmountOfTokens(_tokensSold, tokenReserve, address(this).balance);

    require(ethBought >= _minEth, "Insufficient output amount(Eth)" ); 
    // Transfer `Crypto Dev` tokens from the user's address to the contract
    ERC20(cryptoDevTokenAddress).transferFrom(msg.sender, address(this), _tokensSold);

    // send the `ethBought` to the user from the contract
    payable(msg.sender).transfer(ethBought);
}

}