import {
  Transfer as TransferEvent,
  LBTC as LBTCContract,
  Transfer
} from "../generated/LBTC/LBTC"
import { Accounts, Snapshot, AccountRegistry } from "../generated/schema"
import { BigDecimal, BigInt, Address, ethereum } from "@graphprotocol/graph-ts"

// Define a class for snapshot data
class SnapshotData {
  point: BigDecimal
  balance: BigDecimal
  timestamp: BigInt
  mintAmount: BigDecimal

  constructor(
    point: BigDecimal,
    balance: BigDecimal,
    timestamp: BigInt,
    mintAmount: BigDecimal
  ) {
    this.point = point
    this.balance = balance
    this.timestamp = timestamp
    this.mintAmount = mintAmount
  }
}

// Helper function to add account to registry
function addAccountToRegistry(accountId: string): void {
  let registry = AccountRegistry.load("main")
  if (!registry) {
    registry = new AccountRegistry("main")
    registry.accounts = []
  }
  
  let accounts = registry.accounts
  let accountExists = false
  
  // Check if account already exists in registry
  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i] == accountId) {
      accountExists = true
      break
    }
  }
  
  // Add account if it doesn't exist
  if (!accountExists) {
    accounts.push(accountId)
    registry.accounts = accounts
    registry.save()
  }
}

// Helper to get or create an account
function getOrCreateAccount(address: Address): Accounts {
  let accountId = address.toHexString()
  let account = Accounts.load(accountId)
  
  if (!account) {
    account = new Accounts(accountId)
    // Add to registry
    addAccountToRegistry(account.id)
  }
  
  return account as Accounts
}

// Helper to get the last snapshot data for an account
function getLastSnapshotData(accountId: string, timestamp: BigInt): SnapshotData {
  let lastPoint = BigDecimal.fromString("0")
  let lastBalance = BigDecimal.fromString("0")
  let lastTimestamp = BigInt.fromI32(0)
  let lastMintAmount = BigDecimal.fromString("0")
  
  let account = Accounts.load(accountId)
  if (account && account.lastSnapshotTimestamp) {
    lastTimestamp = account.lastSnapshotTimestamp
    
    // If we have a previous snapshot, load it
    if (lastTimestamp != BigInt.fromI32(0)) {
      let lastSnapshot = Snapshot.load(accountId + "-" + lastTimestamp.toString())
      if (lastSnapshot) {
        // AssemblyScript-safe approach for properties that might be null
        if (lastSnapshot.point) {
          lastPoint = lastSnapshot.point!
        }
        
        // For BigDecimal properties, no need for non-null assertion
        if (lastSnapshot.balance) {
          lastBalance = lastSnapshot.balance
        }
        
        if (lastSnapshot.mintAmount) {
          lastMintAmount = lastSnapshot.mintAmount!
        }
      }
    }
  }
  
  return new SnapshotData(
    lastPoint,
    lastBalance,
    lastTimestamp,
    lastMintAmount
  )
}

// Helper to create and save a new snapshot
function createAndSaveSnapshot(
  accountId: string, 
  timestamp: BigInt, 
  balance: BigDecimal, 
  lastPoint: BigDecimal, 
  lastBalance: BigDecimal, 
  lastTimestamp: BigInt,
  lastMintAmount: BigDecimal,
  isMint: boolean = false,
  mintAmount: BigInt = BigInt.fromI32(0)
): void {
  // Skip processing for zero address
  if (accountId === "0x0000000000000000000000000000000000000000") {
    return;
  }
  let account = Accounts.load(accountId)
  if (!account) {
    account = new Accounts(accountId)
    account.lastSnapshotTimestamp = BigInt.fromI32(0)
    // Add to registry
    addAccountToRegistry(accountId)
  }
  
  let snapshot = new Snapshot(accountId + "-" + timestamp.toString())
  
  snapshot.account = account.id
  snapshot.timestampMilli = timestamp
  
  // Handle mint amount if it's a mint transaction
  if (isMint) {
    snapshot.mintAmount = lastMintAmount.plus(BigDecimal.fromString(mintAmount.toString()))
  } else {
    snapshot.mintAmount = lastMintAmount
  }
  
  snapshot.balance = balance
  
  // Calculate point based on previous values
  // For receiving (to) accounts
  if (lastTimestamp != BigInt.fromI32(0)) {
    let pointValue = BigDecimal.fromString(lastPoint.toString())
      .plus(lastBalance
        .times(BigDecimal.fromString("1000").div(BigDecimal.fromString("24")).div(BigDecimal.fromString("60")).div(BigDecimal.fromString("60")))
        .times(BigDecimal.fromString(timestamp.minus(lastTimestamp).toString()).div(BigDecimal.fromString("1000"))))
    
    snapshot.point = pointValue
  } else {
    snapshot.point = BigDecimal.fromString("0")
  }
  
  snapshot.save()
  
  // Update account's last snapshot timestamp
  account.lastSnapshotTimestamp = timestamp
  account.save()
}

export function handleTransfer(event: TransferEvent): void {
  let lbtc = LBTCContract.bind(event.address)
  
  // Handle "to" account
  let toAccount = getOrCreateAccount(event.params.to)
  let toLastData = getLastSnapshotData(toAccount.id, event.block.timestamp)
  
  // Create snapshot for the "to" account
  let toBalance = BigDecimal.fromString(lbtc.balanceOf(event.params.to).toString())
  
  // Check if this is a mint (from address is zero)
  let isMint = event.params.from == Address.fromString("0x0000000000000000000000000000000000000000")
  
  createAndSaveSnapshot(
    toAccount.id,
    event.block.timestamp,
    toBalance,
    toLastData.point,
    toLastData.balance,
    toLastData.timestamp,
    toLastData.mintAmount,
    isMint,
    event.params.value
  )
  
  // Handle "from" account (skip if it's a mint)
  if (!isMint) {
    let fromAccount = getOrCreateAccount(event.params.from)
    let fromLastData = getLastSnapshotData(fromAccount.id, event.block.timestamp)
    
    // Create snapshot for the "from" account
    let fromBalance = BigDecimal.fromString(lbtc.balanceOf(event.params.from).toString())
    
    createAndSaveSnapshot(
      fromAccount.id,
      event.block.timestamp,
      fromBalance,
      fromLastData.point,
      fromLastData.balance,
      fromLastData.timestamp,
      fromLastData.mintAmount
    )
  }
}

export function handleBlock(block: ethereum.Block): void {
  // Create contract instance
  let lbtc = LBTCContract.bind(Address.fromString("0x8236a87084f8B84306f72007F36F2618A5634494"))
  
  // Get all accounts from registry
  let registry = AccountRegistry.load("main")
  if (registry) {
    let accountIds = registry.accounts
    
    for (let i = 0; i < accountIds.length; i++) {
      let account = Accounts.load(accountIds[i])
      if (account) {
        // Get last snapshot data
        let lastData = getLastSnapshotData(account.id, block.timestamp)
        
        // Only create new snapshot if we have a previous one
        if (lastData.timestamp != BigInt.fromI32(0)) {
          // Get current balance
          let balance = BigDecimal.fromString(lbtc.balanceOf(Address.fromString(account.id)).toString())
          
          // Create and save new snapshot
          createAndSaveSnapshot(
            account.id,
            block.timestamp,
            balance,
            lastData.point,
            lastData.balance,
            lastData.timestamp,
            lastData.mintAmount
          )
        }
      }
    }
  }
}