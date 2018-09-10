pragma solidity 0.4.24;

import "./Ownable.sol";
import "./zeppelin/StandardToken.sol";

/// @title Lockable token with exceptions
/// @dev StandardToken modified with pausable transfers.
contract LockableToken is Ownable, StandardToken {

    /// Flag for locking normal trading
    bool public locked = true;

    /// Addresses exempted from token trade lock
    mapping(address => bool) public lockExceptions;

    constructor() public {
        // It should always be possible to call reclaimToken
        lockExceptions[this] = true;
    }

    /// @notice Admin function to lock trading
    function lock() public onlyOwner {
        locked = true;
    }

    /// @notice Admin function to unlock trading
    function unlock() public onlyOwner {
        locked = false;
    }

    /// @notice Set whether `sender` may trade when token is locked
    /// @param sender The address to change the lock exception for
    /// @param _canTrade Whether `sender` may trade
    function setTradeException(address sender, bool _canTrade) public onlyOwner {
        lockExceptions[sender] = _canTrade;
    }

    /// @notice Check if the token is currently tradable for `sender`
    /// @param sender The address attempting to make a transfer
    /// @return True if `sender` is allowed to make transfers, false otherwise
    function canTrade(address sender) public view returns(bool) {
        return !locked || lockExceptions[sender];
    }

    /// @dev Modifier to make a function callable only when the contract is not paused.
    modifier whenNotLocked() {
        require(canTrade(msg.sender));
        _;
    }

    function transfer(address _to, uint256 _value)
                public whenNotLocked returns (bool) {

        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value)
                public whenNotLocked returns (bool) {

        return super.transferFrom(_from, _to, _value);
    }

    function approve(address _spender, uint256 _value)
                public whenNotLocked returns (bool) {

        return super.approve(_spender, _value);
    }

    function increaseApproval(address _spender, uint _addedValue)
                public whenNotLocked returns (bool success) {

        return super.increaseApproval(_spender, _addedValue);
    }

    function decreaseApproval(address _spender, uint _subtractedValue)
                public whenNotLocked returns (bool success) {
                        
        return super.decreaseApproval(_spender, _subtractedValue);
    }
}