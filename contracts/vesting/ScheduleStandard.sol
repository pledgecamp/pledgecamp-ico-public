pragma solidity 0.4.24;

import "./Schedule.sol";

/// @title ScheduleStandard
/// @notice Vesting schedule where 15% are released on 2018/10/1,
/// @notice  15% on 2018/11/1, 25% on 2018/12/1, 15% on 2019/1/1, 15% on 2019/2/1,
/// @notice  and 15% on 2019/3/1
contract ScheduleStandard is Schedule {

    /// November 1, 2018 (12:00am PST)
    uint256 vesting1 = 1541055600;

    /// December 1, 2018 (12:00am PST)
    uint256 vesting2 = 1543651200;

    /// January 1, 2019 (12:00am PST)
    uint256 vesting3 = 1546329600;

    /// February 1, 2019 (12:00am PST)
    uint256 vesting4 = 1549008000;

    /// March 1, 2019 (12:00am PST)
    uint256 vesting5 = 1551427200;

    constructor(uint256 _tokenReleaseDate) Schedule(_tokenReleaseDate) public {
    }

    /// @notice Calculates the percent of tokens that may be claimed at this time
    /// @return Number of tokens vested
    function vestedPercent() public view returns (uint256) {
        uint256 percentReleased = 0;

        if(now < tokenReleaseDate) {
            percentReleased = 0;
            
        } else if(now >= vesting5) {
            percentReleased = 100;

        } else if(now >= vesting4) {
            percentReleased = 85;

        } else if(now >= vesting3) {
            percentReleased = 70;

        } else if(now >= vesting2) {
            percentReleased = 55;

        } else if(now >= vesting1) {
            percentReleased = 30;

        } else {
            percentReleased = 15;
        }
        return percentReleased;
    }
}
