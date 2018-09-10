pragma solidity 0.4.24;

import "../Ownable.sol";

/// @notice Abstract contract for vesting schedule
/// @notice Implementations must provide vestedPercent()
contract Schedule is Ownable {

    /// The timestamp of the start of vesting
    uint256 public tokenReleaseDate;

    constructor(uint256 _tokenReleaseDate) public {
        tokenReleaseDate = _tokenReleaseDate;
    }

    /// @notice Update the date that PLG trading unlocks
    /// @param newReleaseDate The new PLG release timestamp
    function setTokenReleaseDate(uint256 newReleaseDate) public onlyOwner {
        tokenReleaseDate = newReleaseDate;
    }

    /// @notice Calculates the percent of tokens that may be claimed at this time
    /// @return Number of tokens vested
    function vestedPercent() public view returns (uint256);
}