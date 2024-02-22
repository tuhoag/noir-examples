import { BarretenbergBackend, ProofData } from "@noir-lang/backend_barretenberg";
import { getCircuit } from "./utils";
import { assert, expect } from "chai";
import { Noir } from "@noir-lang/noir_js";
import { ignition } from "hardhat";

import VerifierModule from "../ignition/modules/Verifier";

describe("RecursionVerifier", function () {
  let circuits: { equality: Noir, recursion: Noir };
  let backends: { equality: BarretenbergBackend, recursion: BarretenbergBackend };
  let equalityProof: ProofData;
  let recursionProof: ProofData;
  const equalityInput = {
    x: 1,
    y: 1,
  };
  let recursiveInput: any;


  before(async () => {
    const { circuit: equalityCircuit, backend: equalityBackend } = await getCircuit("equality");
    const { circuit: recursionCircuit, backend: recursionBackend } = await getCircuit("recursion");

    circuits = {
      equality: equalityCircuit,
      recursion: recursionCircuit,
    };

    backends = {
      equality: equalityBackend,
      recursion: recursionBackend,
    };
  });

  it("should be able to generate a valid equality proof", async function() {
    const { witness: equalityWitness } = await circuits.equality.execute(equalityInput);
    equalityProof = await backends.equality.generateIntermediateProof(equalityWitness);
    // console.log("proof:")
    // console.log(equalityProof);

    const equalityVerification = await backends.equality.verifyIntermediateProof(equalityProof);
    // console.log(`equality verification: ${equalityVerification}`);
    assert.equal(equalityVerification, true);
  });

  it("should be able to generate a recursive proof", async function() {
    const { proofAsFields, vkAsFields, vkHash } = await backends.equality.generateIntermediateProofArtifacts(equalityProof, equalityProof.publicInputs.length);

    recursiveInput = {
      verification_key: vkAsFields, // array of length 114
      proof: proofAsFields, // array of length 93 + size of public inputs
      public_inputs: [ equalityInput.y ],//equalityProof.publicInputs, // using the example above, where `y` is the only public input
      key_hash: vkHash,
    };

    recursionProof = await circuits.recursion.generateFinalProof(recursiveInput);
  });

  it("should be able to verify valid proof off-chain", async function() {
    const recursiveVerification = await circuits.recursion.verifyFinalProof(recursionProof);
    expect(recursiveVerification).to.be.true;
  });

  it("should be able to verify valid proof on-chain", async function() {
    const { recursionVerifierContract } = await ignition.deploy(VerifierModule);

    const onChainRecursiveVerification = await recursionVerifierContract.verify(recursionProof.proof, recursionProof.publicInputs);
    expect(onChainRecursiveVerification).to.be.true;
  });
});