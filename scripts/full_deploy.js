var Token = artifacts.require("PLGToken");
var Crowdsale = artifacts.require("PLGCrowdsale");
var Whitelist = artifacts.require("Whitelist");
var u = require('../test/util.js');
var BN = web3.BigNumber;

// Initial balances for crowdsale
var saleBalance = new BN('3e27'); // 3 billion * 1e18
var communityBalance = new BN('4.5e27');
var platformBalance = new BN('1.5e27');
var companyBalance = new BN('1e27');

module.exports = async function(callback) {
    [owner, community, platform, company, investor1, investor2, user1, user2, user3, user4] = web3.eth.accounts;
    
    var start = u.toEthTime(new Date("2018/10/1"));
    var rate = 70000;
    var minPurchase = web3.toWei(0.1, 'ether');
    var token = await Token.new();
    var crowdsale = await Crowdsale.new(token.address, start, rate, minPurchase);

    var initialAddrs = [crowdsale.address, community, platform, company];
    var amounts = [saleBalance, communityBalance, platformBalance, companyBalance];

    await token.initialize(initialAddrs, amounts);

    // Crowdsale and community (bonus pool) need token lock exceptions
    await token.setTradeException(crowdsale.address, true);
    await token.setTradeException(community, true);

    await crowdsale.setBonusPool(bonusPool);

    var wl = await Whitelist.new();
    await wl.setCrowdsale(crowdsale.address);
    await crowdsale.setWhitelist(wl.address);
    
    await token.approve(crowdsale.address, 4.5e27, {from: community});

    var initialized = await token.initialized.call();
    var bonusAddr = await crowdsale.bonusPool.call();

    console.log("Token initialized: "+initialized);
    console.log("Bonus pool matches: "+(bonusAddr.toString(16) == community));
}