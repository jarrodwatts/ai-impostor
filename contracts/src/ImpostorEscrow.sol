// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ImpostorEscrow
 * @notice Singleton escrow + settlement for AI Impostor games on Monad.
 *         Humans escrow a fixed MON buy-in on join; the trusted server submits
 *         an EIP712-signed settlement at game end. The contract NEVER recomputes
 *         game logic — it enforces money conservation: `sum(payouts)+house == pool`
 *         and that every survivor actually funded this game. This guarantees the
 *         house can never pay out more than was escrowed (House EV >= 0).
 *
 * @dev M0 SKELETON. Bodies marked TODO(M2) are implemented in milestone M2 with
 *      full unit + invariant tests. See .agent/plans.md. AI seats never join().
 *      Settlement struct + typehash MUST stay in lockstep with
 *      packages/shared/src/settlement.ts (pinned by a cross-language test).
 */
contract ImpostorEscrow is AccessControl, ReentrancyGuard, EIP712 {
    bytes32 public constant GAME_MANAGER_ROLE = keccak256("GAME_MANAGER_ROLE");

    bytes32 public constant SETTLEMENT_TYPEHASH = keccak256(
        "Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)"
    );

    enum Status {
        None,
        Open,
        Locked,
        Settled,
        Refunding
    }

    struct Game {
        Status status;
        uint128 buyIn;
        uint128 pool;
        uint8 playerCount;
        uint64 createdAt;
        uint64 lockedAt;
    }

    struct Settlement {
        uint256 gameId;
        address[] survivors;
        uint256[] payouts;
        uint256 houseAmount;
        bytes32 resultRoot;
    }

    uint128 public buyIn;
    address public serverSigner;
    address public treasury;

    mapping(uint256 gameId => Game) public games;
    mapping(uint256 gameId => mapping(address => uint256)) public deposit;
    mapping(address => uint256) public owed; // pull-fallback ledger for failed pushes

    event GameCreated(uint256 indexed gameId, uint128 buyIn);
    event Joined(uint256 indexed gameId, address indexed player);
    event GameLocked(uint256 indexed gameId, uint128 pool, uint8 playerCount);
    event GameAborted(uint256 indexed gameId);
    event Refunded(uint256 indexed gameId, address indexed player, uint256 amount);
    event Settled(uint256 indexed gameId, uint8 outcomeSurvivors, uint256 houseAmount);

    error InvalidStatus();
    error WrongBuyIn();
    error AlreadyJoined();
    error LobbyFull();
    error NotEnoughPlayers();
    error BadSignature();
    error ArrayMismatch();
    error ConservationViolated();
    error NotAFunder(address who);

    constructor(address admin, address gameManager, address serverSigner_, address treasury_, uint128 buyIn_)
        EIP712("AI Impostor", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_MANAGER_ROLE, gameManager);
        serverSigner = serverSigner_;
        treasury = treasury_;
        buyIn = buyIn_;
    }

    // ── Lifecycle (TODO(M2): full bodies + tests) ─────────────────────

    function createGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) {
        Game storage g = games[gameId];
        if (g.status != Status.None) revert InvalidStatus();
        g.status = Status.Open;
        g.buyIn = buyIn;
        g.createdAt = uint64(block.timestamp);
        emit GameCreated(gameId, buyIn);
    }

    function join(uint256 gameId) external payable nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        if (msg.value != g.buyIn) revert WrongBuyIn();
        if (deposit[gameId][msg.sender] != 0) revert AlreadyJoined();
        if (g.playerCount >= 9) revert LobbyFull();
        deposit[gameId][msg.sender] = msg.value;
        g.pool += uint128(msg.value);
        g.playerCount += 1;
        emit Joined(gameId, msg.sender);
    }

    function lockGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        if (g.playerCount < 6) revert NotEnoughPlayers();
        g.status = Status.Locked;
        g.lockedAt = uint64(block.timestamp);
        emit GameLocked(gameId, g.pool, g.playerCount);
    }

    function abortGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        g.status = Status.Refunding;
        emit GameAborted(gameId);
    }

    function settle(Settlement calldata s, bytes calldata sig) external onlyRole(GAME_MANAGER_ROLE) nonReentrant {
        // TODO(M2): verify EIP712 sig recovers serverSigner; enforce conservation
        // (sum(payouts)+houseAmount == pool); each survivor must be a funder; no
        // duplicates; replay guard; push-with-pull-fallback disbursement.
        _verifySettlement(s, sig);
        revert("TODO(M2): settle");
    }

    function _verifySettlement(Settlement calldata s, bytes calldata sig) internal view {
        if (s.survivors.length != s.payouts.length) revert ArrayMismatch();
        bytes32 structHash = keccak256(
            abi.encode(
                SETTLEMENT_TYPEHASH,
                s.gameId,
                keccak256(abi.encodePacked(s.survivors)),
                keccak256(abi.encodePacked(s.payouts)),
                s.houseAmount,
                s.resultRoot
            )
        );
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), sig);
        if (signer != serverSigner) revert BadSignature();
    }

    /// @dev Exposed for the cross-language EIP712 typehash test (M1 risk #1).
    function settlementTypehash() external pure returns (bytes32) {
        return SETTLEMENT_TYPEHASH;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
