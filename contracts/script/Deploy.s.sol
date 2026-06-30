// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {MatchdayPolicyGuard} from "../src/MatchdayPolicyGuard.sol";

/// Deploys the MatchdayPolicyGuard enforcer. Owner-scoped rules are committed separately
/// by each fan via `commit(...)` (see CommitDemo.s.sol for the demo rule set).
contract Deploy is Script {
    function run() external returns (MatchdayPolicyGuard guard) {
        vm.startBroadcast();
        guard = new MatchdayPolicyGuard();
        vm.stopBroadcast();
    }
}
