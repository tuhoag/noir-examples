import { assert, expect } from "chai";
import hre, { ethers, ignition } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import ApolloModule from "../ignition/modules/Apollo";
import { describe } from "mocha";

async function deployApolloModuleFixture() {
  const status = "ignition";
  const name = "test-name";

  const { rocket } = await ignition.deploy(ApolloModule, {
    parameters: {
      Apollo: {
        name: name,
      }
    },
  });

  return { rocket, name, status };
}

describe("Apollo", function () {
  describe("Rocket Contract", function () {
    it("Should be initialized with correct values", async function () {
      const { rocket, name, status } = await loadFixture(deployApolloModuleFixture);

      expect(await rocket.name()).to.equal(name);
      assert.equal(await rocket.status(), status);
    });

    it("launch() should change its status to lift-off", async function () {
      const { rocket } = await loadFixture(deployApolloModuleFixture);

      await rocket.launch();

      assert.equal(await rocket.status(), "lift-off");
    });
  });
});