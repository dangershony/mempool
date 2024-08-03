import DB from '../database';
import logger from '../logger';
import { AngorTransactionStatus } from '../angor/AngorTransactionDecoder';

/**
 * Angor project repository.
 */
class AngorProjectRepository {
  /**
   * Stores Angor project into the DB.
   * @param id - project Id.
   * @param npub - project Nostr public key.
   * @param addressOnFeeOutput - address on fee output.
   * @param transactionStatus - transaction status.
   */
  public async $setProject(
    id: string,
    npub: string,
    addressOnFeeOutput: string,
    transactionStatus: AngorTransactionStatus
  ): Promise<void> {
    try {
      const query = `INSERT INTO angor_projects
          (
            id,
            npub,
            address_on_fee_output,
            creation_transaction_status
          )
          VALUES ('${id}', '${npub}', '${addressOnFeeOutput}', '${transactionStatus}')
          ON DUPLICATE KEY UPDATE
            creation_transaction_status = '${transactionStatus}'
        `;

      await DB.query(query);
    } catch (e: any) {
      logger.err(
        `Cannot save Angor project into db. Reason: ` +
          (e instanceof Error ? e.message : e)
      );

      throw e;
    }
  }

  /**
   * Fetches Angor project by address on fee output.
   * @param addressOnFeeOutput - address on fee output
   * @returns - promise that resolves into Angor project.
   */
  public async $getProject(addressOnFeeOutput: string): Promise<any> {
    try {
      const query = `SELECT * FROM angor_projects
          WHERE address_on_fee_output = '${addressOnFeeOutput}'
        `;

      // TODO: define row type
      const [rows] = await DB.query(query);

      return rows;
    } catch (e: any) {
      logger.err(
        `Cannot save Angor project into db. Reason: ` +
          (e instanceof Error ? e.message : e)
      );

      throw e;
    }
  }
}

export default new AngorProjectRepository();
