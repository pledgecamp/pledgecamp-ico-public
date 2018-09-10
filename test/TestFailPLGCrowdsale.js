
var Token = artifacts.require("PLGToken");
var Crowdsale = artifacts.require("PLGCrowdsale");
var Whitelist = artifacts.require("Whitelist");
var u = require('./util.js');
var BN = web3.BigNumber;

var saleBalance = new BN('3e27'); // 3 billion * 1e18
var communityBalance = new BN('4.5e27');
var platformBalance = new BN('1.5e27');
var companyBalance = new BN('1e27');

contract('TestFailPLGCrowdsale', async function(accounts) {
    [owner, community, platform, company, investor1, investor2, user1, user2, user3, user4] = accounts;
    let token, crowdsale, whitelist;

    it("Invalid start, and purchase before start", async function() {
        amounts = [saleBalance, communityBalance, platformBalance, companyBalance];

        [token, crowdsale] = await u.makeCrowdsale(Token, Crowdsale);
        addrs = [crowdsale.address, community, platform, company];
        await u.initializeCrowdsaleTrading(token, crowdsale, addrs, amounts, community);

        // Shouldn't be able to start, or buy tokens before crowdsale is started
        await u.shouldRevert(crowdsale.start(), "Can't start yet");
        await u.shouldRevert(crowdsale.buyTokens({from: user1, value: web3.toWei(1, 'ether')}));
        await u.increaseDays(2);
    });

    it("Invalid attempt to END sale before start", async function() {
        await u.shouldRevert(crowdsale.end());
    });

    it("Invalid Whitelist", async function() {
        // Should fail to set whitelist to a random address
        fakeAddress = 0;
        await u.shouldRevert(crowdsale.setWhitelist(fakeAddress));
    });

    it("Pre-start failure conditions", async function() {
        whitelist = await u.initializeCrowdsaleWhitelist(crowdsale, Whitelist);
        
        await token.approve(crowdsale.address, 4.5e27, {from: community});

        await u.shouldRevert(crowdsale.start({from: investor1}), "Investor1 can't start the sale");
        await crowdsale.start();
    });

    it("Invalid participant adding", async function() {
        var maxPurchase = web3.toWei(10, 'ether');

        await u.shouldRevert(whitelist.addParticipant(user1, 10, maxPurchase, {from: user3}), "User3 can't whitelist");

        await whitelist.addParticipant(user1, 10, maxPurchase);
    });

    it("Non-whitelisted users cannot purchase", async function() {
        var maxPurchase = web3.toWei(10, 'ether');

        await whitelist.addParticipant(user2, 5, maxPurchase);
        await crowdsale.buyTokens({from: user1, value: web3.toWei(1, 'ether')});

        // user3 is not whitelisted
        await u.shouldRevert(crowdsale.buyTokens({from: user3, value: web3.toWei(1, 'ether')}));

        // user4 can't purchase after being revoked
        await whitelist.addParticipant(user4, 5, maxPurchase);
        await whitelist.revokeParticipant(user4);
        await u.shouldRevert(crowdsale.buyTokens({from: user4, value: web3.toWei(1, 'ether')}));

        await u.shouldRevert(crowdsale.buyTokensFor(user4, {from: owner, value: web3.toWei(2, 'ether')}));
        
        // test multiple user revocation
        await whitelist.addParticipants([user3, user4], 5, maxPurchase);
        await whitelist.revokeParticipants([user4, user3]);
        await u.shouldRevert(crowdsale.buyTokens({from: user3, value: web3.toWei(1, 'ether')}));
        await u.shouldRevert(crowdsale.buyTokens({from: user4, value: web3.toWei(1, 'ether')}));
    });

    it("Some ownership failure testing", async function() {
        await u.shouldRevert(crowdsale.setExchangeRate(100000, {from: user1}), "User1 can't set exchange rate");

        await u.shouldRevert(crowdsale.setBonusPool(user2, {from: user3}), "User3 can't set bonus pool");

        await u.shouldRevert(crowdsale.transferOwnership(user1, {from: user1}), "User1 can't steal the sale");
    });

    it("Purchase amount below minimum", async function() {
        
        await u.shouldRevert(crowdsale.buyTokens({from: user1, value: web3.toWei(0.09, 'ether')}));
    });

    it("Invalid purchase for address 0", async function() {

        await u.shouldRevert(whitelist.addParticipant(0, 10, web3.toWei(1, 'ether')));

        await u.shouldRevert(crowdsale.buyTokensFor(0, {from: owner, value: web3.toWei(1, 'ether')}));
    });

    it("Only owner may purchase on behalf of other accounts", async function() {

        await u.shouldRevert(crowdsale.buyTokensFor(user2, {from: user1, value: web3.toWei(2, 'ether')}));

        // Even if sent by the owner, the beneficiary must still be whitelisted
        await u.shouldRevert(crowdsale.buyTokensFor(user3, {from: owner, value: web3.toWei(2, 'ether')}));
    });

    it("Invalid purchase above max sale", async function() {
        
        var amounts2 = [new BN('7e23'), new BN('5e23'), new BN('7e23'), new BN('7e23')];
        [token2, crowdsale2] = await u.makeCrowdsale(Token, Crowdsale);
        var addrs2 = [crowdsale2.address, community, platform, company];
        await u.initializeCrowdsaleTrading(token2, crowdsale2, addrs2, amounts2, community);

        var whitelist = await u.initializeCrowdsaleWhitelist(crowdsale2, Whitelist);

        await token2.approve(crowdsale2.address, new BN('7e23'), {from: community});

        await crowdsale2.setWhitelist(whitelist.address);
        await whitelist.addParticipant(user1, 10, web3.toWei(10, 'ether'));

        await u.increaseDays(2);
        await crowdsale2.start();

        await u.assertValidPurchase(whitelist, user1, 10e18);
        var valid = await crowdsale2.validPurchase.call(10e18);
        assert.isTrue(valid, "Crowdsale2 first purchase should be valid");

        var user1Bonus = await whitelist.getBonusPercent(user1);
        assert.equal(10, user1Bonus.toNumber(), "User1 bonus incorrect");

        await crowdsale2.buyTokens({from: user1, value: web3.toWei(10, 'ether')});
        u.shouldRevert(crowdsale2.buyTokens({from: user1, value: web3.toWei(1, 'ether')}));
    });

    it("Invalid post crowdsale functions", async function() {
        await u.increaseDays(180);
        await u.shouldRevert(crowdsale.end({from: investor2}), "Investor2 can't end the crowdsale");
        await crowdsale.end();

        // Cannot buy tokens after the sale has been ended
        await u.shouldRevert(crowdsale.buyTokens({from: user1, value: web3.toWei(1, 'ether')}));

        // Can't restart the sale after it's been stopped
        await u.shouldRevert(crowdsale.start(), "Can't restart sale after it's been stopped");
    });

});