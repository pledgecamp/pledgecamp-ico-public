
var Token = artifacts.require("PLGToken");
var TestSelfDestruct = artifacts.require("TestSelfDestruct");
var u = require('./util.js');
var BN = web3.BigNumber;
var testAmount = new BN(1e18);

/*
    Test ownership and reclamation failsafes for PLGToken
*/
contract('TestReclamation', async function(accounts) {
    [owner, tester] = accounts;

    let token, token2;

    it("Ownership transfer", async function() {
        token = await Token.new();
        await token.initialize([tester], [new BN(1e18)]);

        token2 = await Token.new();
        await token2.initialize([tester], [new BN(1e18)]);
        
        await token2.transferOwnership(token.address);
        let token2Owner = await token2.owner.call();

        // Test ownership transfer
        assert.equal(token2Owner, token.address, "Token should own token2");
    });

    it("Contract reclamation", async function() {
        await token.reclaimContract(token2.address);

        let token2Owner = await token2.owner.call();
        assert.equal(token2Owner, owner, "Token's owner should now own token2");
    });

    it("No ether to PLGToken (HasNoEther)", async function() {
        try {
            await Token.new({value: 1e18});
        } catch(error) {
            assert.equal(error.message, "Cannot send value to non-payable constructor");

            u.shouldRevert(token.send(testAmount), "Cannot send ETH to PLGToken");
            return;
        }
        assert.equal(false, true, "Can't create PLGToken with ETH");
    });

    it("Ether reclamation", async function() {
        let testContract = await TestSelfDestruct.new();

        await testContract.send(testAmount);
        let eth = await web3.eth.getBalance(testContract.address);
        assert.equal(eth.toString(10), testAmount.toString(10), "testContract should have 1 ETH");

        // Set up Token to own testContract, then self destruct to give Token 1 ETH
        await testContract.transferOwnership(token.address);
        await testContract.kill();

        var tokenEth = await web3.eth.getBalance(token.address);
        assert.equal(tokenEth.toString(10), testAmount.toString(10), "Token should have 1 ETH");

        // Reclaim ETH from Token
        await token.reclaimEther();
        tokenEth = await web3.eth.getBalance(token.address);
        assert.equal(tokenEth.toString(10), new BN(0), "Token should have no ETH");
    });

    it("Token reclamation", async function() {
        await token.unlock();
        await token.transfer(token.address, testAmount, {from: tester});

        await u.assertBalance(token, token.address, testAmount, "Token contract should own 1e18 of its own tokens");

        await token.reclaimToken(token.address);
        await u.assertBalance(token, owner, testAmount, "Reclaimed tokens go to owner");
    });

});