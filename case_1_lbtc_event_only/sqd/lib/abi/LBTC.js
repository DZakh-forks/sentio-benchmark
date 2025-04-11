"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = exports.functions = exports.events = void 0;
const p = __importStar(require("@subsquid/evm-codec"));
const evm_abi_1 = require("@subsquid/evm-abi");
exports.events = {
    Approval: (0, evm_abi_1.event)("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "Approval(address,address,uint256)", { "owner": (0, evm_abi_1.indexed)(p.address), "spender": (0, evm_abi_1.indexed)(p.address), "value": p.uint256 }),
    BasculeChanged: (0, evm_abi_1.event)("0xa0317ebf02283589c190260fcd549e3a6de71bef31204aeb5417c07fb65c0894", "BasculeChanged(address,address)", { "prevVal": (0, evm_abi_1.indexed)(p.address), "newVal": (0, evm_abi_1.indexed)(p.address) }),
    BatchMintSkipped: (0, evm_abi_1.event)("0x199445030f34ba18eca81d4647be9cf6943287dd1a58d150f9cf093111240bff", "BatchMintSkipped(bytes32,bytes)", { "payloadHash": (0, evm_abi_1.indexed)(p.bytes32), "payload": p.bytes }),
    BridgeChanged: (0, evm_abi_1.event)("0xd565484d693f5157abcceb853139678038bc740991b0a4dc3baa2426325bb3c0", "BridgeChanged(address,address)", { "prevVal": (0, evm_abi_1.indexed)(p.address), "newVal": (0, evm_abi_1.indexed)(p.address) }),
    BurnCommissionChanged: (0, evm_abi_1.event)("0x2e7c1540076270015f38f524150bcb5d6ba9db14aca34c2e6d32e6ffad37941a", "BurnCommissionChanged(uint64,uint64)", { "prevValue": (0, evm_abi_1.indexed)(p.uint64), "newValue": (0, evm_abi_1.indexed)(p.uint64) }),
    ClaimerUpdated: (0, evm_abi_1.event)("0x0d4de5cd7f05b154b7f42e4f1dd68f5c27ea0edaf9bd084309201cfa52e85926", "ClaimerUpdated(address,bool)", { "claimer": (0, evm_abi_1.indexed)(p.address), "isClaimer": p.bool }),
    ConsortiumChanged: (0, evm_abi_1.event)("0x146dd8feba84cdc776f012478adc764591d6c0c9570adbc49ff09c648282a0a0", "ConsortiumChanged(address,address)", { "prevVal": (0, evm_abi_1.indexed)(p.address), "newVal": (0, evm_abi_1.indexed)(p.address) }),
    DustFeeRateChanged: (0, evm_abi_1.event)("0x78739e78c1e8bc1416322baf73f3397a683d656e9425f621050e243dc73ea03d", "DustFeeRateChanged(uint256,uint256)", { "oldRate": (0, evm_abi_1.indexed)(p.uint256), "newRate": (0, evm_abi_1.indexed)(p.uint256) }),
    EIP712DomainChanged: (0, evm_abi_1.event)("0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31", "EIP712DomainChanged()", {}),
    FeeChanged: (0, evm_abi_1.event)("0x5fc463da23c1b063e66f9e352006a7fbe8db7223c455dc429e881a2dfe2f94f1", "FeeChanged(uint256,uint256)", { "oldFee": (0, evm_abi_1.indexed)(p.uint256), "newFee": (0, evm_abi_1.indexed)(p.uint256) }),
    FeeCharged: (0, evm_abi_1.event)("0xcd0d4a9ad4b364951764307d0ae7b0d2ea482965b258e2e2452ef396c53b20f0", "FeeCharged(uint256,bytes)", { "fee": (0, evm_abi_1.indexed)(p.uint256), "userSignature": p.bytes }),
    Initialized: (0, evm_abi_1.event)("0xc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d2", "Initialized(uint64)", { "version": p.uint64 }),
    MintProofConsumed: (0, evm_abi_1.event)("0x91f5c148b0f5ac9ddafe7030867f0d968adec49652c7ea760cf51fa233424b14", "MintProofConsumed(address,bytes32,bytes)", { "recipient": (0, evm_abi_1.indexed)(p.address), "payloadHash": (0, evm_abi_1.indexed)(p.bytes32), "payload": p.bytes }),
    MinterUpdated: (0, evm_abi_1.event)("0xb21afb9ce9be0a676f8f317ff0ca072fb89a4f8ce2d1b6fe80f8755c14f1cb19", "MinterUpdated(address,bool)", { "minter": (0, evm_abi_1.indexed)(p.address), "isMinter": p.bool }),
    NameAndSymbolChanged: (0, evm_abi_1.event)("0x4d807d72b2a493ff2c4e338967d3f82d3352481258457d12a4506a1762a44c69", "NameAndSymbolChanged(string,string)", { "name": p.string, "symbol": p.string }),
    OperatorRoleTransferred: (0, evm_abi_1.event)("0xd90d696290df8da2e089fb9f5467201dc45d6fa26d4d8e7c8a239b745f510c6c", "OperatorRoleTransferred(address,address)", { "previousOperator": (0, evm_abi_1.indexed)(p.address), "newOperator": (0, evm_abi_1.indexed)(p.address) }),
    OwnershipTransferStarted: (0, evm_abi_1.event)("0x38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e22700", "OwnershipTransferStarted(address,address)", { "previousOwner": (0, evm_abi_1.indexed)(p.address), "newOwner": (0, evm_abi_1.indexed)(p.address) }),
    OwnershipTransferred: (0, evm_abi_1.event)("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", { "previousOwner": (0, evm_abi_1.indexed)(p.address), "newOwner": (0, evm_abi_1.indexed)(p.address) }),
    Paused: (0, evm_abi_1.event)("0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258", "Paused(address)", { "account": p.address }),
    PauserRoleTransferred: (0, evm_abi_1.event)("0xfb34c91b8734ef26ee8085a0fa11d2692042c6edac57dc40d8850cad2f1bc3ef", "PauserRoleTransferred(address,address)", { "previousPauser": (0, evm_abi_1.indexed)(p.address), "newPauser": (0, evm_abi_1.indexed)(p.address) }),
    Transfer: (0, evm_abi_1.event)("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "Transfer(address,address,uint256)", { "from": (0, evm_abi_1.indexed)(p.address), "to": (0, evm_abi_1.indexed)(p.address), "value": p.uint256 }),
    TreasuryAddressChanged: (0, evm_abi_1.event)("0x4fc6e7a37aea21888550b60360992adb6a9b3b4da644d63e9f3a420c2d86e282", "TreasuryAddressChanged(address,address)", { "prevValue": (0, evm_abi_1.indexed)(p.address), "newValue": (0, evm_abi_1.indexed)(p.address) }),
    Unpaused: (0, evm_abi_1.event)("0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa", "Unpaused(address)", { "account": p.address }),
    UnstakeRequest: (0, evm_abi_1.event)("0x48396c786750ed570cc1b02085ad1b3c1ffb59fd39686c23a263c1e0d974af1b", "UnstakeRequest(address,bytes,uint256)", { "fromAddress": (0, evm_abi_1.indexed)(p.address), "scriptPubKey": p.bytes, "amount": p.uint256 }),
    WithdrawalsEnabled: (0, evm_abi_1.event)("0x45e7e6146471a396eb58b618e88efd46f5c95bd1815b282ed75c5220a559ab10", "WithdrawalsEnabled(bool)", { "_0": p.bool }),
};
exports.functions = {
    Bascule: (0, evm_abi_1.viewFun)("0xd6a02b6a", "Bascule()", {}, p.address),
    DOMAIN_SEPARATOR: (0, evm_abi_1.viewFun)("0x3644e515", "DOMAIN_SEPARATOR()", {}, p.bytes32),
    acceptOwnership: (0, evm_abi_1.fun)("0x79ba5097", "acceptOwnership()", {}),
    addClaimer: (0, evm_abi_1.fun)("0x2ea66401", "addClaimer(address)", { "newClaimer": p.address }),
    addMinter: (0, evm_abi_1.fun)("0x983b2d56", "addMinter(address)", { "newMinter": p.address }),
    allowance: (0, evm_abi_1.viewFun)("0xdd62ed3e", "allowance(address,address)", { "owner": p.address, "spender": p.address }, p.uint256),
    approve: (0, evm_abi_1.fun)("0x095ea7b3", "approve(address,uint256)", { "spender": p.address, "value": p.uint256 }, p.bool),
    balanceOf: (0, evm_abi_1.viewFun)("0x70a08231", "balanceOf(address)", { "account": p.address }, p.uint256),
    'batchMint(address[],uint256[])': (0, evm_abi_1.fun)("0x68573107", "batchMint(address[],uint256[])", { "to": p.array(p.address), "amount": p.array(p.uint256) }),
    'batchMint(bytes[],bytes[])': (0, evm_abi_1.fun)("0x9b914470", "batchMint(bytes[],bytes[])", { "payload": p.array(p.bytes), "proof": p.array(p.bytes) }),
    batchMintWithFee: (0, evm_abi_1.fun)("0x59aae4ba", "batchMintWithFee(bytes[],bytes[],bytes[],bytes[])", { "mintPayload": p.array(p.bytes), "proof": p.array(p.bytes), "feePayload": p.array(p.bytes), "userSignature": p.array(p.bytes) }),
    'burn(uint256)': (0, evm_abi_1.fun)("0x42966c68", "burn(uint256)", { "amount": p.uint256 }),
    'burn(address,uint256)': (0, evm_abi_1.fun)("0x9dc29fac", "burn(address,uint256)", { "from": p.address, "amount": p.uint256 }),
    calcUnstakeRequestAmount: (0, evm_abi_1.viewFun)("0x80e787df", "calcUnstakeRequestAmount(bytes,uint256)", { "scriptPubkey": p.bytes, "amount": p.uint256 }, { "amountAfterFee": p.uint256, "isAboveDust": p.bool }),
    changeBascule: (0, evm_abi_1.fun)("0x7f56945e", "changeBascule(address)", { "newVal": p.address }),
    changeBurnCommission: (0, evm_abi_1.fun)("0xe3248f9a", "changeBurnCommission(uint64)", { "newValue": p.uint64 }),
    changeConsortium: (0, evm_abi_1.fun)("0x56712139", "changeConsortium(address)", { "newVal": p.address }),
    changeDustFeeRate: (0, evm_abi_1.fun)("0x01d40387", "changeDustFeeRate(uint256)", { "newRate": p.uint256 }),
    changeNameAndSymbol: (0, evm_abi_1.fun)("0x089bb99a", "changeNameAndSymbol(string,string)", { "name_": p.string, "symbol_": p.string }),
    changeTreasuryAddress: (0, evm_abi_1.fun)("0xa6f353f0", "changeTreasuryAddress(address)", { "newValue": p.address }),
    consortium: (0, evm_abi_1.viewFun)("0x9ad18765", "consortium()", {}, p.address),
    decimals: (0, evm_abi_1.viewFun)("0x313ce567", "decimals()", {}, p.uint8),
    eip712Domain: (0, evm_abi_1.viewFun)("0x84b0196e", "eip712Domain()", {}, { "fields": p.bytes1, "name": p.string, "version": p.string, "chainId": p.uint256, "verifyingContract": p.address, "salt": p.bytes32, "extensions": p.array(p.uint256) }),
    getBurnCommission: (0, evm_abi_1.viewFun)("0xf216acfb", "getBurnCommission()", {}, p.uint64),
    getDustFeeRate: (0, evm_abi_1.viewFun)("0x1721c6bc", "getDustFeeRate()", {}, p.uint256),
    getMintFee: (0, evm_abi_1.viewFun)("0x7a5caab3", "getMintFee()", {}, p.uint256),
    getTreasury: (0, evm_abi_1.viewFun)("0x3b19e84a", "getTreasury()", {}, p.address),
    initialize: (0, evm_abi_1.fun)("0x6294c311", "initialize(address,uint64,address,address)", { "consortium_": p.address, "burnCommission_": p.uint64, "treasury": p.address, "owner_": p.address }),
    isClaimer: (0, evm_abi_1.viewFun)("0x10a8aecd", "isClaimer(address)", { "claimer": p.address }, p.bool),
    isMinter: (0, evm_abi_1.viewFun)("0xaa271e1a", "isMinter(address)", { "minter": p.address }, p.bool),
    'mint(address,uint256)': (0, evm_abi_1.fun)("0x40c10f19", "mint(address,uint256)", { "to": p.address, "amount": p.uint256 }),
    'mint(bytes,bytes)': (0, evm_abi_1.fun)("0x6bc63893", "mint(bytes,bytes)", { "payload": p.bytes, "proof": p.bytes }),
    mintWithFee: (0, evm_abi_1.fun)("0x06689495", "mintWithFee(bytes,bytes,bytes,bytes)", { "mintPayload": p.bytes, "proof": p.bytes, "feePayload": p.bytes, "userSignature": p.bytes }),
    name: (0, evm_abi_1.viewFun)("0x06fdde03", "name()", {}, p.string),
    nonces: (0, evm_abi_1.viewFun)("0x7ecebe00", "nonces(address)", { "owner": p.address }, p.uint256),
    operator: (0, evm_abi_1.viewFun)("0x570ca735", "operator()", {}, p.address),
    owner: (0, evm_abi_1.viewFun)("0x8da5cb5b", "owner()", {}, p.address),
    pause: (0, evm_abi_1.fun)("0x8456cb59", "pause()", {}),
    paused: (0, evm_abi_1.viewFun)("0x5c975abb", "paused()", {}, p.bool),
    pauser: (0, evm_abi_1.viewFun)("0x9fd0506d", "pauser()", {}, p.address),
    pendingOwner: (0, evm_abi_1.viewFun)("0xe30c3978", "pendingOwner()", {}, p.address),
    permit: (0, evm_abi_1.fun)("0xd505accf", "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)", { "owner": p.address, "spender": p.address, "value": p.uint256, "deadline": p.uint256, "v": p.uint8, "r": p.bytes32, "s": p.bytes32 }),
    redeem: (0, evm_abi_1.fun)("0xa3622bf0", "redeem(bytes,uint256)", { "scriptPubkey": p.bytes, "amount": p.uint256 }),
    reinitialize: (0, evm_abi_1.fun)("0x6c2eb350", "reinitialize()", {}),
    removeClaimer: (0, evm_abi_1.fun)("0xf0490b8a", "removeClaimer(address)", { "oldClaimer": p.address }),
    removeMinter: (0, evm_abi_1.fun)("0x3092afd5", "removeMinter(address)", { "oldMinter": p.address }),
    renounceOwnership: (0, evm_abi_1.fun)("0x715018a6", "renounceOwnership()", {}),
    setMintFee: (0, evm_abi_1.fun)("0xeddd0d9c", "setMintFee(uint256)", { "fee": p.uint256 }),
    symbol: (0, evm_abi_1.viewFun)("0x95d89b41", "symbol()", {}, p.string),
    toggleWithdrawals: (0, evm_abi_1.fun)("0xd239f003", "toggleWithdrawals()", {}),
    totalSupply: (0, evm_abi_1.viewFun)("0x18160ddd", "totalSupply()", {}, p.uint256),
    transfer: (0, evm_abi_1.fun)("0xa9059cbb", "transfer(address,uint256)", { "to": p.address, "value": p.uint256 }, p.bool),
    transferFrom: (0, evm_abi_1.fun)("0x23b872dd", "transferFrom(address,address,uint256)", { "from": p.address, "to": p.address, "value": p.uint256 }, p.bool),
    transferOperatorRole: (0, evm_abi_1.fun)("0x0d121337", "transferOperatorRole(address)", { "newOperator": p.address }),
    transferOwnership: (0, evm_abi_1.fun)("0xf2fde38b", "transferOwnership(address)", { "newOwner": p.address }),
    transferPauserRole: (0, evm_abi_1.fun)("0xbad383a6", "transferPauserRole(address)", { "newPauser": p.address }),
    unpause: (0, evm_abi_1.fun)("0x3f4ba83a", "unpause()", {}),
};
class Contract extends evm_abi_1.ContractBase {
    Bascule() {
        return this.eth_call(exports.functions.Bascule, {});
    }
    DOMAIN_SEPARATOR() {
        return this.eth_call(exports.functions.DOMAIN_SEPARATOR, {});
    }
    allowance(owner, spender) {
        return this.eth_call(exports.functions.allowance, { owner, spender });
    }
    balanceOf(account) {
        return this.eth_call(exports.functions.balanceOf, { account });
    }
    calcUnstakeRequestAmount(scriptPubkey, amount) {
        return this.eth_call(exports.functions.calcUnstakeRequestAmount, { scriptPubkey, amount });
    }
    consortium() {
        return this.eth_call(exports.functions.consortium, {});
    }
    decimals() {
        return this.eth_call(exports.functions.decimals, {});
    }
    eip712Domain() {
        return this.eth_call(exports.functions.eip712Domain, {});
    }
    getBurnCommission() {
        return this.eth_call(exports.functions.getBurnCommission, {});
    }
    getDustFeeRate() {
        return this.eth_call(exports.functions.getDustFeeRate, {});
    }
    getMintFee() {
        return this.eth_call(exports.functions.getMintFee, {});
    }
    getTreasury() {
        return this.eth_call(exports.functions.getTreasury, {});
    }
    isClaimer(claimer) {
        return this.eth_call(exports.functions.isClaimer, { claimer });
    }
    isMinter(minter) {
        return this.eth_call(exports.functions.isMinter, { minter });
    }
    name() {
        return this.eth_call(exports.functions.name, {});
    }
    nonces(owner) {
        return this.eth_call(exports.functions.nonces, { owner });
    }
    operator() {
        return this.eth_call(exports.functions.operator, {});
    }
    owner() {
        return this.eth_call(exports.functions.owner, {});
    }
    paused() {
        return this.eth_call(exports.functions.paused, {});
    }
    pauser() {
        return this.eth_call(exports.functions.pauser, {});
    }
    pendingOwner() {
        return this.eth_call(exports.functions.pendingOwner, {});
    }
    symbol() {
        return this.eth_call(exports.functions.symbol, {});
    }
    totalSupply() {
        return this.eth_call(exports.functions.totalSupply, {});
    }
}
exports.Contract = Contract;
//# sourceMappingURL=LBTC.js.map