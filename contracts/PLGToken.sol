pragma solidity 0.4.24;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./zeppelin/NoOwner.sol";
import "./zeppelin/ERC20.sol";
import "./LockableToken.sol";

/// @title Pledgecamp Token (PLG)
/// @author Sam Pullman
/// @notice ERC20 compatible token for the Pledgecamp platform
contract PLGToken is Ownable, NoOwner, LockableToken {
    using SafeMath for uint256;
    
    /// @notice Emitted when tokens are burned
    /// @param burner Account that burned its tokens
    /// @param value Number of tokens burned
    event Burn(address indexed burner, uint256 value);

    string public name = "PLGToken";
    string public symbol = "PLG";
    uint8 public decimals = 18;

    /// Flag for only allowing a single token initialization
    bool public initialized = false;

    /// @notice Set initial PLG allocations, which can only happen once
    /// @param addresses Addresses of beneficiaries
    /// @param allocations Amounts to allocate each beneficiary
    function initialize(address[] addresses, uint256[] allocations) public onlyOwner {
        require(!initialized);
        require(addresses.length == allocations.length);
        for(uint i = 0; i<allocations.length; i += 1) {
            require(addresses[i] != address(0));
            require(allocations[i] > 0);
        }
        initialized = true;

        for(uint i = 0; i<allocations.length; i += 1) {
            balances[addresses[i]] = allocations[i];
            totalSupply_ = totalSupply_.add(allocations[i]);
        }
    }

    /// @dev Burns a specific amount of tokens owned by the sender
    /// @param value The number of tokens to be burned
    function burn(uint256 value) public {
        require(value <= balances[msg.sender]);

        balances[msg.sender] = balances[msg.sender].sub(value);
        totalSupply_ = totalSupply_.sub(value);
        emit Burn(msg.sender, value);
        emit Transfer(msg.sender, address(0), value);
    }

}