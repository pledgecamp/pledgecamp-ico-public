pragma solidity 0.4.24;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./PLGToken.sol";
import "./Whitelist.sol";

/// @title Pledgecamp Crowdsale
/// @author Sam Pullman
/// @notice Capped crowdsale with bonuses for the Pledgecamp platform
contract PLGCrowdsale is Ownable {
    using SafeMath for uint256;

    /// @notice Indicates successful token purchase
    /// @param buyer Fund provider for the token purchase. Must either be `owner` or equal to `beneficiary`
    /// @param beneficiary Account that ultimately receives purchased tokens
    /// @param value Amount in wei of investment
    /// @param tokenAmount Number of tokens purchased (not including bonus)
    /// @param bonusAmount Number of bonus tokens received
    event TokenPurchase(address indexed buyer, address indexed beneficiary,
                        uint256 value, uint256 tokenAmount, uint256 bonusAmount);

    /// @notice Emitted when the ETH to PLG exchange rate has been updated
    /// @param oldRate The previous exchange rate
    /// @param newRate The new exchange rate
    event ExchangeRateUpdated(uint256 oldRate, uint256 newRate);

    /// @notice Emitted when the crowdsale ends
    event Closed();

    /// True if the sale is active
    bool public saleActive;

    /// ERC20 token the crowdsale is based on
    PLGToken plgToken;

    /// Timestamp for when the crowdsale may start
    uint256 public startTime;

    /// Timestamp set when crowdsale purchasing stops
    uint256 public endTime;

    /// Token to ether conversion rate
    uint256 public tokensPerEther;

    /// Amount raised so far in wei
    uint256 public amountRaised;

    /// The minimum purchase amount in wei
    uint256 public minimumPurchase;

    /// The address from which bonus tokens are distributed
    address public bonusPool;

    /// The strategy for assigning bonus tokens from bonusPool and assigning vesting contracts
    Whitelist whitelist;

    /// @notice Constructor for the Pledgecamp crowdsale contract
    /// @param _plgToken ERC20 token contract used in the crowdsale
    /// @param _startTime Timestamp for when the crowdsale may start
    /// @param _rate Token to ether conversion rate
    /// @param _minimumPurchase The minimum purchase amount in wei
    constructor(address _plgToken, uint256 _startTime, uint256 _rate, uint256 _minimumPurchase) public {

        require(_startTime >= now);
        require(_rate > 0);
        require(_plgToken != address(0));

        startTime = _startTime;
        tokensPerEther = _rate;
        minimumPurchase = _minimumPurchase;
        plgToken = PLGToken(_plgToken);
    }

    /// @notice Set the address of the bonus pool, which provides tokens
    /// @notice during bonus periods if it contains sufficient PLG
    /// @param _bonusPool Address of PLG holder
    function setBonusPool(address _bonusPool) public onlyOwner {
        bonusPool = _bonusPool;
    }

    /// @notice Set the contract that whitelists and calculates how many bonus tokens to award each purchase.
    /// @param _whitelist The address of the whitelist, which must be a `Whitelist`
    function setWhitelist(address _whitelist) public onlyOwner {
        require(_whitelist != address(0));
        whitelist = Whitelist(_whitelist);
    }

    /// @notice Starts the crowdsale under appropriate conditions
    function start() public onlyOwner {
        require(!saleActive);
        require(now > startTime);
        require(endTime == 0);
        require(plgToken.initialized());
        require(plgToken.lockExceptions(address(this)));
        require(bonusPool != address(0));
        require(whitelist != address(0));
        
        saleActive = true;
    }

    /// @notice End the crowdsale if the sale is active
    /// @notice Transfer remaining tokens to reserve pool
    function end() public onlyOwner {
        require(saleActive);
        require(bonusPool != address(0));
        saleActive = false;
        endTime = now;

        withdrawTokens();

        owner.transfer(address(this).balance);
    }

    /// @notice Withdraw crowdsale ETH to owner wallet
    function withdrawEth() public onlyOwner {
        owner.transfer(address(this).balance);
    }

    /// @notice Send remaining crowdsale tokens to `bonusPool` after sale is over
    function withdrawTokens() public onlyOwner {
        require(!saleActive);
        uint256 remainingTokens = plgToken.balanceOf(this);
        plgToken.transfer(bonusPool, remainingTokens);
    }

    /// Default function tries to make a token purchase
    function () external payable {
        buyTokensInternal(msg.sender);
    }

    /// @notice Public crowdsale purchase method
    function buyTokens() external payable {
        buyTokensInternal(msg.sender);
    }

    /// @notice Owner only method for purchasing on behalf of another person
    /// @param beneficiary Address to receive the tokens
    function buyTokensFor(address beneficiary) external payable onlyOwner {
        require(beneficiary != address(0));
        buyTokensInternal(beneficiary);
    }

    /// @notice Main crowdsale purchase method, which validates the purchase and assigns bonuses
    /// @param beneficiary Address to receive the tokens
    function buyTokensInternal(address beneficiary) private {
        require(whitelist != address(0));
        require(bonusPool != address(0));
        require(validPurchase(msg.value));
        uint256 weiAmount = msg.value;

        // This is the whitelist/max purchase check
        require(whitelist.isValidPurchase(beneficiary, weiAmount));

        // Calculate the amount of PLG that's been purchased
        uint256 tokens = weiAmount.mul(tokensPerEther);

        // update state
        amountRaised = amountRaised.add(weiAmount);
        // Record the purchase in the whitelist contract
        whitelist.recordPurchase(beneficiary, weiAmount);

        plgToken.transfer(beneficiary, tokens);

        uint256 bonusPercent = whitelist.getBonusPercent(beneficiary);
        uint256 bonusTokens = tokens.mul(bonusPercent) / 100;

        if(bonusTokens > 0) {
            plgToken.transferFrom(bonusPool, beneficiary, bonusTokens);
        }

        emit TokenPurchase(msg.sender, beneficiary, weiAmount, tokens, bonusTokens);
    }

    /// @notice Set a new ETH to PLG exchange rate
    /// @param _tokensPerEther Exchange rate
    function setExchangeRate(uint256 _tokensPerEther) external onlyOwner {

        emit ExchangeRateUpdated(tokensPerEther, _tokensPerEther);
        tokensPerEther = _tokensPerEther;
    }

    /// @notice Check various conditions to determine whether a purchase is currently valid
    /// @param amount The amount of tokens to be purchased
    function validPurchase(uint256 amount) public view returns (bool) {
        bool nonZeroPurchase = amount != 0;
        bool isMinPurchase = (amount >= minimumPurchase);
        return saleActive && nonZeroPurchase && isMinPurchase;
    }

}