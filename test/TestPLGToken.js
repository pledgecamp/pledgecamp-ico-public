
var Token = artifacts.require("PLGToken");
var u = require('./util.js');
var BN = web3.BigNumber;

var ownerBalance = new BN('40e27');
var reserveBalance = new BN('45e27');
var investorsBalance = new BN('15e27');
var badguyBalance = new BN('0');

contract('TestPLGToken', async function(accounts) {
    [owner, reserve, investors, badguy] = accounts;
    let token;

    it("First three accounts should have 40e19, 45e19, and 15e19", async function() {

        addrs = [owner, reserve, investors];
        amounts = [ownerBalance, reserveBalance, investorsBalance];
        token = await Token.new();
        await token.initialize(addrs, amounts);

        await u.assertBalance(token, owner, ownerBalance);
        await u.assertBalance(token, reserve, reserveBalance);
        await u.assertBalance(token, investors, investorsBalance);
    });

    it("Make transfer exceptions for owner and reserve", async function() {

        await u.shouldRevert(token.transfer(investors, 100, {from: reserve}));
        
        await token.setTradeException(owner, true);
        await token.setTradeException(reserve, true);

        var crowdTradable = await token.canTrade.call(owner);
        var resTradable = await token.canTrade.call(reserve);
        var invTradable = await token.canTrade.call(investors);
        assert.equal(true, crowdTradable, "owner should be able to trade");
        assert.equal(true, resTradable, "Reserve should be able to trade");
        assert.equal(false, invTradable, "Investors should not be able to trade");
    });

    it("Transfer 1000 tokens from reserve to investors.", async function() {
        var amount = 1000;
        reserveBalance = reserveBalance.minus(amount);
        investorsBalance = investorsBalance.plus(amount);

        await token.transfer(investors, amount, {from: reserve});

        await u.assertBalance(token, reserve, reserveBalance, "reserve balance not updated after transfer");
        await u.assertBalance(token, investors, investorsBalance, "Investor balance not updated after transfer");
    });

    it("Transfer 9999 tokens to the investors from owner with reserve as intermediary", async function() {
        var amount = 9999;
        investorsBalance = investorsBalance.plus(amount);
        ownerBalance = ownerBalance.minus(amount);

        await token.approve(reserve, amount, {from: owner});
        var allowance = await token.allowance.call(owner, reserve);
        assert.equal(allowance.valueOf(), amount, "Allowance not updated by call to approve");

        await token.decreaseApproval(reserve, 1000, {from: owner});
        allowance = await token.allowance.call(owner, reserve);
        assert.equal(allowance.valueOf(), amount-1000, "decreaseApproval failed");

        await token.increaseApproval(reserve, 1000, {from: owner});
        allowance = await token.allowance.call(owner, reserve);
        assert.equal(allowance.valueOf(), amount, "increaseApproval failed");

        await token.transferFrom(owner, reserve, amount, {from: reserve});
        await token.transfer(investors, amount, {from: reserve});
        
        await u.assertBalance(token, owner, ownerBalance, "owner balance not updated after transfer");
        await u.assertBalance(token, investors, investorsBalance, "Investor balance not updated after transfer");
    });
    
    it("Recover tokens sent to contract", async function() {
        var amount = 1000;
        reserveBalance = reserveBalance.minus(amount);
        ownerBalance = ownerBalance.plus(amount);

        await token.transfer(token.address, amount, {from: reserve});
        await token.reclaimToken(token.address);

        await u.assertBalance(token, reserve, reserveBalance, "Tokens not sent");
        await u.assertBalance(token, owner, ownerBalance, "Tokens not reclaimed");
    });

  
    it("Burn 1000 owner tokens", async function() {
        var amount = new BN("1000");
        
        ownerBalance = ownerBalance.minus(amount);

        var supply1 = await token.totalSupply.call();
        await token.burn(amount, {from: owner});
        await u.assertBalance(token, owner, ownerBalance, "owner balance not updated after transfer");

        var supply2 = await token.totalSupply.call();
        assert.equal(supply1.minus(amount).toString(16), supply2.toString(16), "Total token supply didn't decrease on burn");
    });

    it("Can't burn more than you have", async function() {
        var amount = reserveBalance.plus(1000);

        u.shouldRevert(token.burn(amount, {from: reserve}));
    });
           
    it("Badguy should not be able to re-initialize token", async function() {
        addrs2 = [badguy, badguy, badguy];
        amounts2 = [ownerBalance, reserveBalance, investorsBalance];
        await u.shouldRevert(token.initialize(addrs2, amounts2, {from: badguy}));
    });
    
    it("Badguy should not be able to increase approval when token locked", async function() {
        await u.shouldRevert(token.approve(reserve, 1000, {from: badguy}));
    });
   
    it("Badguy should be able to trade with token locked", async function() {
        await u.shouldRevert(token.transfer(investors, 1, {from: badguy}));
    });

    it("Badguy should be able to trade from with token locked", async function() {
        await u.shouldRevert(token.transferFrom(owner, badguy, 100, {from: badguy}));
    });

    it("Badguy should not be able to add trade exception", async function() {
        await u.shouldRevert(token.setTradeException(badguy, true, {from: badguy}));
    });

    it("Badguy should not be to unlock trading", async function() {
        await u.shouldRevert(token.unlock({from: badguy}));
    });

    it("Transfer after token unlock", async function() {
        var amount = new BN("1000");
        investorsBalance = investorsBalance.minus(amount);
        badguyBalance = badguyBalance.plus(amount)

        await token.unlock();
        await token.transfer(badguy, amount, {from: investors});
        await u.assertBalance(token, investors, investorsBalance, "Tokens not sent");
        await u.assertBalance(token, badguy, amount, "Tokens not recieved");
    });

    it("Relock Token", async function() {
        var amount = new BN("1000");;
        await token.lock();
        await u.shouldRevert(token.transfer(badguy, amount, {from: investors}));
    });


    it("Add trade exception", async function() {
        var amount = new BN("1000");;
        investorsBalance = investorsBalance.minus(amount);
        badguyBalance = badguyBalance.plus(amount);

        await token.setTradeException(investors, true);

        await token.transfer(badguy, amount, {from: investors});
      
        await u.assertBalance(token, investors, investorsBalance, "Tokens not sent");
        await u.assertBalance(token, badguy, badguyBalance, "Tokens not recieved");
    });

    it("Remove trade exception", async function() {
        var amount = "1000";
        await token.setTradeException(investors, false);
        await u.shouldRevert(token.transfer(badguy, amount, {from: investors}));
    });


    it("Transfer after token unlock2", async function() {
        var amount = "1000";
        investorsBalance = investorsBalance.minus(amount);
        badguyBalance = badguyBalance.plus(amount);

        await token.unlock();

        await token.transfer(badguy, amount, {from: investors});
        await u.assertBalance(token, investors, investorsBalance, "Tokens not sent");
        await u.assertBalance(token, badguy, badguyBalance, "Tokens not recieved");
    });
});
