
import { assert, expect } from "chai";
import hre, { ethers, ignition } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import VerifierModule from "../ignition/modules/Verifier";
import { describe } from "mocha";

import { compile, createFileManager } from '@noir-lang/noir_wasm';
import { resolve } from "path";
import { BarretenbergBackend, CompiledCircuit } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import { getCircuit } from "./utils";

async function verify(circuit: Noir, inputData: any, contract?: any): Promise<boolean> {
  try {
    const proof = await circuit.generateFinalProof(inputData);
    const verification = await circuit.verifyFinalProof(proof);

    if (contract !== undefined) {
      const onChainVerification = await contract.verify(proof.proof, proof.publicInputs);
      assert.equal(verification, onChainVerification);
    }

    return verification;
  } catch (err: any) {
    return false;
  }
}

describe("EqualityVerifier", function () {
  let circuit: Noir;

  before(async () => {
    const circuitName = "equality";
    const { circuit: equalityCircuit } = await getCircuit(circuitName);
    circuit = equalityCircuit;
  });

  describe("(Local Verifier)", function () {
    it("Should accept a valid proof", async function () {
      const input = {
        x: 4,
        y: 4,
      }

      assert.equal(await verify(circuit, input), true);
    });

    it("Should not accept an invalid input", async function () {
      const input = {
        x: 4,
        y: 3,
      }

      assert.equal(await verify(circuit, input), false);
    });
  });
  describe("(On-chain Verifier)", function () {
    let verifierContract: any;

    before(async () => {
      const { equalityVerifierContract } = await ignition.deploy(VerifierModule);
      verifierContract = equalityVerifierContract;
    });

    it("Should accept a valid proof", async function () {
      const input = {
        x: 4,
        y: 4,
      }

      assert.equal(await verify(circuit, input, verifierContract), true);
    });

    it("Should not accept an invalid proof", async function () {
      const input = {
        x: 4,
        y: 3,
      }

      assert.equal(await verify(circuit, input, verifierContract), false);
    });
  });
});