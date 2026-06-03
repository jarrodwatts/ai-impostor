// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
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
 * @dev Lifecycle: None → Open → Locked → Settled, or Open → Refunding.
 *      AI seats never join(). Settlement struct + typehash MUST stay in lockstep
 *      with packages/shared/src/settlement.ts (pinned by a cross-language test).
 *
 * Money-safety design:
 *  - settle() uses checks-effects-interactions: status flips to Settled and every
 *    per-survivor deposit is zeroed BEFORE any value is pushed.
 *  - Payout pushes are wrapped: a failing recipient credits owed[addr] (pull) so a
 *    single griefing contract cannot block the entire settlement.
 *  - refund() / withdraw() are pull-based, nonReentrant, and never paused.
 */
contract ImpostorEscrow is AccessControl, ReentrancyGuard, Pausable, EIP712 {
    using Address for address payable;

    bytes32 public constant GAME_MANAGER_ROLE = keccak256("GAME_MANAGER_ROLE");

    bytes32 public constant SETTLEMENT_TYPEHASH = keccak256(
        "Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)"
    );

    uint8 public constant MAX_PLAYERS = 9;
    uint8 public constant MIN_PLAYERS = 6;

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
    event PayoutDeferred(uint256 indexed gameId, address indexed survivor, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    event BuyInUpdated(uint128 buyIn);
    event TreasuryUpdated(address treasury);
    event ServerSignerRotated(address serverSigner);

    error InvalidStatus();
    error WrongBuyIn();
    error AlreadyJoined();
    error LobbyFull();
    error NotEnoughPlayers();
    error BadSignature();
    error ArrayMismatch();
    error ConservationViolated();
    error NotAFunder(address who);
    error ZeroAddress();
    error NothingOwed();
    error NothingToRefund();

    constructor(address admin, address gameManager, address serverSigner_, address treasury_, uint128 buyIn_)
        EIP712("AI Impostor", "1")
    {
        if (admin == address(0) || gameManager == address(0) || serverSigner_ == address(0) || treasury_ == address(0))
        {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_MANAGER_ROLE, gameManager);
        serverSigner = serverSigner_;
        treasury = treasury_;
        buyIn = buyIn_;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    /// @notice Open a new game keyed by gameId, snapshotting the current buyIn.
    function createGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) whenNotPaused {
        Game storage g = games[gameId];
        if (g.status != Status.None) revert InvalidStatus();
        g.status = Status.Open;
        g.buyIn = buyIn;
        g.createdAt = uint64(block.timestamp);
        emit GameCreated(gameId, buyIn);
    }

    /// @notice Escrow exactly the game's buy-in. One deposit per wallet, cap MAX_PLAYERS.
    function join(uint256 gameId) external payable nonReentrant whenNotPaused {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        if (msg.value != g.buyIn) revert WrongBuyIn();
        if (deposit[gameId][msg.sender] != 0) revert AlreadyJoined();
        if (g.playerCount >= MAX_PLAYERS) revert LobbyFull();
        deposit[gameId][msg.sender] = msg.value;
        g.pool += uint128(msg.value);
        g.playerCount += 1;
        emit Joined(gameId, msg.sender);
    }

    /// @notice Lock an Open game once it has at least MIN_PLAYERS funders.
    function lockGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        if (g.playerCount < MIN_PLAYERS) revert NotEnoughPlayers();
        g.status = Status.Locked;
        g.lockedAt = uint64(block.timestamp);
        emit GameLocked(gameId, g.pool, g.playerCount);
    }

    /// @notice Move an Open game into Refunding so funders can pull their deposits back.
    function abortGame(uint256 gameId) external onlyRole(GAME_MANAGER_ROLE) {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert InvalidStatus();
        g.status = Status.Refunding;
        emit GameAborted(gameId);
    }

    /**
     * @notice Settle a Locked game from a server-signed Settlement.
     * @dev Verifies the EIP712 signature recovers serverSigner; enforces
     *      conservation (sum(payouts) + houseAmount == pool); every survivor must
     *      be a funder of THIS game with no duplicates. Status flips to Settled and
     *      all deposits are zeroed BEFORE pushing value (checks-effects-interactions).
     *      A failing survivor push is credited to owed[survivor] instead of reverting.
     */
    function settle(Settlement calldata s, bytes calldata sig) external onlyRole(GAME_MANAGER_ROLE) nonReentrant {
        Game storage g = games[s.gameId];
        if (g.status != Status.Locked) revert InvalidStatus(); // replay guard: only Locked settles

        _verifySettlement(s, sig);

        uint256 n = s.survivors.length;
        uint256 pool = g.pool;

        // Conservation: total disbursed must exactly equal the escrowed pool.
        uint256 paid;
        for (uint256 i; i < n; ++i) {
            paid += s.payouts[i];
        }
        if (paid + s.houseAmount != pool) revert ConservationViolated();

        // Effects: mark settled and zero every survivor's deposit before any push.
        // Zeroing the deposit doubles as the in-loop duplicate guard.
        g.status = Status.Settled;
        for (uint256 i; i < n; ++i) {
            address survivor = s.survivors[i];
            uint256 dep = deposit[s.gameId][survivor];
            if (dep == 0) revert NotAFunder(survivor); // also catches a duplicate (already zeroed)
            deposit[s.gameId][survivor] = 0;
        }

        // Interactions: push payouts (defer to owed[] on failure), then house take.
        for (uint256 i; i < n; ++i) {
            uint256 amount = s.payouts[i];
            if (amount == 0) continue;
            address survivor = s.survivors[i];
            (bool ok,) = survivor.call{value: amount}("");
            if (!ok) {
                owed[survivor] += amount;
                emit PayoutDeferred(s.gameId, survivor, amount);
            }
        }

        if (s.houseAmount != 0) {
            payable(treasury).sendValue(s.houseAmount);
        }

        emit Settled(s.gameId, uint8(n), s.houseAmount);
    }

    /// @notice Pull a deposit back from an aborted (Refunding) game. Never paused.
    function refund(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Refunding) revert InvalidStatus();
        uint256 amount = deposit[gameId][msg.sender];
        if (amount == 0) revert NothingToRefund();
        deposit[gameId][msg.sender] = 0;
        emit Refunded(gameId, msg.sender, amount);
        payable(msg.sender).sendValue(amount);
    }

    /// @notice Drain the caller's deferred-payout ledger. Never paused.
    function withdraw() external nonReentrant {
        uint256 amount = owed[msg.sender];
        if (amount == 0) revert NothingOwed();
        owed[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
        payable(msg.sender).sendValue(amount);
    }

    // ── Admin (DEFAULT_ADMIN_ROLE) ────────────────────────────────────

    function setBuyIn(uint128 newBuyIn) external onlyRole(DEFAULT_ADMIN_ROLE) {
        buyIn = newBuyIn;
        emit BuyInUpdated(newBuyIn);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function rotateServerSigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newSigner == address(0)) revert ZeroAddress();
        serverSigner = newSigner;
        emit ServerSignerRotated(newSigner);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ── Verification + EIP712 getters ─────────────────────────────────

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
