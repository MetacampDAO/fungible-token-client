import { initializeKeypair, airdropSolIfNeeded } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });


async function main() {
  // ESTABLISH CONNECTION
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));

  // INIT A NEW KEYPAIR (WALLET 1) IF NOT IN ENV
  const user1 = await initializeKeypair(connection);
  await airdropSolIfNeeded(connection, user1.publicKey, 2, 5)

  // CREATE A NEW MINT (PUBKEY RETURNED)
  const mint = await createMintAccount(
    connection,
    user1,
    user1.publicKey,
    user1.publicKey,
    2,
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"}
  );

  // GET MINT ACCOUNT
  const mintInfo = await token.getMint(connection, mint, 'confirmed');


  // CREATE TOKEN ACCOUNT 1
  const tokenAccount = await getOrCreateTokenAccount(
    connection,
    user1,
    mint,
    user1.publicKey,
    undefined,
    'confirmed',
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );

  // MINT 100 TOKEN TO TOKEN ACCOUNT 1
  await mintTokens(
    connection,
    user1,
    mint,
    tokenAccount.address,
    user1,
    100 * 10 ** mintInfo.decimals,
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );

  // CREATE WALLET 2
  const user2_delegate = web3.Keypair.generate();

  // DELEGATE 50 TOKEN TO WALLET 2
  await approveDelegate(
    connection,
    user1,
    tokenAccount.address,
    user2_delegate.publicKey,
    user1.publicKey,
    50 * 10 ** mintInfo.decimals,    
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );

  // CREATE WALLET 3
  const user3_receiver = web3.Keypair.generate().publicKey;
  // CREATE TOKEN ACCOUNT 3
  const receiverTokenAccount = await getOrCreateTokenAccount(
    connection,
    user1,
    mint,
    user3_receiver,
    undefined,
    'confirmed',
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );

  // TRANSFER 50 TOKEN FROM TOKEN ACCOUNT 1 TO TOKEN ACCOUNT 3, WITH WALLET 2
  await transferTokens(
    connection,
    user1,
    tokenAccount.address,
    receiverTokenAccount.address,
    user2_delegate, // delegated amount
    50 * 10 ** mintInfo.decimals,
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );

  // REVOKE WALLET 2 DELEGATION
  await revokeDelegate(
    connection, 
    user1, 
    tokenAccount.address, 
    user1.publicKey,
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    });

  // BURN 25 FROM TOKEN ACCOUNT 1
  await burnTokens(
    connection,
    user1,
    tokenAccount.address,
    mint,
    user1,
    25 * 10 ** mintInfo.decimals,
    undefined,
    {
      commitment: 'confirmed',
      preflightCommitment: "confirmed"
    }
  );
}
  
  

async function createMintAccount(
  connection: web3.Connection,
  payer: web3.Keypair,
  mintAuthority: web3.PublicKey,
  freezeAuthority: web3.PublicKey,
  decimals: number,
  keypair?: web3.Keypair | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
): Promise<web3.PublicKey> {
  const tokenMint = await token.createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals,
    keypair,
    confirmOptions,
    programId
  );

  console.log(
    `Mint Account \x1b[32m${tokenMint}\x1b[0m created: https://explorer.solana.com/address/${tokenMint}?cluster=devnet \n`
  );

  return tokenMint;
}

async function getOrCreateTokenAccount(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  allowOwnerOffCurve?: boolean | undefined,
  commitment?: web3.Commitment | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner,
    allowOwnerOffCurve,
    commitment,
    confirmOptions,
    programId
  );

  console.log(
    `Token Account \x1b[32m${tokenAccount.address}\x1b[0m created for \x1b[32m${owner}\x1b[0m: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet \n`
  );

  return tokenAccount;
}

async function mintTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  authority: web3.Keypair,
  amount: number,
  multiSigners?: web3.Signer[] | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const transactionSignature = await token.mintTo(
    connection,
    payer,
    mint,
    destination,
    authority,
    amount,
    multiSigners,
    confirmOptions,
    programId
  );

  console.log(
    `Mint \x1b[32m${amount}\x1b[0m token basis points to Token Account \x1b[32m${destination}\x1b[0m: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet \n`
  );
}

async function approveDelegate(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  delegate: web3.PublicKey,
  owner: web3.Signer | web3.PublicKey,
  amount: number,
  multiSigners?: web3.Signer[] | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const transactionSignature = await token.approve(
    connection,
    payer,
    account,
    delegate,
    owner,
    amount,
    multiSigners,
    confirmOptions,
    programId
  );

  console.log(
    `Approve \x1b[32m${amount}\x1b[0m token basis points to Delegate Account \x1b[32m${delegate}\x1b[0m: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet \n`
  );
}

async function revokeDelegate(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  owner: web3.Signer | web3.PublicKey,
  multiSigners?: web3.Signer[] | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const transactionSignature = await token.revoke(
    connection,
    payer,
    account,
    owner,
    multiSigners,
    confirmOptions,
    programId
  );

  console.log(
    `Revoke delegate by owner \x1b[32m${owner}\x1b[0m: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet \n`
  );
}

async function transferTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  source: web3.PublicKey,
  destination: web3.PublicKey,
  owner: web3.Keypair,
  amount: number,
  multiSigners?: web3.Signer[] | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const transactionSignature = await token.transfer(
    connection,
    payer,
    source,
    destination,
    owner,
    amount,
    multiSigners,
    confirmOptions,
    programId
  );

  console.log(
    `Transfer \x1b[32m${amount}\x1b[0m token basis points from Token Account \x1b[32m${source}\x1b[0m to Token Account \x1b[32m${destination}\x1b[0m: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet \n`
  );
}

async function burnTokens(
  connection: web3.Connection,
  payer: web3.Keypair,
  account: web3.PublicKey,
  mint: web3.PublicKey,
  owner: web3.Keypair,
  amount: number,
  multiSigners?: web3.Signer[] | undefined,
  confirmOptions?: web3.ConfirmOptions | undefined,
  programId?: web3.PublicKey | undefined
) {
  const transactionSignature = await token.burn(
    connection,
    payer,
    account,
    mint,
    owner,
    amount,
    multiSigners,
    confirmOptions,
    programId
  );

  console.log(
    `Burn \x1b[32m${amount}\x1b[0m token basis points from Token Account \x1b[32m${account}\x1b[0m: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet \n`
  );
}

