import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { resolve } from "path";
import os from 'os';

export async function getCircuit(circuitName) {
  const myProjectPath = `../../circuits/${circuitName}/`
  const fm = createFileManager(resolve(myProjectPath));
  const myCompiledCode = await compile(fm);

  const backend = new BarretenbergBackend(myCompiledCode.program, { threads: 12 });
  const circuit = new Noir(myCompiledCode.program, backend);

  return { circuit, backend };
}

async function main() {
  // console.log(os.cpus().length);
  let rollupProgram;

  const batchSize = 2;
  const { circuit, backend } = await getCircuit("equality");
  let subProgram = {circuit, backend};

  const { circuit: rollupCircuit, backend: rollupBackend } = await getCircuit("rollup");
  rollupProgram = { circuit: rollupCircuit, backend: rollupBackend};

  let rollupInputs3 = new Array();

  for (let i = 0; i < batchSize; i++) {
    const equalityInput = {
      x: i + 1,
      y: i + 1,
    };

    const { witness: subWitness } = await subProgram.circuit.execute(equalityInput);
    const equalityProof = await subProgram.backend.generateIntermediateProof(subWitness);
    const equalityVerification = await subProgram.backend.verifyIntermediateProof(equalityProof);

    console.log(equalityVerification);

    const { proofAsFields, vkAsFields, vkHash } = await subProgram.backend.generateIntermediateProofArtifacts(equalityProof, equalityProof.publicInputs.length);

    rollupInputs3.push({
      "verification_key": vkAsFields,
      "proof": proofAsFields,
      "public_inputs": equalityProof.publicInputs,
      "key_hash": vkHash
    });
  }

  await subProgram.circuit.destroy();

  const rollupInputs1 = {
    verification_key: rollupInputs3[0].verification_key,
    key_hash: rollupInputs3[0].key_hash,
    proof: rollupInputs3[0].proof,
    public_inputs: rollupInputs3[0].public_inputs,
    proof_b: rollupInputs3[1].proof,
  };

  const rollupProof = await rollupProgram.circuit.generateFinalProof(rollupInputs1);

  await rollupProgram.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});