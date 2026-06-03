// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ImpostorEscrow} from "../src/ImpostorEscrow.sol";

/// @dev M0 smoke tests. M2 adds full coverage: settle happy-path, AI-win (house 100%),
///      misvote cut, abort+refund, double-join, bad-sig, non-funder survivor, replay,
///      and the conservation invariant (test/Conservation.invariant.t.sol).
contract ImpostorEscrowTest is Test {
    ImpostorEscrow internal escrow;
    address internal admin = address(0xA11CE);
    address internal manager = address(0xB0B);
    address internal signer = address(0x5169);
    address internal treasury = address(0x7EA5);
    uint128 internal constant BUY_IN = 1 ether;

    function setUp() public {
        escrow = new ImpostorEscrow(admin, manager, signer, treasury, BUY_IN);
    }

    function test_createAndJoin() public {
        vm.prank(manager);
        escrow.createGame(1);

        address player = address(0x1234);
        vm.deal(player, BUY_IN);
        vm.prank(player);
        escrow.join{value: BUY_IN}(1);

        assertEq(escrow.deposit(1, player), BUY_IN);
    }

    function test_typehashStable() public view {
        assertEq(
            escrow.settlementTypehash(),
            keccak256(
                "Settlement(uint256 gameId,address[] survivors,uint256[] payouts,uint256 houseAmount,bytes32 resultRoot)"
            )
        );
    }
}
