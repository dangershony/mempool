import { AngorTransactionDecoder, Networks } from '../AngorTransactionDecoder';
import * as bitcoinJS from 'bitcoinjs-lib';

const expectedData = [
  {
    transactionHex:
      '0100000000010138de40ff6a3d27c33d5b84edf8f35911d819c9c547689cc4da6c5603bc3b26990000000000ffffffff0310270000000000001600144282ccfe323dbba535ccdfc8b66aeeb0bd7dd95b0000000000000000446a210352eb18befb145fef4b5c24513608183d7c3d8004d5fcad9e0e6dc2e89a0af6ae20c749d81fc42037e5b9f7b32ae266cbce75019ce6771be6877d3c509e97e39c14669b052a0100000016001431e5c2bdb361b68eb243ec7dbd46bd7cf71a1d86024730440220075dd33e3809a58423257bf23f5632e305387c283f48dfdce7f355787be33d8002201072fa636fb6bad35ac9d7f8e35fb41eea47de8b38346dc4f123260e9c74c3b401210385143acd30d6d05a5bf35ef1028ce4c50eadffa14670716976007fec5ed3e58500000000',
    founderKeyHex:
      '0352eb18befb145fef4b5c24513608183d7c3d8004d5fcad9e0e6dc2e89a0af6ae',
    founderKeyHashHex:
      'cacedcee9bc28a37b36718ea210fcf7caac182cdb66cc17fafb6027478a221c8',
    founderKeyHashInt: 2023891400,
    projectIdDeriviation: 1011945700,
    projectId: 'angor1qg2pvel3j8ka62dwvmlytv6hwkz7hmk2mms7qll',
    nPub: 'c749d81fc42037e5b9f7b32ae266cbce75019ce6771be6877d3c509e97e39c14',
  },
  {
    transactionHex:
      '01000000000101eebb224f701b3c3cbb86f5d6f181f554e3af5d77d35a117e8060e9d510e8b5f00200000000ffffffff031027000000000000160014d6f8395049504e6088553a1fb7b461fd692cd2230000000000000000446a21039ef6f86a1117ce09239bceae662750c5dc5f7262cb9badc97f97a205092f9067204bb166eff7f60bbf2e420be7f10782c092f7c863262782722c85cb2c8875fa7e64a4191e0100000016001408c9d765966ced3c9e0c3080ec122c587b833e3f02483045022100eea5dfb26baffbb0c15a2d3d75f519992fce393247fad0a0377bda2de39df37602201265af21218804f39cd762943f01ac9c5b0005787cf7769c3a1380c30711f15501210339b96ebaa411f0c8f54c59881ffd75c73753f9a9e6890b925c1bdd029016885700000000',
    founderKeyHex:
      '039ef6f86a1117ce09239bceae662750c5dc5f7262cb9badc97f97a205092f9067',
    founderKeyHashHex:
      '4952a8807df68e71fac242ba4ffb0c0134f53f0806a634c661014622a02f541c',
    founderKeyHashInt: 2687456284,
    projectIdDeriviation: 1343728142,
    projectId: 'angor1q6murj5zf2p8xpzz48g0m0drpl45je53rlvn6sl',
    nPub: '4bb166eff7f60bbf2e420be7f10782c092f7c863262782722c85cb2c8875fa7e',
  },
];

describe('AngorTransactionDecoder', () => {
  expectedData.forEach((data) => {
    const angorTransaction = new AngorTransactionDecoder(
      data.transactionHex,
      Networks.Testnet
    );

    describe('constructor', () => {
      it('should create transaction object from transaction hex', () => {
        expect(
          angorTransaction['transaction'].ins.length
        ).toBeGreaterThanOrEqual(1);
        expect(angorTransaction['transaction'].outs.length).toEqual(3);
      });
    });

    describe('validateTransaction', () => {
      it('should throw an error if transaction object was not created', () => {
        expect(() =>
          angorTransaction['validateTransaction'](null as any)
        ).toThrow(new Error(`Transaction object wasn't created.`));
      });

      it('should throw an error if inputs are not present in transaction object', () => {
        const invalidTransaction = JSON.parse(
          JSON.stringify(angorTransaction['transaction'])
        );

        delete invalidTransaction.ins;

        expect(() =>
          angorTransaction['validateTransaction'](invalidTransaction)
        ).toThrow(new Error(`Transaction object doesn't have inputs.`));
      });

      it('should throw an error if inputs array is empty', () => {
        const invalidTransaction = JSON.parse(
          JSON.stringify(angorTransaction['transaction'])
        );

        invalidTransaction.ins = [];

        expect(() =>
          angorTransaction['validateTransaction'](invalidTransaction)
        ).toThrow(
          new Error(`Transaction object has invalid amount of inputs.`)
        );
      });

      it('should throw an error if outputs are not present in transaction object', () => {
        const invalidTransaction = JSON.parse(
          JSON.stringify(angorTransaction['transaction'])
        );

        delete invalidTransaction.outs;

        expect(() =>
          angorTransaction['validateTransaction'](invalidTransaction)
        ).toThrow(new Error(`Transaction object doesn't have outputs.`));
      });

      it('should throw an error if inputs array is empty', () => {
        const invalidTransaction = JSON.parse(
          JSON.stringify(angorTransaction['transaction'])
        );

        invalidTransaction.outs.pop();

        expect(() =>
          angorTransaction['validateTransaction'](invalidTransaction)
        ).toThrow(
          new Error(`Transaction object has invalid amount of outputs.`)
        );
      });
    });

    describe('decompileOpReturnScript', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return 2 chunks', () => {
        const chunks = angorTransaction['decompileOpReturnScript']();

        expect(chunks.length).toEqual(2);

        chunks.forEach((chunk) => expect(typeof chunk).toEqual('string'));
      });

      it('should throw an error if script decompilation failed', () => {
        jest
          .spyOn(bitcoinJS.script, 'decompile')
          .mockImplementation(() => null);

        expect(() => angorTransaction['decompileOpReturnScript']()).toThrow(
          new Error(`Script decompilation failed.`)
        );
      });

      it('should throw an error if decompiled chunks length is not equal to 3', () => {
        jest
          .spyOn(bitcoinJS.script, 'toASM')
          .mockImplementation(() => 'OP_RETURN something');

        expect(() => angorTransaction['decompileOpReturnScript']()).toThrow(
          new Error(`Script decompilation failed. Wrong chunk amount.`)
        );
      });

      it('should throw an error if the first decompiled chunk is not equal to OP_RETURN', () => {
        jest
          .spyOn(bitcoinJS.script, 'toASM')
          .mockImplementation(() => 'OP_WRONG something something');

        expect(() => angorTransaction['decompileOpReturnScript']()).toThrow(
          new Error(`Script decompilation failed. Wrong first chunk.`)
        );
      });

      it('should throw an error if the second decompiled chunk has wrong byte length', () => {
        jest
          .spyOn(bitcoinJS.script, 'toASM')
          .mockImplementation(() => 'OP_RETURN something something');

        expect(() => angorTransaction['decompileOpReturnScript']()).toThrow(
          new Error(`Script decompilation failed. Wrong second chunk.`)
        );
      });

      it('should throw an error if the third decompiled chunk has wrong byte length', () => {
        jest
          .spyOn(bitcoinJS.script, 'toASM')
          .mockImplementation(
            () => `OP_RETURN ${data.founderKeyHex} something`
          );

        expect(() => angorTransaction['decompileOpReturnScript']()).toThrow(
          new Error(`Script decompilation failed. Wrong third chunk.`)
        );
      });
    });

    describe('getFounderKey', () => {
      it('should return founder key in hex encoding', () => {
        expect(angorTransaction['founderKeyHex']).toEqual(data.founderKeyHex);
      });
    });

    describe('getKeyHash', () => {
      it('should return founder key hash in hex encoding', () => {
        expect((angorTransaction as any).founderKeyHash).toEqual(
          data.founderKeyHashHex
        );
      });

      it('should throw an error if the key is not provided', () => {
        expect(() => angorTransaction['getKeyHash'](null as any)).toThrow(
          new Error(`Key is not provided nor present.`)
        );
      });
    });

    describe('hashToInt', () => {
      it('should return integer representation of founder key hash', () => {
        expect(angorTransaction['hashToInt']()).toEqual(data.founderKeyHashInt);
      });

      it('should throw an error if the hash is not provided', () => {
        expect(() => angorTransaction['hashToInt'](null as any)).toThrow(
          new Error(`Hash is not provided nor present.`)
        );
      });
    });

    describe('getProjectIdDerivation', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return project id dereviation', () => {
        expect(angorTransaction['getProjectIdDerivation']()).toEqual(
          data.projectIdDeriviation
        );
      });

      it('should throw an error if the retention is greater than 2 in power of 31', () => {
        jest
          .spyOn(angorTransaction as any, 'hashToInt')
          .mockImplementation(() => Math.pow(2, 31) * 2 + 2);

        expect(() => angorTransaction['getProjectIdDerivation']()).toThrow(
          new Error(
            `Retention is too large. The max number is 2^31 (2,147,483,648).`
          )
        );
      });
    });

    describe('setProjectId', () => {
      it('should return project id', () => {
        expect(angorTransaction.projectId).toEqual(data.projectId);
      });
    });

    describe('setNostrPubKey', () => {
      it('should return Nostr public key', () => {
        expect(angorTransaction.nostrPubKey).toEqual(data.nPub);
      });
    });
  });
});
