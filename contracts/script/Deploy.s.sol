// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {ImpostorEscrow} from "../src/ImpostorEscrow.sol";

/// @dev M2 wires this to write deployments/10143.json (address + ABI) consumed by
///      packages/contracts. Env: ADMIN, GAME_MANAGER, SERVER_SIGNER, TREASURY, BUY_IN.
contract Deploy is Script {
    function run() external returns (ImpostorEscrow escrow) {
        address admin = vm.envAddress("ADMIN");
        address gameManager = vm.envAddress("GAME_MANAGER");
        address serverSigner = vm.envAddress("SERVER_SIGNER");
        address treasury = vm.envAddress("TREASURY");
        uint128 buyIn = uint128(vm.envUint("BUY_IN"));

        vm.startBroadcast();
        escrow = new ImpostorEscrow(admin, gameManager, serverSigner, treasury, buyIn);
        vm.stopBroadcast();
    }
}
