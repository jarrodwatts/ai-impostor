// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ImpostorEscrow} from "../src/ImpostorEscrow.sol";

/**
 * @title EscrowHandler
 * @notice Fuzz handler driving the escrow through its full lifecycle while
 *         tracking ground-truth accounting in the test:
 *           - totalEscrowed: every wei that entered via join()
 *           - totalDisbursed: every wei that left via settle payouts/house + refunds
 *         The invariant suite asserts the contract can always cover its outstanding
 *         obligations and never pays out more than was escrowed.
 */
contract EscrowHandler is Test {
    ImpostorEscrow public escrow;
    uint256 internal signerPk;
    address internal manager;
    address internal treasury;
    uint128 internal buyIn;

    // ground-truth ledgers
    uint256 public totalEscrowed; // Σ all join() values, ever
    uint256 public totalSettledOut; // Σ payouts + house disbursed across settlements
    uint256 public totalRefunded; // Σ refunds paid

    uint256 internal nextGameId = 1;
    uint256[] internal openGames;
    uint256[] internal lockedGames;
    uint256[] internal refundingGames;

    // funders per game (only real funders ever become survivors)
    mapping(uint256 => address[]) internal fundersOf;

    constructor(ImpostorEscrow escrow_, uint256 signerPk_, address manager_, address treasury_, uint128 buyIn_) {
        escrow = escrow_;
        signerPk = signerPk_;
        manager = manager_;
        treasury = treasury_;
        buyIn = buyIn_;
    }

    function _newPlayer(uint256 seed) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("player", seed)))));
    }

    function createGame(uint256) external {
        uint256 gid = nextGameId++;
        vm.prank(manager);
        escrow.createGame(gid);
        openGames.push(gid);
    }

    function join(uint256 gameSeed, uint256 playerSeed) external {
        if (openGames.length == 0) return;
        uint256 gid = openGames[gameSeed % openGames.length];
        (ImpostorEscrow.Status status,,, uint8 playerCount,,) = escrow.games(gid);
        if (status != ImpostorEscrow.Status.Open) return;
        if (playerCount >= escrow.MAX_PLAYERS()) return;

        address player = _newPlayer(playerSeed ^ (gid << 8));
        if (escrow.deposit(gid, player) != 0) return; // one per wallet

        vm.deal(player, buyIn);
        vm.prank(player);
        escrow.join{value: buyIn}(gid);

        totalEscrowed += buyIn;
        fundersOf[gid].push(player);
    }

    function lockGame(uint256 gameSeed) external {
        if (openGames.length == 0) return;
        uint256 idx = gameSeed % openGames.length;
        uint256 gid = openGames[idx];
        (ImpostorEscrow.Status status,,, uint8 playerCount,,) = escrow.games(gid);
        if (status != ImpostorEscrow.Status.Open || playerCount < escrow.MIN_PLAYERS()) return;

        vm.prank(manager);
        escrow.lockGame(gid);
        _removeOpen(idx);
        lockedGames.push(gid);
    }

    function abortGame(uint256 gameSeed) external {
        if (openGames.length == 0) return;
        uint256 idx = gameSeed % openGames.length;
        uint256 gid = openGames[idx];
        (ImpostorEscrow.Status status,,,,,) = escrow.games(gid);
        if (status != ImpostorEscrow.Status.Open) return;

        vm.prank(manager);
        escrow.abortGame(gid);
        _removeOpen(idx);
        refundingGames.push(gid);
    }

    function settle(uint256 gameSeed, uint256 survivorCountSeed, uint256 houseSeed) external {
        if (lockedGames.length == 0) return;
        uint256 idx = gameSeed % lockedGames.length;
        uint256 gid = lockedGames[idx];
        (ImpostorEscrow.Status status,, uint128 pool,,,) = escrow.games(gid);
        if (status != ImpostorEscrow.Status.Locked) return;

        address[] memory funders = fundersOf[gid];
        uint256 sCount = funders.length == 0 ? 0 : survivorCountSeed % (funders.length + 1);

        // Build a conservation-respecting settlement: split pool across the first
        // sCount funders, remainder (incl. all of it when sCount==0) → house.
        address[] memory survivors = new address[](sCount);
        uint256[] memory payouts = new uint256[](sCount);

        uint256 remaining = pool;
        // house gets at least a fuzzed slice (and dust), rest split evenly.
        uint256 house = sCount == 0 ? pool : (houseSeed % (pool + 1));
        remaining = pool - house;

        uint256 distributed;
        for (uint256 i; i < sCount; ++i) {
            survivors[i] = funders[i];
            uint256 share = i == sCount - 1 ? remaining - distributed : remaining / sCount;
            payouts[i] = share;
            distributed += share;
        }

        ImpostorEscrow.Settlement memory s = ImpostorEscrow.Settlement({
            gameId: gid, survivors: survivors, payouts: payouts, houseAmount: house, resultRoot: bytes32(0)
        });

        bytes memory sig = _sign(s);
        vm.prank(manager);
        escrow.settle(s, sig);

        totalSettledOut += pool; // payouts + house == pool by construction
        _removeLocked(idx);
    }

    function refund(uint256 gameSeed, uint256 playerSeed) external {
        if (refundingGames.length == 0) return;
        uint256 gid = refundingGames[gameSeed % refundingGames.length];
        address[] memory funders = fundersOf[gid];
        if (funders.length == 0) return;
        address player = funders[playerSeed % funders.length];
        uint256 dep = escrow.deposit(gid, player);
        if (dep == 0) return;

        vm.prank(player);
        escrow.refund(gid);
        totalRefunded += dep;
    }

    function withdraw(uint256 playerSeed) external {
        // owed[] only accrues for reverting recipients; EOAs never have owed balances
        // here, so this is a safe no-op probe of the drain path.
        address player = _newPlayer(playerSeed);
        if (escrow.owed(player) == 0) return;
        vm.prank(player);
        escrow.withdraw();
    }

    function _sign(ImpostorEscrow.Settlement memory s) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                escrow.SETTLEMENT_TYPEHASH(),
                s.gameId,
                keccak256(abi.encodePacked(s.survivors)),
                keccak256(abi.encodePacked(s.payouts)),
                s.houseAmount,
                s.resultRoot
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", escrow.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 ss) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, ss, v);
    }

    function _removeOpen(uint256 idx) internal {
        openGames[idx] = openGames[openGames.length - 1];
        openGames.pop();
    }

    function _removeLocked(uint256 idx) internal {
        lockedGames[idx] = lockedGames[lockedGames.length - 1];
        lockedGames.pop();
    }
}

/**
 * @title ConservationInvariant
 * @notice The "house never loses" proof. Across any sequence of lifecycle calls:
 *   1. Σ disbursed (settlements + refunds) ≤ Σ escrowed — no settlement or refund
 *      can ever move more MON than players put in.
 *   2. The contract's live MON balance always covers every wei still owed to
 *      players (open/locked deposits + pending refunds + deferred owed[]), i.e.
 *      it can never become insolvent against outstanding obligations.
 */
contract ConservationInvariantTest is Test {
    ImpostorEscrow internal escrow;
    EscrowHandler internal handler;

    uint256 internal signerPk = 0xA11CE5;
    address internal admin = address(0xA11CE);
    address internal manager = address(0xB0B);
    address internal treasury = address(0x7EA5);
    uint128 internal constant BUY_IN = 1 ether;

    function setUp() public {
        address signer = vm.addr(signerPk);
        escrow = new ImpostorEscrow(admin, manager, signer, treasury, BUY_IN);
        handler = new EscrowHandler(escrow, signerPk, manager, treasury, BUY_IN);

        // Route fuzzing exclusively through the handler.
        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](7);
        selectors[0] = handler.createGame.selector;
        selectors[1] = handler.join.selector;
        selectors[2] = handler.lockGame.selector;
        selectors[3] = handler.abortGame.selector;
        selectors[4] = handler.settle.selector;
        selectors[5] = handler.refund.selector;
        selectors[6] = handler.withdraw.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @dev House never loses: total ever disbursed ≤ total ever escrowed.
    function invariant_neverPaysOutMoreThanEscrowed() public view {
        uint256 disbursed = handler.totalSettledOut() + handler.totalRefunded();
        assertLe(disbursed, handler.totalEscrowed(), "disbursed exceeds escrowed");
    }

    /// @dev Solvency: live balance covers everything escrowed but not yet paid out.
    function invariant_balanceCoversOutstanding() public view {
        uint256 outstanding = handler.totalEscrowed() - (handler.totalSettledOut() + handler.totalRefunded());
        assertEq(address(escrow).balance, outstanding, "balance != outstanding obligations");
    }
}
