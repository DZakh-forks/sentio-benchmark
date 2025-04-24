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
exports.Multicall = void 0;
const p = __importStar(require("@subsquid/evm-codec"));
const evm_abi_1 = require("@subsquid/evm-abi");
const aggregate = (0, evm_abi_1.fun)('0x252dba42', "aggregate((address,bytes)[])", {
    calls: p.array(p.struct({
        target: p.address,
        callData: p.bytes
    }))
}, { blockNumber: p.uint256, returnData: p.array(p.bytes) });
const tryAggregate = (0, evm_abi_1.fun)('0xbce38bd7', "tryAggregate(bool,(address,bytes)[])", {
    requireSuccess: p.bool,
    calls: p.array(p.struct({ target: p.address, callData: p.bytes }))
}, p.array(p.struct({ success: p.bool, returnData: p.bytes })));
class Multicall extends evm_abi_1.ContractBase {
    async aggregate(...args) {
        let [calls, funcs, page] = this.makeCalls(args);
        let size = calls.length;
        let results = new Array(size);
        for (let [from, to] of splitIntoPages(size, page)) {
            let { returnData } = await this.eth_call(aggregate, { calls: calls.slice(from, to) });
            for (let i = from; i < to; i++) {
                let data = returnData[i - from];
                results[i] = funcs[i].decodeResult(data);
            }
        }
        return results;
    }
    async tryAggregate(...args) {
        let [calls, funcs, page] = this.makeCalls(args);
        let size = calls.length;
        let results = new Array(size);
        for (let [from, to] of splitIntoPages(size, page)) {
            let response = await this.eth_call(tryAggregate, {
                requireSuccess: false,
                calls: calls.slice(from, to)
            });
            for (let i = from; i < to; i++) {
                let res = response[i - from];
                if (res.success) {
                    try {
                        results[i] = {
                            success: true,
                            value: funcs[i].decodeResult(res.returnData)
                        };
                    }
                    catch (err) {
                        results[i] = { success: false, returnData: res.returnData };
                    }
                }
                else {
                    results[i] = { success: false };
                }
            }
        }
        return results;
    }
    makeCalls(args) {
        let page = typeof args[args.length - 1] == 'number' ? args.pop() : Number.MAX_SAFE_INTEGER;
        switch (args.length) {
            case 1: {
                let list = args[0];
                let calls = new Array(list.length);
                let funcs = new Array(list.length);
                for (let i = 0; i < list.length; i++) {
                    let [func, address, args] = list[i];
                    calls[i] = { target: address, callData: func.encode(args) };
                    funcs[i] = func;
                }
                return [calls, funcs, page];
            }
            case 2: {
                let func = args[0];
                let list = args[1];
                let calls = new Array(list.length);
                let funcs = new Array(list.length);
                for (let i = 0; i < list.length; i++) {
                    let [address, args] = list[i];
                    calls[i] = { target: address, callData: func.encode(args) };
                    funcs[i] = func;
                }
                return [calls, funcs, page];
            }
            case 3: {
                let func = args[0];
                let address = args[1];
                let list = args[2];
                let calls = new Array(list.length);
                let funcs = new Array(list.length);
                for (let i = 0; i < list.length; i++) {
                    let args = list[i];
                    calls[i] = { target: address, callData: func.encode(args) };
                    funcs[i] = func;
                }
                return [calls, funcs, page];
            }
            default:
                throw new Error('unexpected number of arguments');
        }
    }
}
exports.Multicall = Multicall;
Multicall.aggregate = aggregate;
Multicall.tryAggregate = tryAggregate;
function* splitIntoPages(size, page) {
    let from = 0;
    while (size) {
        let step = Math.min(page, size);
        let to = from + step;
        yield [from, to];
        size -= step;
        from = to;
    }
}
//# sourceMappingURL=multicall.js.map