import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { getCircuit } from "../test/utils";
import { assert, expect } from "chai";
import { Noir } from "@noir-lang/noir_js";
import { ignition } from "hardhat";
import { bytesToHex } from 'viem';

import VerifierModule from "../ignition/modules/Verifier";
import toml from '@iarna/toml';
import fs from "fs";

async function main() {
  let circuits: { equality: Noir, recursive: Noir };
  let backends: { equality: BarretenbergBackend, recursive: BarretenbergBackend };

  const { circuit: equalityCircuit, backend: equalityBackend } = await getCircuit("equality");
  const { circuit: recursionCircuit, backend: recursionBackend } = await getCircuit("recursion");

  circuits = {
    equality: equalityCircuit,
    recursive: recursionCircuit,
  };

  backends = {
    equality: equalityBackend,
    recursive: recursionBackend,
  };


  // generate a valid proof with equality circuit
  const equalityInput = {
    x: 1,
    y: 1,
  };

  const { witness: equalityWitness } = await circuits.equality.execute(equalityInput);
  const equalityProof = await backends.equality.generateIntermediateProof(equalityWitness);

  const equalityVerification = await backends.equality.verifyIntermediateProof(equalityProof);
  console.log(`equality verification: ${equalityVerification}`);
  assert.equal(equalityVerification, true);


  console.log(`num public inputs: ${equalityProof.publicInputs.length}`);
  const { proofAsFields, vkAsFields, vkHash } = await backends.equality.generateIntermediateProofArtifacts(equalityProof, equalityProof.publicInputs.length);
  console.log("proof as field:");
  console.log(proofAsFields.length);
  console.log("vk as field:");
  console.log(vkAsFields.length);
  console.log("vkHash:");
  console.log(vkHash);

  // verification_key: [Field; 114],
    // proof: [Field; 94],
    // public_inputs: [Field; 1],
    // key_hash: Field,

  const recursiveInputs = {
    verification_key: vkAsFields.slice(), // array of length 114
    proof: proofAsFields.slice(), // array of length 93 + size of public inputs
    public_inputs: equalityProof.publicInputs.slice(), // using the example above, where `y` is the only public input
    key_hash: vkHash,
  }

  console.log(recursiveInputs);
  const recursiveProof = await circuits.recursive.generateFinalProof(recursiveInputs);
  expect(recursiveProof.proof instanceof Uint8Array).to.be.true;

  console.log(`recursiveProof: `);
  console.log(recursiveProof);

  const recursiveVerification = await circuits.recursive.verifyFinalProof(recursiveProof);
  expect(recursiveVerification).to.be.true;

  console.log(`off-chain recursiveVerification: ${recursiveVerification}`);

  const { recursionVerifierContract } = await ignition.deploy(VerifierModule);

  const onChainRecursiveVerification = await recursionVerifierContract.verify(recursiveProof.proof, recursiveProof.publicInputs);
  expect(onChainRecursiveVerification).to.be.true;
  console.log(`on-chain recursiveVerification: ${onChainRecursiveVerification}`);

  // write the Prove.poml
  // const jsonInputs = JSON.stringify(recursiveInputs);
  const tomlStr = toml.stringify(recursiveInputs);
  fs.writeFileSync("Prover.toml", tomlStr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});