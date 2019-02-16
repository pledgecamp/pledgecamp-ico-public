# Pledgecamp Crowdsale

The Pledgecamp crowdsale is the initial offering of Pledge Coins (PLG), for the purpose of funding platform development and generating a user base. The crowdsale is managed by a smart contract on the Ethereum blockchain.

## Terms
* **Pledge Coins** - Ethereum ERC20 tokens, abbv. PLG
* **Sale** - The Pledgecamp public crowdsale
* **User** - An ethereum account associated with a person
* **Vesting schedule** - A procedure for gradually releasing coins purchased in the sale

## Summary
The Pledgecamp public crowdsale contract begins on a date specified on creation. The sale is manually activated by the owner after the start date, and stopped by the owner at any time. Contributed ETH may be withdrawn by the owner at any time. Tokens are pre-allocated for a community reserve, a platform reserve, the company, and the public sale. The maximum number of tokens is fixed at *1,000,000,000,000*, and *200,000,000,000* tokens are available for sale. *170,000,000,000* tokens were pre-sold in the private sale, and will be released according to vesting contracts independent from the crowdsale.  *30,000,000,000* tokens are available for the public sale. The public sale is manually stopped when the limit is reached, which may result in slightly more or less than 30,000,000,000 total PLG sold. The sale is also effectively limited by the numbers of tokens controlled by the crowdale. An initial ETH to token exchange rate is set on contract creation and may be modified by the owner.

Individual or groups of users are whitelisted in a separate contract by assigning a bonus percentage and maximum purchase amount. The bonus percentage determines how many extra tokens are awarded to a purchase (e.g. if a user with 20% bonus purchases 10 tokens, they will receive 12 total). Bonus tokens are provided by an account that must have PLG allocated to it during initialization. The maximum purchase amount assigned to each user limits the amount of wei they may contribute to the crowdsale. The whitelisting contract, and bonus fund account, may be updated at any time by the owner. All crowdsale participants must be whitelisted for KYC/AML purposes. A user's whitelist status may be updated or revoked at any time. There is a minimum per-transaction purchase amount of $50 USD. Unsold tokens allotted to the public sale are automatically transferred to the community reserve when the sale ends.

Token trading is locked during the sale, with the exception of transfers required for the crowdsale and bonus transfers. Token trading will be manually unlocked after the sale ends. The owner may lock or unlock token trading at any time. Users may choose to burn (permanently destroy) tokens under their control at any time.

## Crowdsale Features
* Pre-allocations for community, platform, company, and sale
* Tokens capped at 1 trillion (30 billion for public sale)
* Updatable ether to PLG rate
* Whitelist for KYC
* Each user is assigned a bonus percentage and maximum purchase amount in wei
* Bonuses paid from community reserve fund
* Fixed start time after which the owner may begin the sale
* Token trading may be locked or unlocked at any time
* Non-refundable
* Minimum purchase amount of $50 USD

### Token Allocations
When instantiated, the crowdsale contract allocates a fixed number of tokens:

* 45% - Community reserve
* 20% - Public/private sale
* 15% - Platform reserve (partnerships, developer grants, ecosystem investment, and infrastructure)
* 10% - Company, team advisors and future employees
* 5% - Creator acquisition fund
* 5% - Moderator acquisition fund

The contract cannot produce new tokens after creation, so the supply of PLG is effectively fixed until the platform goes live.

## Private Sale Vesting

Tokens that have been pre-sold to private investors are sent to vesting contracts before the sale starts. There are three types of vesting schedules, and more may be added as necessary. Private vesting contracts are independent to the public crowdsale, although vested funds cannot be retrieved until token trading is unlocked after the crowdsale. Vesting contracts may be revoked at any time, in which case non-vested tokens are returned to the contract creator.

# Implementation Notes

* OpenZeppelin contracts last copied May 17, 2018
* Ownable contract is NOT taken from OpenZeppelin (no renounceOwnership())
* Same with SafeMath (no div())

## Deploy Strategy
See deploy/full_deploy.js for code example of crowdsale deployment

* Deploy PLGToken
* Deploy PLGCrowdsale with parameters:
    * PLGToken address
    * Timestamp of sale start (TBD)
    * Initial ETH/PLG exchange rate
    * Min purchase amount of $50 USD (per current conversion rate)
* Initialize PLGToken with pre-allocations
    * PLGCrowdsale contract 30B, private vesting 170B, community 450B, platform 150B , company 100B
* Set PLGToken trading exceptions for bonus pool, crowdsale, and private vesting distribution wallet
* Set PLGCrowdsale bonus pool (same as community reserve in PLGToken initialization)
* Deploy Whitelist
    * Whitelist.setCrowdsale(PLGCrowdsale)
    * PLGCrowdsale.setWhitelist(Whitelist)
* Community wallet approves crowdsale to transfer on its behalf
* Create private vesting contracts
    * Distribute private allocations from private vesting wallet
* Whitelist users (may continue after crowdsale starts)
* Start crowdsale
* Periodically update ETH/PLG exchange rate, and withdraw ETH
* End crowdsale
* Unlock token trading

## Other notes
Token trading must be manually unlocked after crowdsale ends
