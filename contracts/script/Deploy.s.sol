// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {ImpostorEscrow} from "../src/ImpostorEscrow.sol";

/**
 * @dev Deploys ImpostorEscrow and writes deployments/<chainid>.json (e.g.
 *      deployments/10143.json on Monad testnet). The file is seeded from the
 *      Foundry build artifact (so it carries the canonical `abi` array verbatim)
 *      and then overlaid with the deployed `address` and `chainId`. Consumed by
 *      packages/contracts ABI/address generation. fs_permissions in foundry.toml
 *      allows read-write on ./deployments and read on ./out.
 *
 * Env: ADMIN, GAME_MANAGER, SERVER_SIGNER, TREASURY, BUY_IN (wei).
 * Live deploy (manual): a funded deployer key + MONAD_TESTNET_RPC_URL are required:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PK
 */
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

        _writeDeployment(address(escrow));
    }

    /// @dev Writes deployments/<chainid>.json carrying {address, chainId, abi, ...}.
    function _writeDeployment(address escrowAddr) internal {
        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");

        // Seed from the build artifact so the canonical `abi` array is present verbatim.
        string memory artifact = vm.readFile("out/ImpostorEscrow.sol/ImpostorEscrow.json");
        vm.writeJson(artifact, path);

        // Overlay deployment metadata.
        vm.writeJson(vm.toString(escrowAddr), path, ".address");
        vm.writeJson(vm.toString(block.chainid), path, ".chainId");
    }
}
