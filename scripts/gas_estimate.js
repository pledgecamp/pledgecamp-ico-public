var Token = artifacts.require("PLGToken");
var Crowdsale = artifacts.require("PLGCrowdsale");
var Whitelist = artifacts.require("Whitelist");
var Vesting = artifacts.require("TokenVesting");
var ScheduleHold = artifacts.require("ScheduleHold");
var ScheduleStandard = artifacts.require("ScheduleStandard");
var Schedule50 = artifacts.require("Schedule50");
var u = require('../test/util.js');
var BN = web3.BigNumber;

// Initial balances for crowdsale
var saleBalance = new BN('3e27'); // 3 billion * 1e18
var communityBalance = new BN('4.5e27');
var platformBalance = new BN('1.5e27');
var companyBalance = new BN('1e27');

async function contractGas(contract) {
    let receipt = await web3.eth.getTransactionReceipt(contract.transactionHash);
    return receipt.gasUsed;
}

module.exports = async function(callback) {
    global.web3 = web3;
    [owner, community, platform, company, investor1, investor2, user1, user2, user3, user4] = web3.eth.accounts;
    console.log("PLG Crowdsale Deployment Gas Estimates");

    var start = u.toEthTime(u.addDays(new Date(), 2));
    var rate = 70000;
    var minPurchase = web3.toWei(1, 'ether');
    var token = await Token.new();
    var crowdsale = await Crowdsale.new(token.address, start, rate, minPurchase);

    var initialAddrs = [crowdsale.address, community, platform, company];
    var amounts = [saleBalance, communityBalance, platformBalance, companyBalance];
    
    await u.initializeCrowdsaleTrading(token, crowdsale, initialAddrs, amounts, community);

    var whitelist = await u.initializeCrowdsaleWhitelist(crowdsale, Whitelist);
    await token.approve(crowdsale.address, 4.5e27, {from: community});
    await u.increaseDays(3);

    var tokenGas = await contractGas(token);
    var crowdsaleGas = await contractGas(crowdsale);
    var crowdsaleStartGas = await crowdsale.start.estimateGas();
    var whitelistGas = await contractGas(whitelist);
    var addParticipantGas = await whitelist.addParticipant.estimateGas(user1, 0, 1e18);
    var addParticipantsGas = await whitelist.addParticipants.estimateGas(web3.eth.accounts.slice(0, 9), 0, 1e18);

    console.log("Token: "+tokenGas);
    console.log("Crowdsale: "+crowdsaleGas);
    console.log("Crowdsale start: "+crowdsaleStartGas);
    console.log("Whitelist: "+whitelistGas);
    console.log("Add participant: "+addParticipantGas);
    var bulkSingleGas = Math.ceil(addParticipantsGas/10);
    console.log("Bulk add 10 participants: "+addParticipantsGas+" ("+bulkSingleGas+" each)");

    await crowdsale.start();
    var exchangeGas = await crowdsale.setExchangeRate.estimateGas(1000);
    var endGas = await crowdsale.end.estimateGas();
    console.log("Set exchange rate: "+exchangeGas);
    console.log("Crowdsale end: "+endGas);

    await whitelist.addParticipant(user1, 0, 1e18);
    var purchaseGas = await crowdsale.buyTokens.estimateGas({from: user1, value: web3.toWei(1, 'ether')});

    console.log("\nPurchase gas: "+purchaseGas);
    console.log("\n");

    var hold = await ScheduleHold.new(1541055600);
    var standard = await ScheduleStandard.new(1541055600);
    var schedule50 = await Schedule50.new(1541055600);

    var vesting = await Vesting.new(token.address, owner, user1, hold.address);
    var vestingGas = await contractGas(vesting);
    var holdGas = await contractGas(hold);
    var standardGas = await contractGas(standard);
    var schedule50Gas = await contractGas(schedule50);
    console.log("Hold schedule: "+holdGas);
    console.log("Standard schedule: "+standardGas);
    console.log("50 schedule: "+standardGas);
    console.log("Vesting: "+schedule50Gas);
    console.log("Vesting: "+vestingGas);
    console.log("\n");

}