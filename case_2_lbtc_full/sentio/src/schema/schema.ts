
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { String, Int, BigInt, Float, ID, Bytes, Timestamp, Boolean, Int8 } from '@sentio/sdk/store'
import { Entity, Required, One, Many, Column, ListColumn, AbstractEntity } from '@sentio/sdk/store'
import { BigDecimal } from '@sentio/bigdecimal'
import { DatabaseSchema } from '@sentio/sdk'







interface AccountSnapshotConstructorInput {
  id: String;
  timestampMilli: BigInt;
  lbtcBalance: BigDecimal;
}
@Entity("AccountSnapshot")
export class AccountSnapshot extends AbstractEntity  {

	@Required
	@Column("String")
	id: String

	@Required
	@Column("BigInt")
	timestampMilli: BigInt

	@Required
	@Column("BigDecimal")
	lbtcBalance: BigDecimal
  constructor(data: AccountSnapshotConstructorInput) {super()}
  
}


interface TransferConstructorInput {
  id: ID;
  from: String;
  to: String;
  value: BigInt;
  blockNumber: BigInt;
  transactionHash?: Bytes;
}
@Entity("Transfer")
export class Transfer extends AbstractEntity  {

	@Required
	@Column("ID")
	id: ID

	@Required
	@Column("String")
	from: String

	@Required
	@Column("String")
	to: String

	@Required
	@Column("BigInt")
	value: BigInt

	@Required
	@Column("BigInt")
	blockNumber: BigInt

	@Column("Bytes")
	transactionHash?: Bytes
  constructor(data: TransferConstructorInput) {super()}
  
}


const source = `type AccountSnapshot @entity {
  id: String!,
  timestampMilli: BigInt!
  lbtcBalance: BigDecimal!
}

type Transfer @entity {
  id: ID!
  from: String! @index
  to: String! @index
  value: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes
}`
DatabaseSchema.register({
  source,
  entities: {
    "AccountSnapshot": AccountSnapshot,
		"Transfer": Transfer
  }
})
