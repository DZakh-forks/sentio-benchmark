import {
  Transfer as TransferEvent,
  LBTC as LBTCContract,
} from "../generated/case_2_lbtc_full/LBTC"
import { Accounts, Snapshot, AccountRegistry, Transfer as TransferEntity } from "../generated/schema"
import { BigDecimal, BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts"

// Add timer variables
let rpcTime: BigInt = BigInt.fromI32(0)
let pointCalcTime: BigInt = BigInt.fromI32(0)
let storageTime: BigInt = BigInt.fromI32(0)

// Helper function to add time
function addTime(current: BigInt, delta: BigInt): BigInt {
  return current.plus(delta)
}

// Helper function to get current time as BigInt
function getCurrentTime(): BigInt {
  return BigInt.fromString((Date.now() / 1000).toString())
}

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
function addAccountToRegistry(accountId: string, block: ethereum.Block): void {
  const startTime = getCurrentTime()
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
  storageTime = addTime(storageTime, getCurrentTime().minus(startTime))
}

// Helper to get the last snapshot data for an account
function getLastSnapshotData(accountId: string, timestamp: BigInt, block: ethereum.Block): SnapshotData {
  let lastPoint = BigDecimal.fromString("0")
  let lastBalance = BigDecimal.fromString("0")
  let lastTimestamp = BigInt.fromI32(0)
  let lastMintAmount = BigDecimal.fromString("0")

  const startTime = getCurrentTime()
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
  storageTime = addTime(storageTime, getCurrentTime().minus(startTime))
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
  block: ethereum.Block,
  isMint: boolean = false,
  mintAmount: BigInt = BigInt.fromI32(0)
): void {
  // Skip processing for zero address
  if (accountId === "0x0000000000000000000000000000000000000000") {
    return;
  }
  const startAccountTime = getCurrentTime()
  let account = Accounts.load(accountId)
  storageTime = addTime(storageTime, getCurrentTime().minus(startAccountTime))
  if (!account) {
    account = new Accounts(accountId)
    account.lastSnapshotTimestamp = BigInt.fromI32(0)
    // Add to registry
    addAccountToRegistry(accountId, block)
    const startSaveTime = getCurrentTime()
    account.save()
    storageTime = addTime(storageTime, getCurrentTime().minus(startSaveTime))
  }
  
  let snapshot = new Snapshot(accountId + "-" + timestamp.toString())
  
  snapshot.account = account.id
  snapshot.timestamp = timestamp
  
  // Handle mint amount if it's a mint transaction
  if (isMint) {
    snapshot.mintAmount = lastMintAmount.plus(BigDecimal.fromString(mintAmount.toString()))
  } else {
    snapshot.mintAmount = lastMintAmount
  }
  
  snapshot.balance = balance
  
  // Calculate point based on previous values
  if (lastTimestamp != BigInt.fromI32(0)) {
    const calcStartTime = getCurrentTime()
    let pointValue = BigDecimal.fromString(lastPoint.toString())
      .plus(lastBalance
        .times(BigDecimal.fromString("1000").div(BigDecimal.fromString("24")).div(BigDecimal.fromString("60")).div(BigDecimal.fromString("60")))
        .times(BigDecimal.fromString(timestamp.minus(lastTimestamp).toString())))
    
    snapshot.point = pointValue
    pointCalcTime = addTime(pointCalcTime, getCurrentTime().minus(calcStartTime))
  } else {
    snapshot.point = BigDecimal.fromString("0")
  }
  const startSaveTime = getCurrentTime()
  snapshot.save()
  
  // Update account's last snapshot timestamp
  account.lastSnapshotTimestamp = timestamp
  account.save()
  storageTime = addTime(storageTime, getCurrentTime().minus(startSaveTime))
}

export function handleTransfer(event: TransferEvent): void {
  let lbtc = LBTCContract.bind(event.address)
  
  // Create and save Transfer entity
  let transfer = new TransferEntity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.blockTimestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash
  const startTime = getCurrentTime()
  transfer.save()
  storageTime = addTime(storageTime, getCurrentTime().minus(startTime))
  
  // Handle "to" account
  let toLastData = getLastSnapshotData(event.params.to.toHexString(), event.block.timestamp, event.block)
  
  // Create snapshot for the "to" account
  const rpcStartTime = getCurrentTime()
  let toBalance = BigDecimal.fromString(lbtc.balanceOf(event.params.to).toString())
  rpcTime = addTime(rpcTime, getCurrentTime().minus(rpcStartTime))
  
  // Check if this is a mint (from address is zero)
  let isMint = event.params.from == Address.fromString("0x0000000000000000000000000000000000000000")
  
  if (event.params.to.toHexString()!="0x0000000000000000000000000000000000000000") {
    createAndSaveSnapshot(
      event.params.to.toHexString(),
      event.block.timestamp,
      toBalance,
      toLastData.point,
      toLastData.balance,
      toLastData.timestamp,
      toLastData.mintAmount,
      event.block,
      isMint,
      event.params.value
    )
  }
  
  // Handle "from" account (skip if it's a mint)
  if (!isMint) {
    let fromLastData = getLastSnapshotData(event.params.from.toHexString(), event.block.timestamp, event.block)
    
    // Create snapshot for the "from" account
    const rpcStartTime2 = getCurrentTime()
    let fromBalance = BigDecimal.fromString(lbtc.balanceOf(event.params.from).toString())
    rpcTime = addTime(rpcTime, getCurrentTime().minus(rpcStartTime2))
    
    createAndSaveSnapshot(
      event.params.from.toHexString(),
      event.block.timestamp,
      fromBalance,
      fromLastData.point,
      fromLastData.balance,
      fromLastData.timestamp,
      fromLastData.mintAmount,
      event.block
    )
  }
}

export function handleBlock(block: ethereum.Block): void {
  // Create contract instance
  let lbtc = LBTCContract.bind(Address.fromString("0x8236a87084f8B84306f72007F36F2618A5634494"))
  
  // Get all accounts from registry
  const startRegistryTime = getCurrentTime()
  let registry = AccountRegistry.load("main")
  storageTime = addTime(storageTime, getCurrentTime().minus(startRegistryTime))
  
  if (registry) {
    let accountIds = registry.accounts
    
    for (let i = 0; i < accountIds.length; i++) {
      const startAccountTime = getCurrentTime()
      let account = Accounts.load(accountIds[i])
      storageTime = addTime(storageTime, getCurrentTime().minus(startAccountTime))
      
      if (account) {
        // Get last snapshot data
        let lastData = getLastSnapshotData(account.id, block.timestamp, block)
        
        // Only create new snapshot if we have a previous one
        if (lastData.timestamp != BigInt.fromI32(0)) {
          // Create and save new snapshot
          createAndSaveSnapshot(
            account.id,
            block.timestamp,
            lastData.balance,
            lastData.point,
            lastData.balance,
            lastData.timestamp,
            lastData.mintAmount,
            block
          )
        }
      }
    }
  }
  
  log.info("Block {} - RPC: {}s, Point calc: {}s, Storage: {}s", [
    block.number.toString(),
    rpcTime.toString(),
    pointCalcTime.toString(),
    storageTime.toString()
  ])
}