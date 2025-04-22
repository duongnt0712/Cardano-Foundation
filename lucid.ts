import { Blockfrost, Lucid, Crypto, fromText, Data, Addresses } from "https://deno.land/x/lucid/mod.ts";

const seed = "jump sword inform index bleak measure senior athlete survey inhale job hazard athlete victory hurry waste rib zebra dance depend fade tower exile fiber";
const blockfrostKey = "previewkjayiptbqKzcIIJSoWegTy0mTudeoYHN";
const tokenName = "BK03:100";
const lovelace_lock = 50_000_000n;
const tokenAmount = 500n;

const DatumSchema = Data.Object({
  msg: Data.Bytes,
});
const RedeemerSchema = Data.Object({
  msg: Data.Bytes,
});

async function getTotalAda(utxos) {
  const totalLovelace = utxos.reduce((acc, utxo) => {
    const lovelace = BigInt(utxo.assets["lovelace"] || 0n);
    return acc + lovelace;
  }, 0n);
  const totalADA = Number(totalLovelace) / 1_000_000;
  return totalADA;
}

async function createMintingscripts(slot_in: bigint) {
  const { payment } = Addresses.inspect(
    await lucid.wallet.address(),
  );

  const mintingScripts = lucid.newScript(
    {
      type: "All",
      scripts: [
        { type: "Sig", keyHash: payment.hash },
        {
          type: "Before",
          slot: slot_in,
        },
      ],
    },
  );

  return mintingScripts;
}

async function mintToken(policyId: string, tokenName: string, amount: bigint, slot_in: bigint) {
  const unit = policyId + fromText(tokenName);

  // Tạo metadata
  const metadata = {
    [policyId]: {
      [tokenName]: {
        "description": "This is Token minted by Nguyen Thuy Duong_100",
        "name": `${tokenName}`,
        "id": 1,
        "image": "ipfs://QmRE3Qnz5Q8dVtKghL4NBhJBH4cXPwfRge7HMiBhK92SJX"
      }
    }
  };
  console.log(metadata);

  const tx = await lucid.newTx()
    .mint({ [unit]: amount })
    .validTo(Date.now() + 200000)
    .attachScript(await createMintingscripts(slot_in))
    .attachMetadata(721, metadata)
    .commit();

  return tx;
}

// Khoá tài sản
export async function lockUtxo(lovelace: bigint, tokenUnit: string, tokenAmount: bigint): Promise<string> {
  const assets = {
    lovelace,
    [tokenUnit]: tokenAmount
  };

  const tx = await lucid
    .newTx()
    .payToContract(alwaysSucceedAddress, { Inline: Datum() }, assets)
    .commit();

  const signedTx = await tx.sign().commit();
  console.log(signedTx);

  const txHash = await signedTx.submit();

  return txHash;
}

// Mở khóa UTxO
export async function unlockUtxo(redeemer: RedeemerSchema): Promise<string> {

  const utxo = (await lucid.utxosAt(alwaysSucceedAddress)).find((utxo) =>
    !utxo.scriptRef && utxo.datum === redeemer // && utxo.assets.lovelace == lovelace
  );
  console.log(`redeemer: ${redeemer}`);
  console.log(`UTxO unlock: ${utxo}`);
  if (!utxo) throw new Error("No UTxO with lovelace > 1000 found");
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], Redeemer())
    .attachScript(alwaysSucceed_scripts)
    .commit();

  const signedTx = await tx.sign().commit();

  const txHash = await signedTx.submit();

  return txHash;
}

// =================================
// 1. Kết nối ví Cardano dùng seed phase.
const lucid = new Lucid({
  provider: new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", blockfrostKey)
});
lucid.selectWalletFromSeed(seed, { addressType: "Base", index: 0 });

// =================================
// 2. Xem thông tin ví: Hiển thị địa chỉ ví hiện tại và tổng số dư ADA trong ví.
// Địa chỉ ví
const address = await lucid.wallet.address();
console.log(`Địa chỉ ví gửi: ${address}`)

// Tổng số dư ADA
const utxos = await lucid.utxosAt(address);
const totalADA = await getTotalAda(utxos);
console.log(`Tổng số dư ADA trong ví: ${totalADA}`)

// =================================
// 3. Mint 500 Token  với tên là BK03:100
const slot_in = BigInt(lucid.utils.unixTimeToSlots(Date.now() + 1000000));
console.log(`Slot: ${slot_in}`);

const mintingScripts = await createMintingscripts(slot_in);

const policyId = mintingScripts.toHash();
console.log(`Mã chính sách minting là: ${policyId}`);

const tx = await mintToken(policyId, tokenName, tokenAmount, slot_in);
let signedtx = await tx.sign().commit();
let mintedTxHash = await signedtx.submit();
console.log(`Bạn có thể kiểm tra giao dịch tại: https://preview.cexplorer.io/tx/${mintedTxHash}`);

// =================================
// 4. Sử dụng Aiken để viết một smart contract đơn giản: Cho phép mở khóa khi Redeemer==Datum
// Lấy địa chỉ Plutus script
const alwaysSucceed_scripts = lucid.newScript({
  type: "PlutusV3",
  script: "58af01010029800aba2aba1aab9faab9eaab9dab9a48888896600264653001300700198039804000cc01c0092225980099b8748008c01cdd500144c8cc896600266e1d2000300a375400d13232598009808001456600266e1d2000300c375400713371e6eb8c03cc034dd5180798069baa003375c601e601a6ea80222c805a2c8070dd7180700098059baa0068b2012300b001300b300c0013008375400516401830070013003375400f149a26cac80081",
});
const alwaysSucceedAddress = alwaysSucceed_scripts.toAddress();
console.log(`Always succeed address: ${alwaysSucceedAddress}`);

const Datum = () => Data.to({ msg: fromText("Nguyễn Thuỳ Dương_100") }, DatumSchema);
console.log("Datum: ", Datum());

const Redeemer = () => Data.to({ msg: fromText("Nguyễn Thuỳ Dương_100") }, RedeemerSchema);

// =================================
// 5. Lock 50 tADA và số token trên (BK03_100) vào smart contract vừa tạo với Datum là tên và mã học viên của bạn.
const unit = policyId + fromText(tokenName);
const txHash = await lockUtxo(lovelace_lock, unit, tokenAmount);
console.log(`Lock Transaction hash: ${txHash}`);

// =================================
// 6. Unlock UTxO vừa tạo trong sc của bạn.
const redeemTxHash = await unlockUtxo(Redeemer());
console.log(`Unlock Transaction hash: ${redeemTxHash}`);

Deno.exit(0); // Thoát chương trình
