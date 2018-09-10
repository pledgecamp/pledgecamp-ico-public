
var Token = artifacts.require("PLGToken");
var Crowdsale = artifacts.require("PLGCrowdsale");
var Whitelist = artifacts.require("Whitelist");
var u = require('./util.js');
var BN = web3.BigNumber;

var saleBalance = new BN('3e27'); // 3 billion * 1e18
var communityBalance = new BN('4.5e27');
var platformBalance = new BN('1.5e27');
var companyBalance = new BN('1e27');

/*
    Test a complete crowdsale flow
*/
contract('TestPLGCrowdsale', async function(accounts) {
    [owner, community, platform, company, investor1, investor2, user1, user2, user3, user4] = accounts;
    for(let addr of accounts) {
        console.log(addr);  
    }

    let token, crowdsale, whitelist;

    it("Crowdsale initialization", async function() {
        amounts = [saleBalance, communityBalance, platformBalance, companyBalance];

        [token, crowdsale] = await u.makeCrowdsale(Token, Crowdsale);
        addrs = [crowdsale.address, community, platform, company];
        await u.initializeCrowdsaleTrading(token, crowdsale, addrs, amounts, community);

        // Verify token is initialized and totalSupply is correct (10 billion)
        var initialized = await token.initialized.call();
        var supply = await token.totalSupply.call();
        var targetSupply = new BN('10e27').toString(16);
        assert.isTrue(initialized, "Token should be initialized");
        await assert.equal(supply.toString(16), targetSupply, "There should be 10 billion tokens");
    });

    it("Further initialization and crowdsale start", async function() {
        whitelist = await u.initializeCrowdsaleWhitelist(crowdsale, Whitelist);

        // Verify bonus is 0 before crowdsale starts
        var b = await whitelist.getBonusPercent.call(user1);
        assert.equal(b.toNumber(), 0, "Bonus should be 0 by default");

        await u.increaseDays(2);
        await crowdsale.start();
        var started = await crowdsale.saleActive.call();
        assert.isTrue(started, "Crowdsale should be active");

        // Make sure bonus pool is ready to go
        await token.approve(crowdsale.address, 4.5e27, {from: community});
        var allowance = await token.allowance.call(community, crowdsale.address);
        assert.equal(allowance.toNumber(), 4.5e27, "Bonus pool not set up to transfer");
    });

    it("Invalid purchase and whitelist/bonus/vesting setup", async function() {
        var maxPurchase = web3.toWei(10, 'ether');

        // user1 isn't whitelisted yet, they can't buy tokens
        await u.shouldRevert(crowdsale.buyTokens({from: user1, value: web3.toWei(1, 'ether')}));

        // Add users to whitelist for next test
        await whitelist.addParticipant(user1, 10, maxPurchase);
        await whitelist.addParticipants([user2, user3, user4], 5, maxPurchase);

        var eth1 = web3.toWei(1, 'ether');
        await u.assertValidPurchase(whitelist, user1, eth1);
        await u.assertValidPurchase(whitelist, user2, eth1);
        await u.assertValidPurchase(whitelist, user3, eth1);
        await u.assertValidPurchase(whitelist, user4, eth1);
        var user1Bonus = await whitelist.getBonusPercent(user1);
        var user4Bonus = await whitelist.getBonusPercent(user3);
        assert.equal(10, user1Bonus.toNumber(), "User1 bonus incorrect");
        assert.equal(5, user4Bonus.toNumber(), "User4 bonus incorrect");
    });

    it("Successful crowdsale purchases", async function() {

        // Check user1 purchase with 10% bonus
        await u.verifyPurchase(crowdsale, token, user1, 1.1);

        await u.increaseDays(60);

        // Check user1, user3, and user4 purchase with bonus
        await u.verifyPurchase(crowdsale, token, user1, 1.1);
        await u.verifyPurchase(crowdsale, token, user3, 1.05);
        await u.verifyPurchase(crowdsale, token, user4, 1.05);
    });

    it("Owner withdrawal of crowdsale ETH", async function() {
        let ownerEth = await web3.eth.getBalance(owner);
        let crowdsaleEth = await web3.eth.getBalance(crowdsale.address);

        let withdrawTransaction = await crowdsale.withdrawEth();

        // Make sure the owner gets the eth
        let ownerTarget = ownerEth.add(crowdsaleEth).minus(withdrawTransaction.receipt.gasUsed);
        let ownerFinal = await web3.eth.getBalance(owner);
        assert.equal(ownerTarget.toString(10), ownerFinal.toString(10), "Owner should have ~1 more ETH");
    });

    it("Maximum purchase amount", async function() {
        // Check directly with isValidPurchase
        await u.assertValidPurchase(whitelist, user4, web3.toWei(9, 'ether'));
        await u.assertInvalidPurchase(whitelist, user4, web3.toWei(100, 'ether') + 1);

        // Double check with real purchases
        await crowdsale.buyTokens({from: user4, value: web3.toWei(9, 'ether')});
        await u.shouldRevert(crowdsale.buyTokens({from: user4, value: 1}));
    });

    it("Check purchase after re-adding a revoked user", async function() {

        // Check user2 purchase after revocation and re-whitelist
        await whitelist.revokeParticipant(user2);
        await whitelist.addParticipant(user2, 10, web3.toWei(10, 'ether'));
        await u.verifyPurchase(crowdsale, token, user2, 1.1);
    });
    
    it("Owner purchase on behalf of user 1", async function() {

        var b1 = await token.balanceOf.call(user1);
    
        await crowdsale.buyTokensFor(user1, {from: owner, value: web3.toWei(1, 'ether')});
        var target = b1.add(70000 * 1.1 * 1e18);
    
        var b2 = await token.balanceOf.call(user1);
    
        assert.equal(b2.toNumber(), target.toNumber(), "User1 token purchase amount incorrect");
    });

    it("Verify exchange rate update", async function() {

        var b1 = await token.balanceOf.call(user2);

        await crowdsale.setExchangeRate(100000);
        
        await crowdsale.buyTokens({from: user2, value: web3.toWei(1, 'ether')});
        var purchaseAmount = new BN(100000).mul(1.1).mul(1e18);

        var target = b1.add(purchaseAmount);
        var b2 = await token.balanceOf.call(user2);
        assert.equal(b2.toString(10), target.toString(10), "User2 token purchase incorrect at 100000");

        await crowdsale.setExchangeRate(70000);
        purchaseAmount = new BN(70000).mul(1.1).mul(1e18);

        target = b2.add(purchaseAmount);
        await crowdsale.buyTokens({from: user2, value: web3.toWei(1, 'ether')});
        b2 = await token.balanceOf.call(user2);
        assert.equal(b2.toString(10), target.toString(10), "User2 token purchase incorrect at 70000");
    });

    it("Finalize crowdsale", async function() {

        var remainingTokens = await token.balanceOf.call(crowdsale.address);
        var prevCommunity = await token.balanceOf.call(community);

        let ownerEth = await web3.eth.getBalance(owner);
        let crowdsaleEth = await web3.eth.getBalance(crowdsale.address);

        let endTransaction = await crowdsale.end();

        // Ensure leftover tokens go to the platform reserve
        var community2 = await token.balanceOf.call(community);
        var target = remainingTokens.add(prevCommunity).toNumber();
        assert.equal(community2.toNumber(), target, "Extra tokens not sent to community");
        
        var active = await crowdsale.saleActive.call();
        assert.isTrue(!active, "Crowdsale should be inactive after end()");

        // Make sure the owner gets the ETH at the end
        let ownerTarget = ownerEth.add(crowdsaleEth).minus(endTransaction.receipt.gasUsed);
        let ownerFinal = await web3.eth.getBalance(owner);
        assert.equal(ownerTarget.toString(10), ownerFinal.toString(10), "Owner should have 12 more ETH from sale");
    });

    it("Post sale accidental token recovery", async function() {
        let communityTokens = await token.balanceOf.call(community);

        await token.transfer(crowdsale.address, 2e18, {from: community});
        await u.assertBalance(token, crowdsale.address, 2e18);
        await u.assertBalance(token, community, communityTokens.sub(2e18));

        await crowdsale.withdrawTokens();
        await u.assertBalance(token, community, communityTokens);
    })
});