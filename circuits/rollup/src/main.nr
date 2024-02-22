use dep::std;

fn main(
    verification_key: [Field; 114],
    key_hash: Field,
    proof: [Field; 93],
    // public_inputs: [Field; 1],
    proof_b: [Field; 93]
) {
    std::verify_proof(
        verification_key.as_slice(),
        proof.as_slice(),
        [],
        // public_inputs.as_slice(),
        key_hash
    );
    std::verify_proof(
        verification_key.as_slice(),
        proof_b.as_slice(),
        [],
        // public_inputs.as_slice(),
        key_hash
    );
}
