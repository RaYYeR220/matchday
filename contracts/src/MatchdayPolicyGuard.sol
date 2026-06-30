// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title MatchdayPolicyGuard
/// @notice Trustless on-chain enforcement of a fan's matchday spend policy. The committed rules
///         use the SAME canonical ABI layout as the off-chain policy-core serializeRules,
///         so `rulesHash` computed here is byte-identical to the one the wallet computes — the
///         on-device guard and this contract enforce the very same policy. A payment that breaches
///         the budget, a category cap, a per-tap stake cap, a cooldown, the time window, or the
///         allow-list reverts on-chain and cannot be bypassed by the owner's own signature.
/// @dev    Convention (matches policy-core "no entry = unconstrained"): a cap / stakeCap / cooldown
///         of 0 means "not set" (unlimited / none). `totalBudget == 0` means "not committed".
contract MatchdayPolicyGuard {
    error OutsideWindow();
    error DestinationNotAllowed();
    error StakeCapExceeded();
    error CooldownActive();
    error TotalBudgetExceeded();
    error CategoryCapExceeded();
    error NotCommitted();
    error TransferFailed();

    event RulesCommitted(address indexed owner, bytes32 rulesHash);
    event Paid(address indexed owner, address indexed to, address token, uint256 amount, bytes32 category);

    // --- per-owner rules ---
    mapping(address => uint256) public totalBudget;
    mapping(address => uint64) public windowStart;
    mapping(address => uint64) public windowEnd;
    mapping(address => bytes32) public rulesHash;
    mapping(address => mapping(address => bool)) public allowed; // owner => destination => allowed
    mapping(address => mapping(bytes32 => uint256)) public cap; // owner => category => cumulative cap
    mapping(address => mapping(bytes32 => uint256)) public stakeCap; // owner => category => per-tap cap
    mapping(address => mapping(bytes32 => uint64)) public cooldown; // owner => category => min seconds between

    // --- per-owner spend state ---
    mapping(address => uint256) public totalSpent;
    mapping(address => mapping(bytes32 => uint256)) public spentByCategory;
    mapping(address => mapping(bytes32 => uint64)) public lastSpentAt;

    /// @notice Commit your matchday rules. Arrays mirror policy-core serializeRules (sorted by id off-chain).
    function commit(
        uint256 _totalBudget,
        uint64 _windowStart,
        uint64 _windowEnd,
        address[] calldata allowlist,
        bytes32[] calldata capIds,
        uint256[] calldata caps,
        bytes32[] calldata stakeIds,
        uint256[] calldata stakeCaps,
        bytes32[] calldata cooldownIds,
        uint64[] calldata cooldowns
    ) external {
        address o = msg.sender;
        totalBudget[o] = _totalBudget;
        windowStart[o] = _windowStart;
        windowEnd[o] = _windowEnd;
        for (uint256 i; i < allowlist.length; ++i) allowed[o][allowlist[i]] = true;
        for (uint256 i; i < capIds.length; ++i) cap[o][capIds[i]] = caps[i];
        for (uint256 i; i < stakeIds.length; ++i) stakeCap[o][stakeIds[i]] = stakeCaps[i];
        for (uint256 i; i < cooldownIds.length; ++i) cooldown[o][cooldownIds[i]] = cooldowns[i];

        // canonical rules hash — identical to policy-core rulesHash (same ABI parameter layout)
        bytes32 h = keccak256(
            abi.encode(
                _totalBudget, _windowStart, _windowEnd, allowlist, capIds, caps, stakeIds, stakeCaps, cooldownIds, cooldowns
            )
        );
        rulesHash[o] = h;
        emit RulesCommitted(o, h);
    }

    /// @notice Pay USD₮ to an allow-listed destination, enforced against your committed rules.
    ///         Reverts on any policy violation. The owner must `approve` this contract for `token`.
    function pay(IERC20 token, address to, uint256 amount, bytes32 category) external {
        address o = msg.sender;
        if (totalBudget[o] == 0) revert NotCommitted();
        // precedence mirrors policy-core: window → allowlist → stake → cooldown → budget → category cap
        if (block.timestamp < windowStart[o] || block.timestamp > windowEnd[o]) revert OutsideWindow();
        if (!allowed[o][to]) revert DestinationNotAllowed();

        uint256 sc = stakeCap[o][category];
        if (sc != 0 && amount > sc) revert StakeCapExceeded();

        uint64 cd = cooldown[o][category];
        if (cd != 0) {
            uint64 last = lastSpentAt[o][category];
            if (last != 0 && block.timestamp - last < cd) revert CooldownActive();
        }

        if (totalSpent[o] + amount > totalBudget[o]) revert TotalBudgetExceeded();

        uint256 c = cap[o][category];
        if (c != 0 && spentByCategory[o][category] + amount > c) revert CategoryCapExceeded();

        totalSpent[o] += amount;
        spentByCategory[o][category] += amount;
        lastSpentAt[o][category] = uint64(block.timestamp);

        if (!token.transferFrom(o, to, amount)) revert TransferFailed();
        emit Paid(o, to, address(token), amount, category);
    }
}
