pragma solidity 0.4.24;

/// @title Ownable
/// @dev Provide a modifier that permits only a single user to call the function
contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @dev Set the original `owner` of the contract to the sender account.
    constructor() public {
        owner = msg.sender;
    }

    /// @dev Require that the modified function is only called by `owner`
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /// @dev Allow `owner` to transfer control of the contract to `newOwner`.
    /// @param newOwner The address to transfer ownership to.
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

}