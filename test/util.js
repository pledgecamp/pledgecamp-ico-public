
var revertError = "VM Exception while processing transaction: revert";

module.exports = {
    addDays: addDays,
    ethDays: ethDays,
    daysBetween: daysBetween,
    toEthTime: toEthTime,
    fromEthTime: fromEthTime,
    assertBalance: assertBalance,
    shouldRevert: shouldRevert,
    increaseTime: increaseTime,
    increaseDays: increaseDays,
    verifyPurchase: verifyPurchase,
    makeCrowdsale: makeCrowdsale,
    assertValidPurchase: assertValidPurchase,
    assertInvalidPurchase: assertInvalidPurchase,
    initializeCrowdsaleTrading: initializeCrowdsaleTrading,
    initializeCrowdsaleWhitelist: initializeCrowdsaleWhitelist
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeCrowdsale(Token, Crowdsale) {
    var blockDate = fromEthTime(web3.eth.getBlock('latest').timestamp);
    var start = toEthTime(addDays(blockDate, 1));
    var rate = 70000;
    var minPurchase = web3.toWei(0.1, 'ether');
    var token = await Token.new();
    var crowdsale = await Crowdsale.new(token.address, start, rate, minPurchase);
    return [token, crowdsale];
}

async function initializeCrowdsaleTrading(token, crowdsale, initialAddrs, amounts, bonusPool) {
    await token.initialize(initialAddrs, amounts);

    // Crowdsale and community (bonus pool) need token lock exceptions to function later
    await token.setTradeException(crowdsale.address, true);
    await token.setTradeException(bonusPool, true);

    await crowdsale.setBonusPool(bonusPool);
}

async function initializeCrowdsaleWhitelist(crowdsale, Whitelist) {
    var white = await Whitelist.new();
    await white.setCrowdsale(crowdsale.address);
    await crowdsale.setWhitelist(white.address);
    return white;
}

async function assertInvalidPurchase(whitelist, account, amount) {
    var valid = await whitelist.isValidPurchase(account, amount);
    assert.isFalse(valid, account.slice(0, 6)+" should not be able to purchase "+amount.toString());
}

async function assertValidPurchase(whitelist, account, amount) {
    var valid = await whitelist.isValidPurchase(account, amount);
    assert.isTrue(valid, account.slice(0, 6)+" should be able to purchase "+amount.toString());
}

// Verify a crowdsale token purchase with 1 ether.
// `bonus` is used to calculate expected token increase (eg. 1.2 == 20%)
async function verifyPurchase(crowdsale, token, buyer, bonus) {

    var t1 = await token.balanceOf.call(buyer);

    await crowdsale.buyTokens({from: buyer, value: web3.toWei(1, 'ether')});
    var target = t1.add(70000 * bonus * 1e18);

    var t2 = await token.balanceOf.call(buyer);

    assert.equal(t2.toNumber(), target.toNumber(), buyer.slice(2, 8)+" token purchase amount incorrect");
}

async function assertBalance(token, addr, targetBalance, msg) {
    var balance = await token.balanceOf.call(addr);
    if(!msg) {
        msg = targetBalance.toExponential()+" should have been in account "+addr.toString(16);
    }
    if(typeof targetBalance == "object") {
        // targetBalance better be a BigNumber!
        targetBalance = targetBalance.toString(10);
    }
    assert.equal(balance.toString(10), targetBalance, msg);
}

async function shouldRevert(action, message) {
    try {
        await action;
    } catch(error) {
        assert.equal(error.message, revertError, message);
        return;
    }
    assert.equal(false, true, message);
}

function increaseDays(days) {
    return increaseTime(ethDays(days));
}

async function increaseTime(time) {
    time = Math.ceil(time);
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [time], id: new Date().getSeconds()});
    await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: new Date().getSeconds()});
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function ethDays(days) {
    var now = new Date();
    var later = addDays(now, days);
    return (toEthTime(later) - toEthTime(now));
}

function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

function daysBetween(startDate, endDate) {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}


function toEthTime(date) {
    return Math.ceil(date.getTime() / 1000);
}

function fromEthTime(timestamp) {
    return new Date(timestamp * 1000);
}
