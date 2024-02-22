import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { resolve } from "path";

export async function getCircuit(circuitName: string) {
  const myProjectPath = `./circuits/${circuitName}/`
  const fm = createFileManager(resolve(myProjectPath));
  const myCompiledCode = await compile(fm);

  const backend = new BarretenbergBackend(myCompiledCode.program, { threads: 8 });
  const circuit = new Noir(myCompiledCode.program, backend);

  return { circuit, backend };
}