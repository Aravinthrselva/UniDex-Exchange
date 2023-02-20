import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import Web3Modal from 'web3modal'
import {useState, useEffect, useRef} from 'react';
import {providers, utils, BigNumber} from 'ethers';

import {addLiquidity, calculateCD} from '../utils/addLiquidity';

import {removeLiquidity, getTokensAfterRemove} from '../utils/removeLiquidity';

import {getAmountOfTokensReceievedFromSwap, swapTokens } from '@/utils/swap';

import {getEtherBalance, getCDTokensBalance, getLPTokensBalance, getReserveOfCDTokens} from '@/utils/getAmounts';

export default function Home() {


  const web3ModalRef = useRef();
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);

// We have two tabs in this dapp, Liquidity Tab and Swap Tab. This variable keeps track of which Tab the user is on 

  const [liquidityTab, setLiquidityTab] = useState(false);

// Keeps track of whether  `Eth` or `Crypto Dev` token is selected. If `Eth` is selected it means that the user
// wants to swap some `Eth` for some `Crypto Dev` tokens and vice versa if `Eth` is not selected
  const[ethSelected, setEthSelected] = useState(true);


// This variable is the `0` number in form of a BigNumber
  const zero = BigNumber.from(0);

  /** Variables to keep track of amount */
  // Eth held by the user's account
  const [ethBalance, setEthBalance] = useState(zero);

  //ether balance in the contract
  const [ethBalanceContract, setEthBalanceContract] = useState(zero);

  // `CD` tokens help by the users account
  const [cdBalance, setCDBalance] = useState(zero);

  //Crypto Dev tokens Reserve balance in the Exchange contract
  const [reservedCD, setReservedCD] = useState(zero);

  //LP tokens held by the users account
  const[lpBalance, setLPBalance] = useState(zero);

/** Variables to keep track of liquidity to be added or removed */
// amount of Ether that the user wants to add to the liquidity

  const[addEth, setAddEth] = useState(zero);

  // addCDTokens keeps track of the amount of CD tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // CD tokens that the user can add given a certain amount of ether
  const[addCDTokens, setAddCDTokens] = useState(zero);

  //amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens they want to withdraw
  const[removeEth, setRemoveEth] = useState(zero);

  //amount of CD TOkens that would be sent back to the user based on a certain number of `LP` tokens they want to withdraw
  const[removeCD, setRemoveCD] = useState(zero);

  // amount of LP tokens that the user wants to remove from liquidity
  const[removeLPTokens, setRemoveLPTokens]= useState("0");

  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const[swapAmount, setSwapAmount] = useState("");

  // This keeps track of the number of tokens that the user would receive after a swap completes
  const[tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] = useState(zero);



  /**
   * getAmounts call various functions to retrive amounts for ethbalance,
   * LP tokens etc
   */


  const getAmounts = async() => {
    try {
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);
      const address  = await signer.getAddress();
      
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address, false);
      // get the amount of `Crypto Dev` tokens held by the user
      const _cdBalance = await getCDTokensBalance(provider, address);
      // get the amount of `Crypto Dev` LP tokens held by the user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // gets the amount of `CD` tokens that are present in the reserve of the `Exchange contract`
      const _reserveCD = await getReserveOfCDTokens(provider);
      // Get the ether reserves in the contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);

      setEthBalance(_ethBalance);
      setCDBalance(_cdBalance);
      setLPBalance(_lpBalance);
      setReservedCD(_reserveCD);
      setEthBalanceContract(_ethBalanceContract);

    } catch (err) {
      console.error(err);
    }
  }
  /**
   * swapTokens: Swaps  `swapAmountWei` of Eth/Crypto Dev tokens with `tokenToBeReceivedAfterSwap` amount of Eth/Crypto Dev tokens.
   */

  const _swapTokens = async() => {
    try {
  // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`             
      const swapAmountWei = utils.parseEther(swapAmount);
  // Check if the user entered zero
  // We are here using the `eq` method from BigNumber class in `ethers.js`
      if(!swapAmountWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);

        await swapTokens(signer, swapAmountWei, tokenToBeReceivedAfterSwap, ethSelected);
        setLoading(false);

  // Get all the updated amounts after the swap
        await getAmounts();
        setSwapAmount("");
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");
    }
  }

  /**
   * _getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/Crypto Dev tokens that can be received
   * when the user swaps `_swapAmountWEI` amount of Eth/Crypto Dev tokens.
   */

  const _getAmountOfTokensReceivedFromSwap = async(_swapAmount) => {
    try {
    // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`
    const _swapAmountWei = utils.parseEther(_swapAmount.toString());
    if(!_swapAmountWei.eq(zero)) {
      const provider  = await getProviderOrSigner();
    // Get the amount of ether in the contract
      const _ethBalanceContract =  await getEtherBalance(provider, null, true);

      const amountOfTokens = await getAmountOfTokensReceievedFromSwap(_swapAmountWei, provider, ethSelected, _ethBalanceContract, reservedCD);

      setTokenToBeReceivedAfterSwap(amountOfTokens);
    
    } else {
      setTokenToBeReceivedAfterSwap(zero);
    }

    } catch (err) {
      console.error(err);
    }
  }

  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
   * to the exchange. If he is adding the liquidity after the initial liquidity has already been added
   * then we calculate the crypto dev tokens he can add, given the Eth he wants to add by keeping the ratios
   * constant
   */

  const _addLiquidity = async() => {
    try {
     // Convert the ether amount entered by the user to Bignumber
     const addEtherWei = utils.parseEther(addEth.toString());
     
     // Check if the values are zero
     if(!addEtherWei.eq(zero) && !addCDTokens.eq(zero)) {

      const signer = await getProviderOrSigner(true);
      setLoading(true);

      await addLiquidity(signer, addCDTokens, addEtherWei);
      setLoading(false);

      // Reinitialize the CD tokens
      setAddCDTokens(zero);

      await getAmounts();
     
    } else {
      setAddCDTokens(zero);
    }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
    }
  } 


  const _removeLiquidity = async() => {
    try {
      const signer = await getProviderOrSigner(true);

      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);

      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);

      await getAmounts();
      setRemoveCD(zero);
      setRemoveEth(zero);

    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEth(zero);  
    }
  }


  /**
   * _getTokensAfterRemove: Calculates the amount of `Ether` and `CD` tokens
   * that would be returned back to user after he removes `removeLPTokenWei` amount
   * of LP tokens from the contract
   */

  const _getTokensAfterRemove = async(_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();
      // Convert the LP tokens entered by the user to a BigNumber
      const _removeLPTokensWei =  utils.parseEther(_removeLPTokens);

      const _ethBalanceContract = await getEtherBalance(provider, null, true);

      const _cryptoDevTokenReserve = await getReserveOfCDTokens(provider);

      const {_removeEth, _removeCD} = await getTokensAfterRemove(provider, _removeLPTokensWei, _ethBalanceContract, _cryptoDevTokenReserve);

      setRemoveEth(_removeEth);
      setRemoveCD(_removeCD);
    } catch (err) {
      console.error(err);

    }
  }

  const getProviderOrSigner = async(needSigner = false) => {

    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const {chainId} = await web3Provider.getNetwork();

    if (chainId !== 5) {
      window.alert("Please connect to Goelri Network");
      throw new Error("Not Connected to Goerli");
    }

    if(needSigner) {
      const signer =  web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  }


 const connectWallet = async() => {
  try {
  // Get the provider from web3Modal, which in our case is MetaMask
  // When used for the first time, it prompts the user to connect their wallet  
  await getProviderOrSigner();
  setWalletConnected(true);
  } catch (err) {
    console.error(err);
  }
 }


// useEffects are used to react to changes in state of the website
// The array at the end of function call represents what state changes will trigger this effect
// In this case, whenever the value of `walletConnected` changes - this effect will be called

  useEffect(() => {
    if(!walletConnected) {

// Assign the Web3Modal class to the reference object by setting its `current` value
// The `current` value is persisted throughout as long as this page is open

      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected])




const renderButton = () => {
    if(!walletConnected){
      return (<button className = {styles.button} onClick = {connectWallet}> Connect Wallet </button>);
    }

    if(loading) {
      return (<button className = {styles.button}> Loading... </button> )
    }

    if(liquidityTab) {
      return(
        <div>
          <div className = {styles.description}>
            You have: 
            <br/>
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {utils.formatEther(ethBalance)} Eth
            <br/>
            {utils.formatEther(cdBalance)} CD Tokens
            <br/>
            {utils.formatEther(lpBalance)} CD-LP Tokens
          </div>
          <div>
            {/* If reserved CD is zero, render the state for liquidity zero where we ask the user
            how much initial liquidity he wants to add else just render the state where liquidity is not zero and
            we calculate based on the `Eth` amount specified by the user how much `CD` tokens can be added */}

            {utils.parseEther(reservedCD.toString()).eq(zero) ? (
              <div>
                <input
                  className = {styles.input} 
                  type = "number"
                  placeholder =  "Eth"
                  onChange = {(e) => setAddEth(e.target.value || "0")}  
                />
                <input
                className = {styles.input} 
                type = "number"
                placeholder = "CD"
                onChange = {(e) => setAddCDTokens(
                  BigNumber.from(utils.parseEther(e.target.value || "0"))
                  )}
                />
                <button className={styles.button} onClick={_addLiquidity}>
                  Add
                </button>
              </div> 
            ) : (
              <div>
                <input 
                className = {styles.input}
                type= "number"
                placholder = "Eth"
                onChange={async(e) => {
                  setAddEth(e.target.value || "0");
                    // calculate the number of CD tokens that
                    // can be added given  `e.target.value` amount of Eth
                const _addCDTokens = await calculateCD (e.target.value || "0", ethBalanceContract , reservedCD);
                setAddCDTokens(_addCDTokens);
                }}
                />
                <div className={styles.inputDiv}>
                  {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                  {`You need ${utils.formatEther(addCDTokens)} CD Tokens`}
                </div> 
                 <button className={styles.button} onClick={addLiquidity}>
                  Add
                 </button>
              </div>
            )}
            <div>
              <input 
              className={styles.input}
              type="number"
              placeholder="CD-LP"
              onChange = {async(e) => {
                setRemoveLPTokens(e.target.value || "0");
                // Calculate the amount of Ether and CD tokens that the user would receive
                // After he removes `e.target.value` amount of `LP` tokens
              await _getTokensAfterRemove(e.target.value || "0");
              }}
              />
              <div className={styles.inputDiv}>
              {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
              {`You will get ${utils.formatEther(removeCD)} CD Tokens and ${utils.formatEther(removeEth)} Eth`}
              </div>
              <button className={styles.button} onClick={_removeLiquidity}>
                Remove
              </button>
            </div>           
          </div>
        </div>
      );
  // SWAP TAB
    } else { 
      return (
        <div>
          <input 
          className={styles.input}
          type="number"
          placeholder="amount"
          onChange ={async(e) => {
            setSwapAmount(e.target.value || "0");
          
          // Calculate the amount of tokens user would receive after the swap
            await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
          }}
          value = {swapAmount}
          />
          <select
          className={styles.select} 
          name="dropdown"
          id="dropdown"
          onChange={async() => {
            setEthSelected(!ethSelected);

            //Initialize the values back to zero
            await _getAmountOfTokensReceivedFromSwap(0);
            setSwapAmount("");
          }}
          >
            <option value="eth">Eth</option>
            <option value="CD"> CD Token</option>
          </select>
          <br/>
          <div className={styles.inputDiv}>
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {ethSelected ? `You will get ${utils.formatEther(tokenToBeReceivedAfterSwap)} CD Tokens` : 
                           `You will get ${utils.formatEther(tokenToBeReceivedAfterSwap)} Eth`}
          </div>
          <button className={styles.button} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
};
  




return (
    <div>
     <Head>
        <title>UniDex</title>
        <meta name="description" content="An Avantgard Exchange project" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>UniDex Exchange(Beta) </h1>
          <div className= {styles.description}> Ethereum &#60;-&#62; Crypto Dev Tokens</div>  
        
        <div>
          <button className={styles.button} onClick={() => {setLiquidityTab(true)}}>
            Liquidity
          </button>
          <button className={styles.button} onClick={() => {setLiquidityTab(false)}}>
            Swap
          </button>
        </div>
        {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodev.svg" />
        </div>
      </div>
        <footer className = {styles.footer}>
          Made with 💚 by AvantGard
        </footer>
    </div>  
  );
}
