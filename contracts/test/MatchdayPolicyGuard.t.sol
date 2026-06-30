// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MatchdayPolicyGuard, IERC20} from "../src/MatchdayPolicyGuard.sol";

contract MockUSDT {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 v) external {
        balanceOf[to] += v;
    }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        require(balanceOf[f] >= v, "bal");
        require(allowance[f][msg.sender] >= v, "allow");
        allowance[f][msg.sender] -= v;
        balanceOf[f] -= v;
        balanceOf[t] += v;
        return true;
    }
}

contract MatchdayPolicyGuardTest is Test {
    MatchdayPolicyGuard g;
    MockUSDT usdt;
    address fan = address(0xF00);
    address bar = address(0xBA2);

    bytes32 constant BAR = keccak256("bar");
    bytes32 constant MERCH = keccak256("merch");
    bytes32 constant CHEERS = keccak256("cheers");
    bytes32 constant POOL = keccak256("pool");

    function setUp() public {
        g = new MatchdayPolicyGuard();
        usdt = new MockUSDT();
        usdt.mint(fan, 1000e6);
        vm.prank(fan);
        usdt.approve(address(g), type(uint256).max);
        _commit(100e6, 0, type(uint64).max);
    }

    // budget, open window by default; bar cap 40, merch cap 30; cheers stake 5 + 30s cooldown
    function _commit(uint256 budget, uint64 wStart, uint64 wEnd) internal {
        address[] memory al = new address[](1);
        al[0] = bar;
        bytes32[] memory capIds = new bytes32[](2);
        capIds[0] = BAR;
        capIds[1] = MERCH;
        uint256[] memory caps = new uint256[](2);
        caps[0] = 40e6;
        caps[1] = 30e6;
        bytes32[] memory sIds = new bytes32[](1);
        sIds[0] = CHEERS;
        uint256[] memory sCaps = new uint256[](1);
        sCaps[0] = 5e6;
        bytes32[] memory cIds = new bytes32[](1);
        cIds[0] = CHEERS;
        uint64[] memory cds = new uint64[](1);
        cds[0] = 30;
        vm.prank(fan);
        g.commit(budget, wStart, wEnd, al, capIds, caps, sIds, sCaps, cIds, cds);
    }

    function _pay(uint256 amount, bytes32 cat) internal {
        vm.prank(fan);
        g.pay(IERC20(address(usdt)), bar, amount, cat);
    }

    function test_validPaySucceeds() public {
        _pay(5e6, BAR);
        assertEq(usdt.balanceOf(bar), 5e6);
        assertEq(g.totalSpent(fan), 5e6);
        assertEq(g.spentByCategory(fan, BAR), 5e6);
    }

    function test_categoryCapReverts() public {
        _pay(38e6, BAR); // 38/40 ok
        vm.expectRevert(MatchdayPolicyGuard.CategoryCapExceeded.selector);
        _pay(5e6, BAR); // 43 > 40
    }

    function test_destinationNotAllowedReverts() public {
        vm.expectRevert(MatchdayPolicyGuard.DestinationNotAllowed.selector);
        vm.prank(fan);
        g.pay(IERC20(address(usdt)), address(0xDEAD), 1e6, BAR);
    }

    function test_stakeCapReverts() public {
        vm.expectRevert(MatchdayPolicyGuard.StakeCapExceeded.selector);
        _pay(6e6, CHEERS); // cheers per-tap cap 5
    }

    function test_cooldownReverts() public {
        _pay(5e6, CHEERS); // ok
        vm.expectRevert(MatchdayPolicyGuard.CooldownActive.selector);
        _pay(1e6, CHEERS); // within 30s
        vm.warp(block.timestamp + 30);
        _pay(1e6, CHEERS); // ok after cooldown
        assertEq(g.spentByCategory(fan, CHEERS), 6e6);
    }

    function test_totalBudgetReverts() public {
        _pay(40e6, BAR); // total 40
        _pay(60e6, POOL); // total 100 (pool uncapped)
        vm.expectRevert(MatchdayPolicyGuard.TotalBudgetExceeded.selector);
        _pay(1e6, POOL); // 101 > 100
    }

    function test_outsideWindowReverts() public {
        _commit(100e6, uint64(block.timestamp + 1000), type(uint64).max); // window opens later
        vm.expectRevert(MatchdayPolicyGuard.OutsideWindow.selector);
        _pay(1e6, BAR);
    }

    function test_rulesHashMatchesCanonicalEncoding() public view {
        // The on-chain rulesHash must equal keccak256 of the exact policy-core ABI layout.
        address[] memory al = new address[](1);
        al[0] = bar;
        bytes32[] memory capIds = new bytes32[](2);
        capIds[0] = BAR;
        capIds[1] = MERCH;
        uint256[] memory caps = new uint256[](2);
        caps[0] = 40e6;
        caps[1] = 30e6;
        bytes32[] memory sIds = new bytes32[](1);
        sIds[0] = CHEERS;
        uint256[] memory sCaps = new uint256[](1);
        sCaps[0] = 5e6;
        bytes32[] memory cIds = new bytes32[](1);
        cIds[0] = CHEERS;
        uint64[] memory cds = new uint64[](1);
        cds[0] = 30;
        bytes32 expected = keccak256(
            abi.encode(uint256(100e6), uint64(0), type(uint64).max, al, capIds, caps, sIds, sCaps, cIds, cds)
        );
        assertEq(g.rulesHash(fan), expected);
    }

    // invariant-style: a single payment can never move totalSpent above the budget
    function testFuzz_neverExceedsBudgetInOnePay(uint256 amount) public {
        amount = bound(amount, 1, 500e6);
        if (amount > 40e6) {
            vm.expectRevert(); // cap or budget will reject
        }
        vm.prank(fan);
        try g.pay(IERC20(address(usdt)), bar, amount, BAR) {
            assertLe(g.totalSpent(fan), g.totalBudget(fan));
        } catch {}
    }
}
