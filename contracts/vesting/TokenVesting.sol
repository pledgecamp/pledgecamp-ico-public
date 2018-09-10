pragma solidity 0.4.24;

import "../Ownable.sol";
import "../SafeMath.sol";
import "../PLGToken.sol";
import "./Schedule.sol";

/// @notice Abstract contract for vesting PLGTokens
contract TokenVesting is Ownable {
    using SafeMath for uint256;

    /// @notice Emitted when tokens are released to the beneficiary
    /// @param amount The number of tokens released
    event Released(uint256 amount);

    /// @notice Emitted if the vesting contract is revoked
    event Revoked();

    /// Vested tokens originate from this ERC20 token contract 
    PLGToken token;

    /// Helper contract that determines the vesting schedule
    Schedule schedule;

    /// The beneficiary of the vesting schedule
    address public beneficiary;

    /// Number of tokens released to `beneficiary` from token contracts
    uint256 public released;

    /// Whether the vesting contract is revoked for a given token contract
    bool public revoked = false;

    /// @param _beneficiary The account that receives vested tokens
    /// @param _token The address of the ERC20 token contract
    /// @param _schedule The address of the vesting schedule
    constructor(address _token, address _beneficiary, address _schedule) public {
        beneficiary = _beneficiary;
        token = PLGToken(_token);
        schedule = Schedule(_schedule);
    }

    /// @notice Disallow receiving ether using a default function with no `payable` flag.
    function() external {}

    /// @notice Transfer vested tokens to beneficiary.
    function release() public {
        require(!revoked);
        require((msg.sender == owner) || (msg.sender == beneficiary));
        
        uint256 unreleased = releasableAmount();
        require(unreleased > 0);

        released = released.add(unreleased);

        token.transfer(beneficiary, unreleased);

        emit Released(unreleased);
    }

    /// @notice Allow the owner to revoke the vesting. Tokens already vested
    ///  remain in the contract, the rest are returned to the owner.
    function revoke() public onlyOwner {
        require(!revoked);

        uint256 balance = token.balanceOf(this);

        uint256 unreleased = releasableAmount();
        uint256 refund = balance.sub(unreleased);

        revoked = true;

        token.transfer(owner, refund);

        emit Revoked();
    }

    /// @notice Alternative to revoke() that sends all tokens to owner and self destructs
    function kill() public onlyOwner {

        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        selfdestruct(owner);
    }

    /// @notice Calculates the amount that has already vested but hasn't been released yet.
    /// @return Number of releasable tokens
    function releasableAmount() public view returns (uint256) {
        if(revoked) {
            return 0;
        }
        uint256 tokens = token.balanceOf(this);
        uint256 totalBalance = released.add(tokens);
        uint256 releasePercent = schedule.vestedPercent();
        uint256 totalRelease = totalBalance.mul(releasePercent) / 100;

        // Account for situation where vesting schedule is disabled after
        // some tokens have already been released
        if(totalRelease >= released) {
            return totalRelease.sub(released);
        } else {
            return 0;
        }
    }
}
