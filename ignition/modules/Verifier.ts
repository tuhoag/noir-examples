import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Verifier", (m) => {
  const equalityVerifierContract = m.contract("EqualityVerifier");
  const recursionVerifierContract = m.contract("RecursionVerifier");
  const rollupVerifierContract = m.contract("RollupVerifier");

  return { equalityVerifierContract, recursionVerifierContract, rollupVerifierContract };
});