pragma solidity 0.4.24;

import "../Ownable.sol";

/// @title TestSelfDestruct
/// @dev Contract for testing 
contract TestSelfDestruct is Ownable {

    /// @notice Allow incoming ETH transfers
    function() external payable {}

    /// @notice Self destruct, sending ETH to `owner`
    function kill() public {
        selfdestruct(owner);
    }

}