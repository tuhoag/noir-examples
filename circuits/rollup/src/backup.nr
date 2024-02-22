use dep::std;

global num_proofs = 2;

struct Proof {
    proof: [Field; 93],
    public_inputs: [Field; 1],
}

fn main(
    verification_key: [Field; 114],
    key_hash: Field,
    proof: [Field; 93],
    public_inputs: [Field; 1],
    proof_b: [Field; 93] // proof1: Proof, // proof2: Proof
    // proof2: Proof // proofs: pub [[Field; 93]; num_proofs],
    // public_inputs: pub [[Field; 1]; num_proofs],
    // key_hashes: pub [Field; num_proofs]
) {
    std::verify_proof(
        verification_key.as_slice(),
        proof.as_slice(),
        public_inputs.as_slice(),
        key_hash
    );
    std::verify_proof(
        verification_key.as_slice(),
        proof_b.as_slice(),
        public_inputs.as_slice(),
        key_hash
    );
    // for i in 0..num_proofs {
    //     std::verify_proof(
    //         proofs[i].verification_key.as_slice(),
    //         proofs[i].proof.as_slice(),
    //         proofs[i].public_inputs.as_slice(),
    //         proofs[i].key_hash
    //     );
    // }
}
