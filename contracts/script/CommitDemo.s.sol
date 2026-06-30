// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {MatchdayPolicyGuard} from "../src/MatchdayPolicyGuard.sol";

/// Commits the demo matchday rules on-chain for the deployed guard (owner = broadcaster).
contract CommitDemo is Script {
    function run() external {
        MatchdayPolicyGuard g = MatchdayPolicyGuard(0x92891C2E97E2285F9DAc5cCdD0844f1D9c9De44e);
        address bar = 0x000000000000000000000000000000000000dEaD;

        address[] memory al = new address[](1);
        al[0] = bar;
        bytes32[] memory capIds = new bytes32[](2);
        capIds[0] = keccak256("bar");
        capIds[1] = keccak256("merch");
        uint256[] memory caps = new uint256[](2);
        caps[0] = 40e6;
        caps[1] = 30e6;
        bytes32[] memory sIds = new bytes32[](1);
        sIds[0] = keccak256("cheers");
        uint256[] memory sCaps = new uint256[](1);
        sCaps[0] = 5e6;
        bytes32[] memory cIds = new bytes32[](1);
        cIds[0] = keccak256("cheers");
        uint64[] memory cds = new uint64[](1);
        cds[0] = 30;

        vm.startBroadcast();
        g.commit(100e6, 0, type(uint64).max, al, capIds, caps, sIds, sCaps, cIds, cds);
        vm.stopBroadcast();
    }
}
