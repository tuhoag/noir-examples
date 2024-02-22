import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { getCircuit } from "../test/utils";
import { assert, expect } from "chai";
import { InputMap, Noir } from "@noir-lang/noir_js";
import { ignition } from "hardhat";
import { bytesToHex } from 'viem';

import VerifierModule from "../ignition/modules/Verifier";

class Program {
  circuit: Noir;
  backend: BarretenbergBackend;

  constructor(circuit: Noir, backend: BarretenbergBackend) {
    this.circuit = circuit;
    this.backend = backend;
  }
}

class RollupInputs {
  verificationKeys: Array<string[]>;
  proofs: Array<string[]>;
  vkHashes: Array<string>;
  publicInputs: Array<string[]>;

  constructor() {
    this.verificationKeys = new Array();
    this.proofs = new Array();
    this.vkHashes = new Array();
    this.publicInputs = new Array();
  }

  addInput(verificationKey: string[], proof: string[], vkHash: string, publicInputs: string[]) {
    this.verificationKeys.push(verificationKey);
    this.proofs.push(proof);
    this.vkHashes.push(vkHash);
    this.publicInputs.push(publicInputs);
  }

  toCircuitInput() {
    return {
      verification_keys: this.verificationKeys,
      proofs: this.proofs,
      vkHashes: this.vkHashes,
      public_inputs: this.publicInputs,
    }
  }
}

interface RecursiveInput {
  proofAsFields: any,
  vkAsFields: any,
  vkHash: any,
}

class Proof {
  verification_key: Array<string>;
  proof: Array<string>;
  public_inputs: Array<string>;
  key_hash: string;

  constructor(verificationKey: string[], proof: string[], vkHash: string, publicInputs: string[]) {
    this.verification_key = verificationKey;
    this.proof = proof;
    this.public_inputs = publicInputs;
    this.key_hash = vkHash;
  }
}

async function main() {
  let rollupProgram: Program;

  const batchSize = 2;
  const { circuit, backend } = await getCircuit("equality");
  let subProgram: Program = new Program(circuit, backend);

  const { circuit: rollupCircuit, backend: rollupBackend } = await getCircuit("rollup");
  rollupProgram = new Program(rollupCircuit, rollupBackend);

  let verificationKey: string[];
  let verificationKeyHash: string;

  let verificationInputs = Array<RecursiveInput>;

  let rollupInputs: RollupInputs = new RollupInputs();
  let rollupInputs2: Proof[] = new Array();
  let rollupInputs3: Array<any> = new Array();

  for (let i = 0; i < batchSize; i++) {
    // generate a valid proof with equality circuit
    const equalityInput = {
      x: i + 1,
      y: i + 1,
    };

    const { witness: subWitness } = await subProgram.circuit.execute(equalityInput);
    const equalityProof = await subProgram.backend.generateIntermediateProof(subWitness);
    const equalityVerification = await subProgram.backend.verifyIntermediateProof(equalityProof);

    console.log(`equality verification: ${equalityVerification}`);
    assert.equal(equalityVerification, true);

    const { proofAsFields, vkAsFields, vkHash } = await subProgram.backend.generateIntermediateProofArtifacts(equalityProof, equalityProof.publicInputs.length);
    rollupInputs.addInput(vkAsFields, proofAsFields, vkHash, equalityProof.publicInputs);
    rollupInputs2.push(new Proof(vkAsFields, proofAsFields, vkHash, equalityProof.publicInputs));

    rollupInputs3.push({
      "verification_key": vkAsFields,
      "proof": proofAsFields,
      "public_inputs": equalityProof.publicInputs,
      "key_hash": vkHash
    });

  //   verification_key: Array<string>;
  // proof: Array<string>;
  // public_inputs: Array<string>;
  // key_hash: string;
  }

  console.log(`key_hash1: ${rollupInputs2[0].key_hash} - key_hash2: ${rollupInputs2[1].key_hash}`);
  const rollupInputs1 = {
    verification_key: rollupInputs2[0].verification_key,
    key_hash: rollupInputs2[0].key_hash,
    proof: rollupInputs2[0].proof,
    public_inputs: rollupInputs2[0].public_inputs,
    proof_b: rollupInputs2[1].proof,
    // proof1: {
    //   proof: rollupInputs2[0].proof,
    //   public_inputs: rollupInputs2[0].public_inputs,
    // },
    // proof2: {
    //   proof: rollupInputs2[1].proof,
    //   public_inputs: rollupInputs2[1].public_inputs,
    // },
    // verification_keys: {
    //   0: rollupInputs.verificationKeys[0],
    //   1: rollupInputs.verificationKeys[1],
    // },
    // proofs: {
    //   0: rollupInputs.proofs[0],
    //   1: rollupInputs.proofs[1],
    // },
    // public_inputs: {

    // }
    // proofs: proofAsFields, // array of length 93 + size of public inputs
    // public_inputs: [ equalityInput.y ],//equalityProof.publicInputs, // using the example above, where `y` is the only public input
    // key_hashes: vkHash,
  };

  const rollupProof = await rollupProgram.circuit.generateFinalProof(rollupInputs1);
  expect(rollupProof.proof instanceof Uint8Array).to.be.true;

  console.log(`rollupProof: `);
  console.log(rollupProof);

  const rollupVerification = await rollupProgram.circuit.verifyFinalProof(rollupProof);
  expect(rollupVerification).to.be.true;

  console.log(`off-chain recursiveVerification: ${rollupVerification}`);

  const { recursionVerifierContract } = await ignition.deploy(VerifierModule);

  const onChainRollupVerification = await recursionVerifierContract.verify(rollupProof.proof, rollupProof.publicInputs);
  expect(onChainRollupVerification).to.be.true;
  console.log(`on-chain rollupVerification: ${onChainRollupVerification}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});