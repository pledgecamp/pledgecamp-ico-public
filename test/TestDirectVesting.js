
var Token = artifacts.require("PLGToken");
var Vesting = artifacts.require("TokenVesting");
var Schedule50 = artifacts.require("Schedule50");
var ScheduleStandard = artifacts.require("ScheduleStandard");
var ScheduleHold = artifacts.require("ScheduleHold");
var u = require('./util.js');
var BN = web3.BigNumber;

const amountsHold = [0, 0, 0, 0, 0, 1];
const amounts50 = [0.5, 0.1, 0.1, 0.1, 0.1, 0.1];
const amountsStandard = [0.15, 0.15, 0.25, 0.15, 0.15, 0.15];

var vest1Amount = new BN('1e24');
var vest2Amount = new BN('2e24');
var vest3Amount = new BN('10e24');
var vest4Amount = new BN('10e24');
var vest5Amount = new BN('5e24');
var vest6Amount = new BN('1e24');

/* Modify the next two functions to test future times */

function currentTime() {
    return new Date();
    // return new Date("2018/12/3");
}

function setBlockTime() {
    // increaseBlockTimeTo("2018/12/3");
}
/* End time modification */

function getPeriod(now) {
    if(now < new Date(1541055600 * 1000)) {
        return 0;
    } else if(now < new Date(1543651200 * 1000)) {
        return 1;
    } else if(now < new Date(1546329600 * 1000)) {
        return 2;
    } else if(now < new Date(1549008000 * 1000)) {
        return 3;
    } else if(now < new Date(1551427200 * 1000)) {
        return 4;
    } else {
        return 5;
    }
}

async function increaseBlockTimeTo(dateStr) {
    var blockDate = u.fromEthTime(web3.eth.getBlock('latest').timestamp);
    const days = u.daysBetween(blockDate, new Date(dateStr));
    if(days > 0) {
        await u.increaseDays(days);
    }
}

function partialSum(arr, ind) {
    return arr.slice(0, ind+1).reduce((a, b) => a + b).toPrecision(4);
}

function totalReleaseAmount(vested, amounts) {
    const period = getPeriod(currentTime());
    return vested.mul(partialSum(amounts, period));
}

async function verifyOwner(Vesting, contract, targetOwner, msg) {
    var contract = await Vesting.at(contract.address.toString(16));
    var owner = await contract.owner.call();
    if(!msg) msg = "Ownership verification fail";
    assert.equal(targetOwner, owner, msg);
}

async function verifyReleasable(vestingContract, target, msg) {
    var releasable = await vestingContract.releasableAmount.call();
    if(!msg) msg = "Invalid releaseableAmount";
    assert.equal(releasable.toString(10), target.toString(10), msg);
}

async function verifyRelease(token, vestingContract, targetAddress, amount) {

    var vesting1 = await token.balanceOf(vestingContract.address);
    var target1 = await token.balanceOf(targetAddress);
    await vestingContract.release();
    var vesting2 = await token.balanceOf(vestingContract.address);
    var target2 = await token.balanceOf(targetAddress);

    assert.equal(vesting1.sub(amount).toString(10), vesting2.toString(10), "Incorrect amount released from vesting contract");
    assert.equal(target1.add(amount).toString(10), target2.toString(10), "Incorrect amount received by vestee");

    await verifyReleasable(vestingContract, 0, "Releasable must be 0 after release");
}

contract('TestDirectVesting', async function(accounts) {
    [owner, community, platform, company, investor1, investor2, investor3, investor4, user1, user2] = accounts;
    let token, tokenRelease, vesting1, vesting2, vesting3, vesting4, vesting5, vesting6;
    let scheduleHold, schedule50, scheduleStandard;
    let initialReleasePeriod;

    it("Set up vesting contracts and verify ownership", async function() {
        token = await Token.new();

        tokenRelease = u.toEthTime(new Date("2018/10/1"));

        scheduleHold = await ScheduleHold.new(tokenRelease);
        scheduleStandard = await ScheduleStandard.new(tokenRelease);
        schedule50 = await Schedule50.new(tokenRelease);

        vesting1 = await Vesting.new(token.address, investor1, schedule50.address);
        vesting2 = await Vesting.new(token.address, investor2, schedule50.address);
        vesting3 = await Vesting.new(token.address, investor3, scheduleStandard.address);
        vesting4 = await Vesting.new(token.address, investor4, scheduleStandard.address);
        vesting5 = await Vesting.new(token.address, user2, scheduleHold.address);
        vesting6 = await Vesting.new(token.address, user1, schedule50.address);

        await verifyOwner(Vesting, vesting1, owner, "Incorrect owner for vesting1");
        await verifyOwner(Vesting, vesting2, owner, "Incorrect owner for vesting2");
        await verifyOwner(Vesting, vesting3, owner, "Incorrect owner for vesting3");
        await verifyOwner(Vesting, vesting4, owner, "Incorrect owner for vesting4");
        await verifyOwner(Vesting, vesting5, owner, "Incorrect owner for vesting5");
    });

    it("Transfer tokens to vesting contracts", async function() {
        // Transfer to the first two investors via token initialization with 1M and 2M
        var communityBalance = vest3Amount.add(vest4Amount).add(vest5Amount).add(vest6Amount);
        var amounts = [communityBalance, vest1Amount, vest2Amount];
        await token.initialize([community, vesting1.address, vesting2.address], amounts);

        // Transfer the other investors from the community pool
        await token.setTradeException(community, true);
        await token.transfer(vesting3.address, vest3Amount, {from: community});
        await token.transfer(vesting4.address, vest4Amount, {from: community});
        await token.transfer(vesting5.address, vest5Amount, {from: community});
        await token.transfer(vesting6.address, vest6Amount, {from: community});

        // Verify transfers were correct
        await u.assertBalance(token, vesting1.address, vest1Amount, "Vesting1 amount incorrect");
        await u.assertBalance(token, vesting2.address, vest2Amount, "Vesting2 amount incorrect");
        await u.assertBalance(token, vesting3.address, vest3Amount, "Vesting3 amount incorrect");
        await u.assertBalance(token, vesting4.address, vest4Amount, "Vesting4 amount incorrect");
        await u.assertBalance(token, vesting5.address, vest5Amount, "Vesting5 amount incorrect");
    });

    it("Tokens cannot be retrieved early", async function() {
        setBlockTime();

        // This test is only relevant before November 1
        if(currentTime() < new Date(1541055600 * 1000)) {
            await verifyReleasable(vesting1, new BN(0));
            await verifyReleasable(vesting2, new BN(0));
            await verifyReleasable(vesting3, new BN(0));
            await verifyReleasable(vesting4, new BN(0));
            await verifyReleasable(vesting5, new BN(0));

            await u.shouldRevert(vesting1.release(), "Should not be able to release from vesting1");
            await u.shouldRevert(vesting2.release(), "Should not be able to release from vesting2");
            await u.shouldRevert(vesting3.release(), "Should not be able to release from vesting3");
            await u.shouldRevert(vesting4.release(), "Should not be able to release from vesting4");
            await u.shouldRevert(vesting5.release(), "Should not be able to release from vesting5");
        }
    });

    it("Revoke before any funds are releasable", async function() {
        // Token must be unlocked to release funds
        await token.unlock();

        await u.shouldRevert(vesting4.revoke({from: user1}), "Only the owner can revoke");
        await vesting4.revoke();

        // This test is only relevant before November 1
        if(currentTime() < new Date(1541055600 * 1000)) {
            await u.assertBalance(token, vesting4.address, new BN(0), "Vesting4 should have 0 tokens after revoke");
            await u.assertBalance(token, owner, vest4Amount, "Owner should have Vesting4's tokens");

            await u.shouldRevert(vesting4.revoke(), "Can't revoke twice");
        }
    });

    it("Check initial vesting", async function() {
        await increaseBlockTimeTo("2018/10/3");

        const release1 = totalReleaseAmount(vest1Amount, amounts50);
        const release2 = totalReleaseAmount(vest2Amount, amounts50);
        const release3 = totalReleaseAmount(vest3Amount, amountsStandard);
        const release4 = totalReleaseAmount(vest5Amount, amountsHold);

        await verifyReleasable(vesting1, release1);
        await verifyReleasable(vesting2, release2);
        await verifyReleasable(vesting3, release3);
        await verifyReleasable(vesting5, release4);
        await u.shouldRevert(vesting4.release(), "Can't release when revoked");
    });

    it("Can't release when token is locked", async function() {
        const release1 = totalReleaseAmount(vest1Amount, amounts50);
        await token.lock();
        await verifyReleasable(vesting1, release1);

        await u.shouldRevert(vesting1.release(), "Can't release when tokens are locked");
        await token.unlock();
    });

    it("Initial release", async function() {
        // Vesting period in which initial release occurred
        initialReleasePeriod = getPeriod(currentTime());

        const release1 = totalReleaseAmount(vest1Amount, amounts50);
        const release2 = totalReleaseAmount(vest2Amount, amounts50);
        const release3 = totalReleaseAmount(vest3Amount, amountsStandard);
        const release4 = totalReleaseAmount(vest5Amount, amountsHold);

        await verifyRelease(token, vesting1, investor1, release1);
        await verifyRelease(token, vesting2, investor2, release2);
        await verifyRelease(token, vesting3, investor3, release3);
        if(release4 == 0) {
            await u.shouldRevert(verifyRelease(token, vesting5, user2, 0), "No funds are releasable, so should revert");
        } else {
            await verifyRelease(token, vesting5, user2, release4);
        }
    });

    it("Test kill()", async function() {
        await verifyReleasable(vesting6, totalReleaseAmount(vest6Amount, amounts50));

        var balance = await token.balanceOf(owner);
        await vesting6.kill();
        await u.assertBalance(token, owner, balance.add(vest6Amount), "Owner should receive all tokens");
    });

    it("Check vesting 1", async function() {
        
        if(initialReleasePeriod < 1) {
            await increaseBlockTimeTo("2018/11/2");
            await verifyRelease(token, vesting1, investor1, vest1Amount.mul('0.1'));
            await verifyRelease(token, vesting2, investor2, vest2Amount.mul('0.1'));
            await verifyRelease(token, vesting3, investor3, vest3Amount.mul('0.25'));
            await u.shouldRevert(verifyRelease(token, vesting5, user2, 0), "No funds are releasable, so should revert");
        } else {
            console.log('Skipped first vesting period');
        }
    });

    it("Check vesting month 2", async function() {

        if(initialReleasePeriod < 2) {
            await increaseBlockTimeTo("2018/12/2");

            await verifyRelease(token, vesting1, investor1, vest1Amount.mul('0.1'));
            await verifyRelease(token, vesting2, investor2, vest2Amount.mul('0.1'));
            await verifyRelease(token, vesting3, investor3, vest3Amount.mul('0.25'));
            await u.shouldRevert(verifyRelease(token, vesting5, user2, 0), "No funds are releasable, so should revert");
        } else {
            console.log('Skipped second vesting period');
        }
    });

    it("Check vesting month 3", async function() {

        if(initialReleasePeriod < 3) {
            await increaseBlockTimeTo("2019/1/2");

            await verifyRelease(token, vesting1, investor1, vest1Amount.mul('0.1'));
            await verifyRelease(token, vesting2, investor2, vest2Amount.mul('0.1'));
            await verifyRelease(token, vesting3, investor3, vest3Amount.mul('0.15'));
            await u.shouldRevert(verifyRelease(token, vesting5, user2, 0), "No funds are releasable, so should revert");
        } else {
            console.log('Skipped third vesting period');
        }
    });

    it("Check vesting month 4", async function() {

        if(initialReleasePeriod < 4) {
            await increaseBlockTimeTo("2019/2/2");

            await verifyRelease(token, vesting1, investor1, vest1Amount.mul('0.1'));
            await verifyRelease(token, vesting2, investor2, vest2Amount.mul('0.1'));
            await verifyRelease(token, vesting3, investor3, vest3Amount.mul('0.15'));
            await u.shouldRevert(verifyRelease(token, vesting5, user2, 0), "No funds are releasable, so should revert");
        } else {
            console.log('Skipped fourth vesting period');
        }
    });

    it("Revoke vesting contract mid-vest", async function() {
        var ownerBalance = await token.balanceOf.call(owner);
        var targetOwner = ownerBalance.add(vest2Amount.mul(0.1));

        await vesting2.revoke();
        await u.assertBalance(token, vesting2.address, new BN(0), "Vesting4 should have 0 tokens after revoke");
        await u.assertBalance(token, owner, targetOwner, "Owner should have Vesting2's remaining tokens");

        await verifyReleasable(vesting2, new BN(0));
    });

    it("Test token release timestamp update", async function() {
        await increaseBlockTimeTo("2019/3/2");
        let prevRelease = await schedule50.tokenReleaseDate.call();
        let newRelease = u.toEthTime(new Date("2019/4/1"));

        await schedule50.setTokenReleaseDate(newRelease);

        await verifyReleasable(vesting1, new BN(0));

        await schedule50.setTokenReleaseDate(prevRelease);
        await verifyReleasable(vesting1, vest1Amount.mul('0.1'));
    });

    it("Check final vesting", async function() {

        await verifyRelease(token, vesting1, investor1, vest1Amount.mul('0.1'));
        await verifyRelease(token, vesting3, investor3, vest3Amount.mul('0.15'));
        await verifyRelease(token, vesting5, user2, vest5Amount);

        await u.assertBalance(token, investor1, vest1Amount, "Vesting1 hasn't all their tokens");
        await u.assertBalance(token, investor2, vest2Amount.mul('0.9'), "Vesting2 incorrect token amount");
        await u.assertBalance(token, investor3, vest3Amount, "Vesting3 hasn't all their tokens");
        await u.assertBalance(token, user2, vest5Amount, "Vesting5 hasn't all their tokens");
    });
});
