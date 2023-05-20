import * as web3 from "@solana/web3.js"
import * as fs from "fs"
import dotenv from "dotenv"
dotenv.config()

export async function initializeKeypair(
    connection: web3.Connection
): Promise<web3.Keypair> {
    if (!process.env.PRIVATE_KEY) {
        console.log("Creating .env file")
        const signer = web3.Keypair.generate()
        fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`)
        return signer
    }

    const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[]
    const secretKey = Uint8Array.from(secret)
    const keypairFromSecretKey = web3.Keypair.fromSecretKey(secretKey)
    return keypairFromSecretKey
}


export async function airdropSolIfNeeded(connection: web3.Connection, pubkey: web3.PublicKey, amount: number, threshold: number) {

    if (connection.rpcEndpoint.includes('dev') || connection.rpcEndpoint.includes('test')) {
        const balance = await connection.getBalance(pubkey)
        console.log('Current balance is', balance / web3.LAMPORTS_PER_SOL, ' SOL')
        if (balance < threshold * web3.LAMPORTS_PER_SOL) {
            console.log(`Airdropping ${amount} SOL...`)
            await connection.requestAirdrop(pubkey, amount * web3.LAMPORTS_PER_SOL )
            console.log(`\rAirdrop of ${amount} SOL was successful.`)
        }
    } 
    
    console.log(`Selected cluster: ${connection.rpcEndpoint}`)
    console.log('\n');

}