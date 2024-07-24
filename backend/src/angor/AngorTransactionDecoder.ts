import * as bitcoinJS from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as tinySecp256k1 from 'tiny-secp256k1';
import BIP32Factory from 'bip32';
import crypto from 'crypto';
import { bech32 } from 'bech32';

/**
 * Represents a Bitcoin network.
 * Supports Bitcoin and Bitcoin Testnet.
 */
export enum Networks {
  Testnet = 'testnet',
  Bitcoin = 'bitcoin',
}

/**
 * Represents a transaction related to the project at Angor platform (https://angor.io).
 */
export class AngorTransactionDecoder {
  private transaction: bitcoinJS.Transaction;
  private founderKeyHex: string;
  private founderKeyHash: string;
  private network: bitcoinJS.Network;
  private angorKeys = {
    [Networks.Testnet]:
      'tpubD8JfN1evVWPoJmLgVg6Usq2HEW9tLqm6CyECAADnH5tyQosrL6NuhpL9X1cQCbSmndVrgLSGGdbRqLfUbE6cRqUbrHtDJgSyQEY2Uu7WwTL',
    [Networks.Bitcoin]:
      'xpub661MyMwAqRbcGNxKe9aFkPisf3h32gHLJm8f9XAqx8FB1Nk6KngCY8hkhGqxFr2Gyb6yfUaQVbodxLoC1f3K5HU9LM1CXE59gkEXSGCCZ1B',
  };
  private angorKey: string;

  /**
   * Angor project identifier.
   */
  public projectId: string;
  /**
   * Angor project Nostr public key.
   */
  public nostrPubKey: string;

  /**
   * Constructs Angor transaction for the project creation.
   * @param transactionHex - hex of the raw transaction.
   * @param network - bitcoin network.
   */
  constructor(transactionHex: string, network: Networks) {
    this.transaction = bitcoinJS.Transaction.fromHex(transactionHex);

    this.validateTransaction();

    this.network = bitcoinJS.networks[network];
    this.angorKey = this.angorKeys[network];

    this.decompileOpReturnScript();
    this.founderKeyHex = this.getFounderKeyHex();
    this.founderKeyHash = this.getKeyHash();
    this.hashToInt();
    this.getProjectIdDerivation();
    this.projectId = this.getProjectId();
    this.nostrPubKey = this.getNostrPubKey();
  }

  /**
   * Validates transaction object.
   * @param transaction - an object representing bitcoin transaction.
   */
  private validateTransaction(transaction = this.transaction): void {
    // Throw an error if transaction object is not present.
    if (!transaction) {
      throw new Error(`Transaction object wasn't created.`);
    }

    // Throw an error if transaction inputs are not present.
    if (!transaction.ins) {
      throw new Error(`Transaction object doesn't have inputs.`);
    }
    // Throw an error if the amount of transaction inputs is less than 1.
    else if (transaction.ins.length < 1) {
      throw new Error(`Transaction object has invalid amount of inputs.`);
    }

    // Throw an error if transaction outputs are not present.
    if (!transaction.outs) {
      throw new Error(`Transaction object doesn't have outputs.`);
    }
    // Throw an error if the amount of transaction outputs is not equal to 3.
    else if (transaction.outs.length !== 3) {
      throw new Error(`Transaction object has invalid amount of outputs.`);
    }
  }

  /**
   * Decompiles (splits into chunks) OP_RETURN script.
   * @param transaction - an object representing bitcoin transaction.
   * @returns - an array of strings representing script chunks.
   */
  private decompileOpReturnScript(transaction = this.transaction): string[] {
    const script: Buffer = transaction.outs[1].script;

    // Decompiled is an array of Buffers.
    const decompiled = bitcoinJS.script.decompile(script);

    const errorBase = `Script decompilation failed.`;
    if (!decompiled) {
      throw new Error(errorBase);
    }

    // Converts decompiled OP_RETURN script into an ASM (Assembly) string
    // representation and splits this string into chunks.
    const chunks = bitcoinJS.script.toASM(decompiled).split(' ');

    // Throw an error if the chunks amount is incorrect.
    if (chunks.length !== 3) {
      throw new Error(`${errorBase} Wrong chunk amount.`);
    }

    // Throw an error if the first chunk is not OP_RETURN.
    if (chunks[0] !== 'OP_RETURN') {
      throw new Error(`${errorBase} Wrong first chunk.`);
    }

    // Throw an error if the byte length of the second chunk is not 33.
    if (Buffer.from(chunks[1], 'hex').byteLength !== 33) {
      throw new Error(`Script decompilation failed. Wrong second chunk.`);
    }

    // Throw an error if the byte length of the third chunk is not 32.
    if (Buffer.from(chunks[2], 'hex').byteLength !== 32) {
      throw new Error(`${errorBase} Wrong third chunk.`);
    }

    // Remove the first chunk (OP_RETURN) as it is not useful anymore.
    chunks.splice(0, 1);

    return chunks;
  }

  /**
   * Sets the founder key of the Angor project in Hex encoding.
   * @returns - string representing founder key in Hex encoding
   */
  private getFounderKeyHex(): string {
    const chunks = this.decompileOpReturnScript();
    const founderKeyBuffer = Buffer.from(chunks[0], 'hex');
    const founderECpair = ECPairFactory(tinySecp256k1).fromPublicKey(
      founderKeyBuffer,
      {
        network: this.network,
      }
    ); // SECP256k1 elliptic curve key pair
    const founderPublicKeyHex = founderECpair.publicKey.toString('hex');

    return founderPublicKeyHex;
  }

  /**
   * Sets the hash of the founder key.
   * @param key - founder key in Hex encoding.
   * @returns - string representing founder key hash.
   */
  private getKeyHash(key = this.founderKeyHex): string {
    if (!key) {
      throw new Error(`Key is not provided nor present.`);
    }

    // SHA-256 hash of the founder key.
    const firstHash = bitcoinJS.crypto.sha256(Buffer.from(key, 'hex'));
    // SHA-256 hash of the founder key hash.
    const secondHash = bitcoinJS.crypto.sha256(Buffer.from(firstHash));
    // ArrayBufferLike representation of the second hash buffer in reversed order.
    const secondHashArrayBuffer = new Uint8Array(secondHash).reverse().buffer;
    // Hash of the founder key in Hex encoding.
    const founderKeyHash = Buffer.from(secondHashArrayBuffer).toString('hex');

    return founderKeyHash;
  }

  /**
   * Casts hash to an integer.
   * @param hash - founder key hash in Hex encoding.
   * @returns - founder key hash casted to an integer.
   */
  private hashToInt(hash = this.founderKeyHash): number {
    if (!hash) {
      throw new Error(`Hash is not provided nor present.`);
    }

    const hashBuffer = Buffer.from(hash, 'hex');
    // Read an unsigned, big-endian 32-bit integer from the hash of the founder key
    // using 28 as an offset. The offset is used to match the result of
    // uint256.GetLow32() function in C#.
    const hashUint = hashBuffer.readUInt32BE(28);

    return hashUint;
  }

  /**
   * Provides project id derivation.
   * @returns an integer that is derived from integer representation of founder key hash.
   */
  private getProjectIdDerivation(): number {
    const founderKeyHashInt = this.hashToInt();
    // The max size of bip32 derivation range is 2,147,483,648 (2^31) the max number of uint is 4,294,967,295 so we must to divide by 2 and round it to the floor.
    const retention = Math.floor(founderKeyHashInt / 2);

    if (retention > Math.pow(2, 31)) {
      throw new Error(
        `Retention is too large. The max number is 2^31 (2,147,483,648).`
      );
    }

    return retention;
  }

  /**
   * Sets Angor project id.
   * @returns - string representing Angor project id.
   */
  private getProjectId(): string {
    const projectIdDerivation = this.getProjectIdDerivation();

    // BIP32 (Bitcoin Improvement Proposal 32) extended public key created
    // based on the angor key and the network.
    const extendedPublicKey = BIP32Factory(tinySecp256k1).fromBase58(
      this.angorKey,
      this.network
    );
    // Derived Angor public key.
    const angorPublicKey =
      extendedPublicKey.derive(projectIdDerivation).publicKey;

    // SHA-256 digest of the Angor public key in Hex encoding.
    const sha256Digest = crypto
      .createHash('sha256')
      // @ts-ignore: crypto issue casting Buffer ro crypto.BinaryLike type
      .update(angorPublicKey, 'hex')
      .digest('hex');
    // RIPEMD-160 digest in Hex encoding of the SHA-256 digest created
    // from the Angor public key.
    const ripemd160Digest = crypto
      .createHash('ripemd160')
      .update(sha256Digest, 'hex')
      .digest('hex');

    // Bech32 words representation of the RIPEMD-160 digest.
    const bech32Words = bech32.toWords(Buffer.from(ripemd160Digest, 'hex'));
    // Bech32 words represented as an array of unsigned 8-bit integers
    const words = new Uint8Array([0, ...bech32Words]);

    // Bech 32 encoded word using 'angor' prefix
    const projectID = bech32.encode('angor', words);

    return projectID;
  }

  /**
   * Sets Nostr public key.
   * @returns - string representing Nostr public key of Angor project.
   */
  private getNostrPubKey(): string {
    const chunks = this.decompileOpReturnScript();

    return chunks[1];
  }
}
