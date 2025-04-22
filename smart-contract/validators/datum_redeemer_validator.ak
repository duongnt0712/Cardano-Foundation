use aiken/primitive/string
use cardano/script_context.{ScriptContext}
use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  value: ByteArray,
}

pub type Redeemer {
  value: ByteArray,
}

validator datum_redeemer_validator {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _utxo: OutputReference,
    _self: Transaction,
  ) {
    expect Some(datum_input) = datum
    let d: Datum = datum_input
    trace @"redeemer": string.from_bytearray(redeemer.value)
    let a = d.value == redeemer.value
    a?
  }

  // If needs be, remove any of unneeded handlers above, and use:

  else(_ctx: ScriptContext) {
    fail
  }
}
