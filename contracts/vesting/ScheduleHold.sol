pragma solidity 0.4.24;

import "./Schedule.sol";

/// @title ScheduleHold
/// @notice Holds tokens until 2019/03/01
contract ScheduleHold is Schedule {

    /// March 1, 2019 (12:00am PST)
    uint256 vestingRelease = 1551427200;

    constructor(uint256 _tokenReleaseDate) Schedule(_tokenReleaseDate) public {
    }

    /// @notice Calculates the percent of tokens that may be claimed at this time
    /// @return Number of tokens vested
    function vestedPercent() public view returns (uint256) {

        if(now < tokenReleaseDate || now < vestingRelease) {
            return 0;
            
        } else {
            return 100;
        }
    }
}
